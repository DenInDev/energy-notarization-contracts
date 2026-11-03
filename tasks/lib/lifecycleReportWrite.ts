import fs from "node:fs";

let sequence = 0;
const pause = new Int32Array(new SharedArrayBuffer(4));

export function writeLifecycleJson(file: string, value: unknown,
  rename = fs.renameSync, sleep = (ms: number) => { Atomics.wait(pause, 0, 0, ms); }) {
  const temporary = `${file}.${process.pid}.${++sequence}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
  for (let attempt = 0; ; attempt++) {
    try { rename(temporary, file); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 8 || !["EPERM", "EACCES", "EBUSY"].includes(code || "")) throw error;
      sleep(Math.min(10 * 2 ** attempt, 400));
    }
  }
}
