pragma solidity ^0.8.24;

import {FHE, InEuint64, euint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract EnergyNotarizationFHETestFhenix {
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

    function addEnergyEntry(InEuint64 calldata encryptedEnergy) external onlyAuthorized {
        euint64 energy = FHE.asEuint64(encryptedEnergy);

        FHE.allowThis(energy);
        FHE.allowSender(energy);

        lastEntry[msg.sender] = LastEnergyEntry({value: energy, ts: uint64(block.timestamp)});
        hasLastEntry[msg.sender] = true;

        emit AddedMeasure(msg.sender, uint64(block.timestamp));
    }

    function addLastEntryToEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        encryptedTotal[msg.sender] = FHE.add(encryptedTotal[msg.sender], lastEntry[msg.sender].value);

        FHE.allowThis(encryptedTotal[msg.sender]);
        FHE.allowSender(encryptedTotal[msg.sender]);

        emit AddedToEncryptedTotal(msg.sender);

        return encryptedTotal[msg.sender];
    }

    function previewAddLastEntryToEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return FHE.add(encryptedTotal[msg.sender], lastEntry[msg.sender].value);
    }

    function multiplyLastEntryByConstant(uint64 constantValue) external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 encryptedConstant = FHE.asEuint64(constantValue);
        FHE.allowThis(encryptedConstant);

        euint64 result = FHE.mul(lastEntry[msg.sender].value, encryptedConstant);

        FHE.allowThis(result);
        FHE.allowSender(result);
        lastResult[msg.sender] = result;

        emit MultipliedByConstant(msg.sender, constantValue);

        return result;
    }

    function multiplyEntryByConstant(uint256 index, uint64 constantValue) external onlyAuthorized returns (euint64) {
        require(index == 0, "Invalid index");
        require(hasLastEntry[msg.sender], "No entry");

        euint64 encryptedConstant = FHE.asEuint64(constantValue);
        FHE.allowThis(encryptedConstant);

        euint64 result = FHE.mul(lastEntry[msg.sender].value, encryptedConstant);

        FHE.allowThis(result);
        FHE.allowSender(result);
        lastResult[msg.sender] = result;

        emit MultipliedByConstant(msg.sender, constantValue);

        return result;
    }

    function multiplyLastEntryByEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 result = FHE.mul(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);

        FHE.allowThis(result);
        FHE.allowSender(result);
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
        FHE.allowSender(result);
        lastResult[msg.sender] = result;

        emit MultipliedEncryptedValues(msg.sender);

        return result;
    }

    function meanLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 encryptedTwo = FHE.asEuint64(2);
        FHE.allowThis(encryptedTwo);

        euint64 sum = FHE.add(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
        euint64 result = FHE.div(sum, encryptedTwo);

        FHE.allowThis(result);
        FHE.allowSender(result);
        lastResult[msg.sender] = result;

        emit MeanComputed(msg.sender);

        return result;
    }

    function previewMeanLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");
        euint64 encryptedTwo = FHE.asEuint64(2);
        FHE.allowThis(encryptedTwo);
        euint64 sum = FHE.add(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
        return FHE.div(sum, encryptedTwo);
    }

    function meanEntries(uint256 indexA, uint256 indexB) external onlyAuthorized returns (euint64) {
        require(indexA == 0, "Invalid indexA");
        require(indexB == 0, "Invalid indexB");
        require(hasLastEntry[msg.sender], "No entry");

        euint64 encryptedTwo = FHE.asEuint64(2);
        FHE.allowThis(encryptedTwo);

        euint64 sum = FHE.add(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);
        euint64 result = FHE.div(sum, encryptedTwo);

        FHE.allowThis(result);
        FHE.allowSender(result);
        lastResult[msg.sender] = result;

        emit MeanComputed(msg.sender);

        return result;
    }

    function maxLastEntryAndEncryptedTotal() external onlyAuthorized returns (euint64) {
        require(hasLastEntry[msg.sender], "No entry");

        euint64 result = FHE.max(lastEntry[msg.sender].value, encryptedTotal[msg.sender]);

        FHE.allowThis(result);
        FHE.allowSender(result);
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
        FHE.allowSender(result);
        lastResult[msg.sender] = result;

        emit MaxComputed(msg.sender);

        return result;
    }

    function getEncryptedTotal() external onlyAuthorized returns (euint64) {
        euint64 total = encryptedTotal[msg.sender];

        FHE.allowThis(total);
        FHE.allowSender(total);

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
