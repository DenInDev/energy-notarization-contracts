// Dedicated devnet account; never reuse Ethereum keys or print private material.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { encodeBase58 } = require('ethers');
const filename = '.benchmark-accounts/octra-devnet.secret.json';
function loadAccount() {
  
  if (!fs.existsSync(filename)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const seed = privateKey
      .export({ format: 'der', type: 'pkcs8' })
      .subarray(-32);
    const pub = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
    const address =
      'oct' +
      encodeBase58(crypto.createHash('sha256').update(pub).digest()).padStart(
        44,
        '1'
      );
    fs.mkdirSync('.benchmark-accounts', { recursive: true });
    fs.writeFileSync(
      filename,
      JSON.stringify(
        {
          network: 'devnet',
          rpc: 'https://devnet.octrascan.io/rpc',
          address,
          privateKeyBase64: seed.toString('base64'),
          publicKeyBase64: pub.toString('base64')
        },
        null,
        2
      ) + '\n',
      { flag: 'wx', mode: 0o600 }
    );
  }

  const a = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (a.network !== 'devnet' || a.rpc !== 'https://devnet.octrascan.io/rpc')
    throw new Error('Unexpected Octra network');
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      Buffer.from(a.privateKeyBase64, 'base64')
    ]),
    type: 'pkcs8',
    format: 'der'
  });
  const pub = crypto
    .createPublicKey(privateKey)
    .export({ format: 'der', type: 'spki' })
    .subarray(-32);
  const expected =
    'oct' +
    encodeBase58(crypto.createHash('sha256').update(pub).digest()).padStart(
      44,
      '1'
    );
  if (expected !== a.address || pub.toString('base64') !== a.publicKeyBase64)
    throw new Error('Octra account mismatch');
  return { ...a, privateKey };
}

module.exports = { loadAccount };
if (require.main === module) {
  const a = loadAccount();
  console.log(
    JSON.stringify(
      { network: a.network, address: a.address, rpc: a.rpc },
      null,
      2
    )
  );
}
