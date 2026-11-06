"""Descriptive final audit of an interrupted, completed execution. No RPC or mutations."""
import collections
import copy
import datetime as dt
from decimal import Decimal
import hashlib
import json
import math
import pathlib
import statistics

root = pathlib.Path.cwd()
journal = json.loads((root/'logs/energy-active-campaign.json').read_text(encoding='utf-8-sig'))
file = pathlib.Path(journal['report'])
folder = file.parent
raw = file.read_bytes()
report = json.loads(raw)
source_bytes = pathlib.Path(journal['sourceReport']).read_bytes()
source = json.loads(source_bytes)
segment = report['continuations'][-1]
index = json.loads((folder/'final-latency-snapshot-index.json').read_text(encoding='utf-8-sig'))
base = json.loads((pathlib.Path(index['artifactDir'])/'latencies.json').read_text(encoding='utf-8'))
sha = lambda b: hashlib.sha256(b).hexdigest()
assert sha(raw) == base['snapshotSha256']
assert sha(source_bytes) == journal['sourceReportSha256'] == segment['sourceReportSha256']
assert sha(source_bytes) == '846aa7bca53ea2aea36398d878f6ae14a52a0a1908a4083db9e09ebdc18064aa'
assert report['executionComplete'] is True and segment['status'] == 'finished' and report['complete'] is False
assert report['samples'][:111] == source['samples'] and report['setup'] == source['setup']
assert len(report['samples']) == 765 and len(report['samples'][111:]) == 654
assert all(s['status'] == 'ok' for s in report['samples'][111:])
assert all(sha((root/f).read_bytes()) == h for f,h in segment['sourceSha256'].items())
platforms = ['baseline','zama','fhenix']
ops = ['notarize','add','mul_scalar','mean','max']
primary = [s for s in report['samples'] if not s['warmup']]
warmup = [s for s in report['samples'] if s['warmup']]
assert len(primary) == 750 and len(warmup) == 15 and all(s['status'] == 'ok' for s in warmup)
assert {(s['platform'],s['run'],s['operation']) for s in primary} == {
    (p,run,op) for p in platforms for run in range(1,51) for op in ops}
assert sum(s['status']=='ok' for s in primary) == 749
failure = [s for s in primary if s['status']=='error']
assert len(failure)==1 and (failure[0]['platform'],failure[0]['run'],failure[0]['operation'])==('zama',7,'add')
assert 'confirmationMs' not in failure[0] and 'transactionToValidatedPlaintextMs' not in failure[0]
assert len(report['barriers']) == 255
for p in platforms:
    rows = [s for s in report['samples'] if s['platform']==p]
    assert [s['transactionNonce'] for s in rows] == list(range(12,267))
for i,s in enumerate(report['samples']):
    workers = segment['previousWorkers'] if i < 111 else report['workers']
    assert s['workerPid'] == workers[s['platform']]['pid']
    assert s['transactionHash'] == s['preparedTransactionHash'] and s['broadcastState']=='acknowledged'
    if s['status']=='ok':
        assert s['plaintext']==s['expectedPlaintext']
        assert abs(s['confirmationMs']+s['postReceiptToValidatedPlaintextMs']-s['transactionToValidatedPlaintextMs'])<.01
for barrier in report['barriers']:
    rows = [s for s in report['samples'] if (s['warmup'],s['run'],s['operation']) ==
            (barrier['warmup'],barrier['run'],barrier['operation'])]
    assert len(rows)==3
    assert all(s['preparedMaxFeePerGasWei']==barrier['fees']['maxFeePerGas'] and
               s['preparedMaxPriorityFeePerGasWei']==barrier['fees']['maxPriorityFeePerGas'] for s in rows)
    ready = max(dt.datetime.fromisoformat(x['at'].replace('Z','+00:00')) for x in barrier['prepared'].values())
    assert all(dt.datetime.fromisoformat(s['broadcastStartedAt'].replace('Z','+00:00'))>=ready for s in rows)

