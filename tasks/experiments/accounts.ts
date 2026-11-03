import fs from "node:fs";
import path from "node:path";
import { Wallet, getAddress, type Provider } from "ethers";

export const defaultAccountsFile = ".benchmark-accounts/accounts.secret.json";
type AccountFile = { version: 1; chainId: 11155111; accounts: { id: string; address: string; privateKey: string }[] };

export function generateAccounts(file = defaultAccountsFile, count = 8) {
  if (!Number.isInteger(count) || count < 1 || count > 32) throw new Error("Account count must be 1..32");
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  // Exclusive creation: rerunning this command can never replace funded keys.
  if (!fs.existsSync(absolute)) {
    const accounts = Array.from({ length: count }, (_, i) => {
      const wallet = Wallet.createRandom();
      return { id: `user-${i + 1}`, address: wallet.address, privateKey: wallet.privateKey };
    });
    fs.writeFileSync(absolute, JSON.stringify({ version: 1, chainId: 11155111, accounts }, null, 2) + "\n",
      { flag: "wx", mode: 0o600 });
  }
  const wallets = loadAccounts(absolute);
  const publicFile = path.join(path.dirname(absolute), "addresses.json");
  const manifest = { chainId: 11155111, network: "sepolia", accounts: wallets.map((wallet, i) =>
    ({ id: `user-${i + 1}`, address: wallet.address })) };
  fs.writeFileSync(publicFile, JSON.stringify(manifest, null, 2) + "\n");
  return { privateFile: absolute, publicFile, ...manifest };
}

export function loadAccounts(file: string, provider?: Provider): Wallet[] {
  const data: AccountFile = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  if (data.version !== 1 || data.chainId !== 11155111 || !Array.isArray(data.accounts) || !data.accounts.length)
    throw new Error("Invalid Sepolia benchmark account file");
  const wallets = data.accounts.map((item, index) => {
    // Never include the file contents or a secret in validation errors.
    try {
      const wallet = new Wallet(item.privateKey, provider);
      if (wallet.address !== getAddress(item.address)) throw new Error();
      return wallet;
    } catch { throw new Error(`Invalid benchmark account at index ${index}`); }
  });
  if (new Set(wallets.map(w => w.address)).size !== wallets.length) throw new Error("Duplicate benchmark accounts");
  return wallets;
}

export function acquireAccountLock(file: string): () => void {
  const lock = path.join(path.dirname(path.resolve(file)), "campaign.lock");
  try { fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: "wx" }); }
  catch { throw new Error(`Benchmark accounts are locked: ${lock}. Check that the previous campaign stopped before removing a stale lock.`); }
  return () => fs.unlinkSync(lock);
}
