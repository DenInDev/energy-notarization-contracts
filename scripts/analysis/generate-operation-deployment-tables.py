"""Offline LaTeX/CSV provenance tables; raw benchmark reports are never edited."""
import csv
import datetime as dt
import hashlib
import json
import statistics
from pathlib import Path

NAMES = {'baseline': 'Plaintext baseline', 'zama': 'Zama fhEVM', 'fhenix': 'Fhenix CoFHE'}
PLATFORMS = list(NAMES)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stamp(timestamp):
    return dt.datetime.fromtimestamp(timestamp, dt.UTC).strftime('%Y-%m-%d %H:%M:%S')


def escape(text):
    return str(text).replace('_', r'\_').replace('%', r'\%')


def build_table(caption, label, rows, view=False):
    heading = 'Reference block range' if view else 'Containing block range'
    lines = [r'\begin{table*}[!t]', '\\caption{' + caption + '}', '\\label{' + label + '}',
             r'\centering', r'\footnotesize', r'\setlength{\tabcolsep}{4pt}',
             r'\begin{tabular}{|l|l|l|l|r|}', r'\hline',
             r'\textbf{Configuration} &', r'\textbf{Observed interval (UTC)} &',
             r'\textbf{Contract} &', '\\textbf{' + heading + '} &', r'\textbf{Mean gas/target} \\', r'\hline']
    for row in rows:
        n = row['nReadCalls'] if view else row['nConfirmedTransactions']
        configuration = NAMES[row['platform']] + r' (\(n=' + str(n) + r'\))'
        if row.get('nUnsentCapacityLimits'):
            configuration += ' [HCU]'
        interval = '--'
        if row['intervalStartUtc']:
            interval = r'\shortstack[l]{' + row['intervalStartUtc'] + r' \\ -- ' + row['intervalEndUtc'] + '}'
        address = row['contract']
        block_range = '--' if row['firstBlock'] is None else f"{row['firstBlock']}--{row['lastBlock']}"
        percent = '--' if view or row['meanGasTargetPercent'] is None else f"{row['meanGasTargetPercent']:.1f}" + r'\%'
        lines += [configuration + ' &', interval + ' &', r'\texttt{' + address[:6] + '...' + address[-4:] + '} &',
                  block_range + ' &', percent + r' \\', r'\hline']
    lines += [r'\end{tabular}', r'\end{table*}', '']
    return '\n'.join(lines)