def stats(values):
    a=sorted(values)
    return {'n':len(a),'mean':statistics.mean(a) if a else None,'median':statistics.median(a) if a else None,
            'min':min(a) if a else None,'max':max(a) if a else None}

def metric(s,key):
    if key=='clientWorkMs': return s['preparationMs']+s['transactionToValidatedPlaintextMs']
    return s[key]

pairwise=[]
for op in ops:
    for a,b in [('zama','baseline'),('fhenix','baseline'),('zama','fhenix')]:
        pairs=[]
        for run in range(1,51):
            x=next(s for s in primary if s['run']==run and s['operation']==op and s['platform']==a)
            y=next(s for s in primary if s['run']==run and s['operation']==op and s['platform']==b)
            if x['status']==y['status']=='ok': pairs.append((x,y))
        pairwise.append({'operation':op,'difference':a+'-'+b,
                         'metricsMs':{k:stats(metric(x,k)-metric(y,k) for x,y in pairs) for k in
                         ['confirmationMs','postReceiptToValidatedPlaintextMs','transactionToValidatedPlaintextMs','clientWorkMs']},
                         'gasCostDifferenceWei':stats(int(x['gasCostWei'])-int(y['gasCostWei']) for x,y in pairs)})

# Supplement only missing block metadata; never touch the historical sample in
# the raw report or supply its absent observed receipt/completion latency.
derived = copy.deepcopy(report)
patches=[]
for s in derived['samples']:
    if s['warmup'] or s.get('blockHash'): continue
    evidence=segment['supplementaryReceipts'][s['transactionHash']]
    receipt=evidence['receipt']
    assert int(receipt['status'],16)==1 and receipt['transactionHash']==s['transactionHash']
    for key,value in [('blockHash',receipt['blockHash']),('blockNumber',int(receipt['blockNumber'],16))]:
        assert key not in s
        s[key]=value
    patches.append({'transactionHash':s['transactionHash'],'run':s['run'],'operation':s['operation'],
                    'platform':s['platform'],'fields':['blockHash','blockNumber'],
                    'evidence':'continuations[-1].supplementaryReceipts','receiptObservedSeparatelyAt':evidence['observedAt']})
assert len(patches)==1
for before,after in zip(report['samples'],derived['samples']):
    removed={k:v for k,v in after.items() if k in before}
    assert removed==before
    assert set(after)-set(before) <= {'blockHash','blockNumber'}
derived['supplementaryBlockMetadataProvenance']={'rawReport':str(file),'rawSha256':sha(raw),
    'sourceReportSha256':sha(source_bytes),'patches':patches,
    'purpose':'Block inclusion only; original complete=false, failure and absent timing retained'}
supplement=folder/'supplementary-block-inclusion'
supplement.mkdir(exist_ok=True)
derived_path=supplement/'report.block-metadata-only.json'
derived_path.write_text(json.dumps(derived,indent=2)+'\n',encoding='utf-8')
(supplement/'provenance.json').write_text(json.dumps(derived['supplementaryBlockMetadataProvenance'],indent=2)+'\n',encoding='utf-8')

# Cost inventory uses receipt gasUsed * effectiveGasPrice, not fee caps. Every
# transaction is counted exactly once, including deployments and failed timing.
deploy=json.loads((folder/'deployment-receipt-audit.json').read_text(encoding='utf-8'))
inventory=[]
for entry in deploy['receipts']:
    inventory.append({'platform':entry['platform'],'category':'deployment','segment':0,
       'transactionHash':entry['transactionHash'],'gasUsed':int(entry['gasUsed'],16),
       'effectiveGasPriceWei':str(int(entry['effectiveGasPrice'],16)),
       'gasCostWei':str(int(entry['gasUsed'],16)*int(entry['effectiveGasPrice'],16)),
       'receiptSource':'deployment-receipt-audit.json'})
