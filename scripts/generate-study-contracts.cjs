// Generate only the concurrency/circuit contracts; classic lifecycle is untouched.
const fs = require('node:fs');
const path = require('node:path');
const widths = [16, 128];

function contract(platform, width) {
  const plain = platform === 'Plain', zama = platform === 'Zama';
  const type = `${plain ? '' : 'e'}uint${width}`, external = `${plain ? '' : 'externalE'}uint${width}`;
  const add = (a,b) => plain ? `${a} + ${b}` : `FHE.add(${a}, ${b})`;
  const mul = (a,b) => plain ? `${a} * ${b}` : `FHE.mul(${a}, ${b})`;
  const constant = n => plain ? `uint${width}(${n})` : `FHE.asEuint${width}(${zama ? n : `uint256(${n})`})`;
  const handle = value => plain ? `bytes32(uint256(${value}))` : `bytes32(${type}.unwrap(${value}))`;
  return `contract Study${platform}${width}${zama ? ' is ZamaEthereumConfig' : ''} {
    address public immutable owner = msg.sender;
    mapping(address => bool) public authorized;
    struct Window { bool opened; uint8 mode; uint256 sequence; ${type} shared; ${type} factor; }
    mapping(bytes32 => Window) private windows;
    mapping(bytes32 => mapping(address => ${type})) private independent;
    mapping(bytes32 => mapping(address => bool)) private participants;
    mapping(bytes32 => ${type}) private snapshots;
    mapping(bytes32 => address) private requestSender;
    mapping(bytes32 => bool) private used;
    mapping(bytes32 => ${type}[]) private circuitInputs;
    mapping(bytes32 => bool) private circuitExecuted;
    event Applied(bytes32 indexed windowId, bytes32 indexed requestId, address indexed user, uint256 sequence, bytes32 handle);
    event Computed(bytes32 indexed jobId, bytes32 indexed requestId, bytes32 handle);

    constructor() { authorized[msg.sender] = true; }
    modifier onlyOwner() { require(msg.sender == owner, "Owner only"); _; }
    modifier allowed() { require(authorized[msg.sender], "Not authorized"); _; }

    // Authorize the fixed set of benchmark writers before any measured window.
    // Authorization is setup work and cannot be changed by a writer.
    function authorize(address[] calldata users) external onlyOwner {
        for (uint256 i; i < users.length; ++i) authorized[users[i]] = true;
    }

    // Allocate fresh zero state for one isolated window or shared smart meter.
    // Mode 0 isolates users, mode 1 sums, and mode 2 applies S = 3*S + x.
    function openWindow(bytes32 id, uint8 mode, address[] calldata users) external onlyOwner {
        require(!windows[id].opened && mode <= 2 && users.length > 0 && users.length <= 8, "Bad window");
        Window storage w = windows[id]; w.opened = true; w.mode = mode;
        ${type} zero = ${constant(0)}; grant(zero, owner); w.shared = zero;
        if (mode == 2) { w.factor = ${constant(3)}; grant(w.factor, owner); }
        for (uint256 i; i < users.length; ++i) {
            require(authorized[users[i]], "Writer not authorized");
            participants[id][users[i]] = true;
            independent[id][users[i]] = zero;
        }
    }

    // Apply one authenticated input and persist its own immutable output snapshot.
    // Later writes cannot overwrite the value audited for this request ID.
    function submit(bytes32 id, bytes32 requestId, ${external}[] calldata encrypted, bytes calldata proof) external allowed {
        require(windows[id].opened && participants[id][msg.sender] && !used[requestId] && encrypted.length == 1, "Bad request");
        ${type}[] memory values = importValues(encrypted, proof);
        Window storage w = windows[id];
        ${plain ? 'unchecked {' : ''}
        ${type} previous = w.mode == 0 ? independent[id][msg.sender] : w.shared;
        ${type} next = w.mode == 2 ? ${add(mul('previous','w.factor'),'values[0]')} : ${add('previous','values[0]')};
        grant(next, msg.sender);
        if (w.mode == 0) independent[id][msg.sender] = next; else w.shared = next;
        snapshots[requestId] = next; requestSender[requestId] = msg.sender; used[requestId] = true;
        ++w.sequence;
        emit Applied(id, requestId, msg.sender, w.sequence, ${handle('next')});
        ${plain ? '}' : ''}
    }

    // Return a stable per-request result instead of the window's latest state.
    // The writer and the experiment owner can retrieve the authorized snapshot.
    function getSnapshot(bytes32 requestId) external view allowed returns (${type}) {
        require(used[requestId] && (msg.sender == owner || msg.sender == requestSender[requestId]), "Not your request");
        return snapshots[requestId];
    }

    // Expose the final window state to the experiment auditor.
    // Shared modes ignore user; independent mode checks each writer separately.
    function getWindowState(bytes32 id, address user) external view onlyOwner returns (${type}) {
        require(windows[id].opened, "Unknown window");
        return windows[id].mode == 0 ? independent[id][user] : windows[id].shared;
    }

    // Append fresh operands in setup batches, before the job is executed once.
    // Batching supports 32 uint128 operands within the SDK's per-proof bit limit.
    function loadCircuit(bytes32 jobId, ${external}[] calldata encrypted, bytes calldata proof) external onlyOwner {
        require(!circuitExecuted[jobId] && encrypted.length >= 2 && circuitInputs[jobId].length + encrypted.length <= 32, "Bad inputs");
        ${type}[] memory values = importValues(encrypted, proof);
        for (uint256 i; i < values.length; ++i) { grant(values[i], owner); circuitInputs[jobId].push(values[i]); }
    }

    // Read every imported operand so setup readiness can be validated first.
    // This getter does not schedule encrypted arithmetic.
    function getCircuitInputs(bytes32 jobId) external view onlyOwner returns (${type}[] memory) { return circuitInputs[jobId]; }

    // Execute a reduction or an increasing chain in one measured transaction.
    // Kind 0 is linear sum, 1 balanced sum, and 2 repeats x = x*b + a.
    function executeCircuit(bytes32 jobId, bytes32 requestId, uint8 kind, uint32 size) external onlyOwner {
        require(!used[requestId] && !circuitExecuted[jobId] && kind <= 2 && size > 0 && size <= 32, "Bad circuit");
        ${type}[] memory work = circuitInputs[jobId];
        require(work.length >= 2 && (kind == 2 ? work.length == 2 : work.length == size), "Wrong input count");
        ${plain ? 'unchecked {' : ''}
        ${type} value = work[0];
        if (kind == 0) {
            for (uint256 i = 1; i < size; ++i) value = ${add('value','work[i]')};
        } else if (kind == 1) {
            for (uint256 stride = 1; stride < size; stride *= 2)
                for (uint256 i; i + stride < size; i += 2*stride)
                    work[i] = ${add('work[i]','work[i + stride]')};
            value = work[0];
        } else {
            for (uint256 i; i < size; ++i) value = ${add(mul('value','work[1]'),'work[0]')};
        }
        circuitExecuted[jobId] = true;
        grant(value, owner); snapshots[requestId] = value;
        used[requestId] = true; requestSender[requestId] = owner;
        emit Computed(jobId, requestId, ${handle('value')});
        ${plain ? '}' : ''}
    }

    // Import integer operands at exactly this contract's declared width.
    // Authentication and access grants match the consumer contract and sender.
    function importValues(${external}[] calldata values, bytes calldata${plain ? ' /* proof */' : ' proof'}) private${plain ? ' pure' : ''} returns (${type}[] memory result) {
        ${plain ? 'result = values;' : zama ? `result = new ${type}[](values.length);\n        for (uint256 i; i < values.length; ++i) result[i] = FHE.fromExternal(values[i], proof);`
          : `result = FHE.asEuint${width}s(values, proof);`}
    }

    // Keep contract access for dependent operations and grant the audit reader.
    // Writers receive only their own request snapshots, not another user's output.
    function grant(${type}${plain ? ' /* value */' : ' value'}, address${plain ? ' /* reader */' : ' reader'}) private${plain ? ' pure' : ''} {
        ${plain ? '' : 'FHE.allowThis(value); FHE.allow(value, owner); if (reader != owner) FHE.allow(value, reader);'}
    }
}
`;
}

const folder = path.resolve(__dirname, '../contracts/studies');
if (!process.argv.includes('--check')) fs.mkdirSync(folder, { recursive: true });
for (const platform of ['Plain','Zama','CoFHE']) {
  const imports = platform === 'Plain' ? '' : `import {FHE, ${widths.flatMap(w => [`euint${w}`,`externalEuint${w}`]).join(', ')}} from "${platform === 'Zama' ? '@fhevm/solidity/lib/FHE.sol' : '@fhenixprotocol/cofhe-contracts-current/FHE.sol'}";\n` +
    (platform === 'Zama' ? 'import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";\n' : '');
  const content = '// SPDX-License-Identifier: GPL-3.0\npragma solidity ^0.8.27;\n// Generated by scripts/generate-study-contracts.cjs.\n'+imports+'\n'+widths.map(w => contract(platform,w)).join('\n');
  const file = path.join(folder, `Study${platform}.sol`);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n') !== content) throw new Error(`Regenerate ${file}`);
  } else fs.writeFileSync(file, content);
}
