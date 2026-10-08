// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract EnergyNotarizationFHETest is ZamaEthereumConfig {
    mapping(address => bool) private authorized;

    struct LastEnergyEntry {
        euint64 value;
        uint64 ts;
    }

    mapping(address => LastEnergyEntry) private lastEntry;
    mapping(address => bool) private hasLastEntry;
    mapping(address => euint64) private encryptedTotal;
    mapping(address => euint64) private lastResult;

    event AddedMeasure(address indexed from, uint64 timestamp);
    event AddedToEncryptedTotal(address indexed from);
    event MultipliedByConstant(address indexed from, uint64 constantValue);
    event MultipliedEncryptedValues(address indexed from);
    event MeanComputed(address indexed from);
    event MaxComputed(address indexed from);

    modifier onlyAuthorized() {
        require(authorized[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        authorized[msg.sender] = true;
    }

    function addAuthorized(address toAdd) external onlyAuthorized {
        authorized[toAdd] = true;
    }

    function addEnergyEntry(externalEuint64 encryptedEnergy, bytes calldata inputProof) external onlyAuthorized {
        euint64 energy = FHE.fromExternal(encryptedEnergy, inputProof);

        FHE.allowThis(energy);
        FHE.allow(energy, msg.sender);

        lastEntry[msg.sender] = LastEnergyEntry({value: energy, ts: uint64(block.timestamp)});
        hasLastEntry[msg.sender] = true;

        emit AddedMeasure(msg.sender, uint64(block.timestamp));
    }

    // Operazione 1:
    // totale cifrato += dato cifrato

    function addLastEntryToEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        euint64 value = lastEntry[msg.sender].value;

        encryptedTotal[msg.sender] = FHE.add(encryptedTotal[msg.sender], value);

        FHE.allowThis(encryptedTotal[msg.sender]);
        FHE.allow(encryptedTotal[msg.sender], msg.sender);

        emit AddedToEncryptedTotal(msg.sender);

        return encryptedTotal[msg.sender];
    }

    function previewAddLastEntryToEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return FHE.add(encryptedTotal[msg.sender], lastEntry[msg.sender].value);
    }

    // Operazione 2:
    // dato cifrato * costante pubblica
    function multiplyLastEntryByConstant(uint64 constantValue) external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 result = FHE.mul(lastEntry[msg.sender].value, constantValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MultipliedByConstant(msg.sender, constantValue);

        return result;
    }

    function multiplyEntryByConstant(uint256 index, uint64 constantValue) external onlyAuthorized returns (euint64) {
        require(index == 0, "Invalid index");
        require(hasLastEntry[msg.sender], "No entry");
        euint64 result = FHE.mul(lastEntry[msg.sender].value, constantValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MultipliedByConstant(msg.sender, constantValue);

        return result;
    }

    // Operazione 3:
    // ultimo dato cifrato * accumulatore cifrato
    function multiplyLastEntryByEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 result = FHE.mul(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MultipliedEncryptedValues(msg.sender);

        return result;
    }

    function multiplyEncryptedEntries(uint256 indexA, uint256 indexB) external onlyAuthorized returns (euint64) {
        require(indexA == 0, "Invalid indexA");
        require(indexB == 0, "Invalid indexB");
        require(hasLastEntry[msg.sender], "No entry");
        euint64 result = FHE.mul(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MultipliedEncryptedValues(msg.sender);

        return result;
    }

    // Operazione 4:
    // media tra ultimo dato cifrato e accumulatore cifrato
    function meanLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 sum = FHE.add(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
        euint64 result = FHE.div(sum, 2);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MeanComputed(msg.sender);

        return result;
    }

    function previewMeanLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        euint64 sum = FHE.add(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
        return FHE.div(sum, 2);
    }

    function meanEntries(uint256 indexA, uint256 indexB) external onlyAuthorized returns (euint64) {
        require(indexA == 0, "Invalid indexA");
        require(indexB == 0, "Invalid indexB");
        require(hasLastEntry[msg.sender], "No entry");
        euint64 sum = FHE.add(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
        euint64 result = FHE.div(sum, 2);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MeanComputed(msg.sender);

        return result;
    }

    // Operazione 5:
    // massimo tra ultimo dato cifrato e accumulatore cifrato
    function maxLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 result = FHE.max(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MaxComputed(msg.sender);

        return result;
    }

    function previewMaxLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return FHE.max(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
    }

    function maxEntries(uint256 indexA, uint256 indexB) external onlyAuthorized returns (euint64) {
        require(indexA == 0, "Invalid indexA");
        require(indexB == 0, "Invalid indexB");
        require(hasLastEntry[msg.sender], "No entry");
        euint64 result = FHE.max(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        lastResult[msg.sender] = result;

        emit MaxComputed(msg.sender);

        return result;
    }

    function getEncryptedTotal() external onlyAuthorized returns (euint64) {
        euint64 total = encryptedTotal[msg.sender];

        FHE.allowThis(total);
        FHE.allow(total, msg.sender);

        return total;
    }

    function getEntryCount() external view onlyAuthorized returns (uint256) {
        return hasLastEntry[msg.sender] ? 1 : 0;
    }

    function getEntryValue(uint256 index) external view onlyAuthorized returns (euint64) {
        require(index == 0, "Invalid index");
        require(hasLastEntry[msg.sender], "No entry");
        return lastEntry[msg.sender].value;
    }

    function getLastEntryValue() external view onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return lastEntry[msg.sender].value;
    }

    function getLastEntryTimestamp() external view onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return lastEntry[msg.sender].ts;
    }

    function getEncryptedTotalHandle() external view onlyAuthorized returns (euint64) {
        return encryptedTotal[msg.sender];
    }

    function getLastResult() external view onlyAuthorized returns (euint64) {
        return lastResult[msg.sender];
    }
}
