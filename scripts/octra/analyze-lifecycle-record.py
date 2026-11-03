"""Consolidate the Octra feasibility trial without erasing failed attempts."""
import csv
from decimal import Decimal
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'logs/octra-lifecycle-once-2026-11-02'
CONT = Path(str(BASE) + '-continuation1')
FINAL = Path(str(BASE) + '-final-recheck')
EXTRA = Path(str(BASE) + '-add-final')
OUT = Path(str(BASE) + '-results')


def load(p):
    return json.loads(p.read_text(encoding='utf-8'))


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def export(name, rows, fields):
    with (OUT / name).open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        w.writeheader(); w.writerows(rows)


def main():
    OUT.mkdir(exist_ok=True)
    old, cont, obs, extra = (load(p) for p in [BASE/'report.json',CONT/'report.json',
                                               FINAL/'observations.json',EXTRA/'report.json'])
    if extra['status'] in ['preflight','broadcast_started','acknowledged']:
        raise RuntimeError('Final bounded addition attempt is still running')
    recovery = load(EXTRA/'reconciliation.json')
    extra_chain_status = recovery.get('state',{}).get('status','unknown')
    assert sha(BASE/'report.json') == cont['continuation']['sourceReportSha256']
    assert cont['samples'][:len(old['samples'])] == old['samples']
    for filename, digest in cont['evidenceHashes'].items():
        assert sha(Path(filename)) == digest, filename
    states = {t['label']:t for t in obs['transactionObservations']}
    rows = []
    for s in cont['samples']:
        row = dict(s)
        row.setdefault('attempt',1)
        label = row.get('label') or row['operation']
        row['reconciledChainStatus'] = states.get(label,{}).get('status','unknown')
        rows.append(row)
    rows.append(dict(extra,operation='add',attempt=3,
                     reconciledChainStatus=extra_chain_status))
    export('state-changing-attempts.csv',rows,
           ['operation','attempt','status','reconciledChainStatus','correct','plaintext','hash',
            'transactionHash','nonce','declaredOU','feeOU','receiptEffort','inputPreparationMs',
            'signingMs','broadcastAckMs','transactionToReceiptMs','ciphertextRetrievalMs',
            'deserializeMs','decryptionMs','postReceiptToValidatedPlaintextMs',
            'transactionToValidatedPlaintextMs','derivedLifecycleMs','error'])
    diagnostics=[]
    for folder in [Path(str(BASE)+'-final'),FINAL]:
        for row in load(folder/'observations.json')['diagnostics']:
            diagnostics.append(dict(row,sourceReport=str(folder/'observations.json')))
    export('read-only-diagnostics.csv',diagnostics,
           ['name','mode','status','expectedPlaintext','plaintext','correct','rpcMs','deserializeMs',
            'decryptionMs','totalToValidatedMs','elapsedMs','error','sourceReport'])
    confirmed=[t for t in obs['transactionObservations'] if t['status']=='confirmed']
    fees=sum(int(t['declaredOU']) for t in confirmed)
    extra_confirmed=extra_chain_status=='confirmed' and recovery.get('receipt',{}).get('success')
    if extra_confirmed:
        fees+=int(extra['declaredOU'])
    final_balance=recovery.get('balanceAfter',obs['balanceAfter'])
    delta=int(cont['balanceBeforeSend']['balance_raw'])-int(final_balance['balance_raw'])
    notarize=next(s for s in old['samples'] if s['operation']=='notarize' and s['status']=='ok')
    late=next((d for d in obs['diagnostics'] if d['name']=='late_scalar_result' and d.get('correct')),None)
    scalar=states['mul_scalar']
    assert scalar['status']=='confirmed' and scalar['receipt']['success'] is True
    assert late is not None and recovery.get('correct') is True
    assert fees==delta
    assert [t['nonce'] for t in confirmed]+[extra['nonce']]==[7,8,9,10]
    mean=next((d for d in obs['diagnostics'] if d['name']=='mean_even_field_view'),{})
    summary=[
      dict(operation='notarize',mode='state_changing',status='validated',plaintext='43',nPrimaryLatency=1,
           transactionToReceiptMs=notarize['transactionToReceiptMs'],
           postReceiptToValidatedPlaintextMs=notarize['postReceiptToValidatedPlaintextMs'],
           transactionToValidatedPlaintextMs=notarize['transactionToValidatedPlaintextMs'],
           feeOCT='0.001',effort=notarize['receiptEffort']),
      dict(operation='add',mode='state_changing_late_validation',status=extra_chain_status,plaintext=recovery.get('plaintext',''),
           nPrimaryLatency=0,attempts=3,
           transactionToReceiptMs=extra.get('transactionToReceiptMs'),
           postReceiptToValidatedPlaintextMs=extra.get('postReceiptToValidatedPlaintextMs'),
           transactionToValidatedPlaintextMs=extra.get('transactionToValidatedPlaintextMs'),
           feeOCT=str(Decimal(extra['declaredOU'])/Decimal(1000000)) if extra_confirmed else '',
           effort=recovery.get('receipt',{}).get('effort'),readOnlyPlaintext='85',
           scope='Correctness recovered after malformed RPC response; primary latency unavailable'),
      dict(operation='mul_scalar',mode='state_changing_late_validation',status=scalar['status'],
           plaintext=late.get('plaintext','') if late else '',nPrimaryLatency=0,
           feeOCT='2.56' if scalar['status']=='confirmed' else '',
           effort=scalar.get('receipt',{}).get('effort'),
           scope='Correctness recovered after logging failure; primary latency unavailable'),
      dict(operation='mean',mode='read_only_field_candidate',status=mean.get('status','not_observed'),
           plaintext=mean.get('plaintext',''),nPrimaryLatency=0,feeOCT='0',rpcMs=mean.get('rpcMs'),
           scope='Even-sum candidate only; not general floor integer division'),
      dict(operation='max',mode='compiler_probe',status='unsupported_by_live_compiler',nPrimaryLatency=0,
           scope='fhe_max unknown; numeric max rejects cipher; no execution claimed')]
    export('operation-summary.csv',summary,
           ['operation','mode','status','plaintext','nPrimaryLatency','attempts','feeOCT','effort',
            'transactionToReceiptMs','postReceiptToValidatedPlaintextMs',
            'transactionToValidatedPlaintextMs','rpcMs','readOnlyPlaintext','scope'])
    audit=dict(allFiveEquivalentOperationsCompleted=False,
               originalReportUnchanged=True,originalSamplePrefixUnchanged=True,
               sourceAndRunnerHashesVerified=True,originalReportSha256=sha(BASE/'report.json'),
               continuationReportSha256=sha(CONT/'report.json'),
               finalReconciliationSha256=sha(FINAL/'observations.json'),finalAdditionSha256=sha(EXTRA/'report.json'),
               finalAdditionRecoverySha256=sha(EXTRA/'reconciliation.json'),
               confirmedTransactionsIncludingDeployment=len(confirmed)+int(bool(extra_confirmed)),
               confirmedEncryptedOperationCorrectnessChecks=1+int(late is not None)+int(recovery.get('correct') is True),
               validPrimaryLatencyObservations=1,
               originalAdditionRejections=2,finalAdditionStatus=extra_chain_status,
               finalAdditionLatePlaintextValidated=recovery.get('correct') is True,
               finalAdditionPrimaryLatencyAvailable=False,
               scalarChainStatus=scalar['status'],scalarLatePlaintextValidated=late is not None,
               scalarPrimaryLatencyAvailable=False,
               confirmedNativeFeesOU=str(fees),confirmedNativeFeesOCT=str(Decimal(fees)/Decimal(1000000)),
               nativeBalanceBeforeOCT=cont['balanceBeforeSend']['balance'],nativeBalanceAfterOCT=final_balance['balance'],
               nativeBalanceDeltaOU=str(delta),confirmedFeesReconcileWithBalance=fees==delta,
               finalConfirmedNonce=final_balance['nonce'],finalPendingNonce=final_balance['pending_nonce'],
               statistics='No inference; single observations and retained targeted retries')
    (OUT/'completion-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
    (OUT/'analysis.json').write_text(json.dumps(dict(audit=audit,operations=summary,
        primaryAttempts=rows,readOnlyDiagnostics=diagnostics,
        localMeanChecks=load(BASE/'local-checks.json')['cases']),indent=2)+'\n',encoding='utf-8')
    lines=['# Octra encrypted workload: single-trial experimental record','',
      '**All five equivalent state-changing operations did not complete.** Failures, targeted retries, '
      'late correctness recovery and compiler limits are retained separately.','',
      'Program: `'+cont['contractAddress']+'` on **Octra devnet**.','',
      '| Operation | Outcome | Plaintext | Primary latency availability |',
      '|---|---|---:|---|']
    for row in summary:
        lines.append('| '+row['operation']+' | '+row['mode']+': '+row['status']+' | '+str(row.get('plaintext','--'))+
                     ' | '+('n=1' if row['nPrimaryLatency'] else 'unavailable / not applicable')+' |')
    lines+=['','## Primary timing observations','',
      '| Operation | Tx to observed receipt ms | Receipt to validation ms | Tx to validated plaintext ms | Native fee OCT | VM effort |',
      '|---|---:|---:|---:|---:|---:|']
    for row in summary:
        if row['nPrimaryLatency']:
            lines.append('| %s | %.3f | %.3f | %.3f | %s | %s |'%(row['operation'],
                row['transactionToReceiptMs'],row['postReceiptToValidatedPlaintextMs'],
                row['transactionToValidatedPlaintextMs'],row['feeOCT'],row['effort']))
    lines+=['','These are individual observations, not means. No CV, confidence interval or p-value is estimated. '
      'The successful values are not statistically paired with the Sepolia campaign. Input encryption and '
      'serialization, signing, broadcast acknowledgment, retrieval and decryption are retained in the CSV. '
      'Key setup and registration checks are separate. Post-receipt time includes RPC and client validation, '
      'not isolated FHE computation. Small report-write gaps between stages are excluded from summed components.','',
      '## Failures and reconciliation','',
      'Addition at 1,500,000 OU and 2,560,000 OU was rejected with '
      '`program_exec_failed / execution reverted`. A final 2,570,000-OU attempt is recorded separately. '
      'It confirmed with receipt effort 2,560,073, 73 above the preceding allowance. This is consistent '
      'with the preceding allowance being insufficient. Its observer stopped on a malformed JSON RPC '
      'response; late ciphertext validation confirmed 85, and no primary latency was reconstructed. '
      'All earlier failures and observation interruptions remain in the raw data.','',
      'Scalar submission was acknowledged, then a Windows EPERM atomic-file-rename error interrupted '
      'the local observer. Its existing hash was later confirmed and the persisted result decrypted to 129. '
      'It was never automatically replayed. Late validation is correctness evidence; no original primary '
      'latency was reconstructed. Raw report snapshots are retained under the continuation logging-recovery folder.','',
      'The confirmed scalar receipt used 2,542,977 VM effort. The confirmed addition used '
      '2,560,073, explaining why a 2,560,000-OU bound was too tight for that observed execution.','',
      '## Mean and maximum limits','',
      'PVAC field arithmetic is not euint16/euint64 wrapping arithmetic. Synthetic reading 43 is '
      'client-range-checked to 16 bits; initial total is encrypted 42 and scalar is 3. This prototype '
      'implements no on-chain input range proof or equivalent-security claim. The raw sample flag '
      '`equivalentGeneralIntegerSemantics` is a prototype tag, not a validated claim of general '
      'unsigned-64 wrapping equivalence; the analysis restricts correctness to the observed small-value fixtures.','',
      '`fhe_div_const` multiplies by a modular inverse in F_(2^127-1). The local even case (43+85)/2 '
      'gives 64, but (42+17)/2 gives 85070591730234615865843651857942052893 rather than floor integer 29. '
      'The even case was also validated online in a read-only call. It is not counted as a state-changing '
      'general integer mean. Online odd-case failures are retained; the integer counterexample is local.','',
      'The live compiler rejects `fhe_max` as unknown and ordinary `max` on ciphertexts. No fake no-op '
      'maximum, plaintext computation or re-encryption is substituted. This is a limit of the exposed '
      'compiler surface, not an impossibility theorem for Octra.','',
      '## Native fees','',
      'Confirmed fees including deployment: **'+audit['confirmedNativeFeesOCT']+' OCT**.',
      'Native balance: **'+audit['nativeBalanceBeforeOCT']+' -> '+audit['nativeBalanceAfterOCT']+' OCT**.',
      'Confirmed fees exactly reconcile with observed balance delta: **'+str(fees==delta)+'**.','',
      'Native fees are OU (1 OCT = 1,000,000 OU); receipt VM effort is a distinct metric. Neither is '
      'Ethereum gas. Rejected declared allowances are not counted as fees paid merely because submitted.','',
      '## Read-only diagnostics','']
    for row in diagnostics:
        lines.append('- `'+row['name']+'`: '+row['status']+'; plaintext='+str(row.get('plaintext','unavailable'))+
                     '; RPC='+str(row.get('rpcMs','unavailable'))+' ms; '+str(row.get('error','')))
    lines+=['','RPC resource errors, HTTP rate-limit responses, malformed-response failures and retries '
      'are retained in the raw traces. Read-only computations do not replace confirmed state-changing observations.','',
      '## Artifacts','',
      '- `operation-summary.csv`: scope-labeled results for all five requested operations.',
      '- `state-changing-attempts.csv`: every measured attempt, including failed additions and logging interruption.',
      '- `read-only-diagnostics.csv`: all view attempts, including failures.',
      '- `analysis.json` and `completion-audit.json`: complete descriptive results, hashes and fee reconciliation.',
      '- Original raw report: `'+str(BASE/'report.json')+'`.',
      '- Raw continuation: `'+str(CONT/'report.json')+'`.',
      '- Final read-only reconciliation: `'+str(FINAL/'observations.json')+'`.',
      '- Final addition attempt: `'+str(EXTRA/'report.json')+'`.','',
      '- Final addition late reconciliation: `'+str(EXTRA/'reconciliation.json')+'`.','',
      'Original reports and sample prefixes are unchanged; no timings or outcomes were repaired. '
      'Private keys are held only in ignored account files and absent from public artifacts.','',
      'Sources: https://docs.octra.org/developer-docs/applied-cheatsheet and '
      'https://github.com/octra-labs/lite_node/tree/'+cont['nodeSourceCommit']]
    (OUT/'analysis.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    artifacts=[BASE/'report.json',CONT/'report.json',FINAL/'observations.json',EXTRA/'report.json',EXTRA/'reconciliation.json']+[
      OUT/n for n in ['analysis.md','analysis.json','completion-audit.json','operation-summary.csv',
                       'state-changing-attempts.csv','read-only-diagnostics.csv']]
    (OUT/'artifact-sha256.json').write_text(json.dumps({str(p.relative_to(ROOT)):sha(p) for p in artifacts},indent=2)+'\n',encoding='utf-8')
    print(json.dumps(audit,indent=2))


if __name__=='__main__':
    main()
