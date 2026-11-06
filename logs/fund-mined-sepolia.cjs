const fs = require('node:fs');
const hre = require('hardhat');
const { JsonRpcProvider, parseEther, formatEther, keccak256 } = require('ethers');
const { loadAccounts, acquireAccountLock } = require('../tasks/experiments/accounts');
const claimHash = '0xa8ebc3d6c0a7beff7637028e7319e093655fdea1cb057b2adfcc0eaaca26449c';
const reportFile = 'logs/sepolia-mining-funding.json';
const p = new JsonRpcProvider(hre.config.networks.sepolia.url, undefined, { cacheTimeout: -1 });
const target = parseEther('0.05');
let unlock;
let report;
function save() { fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n'); }
async function run() {
  if ((await p.getNetwork()).chainId !== 11155111n) throw new Error('Wrong chain');
  unlock = acquireAccountLock('.benchmark-accounts/accounts.secret.json');
  const wallets = loadAccounts('.benchmark-accounts/accounts.secret.json', p);
  const manifest = JSON.parse(fs.readFileSync('.benchmark-accounts/addresses.json', 'utf8'));
  if (wallets.length !== 8 || wallets.some((w, i) => w.address !== manifest.accounts[i].address)) throw new Error('Account manifest mismatch');
  const sender = wallets[0];
  if (sender.address !== '0x3552Cc153DCcC007d1c0D88Ff5aDB258d2688121') throw new Error('Unexpected sender');
  const claim = await p.getTransaction(claimHash);
  const receipt = await p.getTransactionReceipt(claimHash);
  if (!claim || receipt?.status !== 1 || claim.to !== sender.address || claim.value !== parseEther('0.47025') ||
      claim.from.toLowerCase() !== '0x6cc9397c3b38739dacbfaa68ead5f5d77ba5f455') throw new Error('Claim verification failed');
  report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {
    chainId: 11155111, claimHash, claimedEth: formatEther(claim.value), sender: sender.address, targetEth: '0.05', transfers: []
  };
  if (report.claimHash !== claimHash || report.sender !== sender.address) throw new Error('Journal mismatch');
  for (const old of report.transfers) {
    const prior = await p.getTransactionReceipt(old.hash);
    if (prior?.status !== 1) throw new Error('Prior transfer unresolved; manual reconciliation required');
    old.status = 'confirmed';
  }
  save();
  console.log('Verified Sepolia claim:', claimHash);
  for (const wallet of wallets.slice(1)) {
    const balance = await p.getBalance(wallet.address);
    if (balance >= target) { console.log(wallet.address, 'already funded'); continue; }
    if (report.transfers.some(t => t.to === wallet.address)) throw new Error('Previously funded account balance changed; stopping');
    const latest = await p.getTransactionCount(sender.address, 'latest');
    const pending = await p.getTransactionCount(sender.address, 'pending');
    if (latest !== pending) throw new Error('Sender has unresolved pending transactions');
    const fees = await p.getFeeData();
    if (fees.maxFeePerGas == null || fees.maxPriorityFeePerGas == null) throw new Error('Fee estimate unavailable');
    const value = target - balance;
    const estimate = await p.estimateGas({ from: sender.address, to: wallet.address, value });
    const gasLimit = (estimate * 120n + 99n) / 100n;
    const maximumFee = gasLimit * fees.maxFeePerGas;
    if (maximumFee > parseEther('0.005')) throw new Error('Transfer fee exceeds allowance');
    if ((await p.getBalance(sender.address)) - value - maximumFee < target) throw new Error('Original sender balance would be spent');
    const spent = report.transfers.reduce((sum, t) => sum + BigInt(t.valueWei) + BigInt(t.maxFeeWei), 0n);
    if (spent + value + maximumFee > claim.value) throw new Error('New mining proceeds would be exceeded');
    const signed = await sender.signTransaction({ chainId: 11155111, type: 2, nonce: latest,
      to: wallet.address, value, gasLimit, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });
    const entry = { to: wallet.address, valueWei: value.toString(), maxFeeWei: maximumFee.toString(),
      gasLimit: gasLimit.toString(), nonce: latest, hash: keccak256(signed), status: 'prepared' };
    report.transfers.push(entry);
    save();
    const tx = await p.broadcastTransaction(signed);
    if (tx.hash !== entry.hash) throw new Error('Broadcast hash mismatch');
    entry.status = 'pending'; save();
    console.log('Submitted', wallet.address, formatEther(value), 'ETH', tx.hash);
    const mined = await p.waitForTransaction(tx.hash, 1, 120000);
    if (mined?.status !== 1) throw new Error('Transfer failed or unconfirmed');
    entry.status = 'confirmed'; entry.blockNumber = mined.blockNumber;
    entry.actualFeeWei = mined.fee.toString(); save();
    console.log('Confirmed', wallet.address);
  }
  report.balances = await Promise.all(wallets.map(async w => ({ address: w.address, eth: formatEther(await p.getBalance(w.address)) })));
  if (report.balances.some(b => parseEther(b.eth) < target)) throw new Error('Final funding target not met');
  report.completedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ completed: true, balances: report.balances, reportFile }, null, 2));
}
run().catch(e => { console.error('Funding stopped:', e.code || e.message?.replace(/https?:\/\/\S+/g, '[endpoint]') || 'Unknown failure'); process.exitCode = 1; })
  .finally(() => { if (unlock) unlock(); p.destroy(); });
