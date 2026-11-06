# Pulizia degli esperimenti, 6 novembre 2026

Il codice attivo delle vecchie sweep generaliste è sostituito da due suite esplicite: concorrenza/ordine e circuiti crescenti. I contratti e gli strumenti Octra residui sono rimossi dall'albero attivo e dalla vecchia sottodirectory di archivio.

Per consentire il recupero, prima della rimozione è stato creato e verificato l'archivio [retired-experiments-2026-11-06.zip](../archive/retired-experiments-2026-11-06.zip). Contiene una lista SHA256 dei file e una copia degli entry point precedenti. Non contiene account, chiavi o report sperimentali.

SHA256 dell'archivio: `6b31c28253d33441277538120b59905a3c64b764e7fc3ab7137cd6e09756cec9`.

## File ritirati dall'albero attivo

```text
scripts/generate-experiment-contracts.cjs
tasks/experiments/adapters.ts
tasks/experiments/measurement.ts
tasks/experiments/plan.ts
tasks/experiments/report.ts
tasks/experiments/runner.ts
tasks/experiments/types.ts
test/experiments.test.ts
test/experimentsContracts.test.ts
test/experimentsRunner.test.ts
contracts/experiments/ExperimentCoFHE.sol
contracts/experiments/ExperimentPlain.sol
contracts/experiments/ExperimentZama.sol
scripts/octra/account.cjs
scripts/octra/analyze-lifecycle-record.py
scripts/octra/local-probe.py
scripts/octra/preflight.cjs
scripts/octra/START.txt
contracts/octra/EnergyLifecycleOnce.aml
contracts/octra/EnergyPilot.aml
contracts/octra/EnergyPilotViews.aml
archive/octra-scripts/lifecycle-crypto-worker.py
archive/octra-scripts/lifecycle-once.cjs
archive/octra-scripts/lifecycle-recovery-once.cjs
```

L'archivio conserva anche le versioni precedenti di README, package.json, hardhat.config.ts, tasks/benchmarkExperiments.ts e tasks/experiments/accounts.ts. Quest'ultimo **rimane attivo e invariato**, perché condiviso dalla suite classica. La configurazione Hardhat rimane attiva; task e comandi npm sono aggiornati alle due nuove suite.

## Elementi conservati

- Contratti e runner classici baseline, Zama e Fhenix, compresi continuazioni e diagnostica.
- Suite lifecycle uniforme 16/128, owner eaddress e view/decrypt separata.
- Analisi, risultati grezzi storici, report e recovery già registrate.
- Account salvati, lock e quarantene; nessun finanziamento o transazione avviato per questa pulizia.
- Documenti, diagrammi e modifiche preesistenti dell'utente, inclusa la comparazione architetturale Octra/Zama/Fhenix: è materiale del paper, non uno script da eseguire.

Non vengono cancellati interi alberi di log o cartelle di account. Eventuali vecchi riferimenti testuali nei risultati e nell'archivio sono provenienza storica, non comandi attivi.
