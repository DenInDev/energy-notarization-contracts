import hashlib, importlib.util, json, statistics
from pathlib import Path
root=Path('logs/energy-isolated-validation-2026-10-23')
raw=(root/'report.json').read_bytes(); r=json.loads(raw)
assert r.get('complete') is True, 'Pilot not complete'
assert len(r['samples'])==30 and all(s['status']=='ok' for s in r['samples'])
assert len({w['pid'] for w in r['workers'].values()})==3
assert len({s['transactionHash'] for s in r['samples']} | {s['transactionHash'] for s in r['setup']})==33
spec=importlib.util.spec_from_file_location('lifecycle',Path('scripts/analysis/analyze-lifecycle.py'))
analysis=importlib.util.module_from_spec(spec);spec.loader.exec_module(analysis)
analysis.validate_isolated_rows(r,r['samples'])
for b in r['barriers']:
    rows=[s for s in r['samples'] if (s['run'],s['operation'],s['warmup'])==(b['run'],b['operation'],b['warmup'])]
    assert len(rows)==3
    for s in rows:
        assert s['preparedTransactionHash']==b['prepared'][s['platform']]['hash']==s['transactionHash']
        assert s['preparedMaxFeePerGasWei']==b['fees']['maxFeePerGas']
        assert s['preparedMaxPriorityFeePerGasWei']==b['fees']['maxPriorityFeePerGas']
        assert abs(s['confirmationMs']+s['postReceiptToValidatedPlaintextMs']-s['transactionToValidatedPlaintextMs'])<0.01
        assert int(s['gasCostWei'])==int(s['gasUsed'])*int(s['effectiveGasPriceWei'])
measured=[s for s in r['samples'] if not s['warmup']]
rows=[{'platform':s['platform'],'operation':s['operation'],'preparationMs':s['preparationMs'],
       'transactionPreparationMs':s['transactionPreparationMs'],'barrierWaitMs':s['barrierWaitMs'],
       'invokeMs':next(t['durationMs'] for t in s['stages'] if t['stage']=='transaction.invoke_sign_and_submit'),
       'broadcastAckMs':s['broadcastAckMs'],'receiptMs':s['confirmationMs'],
       'postReceiptMs':s['postReceiptToValidatedPlaintextMs'],'validatedMs':s['transactionToValidatedPlaintextMs']}
      for s in measured]
barriers=[b for b in r['barriers'] if not b['warmup']]
same=sum(len({s['blockHash'] for s in measured if s['operation']==b['operation']})==1 for b in barriers)
wei=sum(int(s['gasCostWei']) for s in r['samples']+r['setup'])
result={'sourceReportSha256':hashlib.sha256(raw).hexdigest(),'purpose':'One-round protocol validation, not statistical performance evaluation',
        'executionMode':r['executionMode'],'measuredValid':15,'warmupValid':15,
        'workerPids':{p:w['pid'] for p,w in r['workers'].items()},'platformOwners':r['platformOwners'],
        'sameBlockTriples':same,'measuredTriples':5,
        'broadcastStartSpreadsMs':[b['broadcastStartSpreadMs'] for b in barriers],
        'baselineBroadcastAckMeanMs':statistics.mean(s['broadcastAckMs'] for s in measured if s['platform']=='baseline'),
        'readyRepeatFailures':sum(bool(s.get('readyDecryptError')) for s in measured),
        'gasCostWei':str(wei),'gasCostEth':f'{wei//10**18}.{wei%10**18:018d}','rows':rows,
        'notes':['Signing/estimation and encryption precede the common barrier. Intentional barrier waiting is recorded separately and excluded from completion.',
                 'Receipt is observed inclusion, not isolated EVM execution; post-receipt includes retrieval, authorization and SDK waits.',
                 'One measured round provides validation evidence, not confidence intervals or a controlled causal performance comparison.',
                 'This validation uses saved accounts user-4/user-5/user-6. Earlier interrupted pilots and their unacknowledged hashes remain retained without retransmission.']}
(root/'pilot-validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
lines=['# Isolated-process pilot validation','',f"15/15 measured observations and 15/15 warmups validated. Three distinct worker processes. Ready-repeat failures: {result['readyRepeatFailures']}.",'',
       '| Platform | Operation | Preparation ms | Barrier wait ms (excluded) | Broadcast ack ms | Receipt ms | Post-receipt ms | Validated ms |',
       '|---|---|---:|---:|---:|---:|---:|---:|']
for s in rows:
    lines.append(f"| {s['platform']} | {s['operation']} | {s['preparationMs']:.1f} | {s['barrierWaitMs']:.1f} | {s['broadcastAckMs']:.1f} | {s['receiptMs']:.1f} | {s['postReceiptMs']:.1f} | {s['validatedMs']:.1f} |")
lines+=['',f"Measured broadcast-start spreads: {result['broadcastStartSpreadsMs']} ms. Same-block triples: {same}/5.",
        f"Actual gas including deployment and warmup: {result['gasCostEth']} Sepolia ETH.",'']
lines += ['- '+x for x in result['notes']]
(root/'pilot-validation.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
assert hashlib.sha256((root/'report.json').read_bytes()).hexdigest()==result['sourceReportSha256']
print(json.dumps({k:v for k,v in result.items() if k not in ['rows','notes','platformOwners']},indent=2))
