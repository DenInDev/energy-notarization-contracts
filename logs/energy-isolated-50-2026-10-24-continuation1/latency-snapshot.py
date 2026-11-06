"""Read-only descriptive snapshot; never edits the running campaign report."""
import collections
import datetime as dt
import hashlib
import json
import math
import pathlib
import statistics
import sys

root = pathlib.Path.cwd()
journal = json.loads((root / 'logs/energy-active-campaign.json').read_text(encoding='utf-8-sig'))
report_path = pathlib.Path(journal['report'])
raw = report_path.read_bytes()
report = json.loads(raw)
captured = dt.datetime.now(dt.timezone.utc)
output = report_path.parent / ('latency-snapshot-' + captured.strftime('%Y%m%dT%H%M%S%fZ'))
output.mkdir()
(output / 'report.snapshot.json').write_bytes(raw)
platforms = ['baseline', 'zama', 'fhenix']
operations = ['notarize', 'add', 'mul_scalar', 'mean', 'max']
cutoffs = [c['sourceSampleCount'] for c in report.get('continuations', [])]
samples = []
for index, sample in enumerate(report['samples']):
    s = dict(sample)
    s['segment'] = sum(index >= n for n in cutoffs)
    s['sampleIndex'] = index
    if not s['warmup']:
        samples.append(s)

def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def elapsed(s, end, start):
    if not s.get(end) or not s.get(start):
        return None
    return (dt.datetime.fromisoformat(s[end].replace('Z', '+00:00')) -
            dt.datetime.fromisoformat(s[start].replace('Z', '+00:00'))).total_seconds() * 1000

def metric(s, key):
    if key == 'clientWorkMs':
        a, b = s.get('preparationMs'), s.get('transactionToValidatedPlaintextMs')
        return a + b if finite(a) and finite(b) else None
    if key == 'workerStartToPlaintextMs':
        return elapsed(s, 'plaintextValidatedAt', 'startedAt')
    if key == 'workerWallIncludingReadyRepeatMs':
        return elapsed(s, 'completedAt', 'startedAt')
    if key == 'alreadyReadyDecryptMs' and s.get('readyDecryptError'):
        return None
    return s.get(key)

metrics = ['inputPreparationMs', 'transactionPreparationMs', 'preparationMs', 'barrierWaitMs',
           'broadcastAckMs', 'broadcastToReceiptMs', 'confirmationMs',
           'postReceiptToValidatedPlaintextMs', 'transactionToValidatedPlaintextMs',
           'clientWorkMs', 'alreadyReadyDecryptMs', 'workerStartToPlaintextMs',
           'workerWallIncludingReadyRepeatMs']

def describe(values):
    values = sorted(v for v in values if finite(v))
    if not values:
        return {'n': 0, 'meanMs': None, 'medianMs': None, 'p95Ms': None,
                'minMs': None, 'maxMs': None, 'sampleSdMs': None}
    position = (len(values) - 1) * .95
    lo, hi = math.floor(position), math.ceil(position)
    return {'n': len(values), 'meanMs': statistics.mean(values), 'medianMs': statistics.median(values),
            'p95Ms': values[lo] + (position-lo) * (values[hi]-values[lo]),
            'minMs': values[0], 'maxMs': values[-1],
            'sampleSdMs': statistics.stdev(values) if len(values) > 1 else None}

def summarize(rows):
    success = [s for s in rows if s['status'] == 'ok']
    return {'attempted': len(rows), 'success': len(success),
            'failed': sum(s['status'] == 'error' for s in rows),
            'pending': sum(s['status'] == 'pending' for s in rows),
            'readyRepeatFailed': sum(bool(s.get('readyDecryptError')) for s in rows),
            'primarySuccessMetrics': {key: describe(metric(s, key) for s in success) for key in metrics},
            'receiptLatencyAllObserved': describe(s.get('confirmationMs') for s in rows),
            'preparationAllObserved': describe(s.get('preparationMs') for s in rows)}

groups = collections.defaultdict(list)
for s in samples:
    groups[(s['run'], s['operation'])].append(s)
paired = [s for rows in groups.values() if len(rows) == 3 and
          {s['platform'] for s in rows} == set(platforms) and all(s['status'] == 'ok' for s in rows)
          for s in rows]
