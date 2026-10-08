// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

contract EnergyNotarizationPlainTest {
    mapping(address => bool) private authorized;

    struct LastEnergyEntry {
        uint64 value;
        uint64 ts;
    }

    mapping(address => LastEnergyEntry) private lastEntry;
    mapping(address => bool) private hasLastEntry;
    mapping(address => uint64) private total;
    mapping(address => uint64) private lastResult;

    event AddedMeasure(address indexed from, uint64 value, uint64 timestamp);
    event AddedToTotal(address indexed from);
    event MultipliedByConstant(address indexed from, uint64 constantValue);
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

    function addEnergyEntry(uint64 energy) external onlyAuthorized {
        lastEntry[msg.sender] = LastEnergyEntry({value: energy, ts: uint64(block.timestamp)});
        hasLastEntry[msg.sender] = true;

        emit AddedMeasure(msg.sender, energy, uint64(block.timestamp));
    }

    function addLastEntryToTotal() public onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");

        total[msg.sender] += lastEntry[msg.sender].value;

        emit AddedToTotal(msg.sender);

        return total[msg.sender];
    }

    function addLastEntryToEncryptedTotal() external onlyAuthorized returns (uint64) {
        return addLastEntryToTotal();
    }

    function previewAddLastEntryToTotal() public view onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return total[msg.sender] + lastEntry[msg.sender].value;
    }

    function previewAddLastEntryToEncryptedTotal() external view onlyAuthorized returns (uint64) {
        return previewAddLastEntryToTotal();
    }

    function multiplyLastEntryByConstant(uint64 constantValue) external onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");

        uint64 result = lastEntry[msg.sender].value * constantValue;
        lastResult[msg.sender] = result;

        emit MultipliedByConstant(msg.sender, constantValue);

        return result;
    }

    function meanLastEntryAndTotal() public onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");

        uint64 result = (lastEntry[msg.sender].value + total[msg.sender]) / 2;
        lastResult[msg.sender] = result;

        emit MeanComputed(msg.sender);

        return result;
    }

    function meanLastEntryAndEncryptedTotal() external onlyAuthorized returns (uint64) {
        return meanLastEntryAndTotal();
    }

    function previewMeanLastEntryAndTotal() public view onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return (lastEntry[msg.sender].value + total[msg.sender]) / 2;
    }

    function previewMeanLastEntryAndEncryptedTotal() external view onlyAuthorized returns (uint64) {
        return previewMeanLastEntryAndTotal();
    }

    function maxLastEntryAndTotal() public onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");

        uint64 value = lastEntry[msg.sender].value;
        uint64 result = value > total[msg.sender] ? value : total[msg.sender];
        lastResult[msg.sender] = result;

        emit MaxComputed(msg.sender);

        return result;
    }

    function maxLastEntryAndEncryptedTotal() external onlyAuthorized returns (uint64) {
        return maxLastEntryAndTotal();
    }

    function previewMaxLastEntryAndTotal() public view onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");
        uint64 value = lastEntry[msg.sender].value;
        return value > total[msg.sender] ? value : total[msg.sender];
    }

    function previewMaxLastEntryAndEncryptedTotal() external view onlyAuthorized returns (uint64) {
        return previewMaxLastEntryAndTotal();
    }

    function getEntryCount() external view onlyAuthorized returns (uint256) {
        return hasLastEntry[msg.sender] ? 1 : 0;
    }

    function getLastEntryValue() external view onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return lastEntry[msg.sender].value;
    }

    function getLastEntryTimestamp() external view onlyAuthorized returns (uint64) {
        require(hasLastEntry[msg.sender], "No entry");
        return lastEntry[msg.sender].ts;
    }

    function getTotal() external view onlyAuthorized returns (uint64) {
        return total[msg.sender];
    }

    function getEncryptedTotal() external view onlyAuthorized returns (uint64) {
        return total[msg.sender];
    }

    function getEncryptedTotalHandle() external view onlyAuthorized returns (uint64) {
        return total[msg.sender];
    }

    function getLastResult() external view onlyAuthorized returns (uint64) {
        return lastResult[msg.sender];
    }
}
