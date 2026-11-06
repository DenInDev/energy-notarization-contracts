"""Generate the requested LaTeX tables without editing source benchmark data."""
import datetime as dt
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import pathlib
import statistics

out = pathlib.Path(__file__).resolve().parent
folder = out.parent
raw = (folder/'report.json').read_bytes()
report = json.loads(raw)
analysis = json.loads((folder/'segmented-analysis.json').read_text(encoding='utf-8'))
assert hashlib.sha256(raw).hexdigest() == analysis['snapshotSha256']
assert report['executionComplete'] and not report['complete']
samples = [s for s in report['samples'] if not s['warmup']]
inventory = {x['transactionHash']:x for x in analysis['gasReceiptInventory']}
supplementary = report['continuations'][-1]['supplementaryReceipts']
platforms = ['baseline','zama','fhenix']
operations = ['notarize','add','mul_scalar','mean','max']
blocks = {}
for s in samples:
    if all(k in s for k in ['blockHash','blockGasUsed','blockGasLimit']):
        meta = {'blockGasUsed':int(s['blockGasUsed']), 'blockGasLimit':int(s['blockGasLimit']),
                'donorTransactionHash':s['transactionHash']}
        if s['blockHash'] in blocks:
            assert all(blocks[s['blockHash']][k]==meta[k] for k in ['blockGasUsed','blockGasLimit'])
        blocks[s['blockHash']] = meta

def rounded(value):
    return str(Decimal(str(value)).quantize(Decimal('1'),rounding=ROUND_HALF_UP))

def stats(values):
    return {'n':len(values),'mean':statistics.mean(values),'sampleSd':statistics.stdev(values),
            'cvPct':100*statistics.stdev(values)/statistics.mean(values)}

def cell(summary):
    return rounded(summary['mean'])+f" ({summary['cvPct']:.2f}\\%)"

header = r"""\begin{table*}[!t]
\caption{CAPTION}
\label{LABEL}
\centering
\scriptsize
\setlength{\tabcolsep}{4pt}
\begin{tabular}{|l|r|rrr|r|}
\hline
\textbf{Operation} &
\textbf{Mean Gas} &
\multicolumn{3}{c|}{\textbf{Latency Components: Mean ms (CV\%)}} &
\textbf{Derived total} \\
\cline{3-5}
&
&
\textbf{Input preparation} &
\textbf{Tx to receipt} &
\textbf{Receipt to validation} &
\textbf{Lifecycle ms (CV\%)} \\
\hline
"""
captions = {'baseline':('Plaintext baseline performance on Sepolia','tab:baseline-sepolia-benchmark'),
            'zama':('Zama fhEVM performance on Sepolia','tab:zama-fhevm-sepolia-benchmark'),
            'fhenix':('Fhenix CoFHE performance on Sepolia','tab:fhenix-cofhe-sepolia-benchmark')}
provenance = {'sourceReport':str(folder/'report.json'), 'sourceSha256':hashlib.sha256(raw).hexdigest(),
              'primaryObservationsAttempted':750,'primaryObservationsValid':749,
              'latencyDefinition':'inputPreparationMs (zero when not applicable) + confirmationMs + postReceiptToValidatedPlaintextMs, summed per observation before descriptive statistics; transaction estimation/signing and intentional barrier waits excluded',
              'cvDefinition':'100 * sample standard deviation (ddof=1) / arithmetic mean; no independence or inferential claim',
              'gasDefinition':'Arithmetic mean gasUsed over all 50 confirmed measured transactions per platform/operation, including late-included historical failure',
              'blockTargetDefinition':'Transaction-weighted arithmetic mean of 2 * containing block gasUsed / block gasLimit over all 250 measured transactions per platform',
              'rounding':'Integer means: nearest, half up; CV: two decimals. Totals calculated before rounding.',
              'performance':[], 'deployments':[], 'metadataRecoveries':[]}
tables = {}
for p in platforms:
    caption,label = captions[p]
    lines = [header.replace('CAPTION',caption).replace('LABEL',label)]
    for op in operations:
        all_rows = [s for s in samples if s['platform']==p and s['operation']==op]
        success = [s for s in all_rows if s['status']=='ok']
        assert len(all_rows)==50 and len(success)==(49 if p=='zama' and op=='add' else 50)
        gas = statistics.mean(inventory[s['transactionHash']]['gasUsed'] for s in all_rows)
        input_summary = stats([s['inputPreparationMs'] for s in success]) if p!='baseline' and op=='notarize' else None
        receipt = stats([s['confirmationMs'] for s in success])
        post = stats([s['postReceiptToValidatedPlaintextMs'] for s in success])
        values = [s.get('inputPreparationMs',0)+s['confirmationMs']+s['postReceiptToValidatedPlaintextMs'] for s in success]
        total = stats(values)
        assert abs(total['mean']-((input_summary or {'mean':0})['mean']+receipt['mean']+post['mean']))<1e-6
        provenance['performance'].append({'platform':p,'operation':op,'gasN':50,'meanGas':gas,
            'latencyN':len(success),'input':input_summary,'receipt':receipt,'postReceipt':post,'derivedTotal':total})
        lines.append(op.replace('_',r'\_')+' & '+rounded(gas)+' & '+(cell(input_summary) if input_summary else '--')+
            ' & '+cell(receipt)+' & '+cell(post)+' & '+cell(total)+r' \\')
    lines += [r'\hline',r'\end{tabular}',r'\end{table*}']
    tables[p]='\n'.join(lines)+'\n'