for i,s in enumerate(report['samples']):
    if 'gasUsed' in s:
        gas=int(s['gasUsed']); price=int(s['effectiveGasPriceWei']); cost=gas*price
        assert cost==int(s['gasCostWei']) and s['receiptStatus']==1
        receipt_source='raw primary/warmup receipt fields'
    else:
        receipt=segment['supplementaryReceipts'][s['transactionHash']]['receipt']
        gas=int(receipt['gasUsed'],16);price=int(receipt['effectiveGasPrice'],16);cost=gas*price
        receipt_source='late supplementary receipt; no latency reconstructed'
    inventory.append({'platform':s['platform'],'operation':s['operation'],'run':s['run'],
       'category':'warmup' if s['warmup'] else 'measured','primaryStatus':s['status'],
       'segment':0 if i<111 else 1,'transactionHash':s['transactionHash'],
       'gasUsed':gas,'effectiveGasPriceWei':str(price),'gasCostWei':str(cost),'receiptSource':receipt_source})
assert len(inventory)==len({x['transactionHash'] for x in inventory})==768
eth=lambda wei: format(Decimal(wei)/Decimal(10**18),'.18f')
costs=[]
for p in platforms:
    entries=[x for x in inventory if x['platform']==p]
    parts={k:sum(int(x['gasCostWei']) for x in entries if x['category']==k) for k in ['deployment','warmup','measured']}
    total=sum(parts.values())
    costs.append({'platform':p,'receipts':len(entries),'partsWei':{k:str(v) for k,v in parts.items()},
                  'totalWei':str(total),'totalEth':eth(total),'gasUsed':sum(x['gasUsed'] for x in entries)})
cost_by_op=[]
for p in platforms:
    for op in ops:
        rows=[x for x in inventory if x['platform']==p and x.get('operation')==op and x['category']=='measured']
        cost_by_op.append({'platform':p,'operation':op,'gasUsed':stats(x['gasUsed'] for x in rows),
                           'gasCostWei':stats(int(x['gasCostWei']) for x in rows)})

polling=collections.defaultdict(collections.Counter)
event_gaps=collections.defaultdict(list)
retries=collections.defaultdict(collections.Counter)
backoffs=collections.defaultdict(list)
http=collections.defaultdict(collections.Counter)
for i,s in enumerate(report['samples']):
    scope=f"segment{0 if i<111 else 1}/{s['platform']}/{'warmup' if s['warmup'] else 'measured'}"
    last_events={}
    for stage in sorted(s['stages'],key=lambda x:x['startMs']):
        d=stage.get('detail',{});name=stage['stage']
        for field in ['retryAfterMs','intervalMs']:
            if field in d: polling[scope+'/'+name+'/'+field][str(d[field])]+=1
        if 'httpStatus' in d: http[scope+'/'+name][str(d['httpStatus'])]+=1
        if name.endswith('retry_backoff') and stage['status']=='ok': backoffs[scope+'/'+name].append(stage['durationMs'])
        elif 'retry' in name and stage['status']=='event': retries[scope][name]+=1
        if name in ['completion.sdk_poll','already_ready.sdk_poll','completion.sdk_progress','already_ready.sdk_progress']:
            key=(name,d.get('jobId',d.get('requestId','')))
            if key in last_events: event_gaps[scope+'/'+name].append(stage['startMs']-last_events[key])
            last_events[key]=stage['startMs']

counts_by_segment=[]
for n,rows in [(0,report['samples'][:111]),(1,report['samples'][111:])]:
    for p in platforms:
        for w in [False,True]:
            a=[s for s in rows if s['platform']==p and s['warmup']==w]
            counts_by_segment.append({'segment':n,'platform':p,'warmup':w,'attempted':len(a),
              'success':sum(s['status']=='ok' for s in a),'failed':sum(s['status']=='error' for s in a),
              'readyRepeatSuccess':sum('alreadyReadyDecryptMs' in s and not s.get('readyDecryptError') for s in a),
              'readyRepeatFailed':sum(bool(s.get('readyDecryptError')) for s in a)})
