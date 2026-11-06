import argparse
import csv
import hashlib
import json
import statistics
import zipfile
from collections import Counter
from pathlib import Path


def stats(values):
    xs = [x for x in values if x is not None]
    mean = statistics.mean(xs) if xs else None
    sd = statistics.stdev(xs) if len(xs) > 1 else None
    return dict(n=len(xs), mean=mean, sd=sd, cvPercent=100 * sd / mean if sd is not None and mean else None,
                median=statistics.median(xs) if xs else None, min=min(xs) if xs else None, max=max(xs) if xs else None)


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def slot(t):
    return t['caseId'], t['platform'], t['repetition'], t['warmup'], t.get('controlDirection', 'main')


def analyze_stage(stage, audit):
    raw = Path(stage['report'])
    assert digest(raw) == stage['rawSha256'] == audit['rawSha256']
    r = json.loads(raw.read_text())
    assert r['executionComplete'] and audit['status'] == 'verified'
    out = raw.parent
    # Preserve the pre-final-audit descriptive artifacts before updating analyses.
    backup = out / 'analysis-before-final-canonical-audit.zip'
    old = [out / f for f in ('pilot-analysis.json', 'pilot-analysis.md', 'pilot-metrics.csv', 'completion-audit.json') if (out / f).exists()]
    if old and not backup.exists():
        with zipfile.ZipFile(backup, 'x', zipfile.ZIP_DEFLATED) as z:
            for file in old:
                z.write(file, file.name)
        with zipfile.ZipFile(backup) as z:
            assert all(hashlib.sha256(z.read(f.name)).hexdigest() == digest(f) for f in old)
    rec = r.get('canonicalReceipts', []) + audit['newReconciliations']
    canonical = {x['transactionHash']: x['canonical'] for x in rec}
    effective = lambda tx: {**tx, **canonical.get(tx.get('transactionHash'), {})}
    late = [a for a in r.get('recoveredAudits', []) if a['status'] == 'ok']
    late_by_scope = {a['scopeId']: a for a in late}
    latest = {slot(t): t for t in r['trials']}
    assert len(latest) == (108 if stage['suite'] == 'circuits' else 81)
    assert all(t['status'] in ('ok', 'capacity_rejected') or t['scopeId'] in late_by_scope for t in latest.values())
    owner = {}
    txs = []
    for setup in r['setups']:
        txs.append(setup['transaction'])
        owner[setup['transaction'].get('transactionHash')] = setup['platform']
    for t in r['trials']:
        for tx in t['setup'] + [q['transaction'] for q in t['requests']]:
            txs.append(tx)
            owner[tx.get('transactionHash')] = t['platform']
    confirmed = [tx for tx in txs if tx['status'] == 'confirmed']
    assert len(confirmed) == len({tx['transactionHash'] for tx in confirmed}) == audit['verifiedReceipts']
    for tx in confirmed:
        e = effective(tx)
        assert e['receiptStatus'] == 1 and int(e['gasCostWei']) == e['gasUsed'] * int(e['effectiveGasPriceWei'])
    for address in r['accounts']:
        nonces = sorted(tx['transactionNonce'] for tx in confirmed if tx['user'] == address)
        assert nonces == list(range(nonces[0], nonces[-1] + 1))
    for segment in r.get('continuations', []):
        source = Path(segment['sourceFile'])
        s = json.loads(source.read_text())
        assert digest(source) == segment['sourceSha256']
        for name in ('trials', 'setups', 'recoveredAudits', 'canonicalReceipts'):
            assert r.get(name, [])[:len(s.get(name, []))] == s.get(name, [])
    cases = {c['id']: c for c in r['cases']}
    for t in latest.values():
        c = cases[t['caseId']]
        if t['status'] == 'capacity_rejected':
            q = t['requests'][0]
            assert t['rejection']['broadcast'] is False and q['transaction']['transactionNonce'] == -1
            assert not q['transaction'].get('transactionHash') and q.get('transactionToValidatedMs') is None
            continue
        if c['suite'] == 'circuits':
            values = list(map(int, t['inputValues']))
            mask = (1 << c['width']) - 1
            expected = sum(values) & mask
            if c['circuit'] == 'affine_chain':
                expected = values[0]
                for _ in range(c['size']):
                    expected = (expected * values[1] + values[0]) & mask
            q = t['requests'][0]
            assert int(q['plaintext']) == int(q['expected']) == expected
            assert abs(q['transaction']['receiptMs'] + q['postReceiptMs'] - q['transactionToValidatedMs']) < 1e-4
        else:
            ordered = sorted(t['requests'], key=lambda q: (effective(q['transaction'])['blockNumber'], effective(q['transaction'])['transactionIndex']))
            observed = t if t['status'] == 'ok' else late_by_scope[t['scopeId']]
            assert [q['requestId'] for q in ordered] == observed['canonicalOrder']
            snapshots = {q['requestId']: q for q in observed.get('snapshots', [])}
            state = {}
            for q in ordered:
                k = q['user'].lower() if c['mode'] == 'independent' else 'shared'
                state[k] = ((3 if c['mode'] == 'shared_ordered' else 1) * state.get(k, 0) + int(q['input'])) % (1 << c['width'])
                check = q if t['status'] == 'ok' else snapshots[q['requestId']]
                assert int(check['plaintext']) == int(check['expected']) == state[k]
            assert {k: int(v) for k, v in observed['finalPlaintexts'].items()} == state
    rows = []
    for c in r['cases']:
        for platform in r['platforms']:
            trials = [t for t in r['trials'] if not t['warmup'] and t['caseId'] == c['id'] and t['platform'] == platform]
            requests = [q for t in trials for q in t['requests']]
            good = [q for q in requests if q['status'] == 'ok' and q['transaction'].get('transactionHash') not in canonical]
            windows = [t for t in trials if t['status'] == 'ok' and not any(q['transaction'].get('transactionHash') in canonical for q in t['requests'])]
            fresh = [t for t in windows if not t.get('resumedPreparation') and not any(tx.get('transactionHash') in canonical for tx in t['setup'])]
            after = [a for a in late if not a['warmup'] and a['scopeId'] in {t['scopeId'] for t in trials}]
            rows.append(dict(caseId=c['id'], platform=platform, **{k: c[k] for k in ('width', 'suite', 'users', 'size', 'inputCount', 'additions', 'multiplications', 'dependencyDepth')},
                mode=c.get('mode'), circuit=c.get('circuit'), plannedWindows=3,
                originalValidatedRequests=sum(q['status'] == 'ok' for q in requests), lateValidatedRequests=sum(len(a['snapshots']) for a in after),
                successfulOriginalWindows=sum(t['status'] == 'ok' for t in trials), separatelyLateWindows=len(after),
                capacityRejected=sum(t['status'] == 'capacity_rejected' for t in trials), retainedIncompleteAttempts=sum(t['status'] == 'incomplete' for t in trials),
                orderChangedWindows=sum(bool(t.get('orderChanged')) for t in trials if t['status'] == 'ok'),
                finalDiffersFromPlannedWindows=sum(t.get('finalMatchesPlannedOrder') is False for t in trials if t['status'] == 'ok'),
                receiptMs=stats([q['transaction'].get('receiptMs') for q in requests if q['transaction'].get('transactionHash') not in canonical]),
                validatedPlaintextMs=stats([q.get('transactionToValidatedMs') for q in good]), postReceiptMs=stats([q.get('postReceiptMs') for q in good]),
                deferredAlreadyReadyAuditMs=stats([q.get('auditCallMs') for q in good]),
                gasUsed=stats([effective(q['transaction']).get('gasUsed') for q in requests]),
                freshPreparationMs=stats([t.get('preparationMs') for t in fresh]),
                freshFullClientWorkMs=stats([t['preparationMs'] + t['requests'][0]['transactionToValidatedMs'] for t in fresh if c['suite'] == 'circuits']),
                receiptWindowMs=stats([t.get('receiptWindowMs') for t in windows]),
                receiptThroughputPerSecond=stats([t.get('receiptTransactionsPerSecond') for t in windows]),
                broadcastSpreadMs=stats([x for t in trials for x in t['broadcastSpreadsMs']]),
                broadcastAckMs=stats([q['transaction'].get('broadcastAckMs') for q in requests])))
    original = lambda warm: sum(q['status'] == 'ok' for t in r['trials'] if t['warmup'] == warm for q in t['requests'])
    late_count = lambda warm: sum(len(a['snapshots']) for a in late if a['warmup'] == warm)
    gas = {p: str(sum(int(effective(t)['gasCostWei']) for t in confirmed if owner[t['transactionHash']] == p)) for p in r['platforms']}
    total = sum(map(int, gas.values()))
    assert str(total) == audit['canonicalGasCostWei']
    stages = [s for t in r['trials'] for s in t.get('logReadStages', [])] + [s for t in r['trials'] for q in t['requests'] for s in q['stages']] + [s for a in r.get('recoveredAudits', []) for s in a['stages']]
    events = Counter(s['stage'] for s in stages if any(k in s['stage'].lower() for k in ('retry', 'rate', '429', 'hint', 'poll')))
    # Keep the interruptions visible even in descriptive summaries. No paired
    # or inferential pooling across coordinator versions/sessions is performed.
    continuations = r.get('continuations', [])
    boundaries = [0] + [c['sourceTrialCount'] for c in continuations] + [len(r['trials'])]
    segments = []
    for index, (start, stop) in enumerate(zip(boundaries, boundaries[1:])):
        part = r['trials'][start:stop]
        began = r['startedAt'] if index == 0 else continuations[index - 1]['startedAt']
        ended = continuations[index]['startedAt'] if index < len(continuations) else r['finishedAt']
        added_audits = [a for a in late if began <= a['startedAt'] < ended]
        groups = []
        for case in r['cases']:
            for platform in r['platforms']:
                ts = [t for t in part if not t['warmup'] and t['caseId'] == case['id'] and t['platform'] == platform]
                qs = [q for t in ts for q in t['requests']]
                if qs:
                    groups.append(dict(caseId=case['id'], platform=platform,
                        originalValidated=sum(q['status'] == 'ok' for q in qs),
                        receiptMs=stats([q['transaction'].get('receiptMs') for q in qs if q['transaction'].get('transactionHash') not in canonical]),
                        validatedPlaintextMs=stats([q.get('transactionToValidatedMs') for q in qs if q['status'] == 'ok' and q['transaction'].get('transactionHash') not in canonical]),
                        deferredAuditMs=stats([q.get('auditCallMs') for q in qs if q['status'] == 'ok' and q['transaction'].get('transactionHash') not in canonical])))
        provenance = r['provenance'] if index == 0 else continuations[index - 1]['provenance']
        segments.append(dict(segment='original' if index == 0 else f'continuation{index}',
            trialPrefixStart=start, trialPrefixEndExclusive=stop, startedAt=began, intervalEndsAt=ended,
            originalMeasuredValidated=sum(q['status'] == 'ok' for t in part if not t['warmup'] for q in t['requests']),
            originalWarmupValidated=sum(q['status'] == 'ok' for t in part if t['warmup'] for q in t['requests']),
            retainedIncompleteAttempts=sum(t['status'] == 'incomplete' for t in part),
            unsentCapacityAttempts=sum(t['status'] == 'capacity_rejected' for t in part),
            lateMeasuredCorrectnessChecks=sum(len(a['snapshots']) for a in added_audits if not a['warmup']),
            lateWarmupCorrectnessChecks=sum(len(a['snapshots']) for a in added_audits if a['warmup']),
            sourceHashes=provenance.get('sha256'), change=provenance.get('change'), rows=groups))
    meta = dict(rawReport=str(raw.resolve()), rawSha256=digest(raw), executionComplete=True, allOriginalTrialsValid=r['complete'], suite=stage['suite'], width=stage['width'],
        measuredPlanned=stage['measuredTransactions'], measuredOriginalValidated=original(False), measuredSeparatelyLateValidated=late_count(False),
        measuredUnsentCapacityLimits=sum(t['status'] == 'capacity_rejected' for t in latest.values() if not t['warmup']),
        warmupPlanned=stage['warmupTransactions'], warmupOriginalValidated=original(True), warmupSeparatelyLateValidated=late_count(True),
        warmupUnsentCapacityLimits=sum(t['status'] == 'capacity_rejected' for t in latest.values() if t['warmup']),
        confirmedReceipts=len(confirmed), deployments=sum(s['kind'] == 'deployment' for s in r['setups']),
        canonicalReconciliations=len(rec), canonicalGasCostWei=str(total), canonicalGasCostEth=f'{total / 10**18:.18f}', gasWeiByPlatform=gas,
        sourceBytesAndPrefixesVerified=True, independentModularOracleAndFinalCanonicalOrderVerified=True, noncesAndGasProductsVerified=True)
    supplement = dict(rawReport=str(raw.resolve()), rawSha256=digest(raw), provenance='Existing report reconciliations plus final-canonical-audit.json; no raw fields overwritten.', reconciliations=rec)
    (out / 'final-canonical-receipts.json').write_text(json.dumps(supplement, indent=2) + '\n', encoding='utf8')
    (out / 'completion-audit.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf8')
    analysis = dict(kind='Descriptive segmented reduced pilot; no inferential or causal claims', audit=meta, segments=segments, observedInstrumentedPollingRetryEvents=dict(events),
        methodology=['Three planned measured repetitions per case/platform; pilots and widths remain separate.',
                     'Concurrency audit-call duration is deferred already-ready retrieval, not FHE completion latency.',
                     'Late audits never restore original timing; known reincluded receipts and affected window throughput are excluded from timing summaries.',
                     'Fresh circuit preparation includes loading/readiness; resumed preparations and reincluded input loads are excluded from fresh lifecycle statistics.',
                     'Capacity rejections consume no compute nonce, gas or primary latency; values are unavailable, not zero.'], rows=rows)
    (out / 'pilot-analysis.json').write_text(json.dumps(analysis, indent=2) + '\n', encoding='utf8')
    flat = []
    for row in rows:
        f = {k: v for k, v in row.items() if not isinstance(v, dict)}
        for k, v in row.items():
            if isinstance(v, dict):
                f.update({k + '_' + name: value for name, value in v.items()})
        flat.append(f)
    with (out / 'pilot-metrics.csv').open('w', encoding='utf8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(flat[0])); writer.writeheader(); writer.writerows(flat)
    fmt = lambda d: '--' if d['mean'] is None else f"{d['mean']:.1f} ({d['n']})"
    lines = [f"# {stage['suite']} euint{stage['width']}: pilot descrittivo", '',
        f"Prove misurate: {meta['measuredOriginalValidated']} originali + {meta['measuredSeparatelyLateValidated']} audit tardivi separati; {meta['measuredUnsentCapacityLimits']} rifiuti di capacità senza invio, su {meta['measuredPlanned']} tentativi pianificati.",
        f"Warmup/controlli: {meta['warmupOriginalValidated']} originali + {meta['warmupSeparatelyLateValidated']} tardivi; {meta['warmupUnsentCapacityLimits']} rifiuti senza invio, su {meta['warmupPlanned']} pianificati.", '',
        '| Caso | Piattaforma | Validi originali + tardivi | Limiti senza invio | Receipt ms (n) | Plaintext ms (n) | Audit differito ms (n) | Gas medio (n) |',
        '|---|---|---:|---:|---:|---:|---:|---:|']
    for x in rows:
        lines.append(f"| {x['caseId']} | {x['platform']} | {x['originalValidatedRequests']} + {x['lateValidatedRequests']} | {x['capacityRejected']} | {fmt(x['receiptMs'])} | {fmt(x['validatedPlaintextMs'])} | {fmt(x['deferredAlreadyReadyAuditMs'])} | {fmt(x['gasUsed'])} |")
    lines += ['', '| Segmento | Misurate originali validate | Controlli originali validati | Audit tardivi misurati / warmup | Tentativi incompleti conservati |',
              '|---|---:|---:|---:|---:|']
    for s in segments:
        lines.append(f"| {s['segment']} | {s['originalMeasuredValidated']} | {s['originalWarmupValidated']} | {s['lateMeasuredCorrectnessChecks']} / {s['lateWarmupCorrectnessChecks']} | {s['retainedIncompleteAttempts']} |")
    lines += ['', f"Costo canonico incluse tutte le {len(confirmed)} receipt di deployment/autorizzazioni/input/setup/warmup/prove: {total} wei = {meta['canonicalGasCostEth']} ETH.", '',
        'Ogni denominatore è esplicito. Nessuna metrica rappresenta puro calcolo FHE. Le durate tardive non entrano nelle latenze originali; le receipt reincluse e il throughput delle relative finestre sono esclusi. Preparazioni riprese e caricamenti reinclusi non entrano nella preparazione fresca. I report grezzi e i fallimenti restano invariati.', '',
        'Tre ripetizioni sono un pilot, non una garanzia di robustezza. Nessun p-value, pooling con i classici o confronto causale fra piattaforme/width. Eventi di polling/retry sono quelli strumentati dal client, non ogni richiesta interna del servizio.', '',
        f"Report grezzo SHA256: {meta['rawSha256']}", '']
    (out / 'pilot-analysis.md').write_text('\n'.join(lines), encoding='utf8')
    return meta


def main():
    parser = argparse.ArgumentParser(description='Offline audit and descriptive summaries of the four reduced study pilots.')
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    final = json.loads((args.root / 'final-canonical-audit.json').read_text())
    assert final['status'] == 'verified' and final['mutationCalls'] == 0
    manifest = json.loads(Path(final['manifest']).read_text())
    assert len(manifest['stages']) == 4 and all(s['status'] == 'finished' for s in manifest['stages'])
    summaries = [analyze_stage(s, a) for s, a in zip(manifest['stages'], final['stages'])]
    overview = dict(status=manifest['status'], repetitionsPerCase=3, stages=summaries,
                    canonicalAudit=str((args.root / 'final-canonical-audit.json').resolve()), allAtOrBelowFinalized=final.get('allReceiptsAtOrBelowFinalized', False),
                    totalReceipts=sum(s['confirmedReceipts'] for s in summaries), totalCanonicalGasCostWei=str(sum(int(s['canonicalGasCostWei']) for s in summaries)))
    (args.root / 'pilot-results.json').write_text(json.dumps(overview, indent=2) + '\n', encoding='utf8')
    lines = ['# Risultati dei quattro pilot', '',
        'Raccolta autorizzata completata. Tre ripetizioni misurate per configurazione; la matrice completa da 50 non è stata avviata. Fallimenti storici, segmenti e recuperi restano distinti.', '',
        '| Pilot | Validi originali | Audit tardivi separati | Limiti senza invio | Pianificati | Receipt totali | Costo canonico ETH |',
        '|---|---:|---:|---:|---:|---:|---:|']
    for s in summaries:
        lines.append(f"| {s['suite']} {s['width']} | {s['measuredOriginalValidated']} | {s['measuredSeparatelyLateValidated']} | {s['measuredUnsentCapacityLimits']} | {s['measuredPlanned']} | {s['confirmedReceipts']} | {s['canonicalGasCostEth']} |")
    lines += ['', 'Zama affine_chain k4 a 128 bit ha raggiunto HCUTransactionDepthLimitExceeded in tutti e tre i tentativi misurati e nel warmup. Non sono state inviate compute per questi rifiuti.', '',
        'Le finestre concorrenti sono verificate contro il replay canonico con aritmetica modulare. Differenze di ordine e risultati delle operazioni non commutative sono separate dalle inconsistenze. Nessuna discrepanza di risultato osservata rispetto al replay nelle finestre verificate. Questo non dimostra robustezza generale.', '',
        'Latenze receipt, completion dei circuiti, audit già-pronto, preparazione e throughput sono in tabelle con denominatori espliciti. Esclusioni per reinclusioni e recuperi tardivi sono documentate. Nessun pooling con gli esperimenti classici o affermazione di puro tempo FHE.', '', '## File', '']
    for s in summaries:
        folder = Path(s['rawReport']).parent
        lines.append(f"- {s['suite']} {s['width']}: [report]({Path(s['rawReport']).as_posix()}) · [analisi]({(folder / 'pilot-analysis.md').as_posix()}) · [CSV]({(folder / 'pilot-metrics.csv').as_posix()}) · [audit]({(folder / 'completion-audit.json').as_posix()}) · [receipt supplementari]({(folder / 'final-canonical-receipts.json').as_posix()})")
    lines += ['', f"[Audit canonico finale]({Path(overview['canonicalAudit']).as_posix()})", '',
              'Ricevute al di sotto del blocco finalized alla riverifica: ' + str(overview['allAtOrBelowFinalized']) + '.', '']
    (args.root / 'PILOT-RESULTS.md').write_text('\n'.join(lines), encoding='utf8')
    print(json.dumps(dict(totalReceipts=overview['totalReceipts'], totalCanonicalGasCostWei=overview['totalCanonicalGasCostWei'], stages=len(summaries))))


if __name__ == '__main__':
    main()
