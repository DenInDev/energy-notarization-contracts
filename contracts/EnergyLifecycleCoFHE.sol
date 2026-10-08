// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhenixprotocol/cofhe-contracts-current/FHE.sol";

// Version-isolated CoFHE 0.2 contract; the historical 0.1 benchmark is unchanged.
contract EnergyLifecycleCoFHE {
    struct LastEnergyEntry {
        euint64 value;
        uint64 timestamp;
    }
    mapping(address => LastEnergyEntry) private lastEntry;
    mapping(address => bool) private authorized;
    mapping(address => euint64) private total;
    mapping(address => euint64) private result;
    mapping(address => bool) private initialized;

    event AddedMeasure(address indexed from, uint64 timestamp);
    event AddedToEncryptedTotal(address indexed from);
    event MultipliedByConstant(address indexed from, uint64 constantValue);
    event MeanComputed(address indexed from);
    event MaxComputed(address indexed from);

    constructor() {
        authorized[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(authorized[msg.sender], "Not authorized");
        _;
    }

    modifier hasEntry() {
        require(initialized[msg.sender], "No entry");
        _;
    }

    function addEnergyEntry(externalEuint64 input, bytes calldata proof) external onlyAuthorized {
        euint64 value = FHE.asEuint64(input, proof);
        grant(value);
        lastEntry[msg.sender] = LastEnergyEntry(value, uint64(block.timestamp));
        initialized[msg.sender] = true;
        emit AddedMeasure(msg.sender, uint64(block.timestamp));
    }

    function addLastEntryToEncryptedTotal() external onlyAuthorized hasEntry returns (euint64) {
        euint64 value = FHE.add(total[msg.sender], lastEntry[msg.sender].value);
        grant(value);
        total[msg.sender] = value;
        emit AddedToEncryptedTotal(msg.sender);
        return value;
    }

    function multiplyLastEntryByConstant(uint64 scalar) external onlyAuthorized hasEntry returns (euint64) {
        euint64 constantValue = FHE.asEuint64(uint256(scalar));
        FHE.allowThis(constantValue);
        euint64 value = storeResult(FHE.mul(lastEntry[msg.sender].value, constantValue));
        emit MultipliedByConstant(msg.sender, scalar);
        return value;
    }

    function meanLastEntryAndEncryptedTotal() external onlyAuthorized hasEntry returns (euint64) {
        euint64 divisor = FHE.asEuint64(uint256(2));
        FHE.allowThis(divisor);
        euint64 value = storeResult(FHE.div(FHE.add(lastEntry[msg.sender].value, total[msg.sender]), divisor));
        emit MeanComputed(msg.sender);
        return value;
    }

    function maxLastEntryAndEncryptedTotal() external onlyAuthorized hasEntry returns (euint64) {
        euint64 value = storeResult(FHE.max(lastEntry[msg.sender].value, total[msg.sender]));
        emit MaxComputed(msg.sender);
        return value;
    }

    function getLastEntryValue() external view onlyAuthorized hasEntry returns (euint64) {
        return lastEntry[msg.sender].value;
    }
    function getEncryptedTotalHandle() external view onlyAuthorized returns (euint64) {
        return total[msg.sender];
    }
    function getLastResult() external view onlyAuthorized returns (euint64) {
        return result[msg.sender];
    }

    function storeResult(euint64 value) private returns (euint64) {
        grant(value);
        result[msg.sender] = value;
        return value;
    }

    function grant(euint64 value) private {
        FHE.allowThis(value);
        FHE.allowSender(value);
    }
}
