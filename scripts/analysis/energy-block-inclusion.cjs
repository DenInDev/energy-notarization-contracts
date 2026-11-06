const fs = require('node:fs');
const path = require('node:path');
const file = process.argv[2];
if (!file) throw new Error('Pass a lifecycle report.json');
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const groups = new Map();
for (const sample of report.samples.filter(s => !s.warmup)) {
  const key = `${sample.run}/${sample.operation}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(sample);
}
const comparisons = [...groups.values()].filter(samples =>
  samples.length === report.selectedPlatforms.length &&
  new Set(samples.map(s => s.platform)).size === report.selectedPlatforms.length &&
  samples.every(s => s.blockHash && s.blockNumber !== undefined),
).map(samples => ({
  run: samples[0].run, operation: samples[0].operation,
  sameBlock: new Set(samples.map(s => s.blockHash)).size === 1,
  blockSpread: Math.max(...samples.map(s => s.blockNumber)) - Math.min(...samples.map(s => s.blockNumber)),
  blocks: Object.fromEntries(samples.map(s => [s.platform, {number: s.blockNumber, hash: s.blockHash}])),
}));
const sameBlockCount = comparisons.filter(c => c.sameBlock).length;
const result = {complete: !!report.complete, comparisonCount: comparisons.length, sameBlockCount,
  sameBlockFraction: comparisons.length ? sameBlockCount / comparisons.length : null,
  plannedComparisonCount: report.runs * (report.measuredOperations?.length ?? 5), comparisons};
const output = path.join(path.dirname(file), 'block-inclusion.json');
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({output, comparisons: comparisons.length, sameBlockCount,
  sameBlockFraction: result.sameBlockFraction}));