def generate(root):
    plan_file = root / 'input-plan.json'
    plan = json.loads(plan_file.read_text(encoding='utf8'))
    metadata_file = root / 'block-metadata.json'
    metadata = json.loads(metadata_file.read_text(encoding='utf8'))
    assert metadata['status'] == 'finished' and metadata['allContainingBlocksFinalized']
    assert sha(plan_file) == metadata['inputPlanSha256']
    blocks = metadata['blocks']
    references = {(r['dataset'], r['index']): r for r in metadata['references']}
    all_rows, overview, files = [], [], []
    source_audits = []
    for dataset in plan['datasets']:
        source = Path(dataset['sourceReport'])
        assert sha(source) == dataset['sourceSha256']
        source_audits.append(dict(file=str(source), sha256=sha(source)))
        dataset_id = dataset['id']
        numbered = list(enumerate(dataset['records']))
        record_blocks = {}
        by_transaction = {}
        for i, record in numbered:
            if (dataset_id, i) in references:
                ref = references[(dataset_id, i)]
                record_blocks[i] = blocks[ref['canonicalBlockHash']]
                assert record_blocks[i]['number'] == ref['canonicalBlockNumber']
                by_transaction[record['transaction']['transactionHash']] = record_blocks[i]
        arithmetic = ('mixed16/64 arithmetic' if dataset['kind'] == 'classic-reference' else f"{dataset['width']}-bit arithmetic")
        family = 'classical lifecycle' if dataset['kind'].startswith('classic') else dataset['kind'] + ' pilot'

        def transaction_rows(operation=None, category='primary'):
            values = []
            for platform in PLATFORMS:
                selected = [(i, s) for i, s in numbered if s['platform'] == platform and s['category'] == category and (operation is None or s['operation'] == operation)]
                confirmed = [(i, s) for i, s in selected if i in record_blocks]
                bs = [record_blocks[i] for i, _ in confirmed]
                hashes = [s['transaction']['transactionHash'] for _, s in confirmed]
                assert len(hashes) == len(set(hashes))
                ratios = [200 * int(b['gasUsed']) / int(b['gasLimit']) for b in bs]
                values.append(dict(dataset=dataset_id, operation=operation or 'all_measured_operations', category=category, platform=platform,
                    nConfirmedTransactions=len(confirmed), nReadCalls=None,
                    nOriginalStatusOk=sum(s['status'] == 'ok' for _, s in confirmed),
                    nOriginalOtherStatuses=sum(s['status'] != 'ok' for _, s in confirmed),
                    nUnsentCapacityLimits=sum(bool(s.get('capacity')) for _, s in selected if not s['transaction'].get('transactionHash')),
                    intervalDefinition='Canonical containing-block timestamps; excludes preparation and decryption; range may span interruptions.',
                    intervalStartUtc=stamp(min(b['timestamp'] for b in bs)) if bs else None,
                    intervalEndUtc=stamp(max(b['timestamp'] for b in bs)) if bs else None,
                    clientIntervalStartUtc=min(s['clientStartedAt'] for _, s in confirmed if s.get('clientStartedAt'))[:19].replace('T', ' ') if any(s.get('clientStartedAt') for _, s in confirmed) else None,
                    clientIntervalEndUtc=max(s['clientCompletedAt'] for _, s in confirmed if s.get('clientCompletedAt'))[:19].replace('T', ' ') if any(s.get('clientCompletedAt') for _, s in confirmed) else None,
                    contract=dataset['contracts'][platform], firstBlock=min(b['number'] for b in bs) if bs else None,
                    lastBlock=max(b['number'] for b in bs) if bs else None,
                    meanGasTargetPercent=statistics.mean(ratios) if ratios else None,
                    uniqueContainingBlocks=len({b['hash'] for b in bs}), transactionHashes=hashes,
                    sourceReport=dataset['sourceReport'], sourceSha256=dataset['sourceSha256']))
            return values

        rows = transaction_rows()
        all_rows += rows
        suffix = dataset_id.replace('_', '-')
        label = 'tab:sepolia-experiment-deployments' if dataset_id == 'classic-euint16' else 'tab:sepolia-experiment-deployments-' + suffix
        caption = 'Sepolia deployments and measurement intervals (interleaved runs)' if dataset_id == 'classic-euint16' else f'Sepolia deployments and measurement intervals: {family}, {arithmetic}'
        table = build_table(caption, label, rows)
        if dataset['kind'] == 'classic-reference':
            (root / 'reference-oct24-overview.tex').write_text(table, encoding='utf8')
        else:
            overview.append(table)
        fragments = []
        for operation in dataset['operations']:
            rows = transaction_rows(operation)
            all_rows += rows
            if dataset['kind'].startswith('classic'):
                title = r'\texttt{' + escape(operation) + '}'
            else:
                case = next(c for c in dataset['cases'] if c['id'] == operation)
                title = (r'\texttt{' + escape(case['circuit']) + '} (' + str(case['size']) + ')' if case['suite'] == 'circuits'
                         else r'\texttt{' + escape(case['mode']) + r'}, \(C=' + str(case['users']) + r'\)')
            caption = f'Sepolia deployments and measurement intervals: {title}, {arithmetic}'
            label = 'tab:sepolia-experiment-deployments-' + suffix + '-' + operation.replace('_', '-')
            fragments.append(build_table(caption, label, rows))
        for category in ('primary', 'late-recovery'):
            views = [v for v in dataset['views'] if v['category'] == category]
            if not views:
                continue
            view_rows = []
            for platform in PLATFORMS:
                selected = [v for v in views if v['platform'] == platform]
                observed = [v for v in selected if v.get('startedAt') and v.get('completedAt')]
                refs = []
                for v in selected:
                    b = blocks.get(v.get('referenceBlockHash'))
                    if b is None:
                        candidate = by_transaction.get(v.get('referenceTransactionHash'))
                        if candidate and candidate['hash'] == v.get('referenceBlockHash'):
                            b = candidate
                    if b:
                        refs.append(b)
                view_rows.append(dict(dataset=dataset_id, operation='view_decrypt', category=category, platform=platform,
                    nReadCalls=len(selected), nConfirmedTransactions=0, nOriginalStatusOk=sum(v['status'] == 'ok' for v in selected),
                    nOriginalOtherStatuses=sum(v['status'] != 'ok' for v in selected), nUnsentCapacityLimits=0,
                    intervalDefinition='Recorded client view/decrypt start through completion; no transaction submitted.',
                    intervalStartUtc=min(v['startedAt'] for v in observed)[:19].replace('T', ' ') if observed else None,
                    intervalEndUtc=max(v['completedAt'] for v in observed)[:19].replace('T', ' ') if observed else None,
                    contract=dataset['contracts'][platform], firstBlock=min(b['number'] for b in refs) if refs else None,
                    lastBlock=max(b['number'] for b in refs) if refs else None, meanGasTargetPercent=None,
                    nReferenceBlocksResolved=len(refs), uniqueContainingBlocks=None, transactionHashes=[],
                    sourceReport=dataset['sourceReport'], sourceSha256=dataset['sourceSha256']))
            all_rows += view_rows
            title = 'already-ready view and decrypt' if category == 'primary' else 'separate late-recovery view and decrypt'
            fragments.append(build_table(f'Sepolia observation intervals: {title}, {arithmetic}',
                'tab:sepolia-view-decrypt-' + suffix + '-' + category, view_rows, view=True))
        retry_rows = transaction_rows(category='explicit-retry')
        if any(r['nConfirmedTransactions'] for r in retry_rows):
            all_rows += retry_rows
            fragments.append(build_table(f'Sepolia deployments and measurement intervals: separately authorized retry, {arithmetic}',
                'tab:sepolia-explicit-retry-' + suffix, retry_rows))
        filename = suffix + '-operations.tex'
        (root / filename).write_text('\n'.join(fragments), encoding='utf8')
        if dataset['kind'] != 'classic-reference':
            files.append(filename)
        if dataset['kind'].startswith('classic'):
            # This alternative preserves the user's original table convention:
            # actual recorded sample start/completion, not containing-block time.
            client_tables = []
            for operation in [None] + dataset['operations']:
                client_rows = transaction_rows(operation)
                for row in client_rows:
                    row['intervalStartUtc'] = row['clientIntervalStartUtc']
                    row['intervalEndUtc'] = row['clientIntervalEndUtc']
                title = r'\texttt{' + escape(operation) + '}' if operation else 'all measured operations'
                client_tables.append(build_table(f'Sepolia deployments and client-observed measurement intervals: {title}, {arithmetic}',
                    'tab:sepolia-client-intervals-' + suffix + '-' + (operation or 'overall').replace('_', '-'), client_rows))
            (root / (suffix + '-client-observed-intervals.tex')).write_text('\n'.join(client_tables), encoding='utf8')
    (root / 'overview-tables.tex').write_text('\n'.join(overview), encoding='utf8')
    (root / 'all-operation-tables.tex').write_text('\n'.join('\\input{' + f + '}\n\\clearpage' for f in files) + '\n', encoding='utf8')
    notes = r'''\paragraph{Table scope.}
For transaction rows, UTC intervals span the timestamps of the first and last canonical containing blocks; they are inclusion intervals, not preparation-to-decryption intervals. Ranges may include interruptions.
Only measured primary transactions enter the main rows; deployment, warmup, explicit retries and late view recovery are separate. The integer $n$ is the confirmed transaction count, not the number of valid latency observations.
Mean gas/target is the transaction-weighted mean of $100\,g_b/(G_b/2)$, where $g_b$ and $G_b$ are the containing block's gas used and gas limit. A block is weighted once per included experimental transaction.
The 128-bit classical baseline and Zama schedules are partial (ten rounds, nine for max); Fhenix completed fifty planned rounds, retaining its failures. Owner registration uses \texttt{eaddress}; the width labels refer to arithmetic.
For view/decrypt, intervals use recorded client times and block ranges denote the persisted result's reference blocks. No new transaction is submitted, hence gas/target is not applicable.
The new studies are three-repetition pilots. Platform windows are rotated and executed sequentially; concurrency refers to writers within a platform. Unsent HCU rejections have no containing block. Raw timings and outcomes are unchanged.
'''
    (root / 'table-notes.tex').write_text(notes, encoding='utf8')
    (root / 'all-tables.tex').write_text(r'\input{table-notes.tex}' + '\n' + r'\input{overview-tables.tex}' + '\n\\clearpage\n' + r'\input{all-operation-tables.tex}' + '\n', encoding='utf8')
    headers = [k for k in all_rows[0] if k != 'transactionHashes']
    headers = list(dict.fromkeys(headers + [k for row in all_rows for k in row if k != 'transactionHashes']))
    with (root / 'deployment-intervals.csv').open('w', encoding='utf8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=headers, extrasaction='ignore')
        writer.writeheader(); writer.writerows({k: v for k, v in row.items() if k != 'transactionHashes'} for row in all_rows)
    values = dict(schemaVersion=1, notes=plan['scope'], intervalDefinition=plan['intervalDefinition'], targetDefinition=plan['targetDefinition'],
        metadataFile=str(metadata_file.resolve()), metadataSha256=sha(metadata_file), allContainingBlocksFinalized=True,
        rawSourcesUnchanged=source_audits, reconciliations=metadata['reconciliations'], rows=all_rows)
    (root / 'table-values-and-provenance.json').write_text(json.dumps(values, indent=2) + '\n', encoding='utf8')
    all_tex = ''.join((root / f).read_text(encoding='utf8') for f in files) + (root / 'overview-tables.tex').read_text(encoding='utf8')
    import re
    labels = re.findall(r'\\label\{([^}]+)\}', all_tex)
    assert len(labels) == len(set(labels)) and all_tex.count(r'\begin{table*}') == all_tex.count(r'\end{table*}')
    for source in source_audits:
        assert sha(Path(source['file'])) == source['sha256']
    readme = ['# Tabelle di provenienza per operazione', '',
        'Le tabelle mantengono lo stile a cinque colonne richiesto. Il label originale compare una sola volta nella panoramica classica16; ogni altra tabella ha un label univoco.', '',
        '**Intervalli delle transazioni:** timestamp UTC dei blocchi canonici contenenti le misure, non tempi completi del client. Calcolo: media, pesata per transazione, di100 × blockGasUsed/(blockGasLimit/2). Non è il gas medio della funzione. Le percentuali possono superare100%.', '',
        '**Conteggi:** n è il numero di transazioni primarie confermate. Nei classici16,50 per operazione/piattaforma. Nei classici128, baseline e Zama hanno10 prove per operazione,9 per max; Fhenix50. I fallimenti di validazione restano tali: la presenza di una receipt non implica una latenza valida. Retry e recuperi view sono separati.', '',
        '**Nuovi pilot:** tre round per configurazione; nei circuiti n è normalmente3, nella concorrenza n=24transazioni per cella. I tre rifiuti Zama affine_chain k4 a128bit non sono transazioni inviate (n=0). Finestre di piattaforma sequenziali con ordine ruotato, non tre piattaforme simultanee.', '',
        '**View/decrypt:** tempi client, blocchi di riferimento del risultato e gas/target non applicabile. I recuperi tardivi hanno una tabella distinta.', '',
        '## File', '', '- `overview-tables.tex`: panoramiche delle sei campagne recenti.', '- `all-operation-tables.tex`: include le tabelle per tutte le operazioni recenti.', '- `all-tables.tex`: note, panoramiche e operazioni.', '- `deployment-intervals.csv`: dati tabellari, n, esiti originali e scope degli intervalli.', '- `table-values-and-provenance.json`: valori non arrotondati, SHA e provenienza per ogni transazione.', '- `block-metadata.json`:1661 blocchi interrogati in sola lettura; tutti finalized.', '- `reference-mixed-oct24-operations.tex` e `reference-oct24-overview.tex`: precedente campagna mista del24ottobre, separata dai dati recenti.', '',
        'La modifica di canonicità osservata per la registrazione owner Fhenix128 run20 è registrata come evidenza supplementare. Nessun report grezzo, timing o outcome è stato modificato.', '',
        '## Intervalli client come nella tabella di esempio', '',
        'I file `classic-euint16-client-observed-intervals.tex`, `classic-euint128-client-observed-intervals.tex` e `reference-mixed-oct24-client-observed-intervals.tex` riportano invece gli estremi startedAt/completedAt registrati dal client, inclusa la preparazione. Blocchi e percentuali restano gli stessi. Per i nuovi pilot non sono inventati timestamp client di completamento assenti dal report: si usano gli intervalli dei blocchi canonici.', '',
        '## Riproduzione offline', '', '```powershell', '.venv/Scripts/python.exe scripts/analysis/generate-operation-deployment-tables.py logs/sepolia-operation-tables-2026-11-07', '```', '']
    (root / 'README.md').write_text('\n'.join(readme), encoding='utf8')
    print(json.dumps(dict(folder=str(root.resolve()),tables=len(labels),rows=len(all_rows),rawReportsUnchanged=len(source_audits),blocks=len(blocks))))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', type=Path)
    generate(parser.parse_args().folder)
