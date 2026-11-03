import type {} from "@nomicfoundation/hardhat-ethers";
import type {} from "@fhevm/hardhat-plugin";
import {strict as assert} from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import hre from "hardhat";
import {runExperiments} from "../tasks/experiments/runner";
import {experimentDefaults} from "./experiments.test";

describe("expanded campaign integration", function () {
  this.timeout(120000);
  it("runs every suite locally, preserves per-user nonce order and cannot overwrite a report", async () => {
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),"experiments-integration-"));
    try {
      const args={...experimentDefaults,platform:"baseline,zama",runs:1,widths:"128",counts:"1,4",chains:"4",
        states:"16",touched:"1,4",users:"1,8",requests:8,outputDir:folder};
      const report=await runExperiments(args,hre);
      assert.ok(report?.complete,JSON.stringify(report?.errors));
      assert.ok(report.samples.every(s=>s.status==="ok"));
      assert.equal(report.windows.length,4);
      for (const window of report.windows) {
        assert.equal(window.attempted,8);assert.equal(window.completed,8);assert.equal(window.receiptTransactions,16);
      }
      const senders=new Map<string,number[]>();
      for (const record of [...report.setups,...report.samples]) {
        const user=record.user as string;
        const values=senders.get(user)??[];
        for (const tx of record.transactions as {nonce:number}[]) values.push(tx.nonce);
        senders.set(user,values);
      }
      assert.equal(senders.size,9);
      for (const nonces of senders.values()) {
        const sorted=nonces.sort((a,b)=>a-b);
        assert.equal(new Set(sorted).size,sorted.length);
        assert.deepEqual(sorted,Array.from({length:sorted.length},(_,i)=>sorted[0]+i));
      }
      const before=fs.readFileSync(path.join(folder,"report.json"),"utf8");
      await assert.rejects(runExperiments(args,hre),/already contains/);
      assert.equal(fs.readFileSync(path.join(folder,"report.json"),"utf8"),before);
      assert.ok(!before.includes("privateKey"));
    } finally {
      for (const name of ["report.json","report.json.tmp","summary.json","summary.csv","summary.md"])
        fs.rmSync(path.join(folder,name),{force:true});
      fs.rmdirSync(folder);
    }
  });
});