barrier_stats={str(w):stats(b['broadcastStartSpreadMs'] for b in report['barriers'] if b['warmup']==w) for w in [False,True]}
audit={'checkedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'rawReportSha256':sha(raw),
       'sourceReportSha256':sha(source_bytes),'sourcePrefixUnchanged':True,'sourceBytesUnchanged':True,
       'deploymentsAndWarmupsUnchanged':True,'uniquePlannedMeasuredSamples':750,'newPrimarySuccesses':654,
       'primarySuccesses':749,'retainedFailures':1,'warmupSuccesses':15,'receiptInventoryCount':768,
       'continuationCodeHashesUnchanged':True,'perSegmentWorkerIdentitiesVerified':True,
       'preparedHashAndAcknowledgementsVerified':True,'sharedFeesAndPreparedBarrierVerified':True,
       'noncesVerifiedPerPlatform':[12,266],'recoveryExcludedFromTimings':True,
       'supplementaryBlockCopy':str(derived_path),'blockPatches':patches}
(folder/'completion-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
analysis={**base,'purpose':'Final descriptive segmented analysis; all operations attempted, historical failure retained',
          'provisional':False,'countsBySegmentPlatformAndWarmup':counts_by_segment,
          'pairwiseSuccessfulDifferences':pairwise,'gasCostsByPlatform':costs,'gasCostsByOperation':cost_by_op,
          'gasReceiptInventory':inventory,'totalGasCostWei':str(sum(int(x['gasCostWei']) for x in inventory)),
          'totalGasCostEth':eth(sum(int(x['gasCostWei']) for x in inventory)),
          'polling':{'hintHistograms':{k:dict(v) for k,v in polling.items()},
                     'observedCallbackGapMs':{k:stats(v) for k,v in event_gaps.items()},
                     'retryEvents':{k:dict(v) for k,v in retries.items()},
                     'measuredRetryBackoffMs':{k:stats(v) for k,v in backoffs.items()},
                     'observedHttpStatus':{k:dict(v) for k,v in http.items()},
                     'rateLimitFailuresRecorded':sum('429' in s.get('error','') or '429' in s.get('readyDecryptError','') for s in report['samples']),
                     'http429ResponsesObserved':sum(v.get('429',0) for v in http.values()),
                     'scope':'Raw sample telemetry including warmup, phase/segment separated. Zama HTTP status coverage is partial; no global absence claim. SDK polling hints are not measured sleeps; callback gaps include network and processing.'},
          'broadcastStartSpreadMs':barrier_stats,'lateRecoveries':segment['recoveries'],
          'audit':audit,'supplementaryBlockMetadataReport':str(derived_path)}
(folder/'segmented-analysis.json').write_text(json.dumps(analysis,indent=2)+'\n',encoding='utf-8')
f=lambda x:'—' if x is None else f'{x/1000:.3f}'
lines=['# Analisi finale descrittiva per segmenti','',
       '**Tutte le operazioni previste sono state tentate: 749/750 risultati primari validi, 15/15 warmup validi.**',
       'Continuazione: 654/654 nuove osservazioni valide. Baseline 250/250, Zama 249/250, Fhenix 250/250. '
       'Resta il timeout storico Zama add, run 7: ricevuta non osservata entro 180 s. Ricevuta tardiva e plaintext 364 sono recuperi separati. '
       '`executionComplete=true`, `complete=false`.','',
       'Statistiche descrittive di una campagna interrotta e ripresa; nuovi processi/sessioni SDK, stesso protocollo isolato. '
       'Nessun p-value o pretesa di campagna ininterrotta tutta valida. I dettagli per segmento, singoli campioni e stadi sono nel JSON.','',
       '## Latenze medie in secondi — successi primari, esclusi warmup','',
       '| Operazione | Piattaforma | n | Preparazione | Ricevuta | Dopo ricevuta | Invio→plaintext | Totale client | Già pronto (n) |',
       '|---|---|---:|---:|---:|---:|---:|---:|---:|']
for row in base['allAttemptsSummary']:
    m=row['primarySuccessMetrics'];ready=m['alreadyReadyDecryptMs']
    lines.append('| '+' | '.join([row['operation'],row['platform'],str(row['success']),
        *[f(m[k]['meanMs']) for k in ['preparationMs','confirmationMs','postReceiptToValidatedPlaintextMs',
          'transactionToValidatedPlaintextMs','clientWorkMs']],f(ready['meanMs'])+f" ({ready['n']})"])+' |')
lines += ['', 'Ricevuta = invio → osservazione inclusione, non finalità. Dopo ricevuta include getter canonico, autorizzazione, SDK/servizi/polling e validazione; non è solo calcolo FHE. '
          'Totale client = preparazione + invio→plaintext, esclusa l’attesa intenzionale alla barriera. '
          'Worker-start→plaintext include la barriera; worker wall include anche la seconda decryption. '
          'Già pronto è una ripetizione success-only separata: Zama 249 successi, Fhenix 250, nessun errore. '
          'Il timeout storico non riceve una latenza ricostruita. Ricevute con latenza osservata: 749/750; ricevute effettive incluse nel costo: 750/750.','',
          '## Costi effettivi ETH — ricevute confermate','',
          '| Piattaforma | Ricevute | Deployment | Warmup | Misure (incluso fallimento storico) | Totale ETH |',
          '|---|---:|---:|---:|---:|---:|']
for c in costs:
    lines.append('| '+' | '.join([c['platform'],str(c['receipts']),*[eth(int(c['partsWei'][k])) for k in ['deployment','warmup','measured']],c['totalEth']])+' |')
lines += ['', '**Totale: '+analysis['totalGasCostEth']+' ETH**, da gasUsed × effectiveGasPrice di 768 ricevute uniche. '
          'Tre deployment ricontrollati via RPC; la ricevuta storica tardiva è supplementare, senza modificarne l’esito sperimentale.','',
          '## Polling, retry e sincronizzazione','',
          'Le distribuzioni complete dei suggerimenti di polling sono nel JSON, suddivise per segmento/piattaforma/fase e warmup/misura. '
          'La base SDK è 100 ms; Zama può imporre Retry-After maggiore. Le distanze osservate tra callback includono rete e processamento; non sono sonno o puro calcolo backend. '
          'Sono separati i backoff applicativi effettivamente cronometrati. Nessun fallimento da rate limit registrato; copertura HTTP Zama parziale.','',
          'Dispersione avvio broadcast, misure: '+json.dumps(barrier_stats['False'])+' ms.','',
          '## Provenienza e controlli','',
          'Report grezzo SHA256: `'+sha(raw)+'`. Fonte originale SHA256: `'+sha(source_bytes)+'`. '
          'Prefisso di 111 campioni, deployment/warmup originali, hash preparati, fee comuni, nonce e identità worker per segmento verificati. '
          'Il JSON contiene mediana/P95/min/max/DS, denominatori per metrica, coppie valide con n esplicito, stadi e inventario ricevute. '
          'I confronti sono descrittivi su rete pubblica; non mescolare con le precedenti campagne async.','',
          '## Blocchi','',
          'Il report grezzo ha 249 confronti con metadati completi. La copia supplementare aggiunge soltanto blockHash e blockNumber '
          'della ricevuta storica già verificata canonicamente: non aggiunge tempi, plaintext o successi. '
          'I risultati su 250 confronti sono in supplementary-block-inclusion/block-inclusion.json.']
(folder/'segmented-analysis.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
assert file.read_bytes()==raw and pathlib.Path(journal['sourceReport']).read_bytes()==source_bytes
print(json.dumps({'analysis':str(folder/'segmented-analysis.json'),'audit':str(folder/'completion-audit.json'),
                 'totalGasCostEth':analysis['totalGasCostEth'],'costs':costs,'broadcastSpread':barrier_stats,
                 'primaryValid':749,'warmupValid':15,'receiptCount':768}))
