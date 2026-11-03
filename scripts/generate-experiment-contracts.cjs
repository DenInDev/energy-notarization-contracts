// Shared template keeps operation order, storage and access policy comparable.
// Run with --check in verification; edit this template rather than generated Solidity.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'contracts', 'experiments');
const widths = [8, 16, 32, 64, 128];

function contract(platform, width) {
  const plain = platform === 'Plain';
  const zama = platform === 'Zama';
  const type = `${plain ? '' : 'e'}uint${width}`;
  const external = plain ? type : `externalEuint${width}`;
  const add = (a,b) => plain ? `${a} + ${b}` : `FHE.add(${a}, ${b})`;
  const mul = (a,b) => plain ? `${a} * ${b}` : `FHE.mul(${a}, ${b})`;
  const constant = (v) => plain ? `${type}(${v})` : `FHE.asEuint${width}(${zama ? '' : 'uint256('}${v}${zama ? '' : ')'})`;
  const select = (a,b,x,y) => plain ? `${a} > ${b} ? ${x} : ${y}` : `FHE.select(FHE.gt(${a}, ${b}), ${x}, ${y})`;
  const convert = plain ? 'values[i]' : zama ? 'FHE.fromExternal(values[i], proof)' : `FHE.asEuint${width}(values[i], proof)`;
  return `contract Experiment${platform}${width}${zama ? ' is ZamaEthereumConfig' : ''} {
    address public immutable owner = msg.sender;
    mapping(address => bool) public authorized;
    mapping(address => ${type}[]) private inputs;
    mapping(address => ${type}[]) private history;
    mapping(address => ${type}) private results;

    constructor() { authorized[msg.sender] = true; }
    modifier allowed() { require(authorized[msg.sender], "Not authorized"); _; }
    function authorize(address[] calldata users) external {
        require(msg.sender == owner, "Owner only");
        for (uint256 i; i < users.length; ++i) authorized[users[i]] = true;
    }
    function load(${external}[] calldata values, bytes calldata${plain ? ' /* proof */' : ' proof'}) external allowed {
        require(values.length > 0 && values.length <= 32, "Input count 1..32");
        delete inputs[msg.sender];
        for (uint256 i; i < values.length; ++i) {
            ${type} value = ${convert};
            grant(value);
            inputs[msg.sender].push(value);
        }
        results[msg.sender] = inputs[msg.sender][0];
    }
    function append(${external}[] calldata values, bytes calldata${plain ? ' /* proof */' : ' proof'}) external allowed {
        require(values.length > 0 && values.length <= 32, "Input count 1..32");
        for (uint256 i; i < values.length; ++i) {
            ${type} value = ${convert};
            grant(value);
            history[msg.sender].push(value);
            results[msg.sender] = value;
        }
    }
    // 0:add, 1:encrypted multiply, 2:compare/select, 3:threshold tariff,
    // 4:linear sum, 5:balanced sum, 6:dependent chain step, 7:state read, 8:state sum.
    // Plain operations wrap modulo 2^width, matching the encrypted integer model.
    function execute(uint8 operation, uint32 count, uint32 index) external allowed {
        ${plain ? 'unchecked {' : ''}
        ${type} value;
        if (operation <= 3 || operation == 6) {
            require(inputs[msg.sender].length >= 2, "Need two inputs");
            ${type} a = inputs[msg.sender][0];
            ${type} b = inputs[msg.sender][1];
            if (operation == 0) value = ${add('a','b')};
            else if (operation == 1) value = ${mul('a','b')};
            else if (operation == 2) value = ${select('a','b','a','b')};
            else if (operation == 3) value = ${select('a','b',constant(7),constant(3))};
            else {
                ${type} previous = index == 0 ? a : results[msg.sender];
                value = ${add(mul('previous','b'),'a')};
            }
        } else if (operation == 4 || operation == 5) {
            require(count > 0 && count <= inputs[msg.sender].length, "Bad count");
            ${type}[] memory work = new ${type}[](count);
            for (uint256 i; i < count; ++i) work[i] = inputs[msg.sender][i];
            if (operation == 4) {
                value = work[0];
                for (uint256 i = 1; i < count; ++i) value = ${add('value','work[i]')};
            } else {
                for (uint256 stride = 1; stride < count; stride *= 2)
                    for (uint256 i; i + stride < count; i += 2 * stride)
                        work[i] = ${add('work[i]','work[i + stride]')};
                value = work[0];
            }
        } else if (operation == 7 || operation == 8) {
            uint256 length = operation == 7 ? 1 : count;
            require(length > 0 && uint256(index) + length <= history[msg.sender].length, "Bad state range");
            value = history[msg.sender][index];
            for (uint256 i = 1; i < length; ++i) value = ${add('value','history[msg.sender][uint256(index) + i]')};
        } else revert("Unknown operation");
        grant(value);
        results[msg.sender] = value;
        ${plain ? '}' : ''}
    }
    function getResult() external view allowed returns (${type}) { return results[msg.sender]; }
    function getInputs() external view allowed returns (${type}[] memory) { return inputs[msg.sender]; }
    function getStateRange(uint32 index, uint32 count) external view allowed returns (${type}[] memory values) {
        require(count > 0 && count <= 32 && uint256(index) + count <= history[msg.sender].length, "Bad range");
        values = new ${type}[](count);
        for (uint256 i; i < count; ++i) values[i] = history[msg.sender][uint256(index) + i];
    }
    function getStateCount() external view allowed returns (uint256) { return history[msg.sender].length; }
    function grant(${type}${plain ? ' /* value */' : ' value'}) private${plain ? ' pure' : ''} {
        ${plain ? '' : `FHE.allowThis(value); ${zama ? 'FHE.allow(value, msg.sender);' : 'FHE.allowSender(value);'}`}
    }
}
`;
}

fs.mkdirSync(root, {recursive:true});
for (const platform of ['Plain', 'Zama', 'CoFHE']) {
  const imports = platform === 'Plain' ? '' :
    `import {FHE, ${widths.flatMap(w => [`euint${w}`, `externalEuint${w}`]).join(', ')}} from "${platform === 'Zama' ? '@fhevm/solidity/lib/FHE.sol' : '@fhenixprotocol/cofhe-contracts-current/FHE.sol'}";\n` +
    (platform === 'Zama' ? 'import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";\n' : '');
  const content = '// SPDX-License-Identifier: GPL-3.0\npragma solidity ^0.8.27;\n\n// Generated by scripts/generate-experiment-contracts.cjs.\n' + imports + '\n' + widths.map(w => contract(platform,w)).join('\n');
  const file = path.join(root, `Experiment${platform}.sol`);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file,'utf8') !== content) throw new Error(`Regenerate ${file}`);
  } else fs.writeFileSync(file, content);
}