paired_summary, all_summary, segment_summary = [], [], []
for op in operations:
    for p in platforms:
        paired_summary.append({'operation': op, 'platform': p, **summarize(
            [s for s in paired if s['operation'] == op and s['platform'] == p])})
        all_summary.append({'operation': op, 'platform': p, **summarize(
            [s for s in samples if s['operation'] == op and s['platform'] == p])})
        for segment in range(len(cutoffs) + 1):
            segment_summary.append({'operation': op, 'platform': p, 'segment': segment, **summarize(
                [s for s in samples if s['operation'] == op and s['platform'] == p and s['segment'] == segment])})

paired_differences = []
for op in operations:
    eligible = [rows for (run, operation), rows in groups.items() if operation == op and len(rows) == 3 and
                {s['platform'] for s in rows} == set(platforms) and all(s['status'] == 'ok' for s in rows)]
    for p in ['zama', 'fhenix']:
        diffs = {key: describe(metric(next(s for s in rows if s['platform'] == p), key) -
                               metric(next(s for s in rows if s['platform'] == 'baseline'), key)
                               for rows in eligible)
                 for key in ['confirmationMs', 'postReceiptToValidatedPlaintextMs',
                             'transactionToValidatedPlaintextMs', 'clientWorkMs']}
        paired_differences.append({'operation': op, 'difference': p + '-baseline', 'metrics': diffs})

stage_rows = []
for segment in range(len(cutoffs) + 1):
    for op in operations:
        for p in platforms:
            relevant = [s for s in samples if s['segment'] == segment and s['operation'] == op and
                        s['platform'] == p and s['status'] == 'ok']
            stage_names = {x['stage'] for s in relevant for x in s['stages'] if x['status'] == 'ok'}
            for name in sorted(stage_names):
                totals = [sum(x['durationMs'] for x in s['stages'] if x['stage'] == name and x['status'] == 'ok')
                          for s in relevant if any(x['stage'] == name and x['status'] == 'ok' for x in s['stages'])]
                stage_rows.append({'segment': segment, 'operation': op, 'platform': p, 'stage': name,
                                   **describe(totals)})

failures = [{'run': s['run'], 'operation': s['operation'], 'platform': s['platform'],
             'segment': s['segment'], 'status': s['status'], 'error': s.get('error'),
             'readyDecryptError': s.get('readyDecryptError')} for s in samples
            if s['status'] != 'ok' or s.get('readyDecryptError')]
result = {'capturedAtUtc': captured.isoformat(),
          'capturedAtRome': captured.astimezone(dt.timezone(dt.timedelta(hours=2))).isoformat(),
          'sourceReport': str(report_path), 'snapshotReport': str(output / 'report.snapshot.json'),
          'snapshotSha256': hashlib.sha256(raw).hexdigest(),
          'campaignStatus': report.get('continuations', [{}])[-1].get('status'),
          'executionComplete': report.get('executionComplete', False), 'allPrimaryValid': report.get('complete', False),
          'counts': summarize(samples), 'pairedTripleCount': len(paired)//3,
          'warmupsExcluded': sum(bool(s['warmup']) for s in report['samples']),
          'pairedTripleSuccessSummary': paired_summary, 'allAttemptsSummary': all_summary,
          'segmentSummary': segment_summary, 'pairedDifferences': paired_differences,
          'stageDurationsPerObservation': stage_rows, 'failuresAndPending': failures,
          'samples': [{k: s.get(k) for k in ['sampleIndex', 'segment', 'platform', 'operation', 'run', 'status',
                       'startedAt', 'error', 'readyDecryptError']} | {key: metric(s, key) for key in metrics} for s in samples],
          'interpretation': ['Provisional descriptive snapshot of an interrupted campaign; no inferential tests.',
                            'Main comparison restricts every platform to identical successful triples; excludes whole historical failed triple.',
                            'All-attempt and per-segment tables retain failures/pending and metric-specific denominators.',
                            'Means aggregate original segment and continuation descriptively; separate segment statistics supplied.',
                            'Receipt means client-observed inclusion, not finality or block production time.',
                            'Postreceipt includes pinned getter, authorization, SDK/service/polling and plaintext validation; not pure FHE compute.',
                            'Preparation includes encryption/input approval and transaction estimate/signing; clientWork excludes barrier wait.',
                            'Already-ready statistics are successful repeated decryptions only and exclude primary completion.',
                            'Worker start-to-plaintext includes barrier; completedAt also includes ready repeat when run.',
                            'Stage durations overlap/nest; do not add them to obtain a total.',
                            'Late receipt/plaintext recovery is excluded from latency statistics.']}