deployment = [r"""\paragraph{Measurement procedure.}
All 750 scheduled primary operations were attempted in two observation segments.
Latency summaries use successful primary observations: $n=50$ for each row,
except Zama \texttt{add} ($n=49$), for which one receipt-observation deadline
was exceeded; its transaction was subsequently confirmed, and its late recovery
does not replace the failed latency observation. Gas summaries include all 50
confirmed transactions per operation. Warmups and deployments are excluded from
the performance rows. The two UTC intervals below denote the original segment
and its continuation, respectively.
Input preparation denotes encrypted-input work when applicable. Each derived
lifecycle is the per-observation sum of the three displayed components,
excluding separately recorded transaction estimation/signing, intentional
barrier waits, and already-ready decryption repeats. Means and CVs are computed
before rounding; CV is the sample standard deviation divided by the mean.
Post-receipt validation includes RPC reads, authorization and SDK/service waits,
and does not isolate FHE computation.
\begin{table*}[!t]
\caption{Sepolia deployments and measurement intervals (interleaved runs)}
\label{tab:sepolia-experimental-deployments}
\centering
\footnotesize
\setlength{\tabcolsep}{4pt}
\begin{tabular}{|l|l|l|l|r|}
\hline
\textbf{Configuration} &
\textbf{Observed interval (UTC)} &
\textbf{Contract} &
\textbf{Containing block range} &
\textbf{Mean gas/target} \\
\hline
"""]
names = {'baseline':'Plaintext baseline','zama':'Zama fhEVM','fhenix':'Fhenix CoFHE'}
source_count = report['continuations'][-1]['sourceSampleCount']
def stamp(value):
    return dt.datetime.fromisoformat(value.replace('Z','+00:00')).strftime('%Y-%m-%d %H:%M:%S')
for p in platforms:
    groups = [[s for s in report['samples'][start:end] if s['platform']==p and not s['warmup']]
              for start,end in [(0,source_count),(source_count,len(report['samples']))]]
    intervals = [{'start':min(s['startedAt'] for s in g), 'end':max(s['completedAt'] for s in g)} for g in groups]
    numbers,ratios=[],[]
    for s in [x for x in samples if x['platform']==p]:
        if s.get('blockHash'):
            block_hash=s['blockHash'];number=s['blockNumber'];meta=blocks[block_hash]
            if 'blockGasUsed' not in s:
                provenance['metadataRecoveries'].append({'transactionHash':s['transactionHash'],
                    'blockHash':block_hash,'method':'exact containing-block hash join to another raw observation',
                    'donorTransactionHash':meta['donorTransactionHash']})
        else:
            evidence=supplementary[s['transactionHash']];receipt=evidence['receipt']
            block_hash=receipt['blockHash'];number=int(receipt['blockNumber'],16)
            meta={'blockGasUsed':int(evidence['blockGasUsed'],16),'blockGasLimit':int(evidence['blockGasLimit'],16)}
            provenance['metadataRecoveries'].append({'transactionHash':s['transactionHash'],
                'blockHash':block_hash,'method':'canonical late receipt and block metadata in continuation preflight',
                'observedAt':evidence['observedAt']})
        numbers.append(number);ratios.append(2*meta['blockGasUsed']/meta['blockGasLimit'])
    setup=next(s for s in report['setup'] if s['platform']==p);address=setup['address']
    interval=r'\shortstack[l]{'+r' \\ '.join(stamp(v['start'])+' -- '+stamp(v['end']) for v in intervals)+'}'
    deployment += [names[p]+' &',interval+' &',r'\texttt{'+address[:6]+'...'+address[-4:]+'} &',
                   str(min(numbers))+'--'+str(max(numbers))+' &',f'{statistics.mean(ratios)*100:.1f}'+r'\% \\',r'\hline']
    provenance['deployments'].append({'platform':p,'contract':address,'intervalsUtc':intervals,
        'firstContainingBlock':min(numbers),'lastContainingBlock':max(numbers),
        'meanBlockGasTargetRatio':statistics.mean(ratios),'n':len(ratios)})
deployment += [r'\end{tabular}',r'\end{table*}']
text=tables['baseline']+'\n'+'\n'.join(deployment)+'\n\n'+tables['zama']+'\n'+tables['fhenix']
assert text.count(r'\begin{table*}[!t]')==4 and text.count(r'\end{table*}')==4
for caption,label in list(captions.values())+[
    ('Sepolia deployments and measurement intervals (interleaved runs)','tab:sepolia-experimental-deployments')]:
    assert text.count(r'\caption{'+caption+'}')==1 and text.count(r'\label{'+label+'}')==1
(out/'tables.tex').write_text(text,encoding='utf-8')
(out/'table-values-and-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8')
assert (folder/'report.json').read_bytes()==raw
print(json.dumps({'tables':str(out/'tables.tex'),'labelsAndCaptionsPreserved':True,
                  'metadataRecoveredByExactHash':len(provenance['metadataRecoveries']),
                  'sourceSha256':provenance['sourceSha256']}))
