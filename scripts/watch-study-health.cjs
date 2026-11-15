// Temporary read-only job monitor. Never starts, stops or retries experiments.
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const root = path.resolve(process.argv[2]);
const intervalMs = 10 * 60 * 1000;
const identity = JSON.parse(fs.readFileSync(path.join(root, 'process-identity.json')));
if (!Number.isSafeInteger(identity.pid) || identity.pid <= 0) throw Error('Invalid study process identity');
let running = false;

async function check() {
  if (running) return;
  running = true;
  const observation = { at: new Date().toISOString(), intervalMs, mutationCalls: 0 };
  try {
    const command = `$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${identity.pid}'; if($p){[ordered]@{pid=$p.ProcessId;createdUtc=$p.CreationDate.ToUniversalTime().ToString('o');command=$p.CommandLine}|ConvertTo-Json -Compress}`;
    const result = await promisify(execFile)('pwsh.exe', ['-NoProfile', '-Command', command], { timeout: 20000, windowsHide: true });
    const process = result.stdout.trim() ? JSON.parse(result.stdout) : null;
    observation.processIdentityVerified = !!process && process.pid === identity.pid &&
      process.createdUtc === identity.createdUtc && process.command === identity.command;
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'campaign.json')));
    observation.status = manifest.status;
    observation.error = manifest.error;
    const sessions=manifest.sessions??[{id:'campaign',status:manifest.status,manifest:path.join(root,'campaign.json')}];
    observation.sessions = sessions.map(session => {
      const child = JSON.parse(fs.readFileSync(session.manifest));
      return { id: session.id, status: session.status, childStatus: child.status, error: child.error,
        stages: child.stages.map(stage => {
          const state = { suite: stage.suite, status: stage.status };
          if (!fs.existsSync(stage.report)) return state;
          const report = JSON.parse(fs.readFileSync(stage.report));
          const latest = new Map(report.trials.filter(t => !t.warmup).map(t =>
            [[t.caseId, t.platform, t.repetition, t.controlDirection ?? 'main'].join('/'), t]));
          const trials = [...latest.values()];
          return { ...state, observations: trials.length, ok: trials.filter(t => t.status === 'ok').length,
            capacityRejected: trials.filter(t => t.status === 'capacity_rejected').length,
            segmentStatus: report.continuations?.at(-1)?.status,
            reportAgeSeconds: (Date.now() - fs.statSync(stage.report).mtimeMs) / 1000,
            last: trials.at(-1) && { case: trials.at(-1).caseId, platform: trials.at(-1).platform,
              round: trials.at(-1).repetition, status: trials.at(-1).status } };
        }) };
    });
    const terminal = manifest.status === 'failed' || manifest.status.startsWith('execution_complete') || manifest.status === 'finished';
    const stale = observation.sessions.some(s => s.stages.some(t =>
      t.status === 'running' && t.segmentStatus !== 'preflight' && t.reportAgeSeconds > 600));
    observation.health = terminal ? (manifest.status === 'failed' ? 'failed' : 'finished') :
      !observation.processIdentityVerified ? 'process_missing_or_changed' : stale ? 'needs_attention_no_recent_report' : 'running';
    observation.monitorStopped = terminal || !observation.processIdentityVerified;
  } catch (error) {
    observation.health = 'monitor_read_error';
    observation.error = String(error.message).replace(/https?:\/\/\S+/g, '[endpoint]');
    observation.monitorStopped = false;
  }
  fs.appendFileSync(path.join(root, 'health-checks.jsonl'), JSON.stringify(observation) + '\n');
  fs.writeFileSync(path.join(root, 'health-monitor.json'), JSON.stringify(observation, null, 2));
  console.log(JSON.stringify(observation));
  running = false;
  if (observation.monitorStopped) clearInterval(timer);
}

const timer = setInterval(check, intervalMs);
check();
