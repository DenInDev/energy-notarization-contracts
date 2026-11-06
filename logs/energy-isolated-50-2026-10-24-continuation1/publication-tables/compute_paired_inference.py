"""Exploratory paired inference requested after the descriptive campaign analysis.

Raw observations are immutable. Bootstrap blocks never cross the interruption.
The estimand is conditional on successful round-matched primary observations.
"""
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import math
import pathlib
import sys
import numpy as np

FOLDER = pathlib.Path(__file__).resolve().parent
REPORT = FOLDER.parent/'report.json'
REPS = 199999
PRIMARY_LENGTH = 3
LENGTHS = [1,2,3,5]
SEED_NAMESPACE = 'segmented-paired-lifecycle-inference-v1'

def holm(values):
    values=np.asarray(values,dtype=float)
    order=np.argsort(values,kind='stable')
    adjusted=np.minimum(1,np.maximum.accumulate(values[order]*(len(values)-np.arange(len(values)))))
    out=np.empty_like(adjusted)
    out[order]=adjusted
    return out.tolist()

def bootstrap_means(segments, block_length, seed, reps=REPS):
    rng=np.random.default_rng(seed)
    count=sum(len(s) for s in segments)
    result=np.zeros(reps)
    for values in segments:
        values=np.asarray(values,dtype=float)
        n=len(values); length=min(block_length,n)
        for first in range(0,reps,4096):
            stop=min(first+4096,reps)
            starts=rng.integers(0,n,size=(stop-first,math.ceil(n/length)))
            indices=((starts[:,:,None]+np.arange(length))%n).reshape(stop-first,-1)[:,:n]
            result[first:stop]+=values[indices].sum(axis=1)/count
    return result

def bootstrap_test(segments, block_length, seed, reps=REPS):
    observed=float(np.mean(np.concatenate(segments)))
    replicate=bootstrap_means(segments,block_length,seed,reps)
    error=replicate-observed
    low_error,high_error=np.quantile(error,[.025,.975])
    # Basic interval on log scale, transformed to the ratio scale. Inverting
    # this same centered-error distribution gives the two-sided raw test.
    ci=np.exp([observed-high_error,observed-low_error]).tolist()
    upper=int(np.count_nonzero(error>=observed))
    lower=int(np.count_nonzero(error<=observed))
    p=min(1,2*(min(upper,lower)+1)/(reps+1))
    return {'ratio':math.exp(observed),'ci95':ci,'rawP':p,'bootstrapSELog':float(np.std(replicate,ddof=1)),
            'tailCounts':{'upper':upper,'lower':lower},'replicates':reps,'seed':seed,
            'rawPMinimumResolution':2/(reps+1),'blockLength':block_length}

def lifecycle(row):
    return row.get('inputPreparationMs',0)+row['confirmationMs']+row['postReceiptToValidatedPlaintextMs']

def seed_for(op,candidate,reference,length):
    text=f'{SEED_NAMESPACE}:{op}:{candidate}:{reference}:{length}'
    return int.from_bytes(hashlib.sha256(text.encode()).digest()[:8],'big')

def integer(value):
    return str(Decimal(str(value)).quantize(Decimal('1'),rounding=ROUND_HALF_UP))

def p_latex(p):
    return r'$<0.001$' if p<.001 else f'{p:.4f}'

def tests():
    assert np.allclose(holm([.01,.04,.03]),[.03,.06,.06])
    assert holm([0,1,.5])==[0,1,1]
    data=[np.array([-.2,.1,.3,.4,.1,.2]),np.array([.2,.3,.1,-.1,.5,.2])]
    first=bootstrap_test(data,3,7123,9999)
    reversed_test=bootstrap_test([-x for x in data],3,7123,9999)
    assert abs(first['ratio']*reversed_test['ratio']-1)<1e-12
    assert np.allclose(first['ci95'],[1/reversed_test['ci95'][1],1/reversed_test['ci95'][0]])
    assert first['rawP']==reversed_test['rawP']
    constant=bootstrap_means([np.full(6,1.),np.full(44,3.)],3,8102,100)
    assert np.allclose(constant,(6+44*3)/50), 'segment weights/boundaries were not preserved'
    print('Verified Holm reference values, reciprocal CIs, symmetric p-values, and fixed segment weights.')

