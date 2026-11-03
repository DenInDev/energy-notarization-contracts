import { fork, type ChildProcess, type ForkOptions } from "node:child_process";
import path from "node:path";

export class LifecycleWorkerClient {
  readonly child: ChildProcess;
  private serial = 0;
  private calls = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private exited = false;
  // Forks a platform worker with an IPC channel to the campaign.
  // Routes progress events and correlates replies with pending requests.
  constructor(private readonly onEvent: (message: any) => void,
    script = path.resolve("scripts/energy-platform-worker.cjs")) {
    const options: ForkOptions & { windowsHide: boolean } = { cwd: process.cwd(), windowsHide: true,
      execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"] };
    this.child = fork(script, [], options);
    this.child.on("message", (message: any) => {
      if (message?.type === "fatal") {
        onEvent(message);
        for (const call of this.calls.values()) { clearTimeout(call.timer); call.reject(new Error(message.error)); }
        this.calls.clear(); return;
      }
      if (message?.type !== "response") { onEvent(message); return; }
      const call = this.calls.get(message.id); if (!call) return;
      clearTimeout(call.timer); this.calls.delete(message.id);
      if (message.error) call.reject(new Error(message.error)); else call.resolve(message.result);
    });
    // Marks the worker as unavailable and rejects pending requests.
    // Clears each request's response deadline.
    const fail = (error: Error) => {
      this.exited = true;
      for (const call of this.calls.values()) { clearTimeout(call.timer); call.reject(error); }
      this.calls.clear();
    };
    this.child.on("error", () => fail(new Error("Platform process could not start")));
    this.child.on("exit", code => fail(new Error(`Platform process exited (${code})`)));
  }
  // Sends a command with a unique identifier to the worker.
  // Resolves on its reply or rejects on IPC failure or deadline expiry.
  request(command: string, args: any, timeoutMs: number): Promise<any> {
    if (this.exited || !this.child.connected) return Promise.reject(new Error("Platform process unavailable"));
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.calls.delete(id); reject(new Error(`Platform ${command} response deadline; transaction state may be uncertain`));
      }, timeoutMs);
      this.calls.set(id, { resolve, reject, timer });
      this.child.send({ id, command, args }, error => {
        if (!error) return;
        clearTimeout(timer); this.calls.delete(id); reject(new Error("Platform IPC send failed"));
      });
    });
  }
  // Requests shutdown for a connected platform worker.
  // Waits for the worker's response within the supplied deadline.
  async close(timeoutMs: number) {
    if (!this.exited && this.child.connected) await this.request("shutdown", {}, timeoutMs);
  }
}

// Creates the IPC client for a platform worker.
// Registers the callback that receives its progress events.
export const createLifecycleWorker = (onEvent: (message: any) => void) => new LifecycleWorkerClient(onEvent);
