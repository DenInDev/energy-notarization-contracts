import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeLifecycleJson } from "../tasks/lib/lifecycleReportWrite";

describe("Windows report replacement", () => {
  it("retries transient sharing failures while preserving a readable old report", () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "report-sharing-")), file = path.join(folder, "report.json");
    try {
      fs.writeFileSync(file, JSON.stringify({ previous: true }));
      let calls = 0;
      writeLifecycleJson(file, { next: true }, (from, to) => {
        if (++calls <= 3) {
          assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).previous, true);
          throw Object.assign(new Error("sharing conflict"), { code: "EPERM" });
        }
        fs.renameSync(from, to);
      }, () => {});
      assert.equal(calls, 4); assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).next, true);
    } finally { fs.rmSync(folder, { recursive: true, force: true }); }
  });
  it("bounds persistent failures and preserves the new snapshot for recovery", () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "report-sharing-")), file = path.join(folder, "report.json");
    try {
      fs.writeFileSync(file, JSON.stringify({ previous: true }));
      let calls = 0;
      assert.throws(() => writeLifecycleJson(file, { next: true }, () => {
        calls++; throw Object.assign(new Error("locked"), { code: "EACCES" });
      }, () => {}), /locked/);
      assert.equal(calls, 9); assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).previous, true);
      const temporary = fs.readdirSync(folder).find(p => p.endsWith(".tmp"))!;
      assert.equal(JSON.parse(fs.readFileSync(path.join(folder, temporary), "utf8")).next, true);
    } finally { fs.rmSync(folder, { recursive: true, force: true }); }
  });
});
