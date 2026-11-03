import { fork, type ChildProcess, type ForkOptions } from "node:child_process";
import path from "node:path";

export class LifecycleWorkerClient {
  readonly child: ChildProcess;
  private serial = 0;
  private calls = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private exited = false;
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
    const fail = (error: Error) => {
      this.exited = true;
      for (const call of this.calls.values()) { clearTimeout(call.timer); call.reject(error); }
      this.calls.clear();
    };
    this.child.on("error", () => fail(new Error("Platform process could not start")));
    this.child.on("exit", code => fail(new Error(`Platform process exited (${code})`)));
  }
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
  async close(timeoutMs: number) {
    if (!this.exited && this.child.connected) await this.request("shutdown", {}, timeoutMs);
  }
}

export const createLifecycleWorker = (onEvent: (message: any) => void) => new LifecycleWorkerClient(onEvent);