(output / 'latencies.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')

def sec(value):
    return '—' if value is None else f'{value/1000:.3f}'

def table(title, summary):
    lines = ['## ' + title, '', '| Operazione | Piattaforma | OK / tentati | Errori | Pendenti | Prep. | ACK | Ricevuta | Post-ricevuta | Plaintext | Client totale | Barriera | Già pronto (n) |',
             '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for row in summary:
        m = row['primarySuccessMetrics']
        vals = [sec(m[key]['meanMs']) for key in ['preparationMs','broadcastAckMs','confirmationMs',
                'postReceiptToValidatedPlaintextMs','transactionToValidatedPlaintextMs','clientWorkMs','barrierWaitMs']]
        ready = sec(m['alreadyReadyDecryptMs']['meanMs']) + f" ({m['alreadyReadyDecryptMs']['n']})"
        lines.append('| ' + ' | '.join([row['operation'],row['platform'],f"{row['success']}/{row['attempted']}",
                     str(row['failed']),str(row['pending']),*vals,ready]) + ' |')
    return lines + ['']

lines = ['# Latenze: snapshot descrittivo provvisorio', '', f"Acquisito: {result['capturedAtRome']} (Europe/Rome, UTC+02:00).",
         f"Misure primarie: {result['counts']['success']} valide, {result['counts']['failed']} fallite, {result['counts']['pending']} pendenti; 750 previste.",
         f"Warmup esclusi: {result['warmupsExcluded']}. Triple interamente valide: {result['pairedTripleCount']}.", '',
         'Tutte le durate nelle tabelle sono **secondi**. Le tabelle principali riportano medie; n e statistiche complete sono nel JSON.', '',
         'Ricevuta = avvio invio → osservazione ricevuta; post-ricevuta = ricevuta osservata → plaintext validato; plaintext = somma delle due. '
         'Client totale = preparazione + plaintext, esclusa barriera intenzionale. ACK è già incluso nella latenza di inclusione. '
         'Già pronto è una seconda decryption success-only, separata. — significa non misurato.', '']
lines += table('Confronto bilanciato: solo triple con successo primario per tutte le piattaforme', paired_summary)
lines += table('Tutte le osservazioni: medie dei successi, fallimenti e pendenti conservati nei conteggi', all_summary)
for segment in range(len(cutoffs)+1):
    lines += table('Segmento ' + str(segment) + (' — prima interruzione' if segment == 0 else ' — continuazione'),
                   [row for row in segment_summary if row['segment'] == segment])
lines += ['## Distribuzione completa per metrica — tutte le osservazioni valide', '',
          '| Operazione | Piattaforma | Metrica | n | Media | Mediana | P95 | Min | Max | DS campionaria |',
          '|---|---|---|---:|---:|---:|---:|---:|---:|---:|']
for row in all_summary:
    for key, stat in row['primarySuccessMetrics'].items():
        lines.append('| ' + ' | '.join([row['operation'],row['platform'],key,str(stat['n']),
                     *[sec(stat[x]) for x in ['meanMs','medianMs','p95Ms','minMs','maxMs','sampleSdMs']]]) + ' |')
lines += ['', '## Lettura e limiti', '', *['- ' + note for note in result['interpretation']], '',
          f"SHA256 della copia grezza: `{result['snapshotSha256']}`.",
          'Il JSON include singole osservazioni, differenze appaiate e stadi per piattaforma/operazione/segmento.']
(output / 'latencies.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(json.dumps({'artifactDir': str(output), 'capturedAtRome': result['capturedAtRome'],
                  'success': result['counts']['success'], 'failed': result['counts']['failed'],
                  'pending': result['counts']['pending'], 'pairedTriples': result['pairedTripleCount'],
                  'pairedRows': [{'operation': r['operation'], 'platform': r['platform'], 'n':r['success'],
                                  **{k: r['primarySuccessMetrics'][k]['meanMs'] for k in
                                     ['preparationMs','broadcastAckMs','confirmationMs','postReceiptToValidatedPlaintextMs',
                                      'transactionToValidatedPlaintextMs','clientWorkMs','alreadyReadyDecryptMs']}}
                                 for r in paired_summary]}))
