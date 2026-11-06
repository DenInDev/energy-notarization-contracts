"""Append/update only the paired table in the existing tables.tex document."""
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import math
import pathlib
import statistics

folder = pathlib.Path(__file__).resolve().parent
if (folder/'paired-inference.json').exists():
    raise SystemExit('Inference tables already exist. Use compute_paired_inference.py to regenerate them without discarding CI/p-values.')
raw = (folder.parent/'report.json').read_bytes()
report = json.loads(raw)
provenance = json.loads((folder/'table-values-and-provenance.json').read_text(encoding='utf-8'))
assert hashlib.sha256(raw).hexdigest() == provenance['sourceSha256']
index = {(s['platform'],s['operation'],s['run']):s for s in report['samples'] if not s['warmup']}
def lifecycle(s):
    return s.get('inputPreparationMs',0)+s['confirmationMs']+s['postReceiptToValidatedPlaintextMs']
def integer(value):
    return str(Decimal(str(value)).quantize(Decimal('1'),rounding=ROUND_HALF_UP))

rows=[]
for op in ['notarize','add','mul_scalar','mean','max']:
    for platform in ['zama','fhenix']:
        pairs=[(index[('baseline',op,i)],index[(platform,op,i)]) for i in range(1,51)
               if index[('baseline',op,i)]['status']==index[(platform,op,i)]['status']=='ok']
        assert len(pairs)==(49 if platform=='zama' and op=='add' else 50)
        a=[lifecycle(x) for x,y in pairs];b=[lifecycle(y) for x,y in pairs]
        ratio=math.exp(statistics.mean(math.log(y/x) for x,y in zip(a,b)))
        rows.append({'operation':op,'platform':platform,'n':len(pairs),
            'rounds':[x['run'] for x,y in pairs], 'baselineMeanMs':statistics.mean(a),
            'fheMeanMs':statistics.mean(b),'geometricMeanPairedRatio':ratio,
            'overheadPct':100*(ratio-1),'confidenceInterval95':None,'holmP':None})

header=r"""% BEGIN GENERATED PAIRED LATENCY TABLE
\begin{table*}[!t]
\caption{Paired latency comparison against the plaintext baseline}
\label{tab:paired-lifecycle-comparison}
\centering
\footnotesize
\setlength{\tabcolsep}{5pt}
\begin{tabular}{|l|l|r|r|r|c|r|r|}
\hline
\textbf{Operation} &
\textbf{Platform} &
\textbf{Baseline Mean} &
\textbf{FHE Mean} &
\textbf{Paired Ratio} &
\textbf{95\% CI} &
\textbf{Overhead} &
\textbf{Holm \(p\)} \\
\hline
"""
lines=[header]
for i,row in enumerate(rows):
    if i%2==0:
        lines += ['',r'\multirow{2}{*}{'+row['operation'].replace('_',r'\_')+'}']
    name='Zama' if row['platform']=='zama' else 'Fhenix'
    lines.append('& '+name+' & '+integer(row['baselineMeanMs'])+' & '+integer(row['fheMeanMs'])+
        f" & {row['geometricMeanPairedRatio']:.3f} & -- & {row['overheadPct']:+.1f}\\% & --"+r' \\')
    if i%2==1: lines.append(r'\hline')
lines += [r'\end{tabular}',r'\end{table*}',r"""
\noindent
Means are in milliseconds and use the same round-matched successful primary
observations for each platform--baseline pair: $n=50$, except Zama
\texttt{add} ($n=49$). Lifecycle is the same sum of displayed components as
in the preceding performance tables. The paired ratio is
$\exp(\mathrm{mean}(\log(L_{\mathrm{FHE}}/L_{\mathrm{baseline}})))$,
and overhead is $100(\mathrm{ratio}-1)\%$, calculated before rounding.
These are descriptive summaries of the original and continuation segments;
confidence intervals and Holm-adjusted $p$-values were not estimated and are
shown as ``--''. Ratios do not represent isolated FHE compute time or causal
effects.
% END GENERATED PAIRED LATENCY TABLE
"""]
block='\n'.join(lines)
file=folder/'tables.tex'
before=file.read_text(encoding='utf-8')
start='% BEGIN GENERATED PAIRED LATENCY TABLE'
end='% END GENERATED PAIRED LATENCY TABLE'
if start in before:
    left,tail=before.split(start,1)
    _,right=tail.split(end,1)
    after=left+block+right.lstrip('\n')
else:
    assert r'\label{tab:paired-lifecycle-comparison}' not in before
    after=before+'\n'+block
    assert after.startswith(before)
assert after.count(r'\label{tab:paired-lifecycle-comparison}')==1
assert after.count(r'\begin{table*}[!t]')==5
file.write_text(after,encoding='utf-8')
main=folder/'main.tex'
wrapper=main.read_text(encoding='utf-8')
if r'\usepackage{multirow}' not in wrapper:
    wrapper=wrapper.replace(r'\usepackage{array}',r'\usepackage{array}'+'\n'+r'\usepackage{multirow}')
    main.write_text(wrapper,encoding='utf-8')
record={'sourceReportSha256':hashlib.sha256(raw).hexdigest(),
        'lifecycleDefinition':provenance['latencyDefinition'],
        'pairedRatioDefinition':'exp(mean(log(candidate lifecycle / baseline lifecycle))) over identical successful rounds',
        'inference':'Not estimated; descriptive segmented analysis only. No previous-experiment CI or p-values reused.',
        'rows':rows}
(folder/'paired-table-values.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'edited':str(file),'rows':len(rows),'captionAndLabelPreserved':True,
                  'n49BaselineMeanMs':next(r['baselineMeanMs'] for r in rows if r['platform']=='zama' and r['operation']=='add')}))