def main():
    tests()
    raw=REPORT.read_bytes();report=json.loads(raw)
    provenance=json.loads((FOLDER/'table-values-and-provenance.json').read_text(encoding='utf-8'))
    assert hashlib.sha256(raw).hexdigest()==provenance['sourceSha256']
    assert report['executionComplete'] and not report['complete']
    cutoff=report['continuations'][-1]['sourceSampleCount']
    source=pathlib.Path(report['continuations'][-1]['sourceReport']).read_bytes()
    assert hashlib.sha256(source).hexdigest()==report['continuations'][-1]['sourceReportSha256']
    assert report['samples'][:cutoff]==json.loads(source)['samples']
    index={(s['platform'],s['operation'],s['run']):(s,0 if i<cutoff else 1)
           for i,s in enumerate(report['samples']) if not s['warmup']}
    definitions=[]
    for op in ['notarize','add','mul_scalar','mean','max']:
        for candidate,reference in [('zama','baseline'),('fhenix','baseline'),('zama','fhenix')]:
            pairs=[]
            for run in range(1,51):
                a,seg_a=index[(reference,op,run)];b,seg_b=index[(candidate,op,run)]
                assert seg_a==seg_b
                if a['status']==b['status']=='ok':
                    pairs.append({'run':run,'segment':seg_a,'referenceMs':lifecycle(a),'candidateMs':lifecycle(b),
                                  'logRatio':math.log(lifecycle(b)/lifecycle(a))})
            expected=49 if op=='add' and candidate=='zama' else 50
            assert len(pairs)==expected
            groups=[]
            for segment in [0,1]:
                part=[p for p in pairs if p['segment']==segment]
                assert all(y['run']==x['run']+1 for x,y in zip(part,part[1:]))
                groups.append(np.array([p['logRatio'] for p in part]))
            definitions.append({'operation':op,'candidate':candidate,'reference':reference,'n':len(pairs),
                'referenceMeanMs':float(np.mean([p['referenceMs'] for p in pairs])),
                'candidateMeanMs':float(np.mean([p['candidateMs'] for p in pairs])),
                'segmentSizes':[len(g) for g in groups],'pairs':pairs,'groups':groups})
    sensitivity={}
    for length in LENGTHS:
        values=[bootstrap_test(d['groups'],length,seed_for(d['operation'],d['candidate'],d['reference'],length)) for d in definitions]
        adjusted=holm([x['rawP'] for x in values])
        baseline_indices=[i for i,d in enumerate(definitions) if d['reference']=='baseline']
        direct_indices=[i for i,d in enumerate(definitions) if d['reference']=='fhenix']
        separate={}
        for subset in [baseline_indices,direct_indices]:
            for i,p in zip(subset,holm([values[j]['rawP'] for j in subset])):separate[i]=p
        for i,(d,v,p) in enumerate(zip(definitions,values,adjusted)):
            v.update({'operation':d['operation'],'candidate':d['candidate'],'reference':d['reference'],
                      'n':d['n'],'holmPAll15':p,'holmPWithinTable':separate[i],'rejectAll15At05':p<.05})
        sensitivity[str(length)]=values
    primary=sensitivity[str(PRIMARY_LENGTH)]
    rows=[]
    for d,result in zip(definitions,primary):
        row={k:v for k,v in d.items() if k!='groups'}
        row.update(result);row['overheadPct']=100*(row['ratio']-1)
        row['conclusionStableAcrossLengths']=len({v[i]['rejectAll15At05'] for v in sensitivity.values()
                                                  for i in [len(rows)]})==1
        rows.append(row)
    methods={
        'estimand':'exp(mean per-round log(candidate/reference lifecycle)) conditional on both primary observations succeeding',
        'lifecycleDefinition':provenance['latencyDefinition'],
        'nullHypothesis':'Mean paired log ratio = 0 (geometric mean paired ratio = 1), two-sided',
        'bootstrap':'Circular moving blocks within each original/continuation segment, fixed observed sample count per segment; same paired ratio observations resampled',
        'primaryBlockLength':PRIMARY_LENGTH,'sensitivityBlockLengths':LENGTHS,'replicates':REPS,
        'confidenceInterval':'Pointwise 95% basic bootstrap interval on mean log-ratio, exponentiated; not Holm-adjusted',
        'rawP':'Two-sided equal-tail null-centered block-bootstrap test: min(1, 2*(min(upper,lower)+1)/(B+1)); centered replicate=bootstrap log-mean minus observed log-mean',
        'multiplicity':'Holm step-down across all 15 operation/comparison hypotheses in both tables. Separate 10/5 corrections are stored only as secondary diagnostics.',
        'assumptions':'Exploratory conditional inference. Requires approximate stationarity and sufficiently weak temporal dependence within each segment. Stratification fixes segment mix and does not eliminate network confounding or outcome-dependent missingness.',
        'interpretation':'These are public-network client lifecycle ratios, not pure FHE execution, causal overhead, uninterrupted-campaign results, or claims about the timed-out observation.',
        'seedNamespace':SEED_NAMESPACE,'python':sys.version,'numpy':np.__version__,
        'references':[
            'https://stat.ethz.ch/R-manual/R-patched/RHOME/library/boot/html/tsboot.html',
            'https://stat.ethz.ch/CRAN/web/packages/boot.pval/vignettes/boot_summary.html',
            'https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html']}
    result={'sourceReportSha256':hashlib.sha256(raw).hexdigest(),'methods':methods,'rows':rows,'sensitivity':sensitivity}
    (FOLDER/'paired-inference.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    # Update the original paired table only, keeping its caption/label/columns.
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
    for op in ['notarize','add','mul_scalar','mean','max']:
        lines += ['',r'\multirow{2}{*}{'+op.replace('_',r'\_')+'}']
        pair_rows=[x for x in rows if x['operation']==op and x['reference']=='baseline']
        shared_baseline=([p['run'] for p in pair_rows[0]['pairs']]==[p['run'] for p in pair_rows[1]['pairs']])
        for position,r in enumerate(pair_rows):
            name='Zama' if r['candidate']=='zama' else 'Fhenix';lo,hi=r['ci95']
            baseline_cell=(r'\multirow{2}{*}{'+integer(r['referenceMeanMs'])+'}' if position==0 else '') if shared_baseline else integer(r['referenceMeanMs'])
            lines.append('& '+name+' & '+baseline_cell+' & '+integer(r['candidateMeanMs'])+
                f" & {r['ratio']:.3f} & [{lo:.3f}, {hi:.3f}] & {r['overheadPct']:+.1f}\\% & "+p_latex(r['holmPAll15'])+r' \\')
        lines.append(r'\hline')
    lines += [r'\end{tabular}',r'\end{table*}',r"""
\noindent
Means are in milliseconds over the same round-matched successful primary
observations in each pair ($n=50$, except Zama \texttt{add}, $n=49$).
The two \texttt{add} baseline means differ because their matched round sets differ.
Lifecycle is the same sum of displayed components as in the preceding tables.
Ratios are geometric means of per-round lifecycle ratios, with overhead
$100(\mathrm{ratio}-1)\%$. The pointwise 95\% intervals are basic circular
block-bootstrap intervals on the mean log-ratio, transformed back to the ratio
scale (199999 replicates, block length 3). Blocks are resampled separately
within the original and continuation segments, preserving their sample counts.
Two-sided tests use the corresponding null-centered bootstrap distribution;
Holm adjustment covers all 15 comparisons across both tables. Intervals are
pointwise, not multiplicity-adjusted. These exploratory inferences are
conditional on successful observations and assumptions of approximate
within-segment stationarity and weak dependence; they do not identify causal
or isolated FHE computation effects.
% END GENERATED PAIRED LATENCY TABLE
"""]
    block='\n'.join(lines)
    second=r"""% BEGIN GENERATED ZAMA FHENIX TABLE
\begin{table*}[!t]
\caption{Paired latency comparison: Zama fhEVM versus Fhenix CoFHE}
\label{tab:zama-fhenix-lifecycle-comparison}
\centering
\footnotesize
\setlength{\tabcolsep}{5pt}
\begin{tabular}{|l|r|r|r|r|c|r|r|}
\hline
\textbf{Operation} &
\textbf{Pairs} &
\textbf{Fhenix Mean} &
\textbf{Zama Mean} &
\textbf{Paired Ratio} &
\textbf{95\% CI} &
\textbf{Overhead} &
\textbf{Holm \(p\)} \\
\hline
"""
    slines=[second]
    for r in [x for x in rows if x['reference']=='fhenix']:
        lo,hi=r['ci95']
        slines.append(r['operation'].replace('_',r'\_')+' & '+str(r['n'])+' & '+integer(r['referenceMeanMs'])+' & '+integer(r['candidateMeanMs'])+
            f" & {r['ratio']:.3f} & [{lo:.3f}, {hi:.3f}] & {r['overheadPct']:+.1f}\\% & "+p_latex(r['holmPAll15'])+r' \\')
    slines += [r'\hline',r'\end{tabular}',r'\end{table*}',r"""
\noindent
The ratio is Zama/Fhenix; positive overhead indicates a higher Zama lifecycle
latency on the matched observations. Means are in milliseconds. Pairing,
bootstrap and the joint 15-test Holm correction follow the preceding table.
The $n=49$ \texttt{add} comparison excludes the same historical failed Zama
primary observation from both sides of that pair.
% END GENERATED ZAMA FHENIX TABLE
"""]
    second_block='\n'.join(slines)
    file=FOLDER/'tables.tex';before=file.read_text(encoding='utf-8')
    start='% BEGIN GENERATED PAIRED LATENCY TABLE';end='% END GENERATED PAIRED LATENCY TABLE'
    left,tail=before.split(start,1);_,right=tail.split(end,1)
    after=left+block+right
    zstart='% BEGIN GENERATED ZAMA FHENIX TABLE';zend='% END GENERATED ZAMA FHENIX TABLE'
    if zstart in after:
        prefix,tail=after.split(zstart,1);_,suffix=tail.split(zend,1)
        after=prefix+second_block+suffix
    else: after+='\n'+second_block
    assert after.startswith(left)
    assert after.count(r'\label{tab:paired-lifecycle-comparison}')==1
    assert after.count(r'\label{tab:zama-fhenix-lifecycle-comparison}')==1
    assert after.count(r'\begin{table*}[!t]')==6
    file.write_text(after,encoding='utf-8')
    (FOLDER/'paired-comparisons-with-inference.tex').write_text(block+'\n\n'+second_block,encoding='utf-8')
    old=json.loads((FOLDER/'paired-table-values.json').read_text(encoding='utf-8'))
    for row in old['rows']:
        r=next(x for x in rows if x['operation']==row['operation'] and x['candidate']==row['platform'] and x['reference']=='baseline')
        assert abs(row['geometricMeanPairedRatio']-r['ratio'])<1e-12
        row.update({'confidenceInterval95':r['ci95'],'holmP':r['holmPAll15']})
    old['inference']=methods;old['inferenceArtifact']='paired-inference.json'
    (FOLDER/'paired-table-values.json').write_text(json.dumps(old,indent=2)+'\n',encoding='utf-8')
    notes=['# Paired lifecycle inference','',
        'Calculated at the user\'s explicit request after completion of the descriptive segmented analysis. Raw campaign reports are unchanged.','',
        'Estimand: geometric mean of round-matched lifecycle ratios. The lifecycle remains inputPreparationMs + confirmationMs + postReceiptToValidatedPlaintextMs, not the larger total including estimation/signing.',
        'Successful pairs only: 50 except comparisons involving Zama add, which use 49. Original and continuation segment sample counts stay fixed during resampling.','',
        'Primary inference: two-sided null-centered circular-block-bootstrap test on mean log-ratio, B=199999, block length=3. Basic 95% bootstrap intervals on the log scale are exponentiated. The displayed p-values are Holm-adjusted across all 15 hypotheses. CIs are pointwise.',
        'The raw two-sided Monte Carlo p-value has minimum resolution 2/(B+1)=0.00001. Values printed as <0.001 are bounded reports, never zeros. Repeated small values can reflect finite resampling resolution.',
        'Exploratory conditional inference assumes approximate within-segment stationarity and weak dependence; preserving segments is not a cure for network confounding or selective success. This is not a causal benchmark of isolated computation.','',
        '| Operation | Numerator / denominator | n | Ratio | Pointwise 95% CI | Holm p (15) | Reject at .05 | Stable for block lengths 1,2,3,5 |',
        '|---|---|---:|---:|---|---:|---|---|']
    for r in rows:
        notes.append(f"| {r['operation']} | {r['candidate']}/{r['reference']} | {r['n']} | {r['ratio']:.6f} | [{r['ci95'][0]:.6f}, {r['ci95'][1]:.6f}] | {r['holmPAll15']:.6g} | {r['rejectAll15At05']} | {r['conclusionStableAcrossLengths']} |")
    notes += ['', '## Block-length sensitivity','', '| Operation | Ratio | Block length | CI | Raw p | Holm p (15) |','|---|---|---:|---|---:|---:|']
    for length,values in sensitivity.items():
        for r in values:
            notes.append(f"| {r['operation']} | {r['candidate']}/{r['reference']} | {length} | [{r['ci95'][0]:.6f}, {r['ci95'][1]:.6f}] | {r['rawP']:.6g} | {r['holmPAll15']:.6g} |")
    notes += ['', '## Sources', '', *['- '+x for x in methods['references']], '',
              'Reproduction: run compute_paired_inference.py with the repository .venv Python. Seeds and every paired observation are in paired-inference.json.',
              'Source report SHA256: '+hashlib.sha256(raw).hexdigest()]
    (FOLDER/'paired-inference-methods.md').write_text('\n'.join(notes)+'\n',encoding='utf-8')
    assert REPORT.read_bytes()==raw
    print(json.dumps({'sourceUnchanged':True,'replicates':REPS,'holmFamily':15,'results':[
        {k:r[k] for k in ['operation','candidate','reference','n','ratio','ci95','rawP','holmPAll15','conclusionStableAcrossLengths']} for r in rows]},indent=2))

if __name__=='__main__':main()
