import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-ethers";
import { HardhatUserConfig, vars } from "hardhat/config";

import "./tasks/benchmarkEnergyLifecycle";

const mnemonic = process.env.SEPOLIA_MNEMONIC ?? vars.get("SEPOLIA_MNEMONIC", "");
const rpcUrl =
  process.env.SEPOLIA_RPC_URL ??
  vars.get("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
      viaIR: false,
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: rpcUrl,
      chainId: 11155111,
      accounts: mnemonic ? { mnemonic } : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 120000,
  },
};

export default config;
