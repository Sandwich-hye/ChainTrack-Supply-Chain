require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Environment variables (see .env.example):
 *  - SEPOLIA_RPC_URL   JSON-RPC endpoint for the Sepolia testnet
 *  - PRIVATE_KEY       deployer private key (no 0x prefix required)
 *  - ETHERSCAN_API_KEY optional, for contract verification
 *  - REPORT_GAS        set to "true" to enable the gas reporter
 *  - COINMARKETCAP_API_KEY optional, for fiat gas cost estimates
 *
 * Never hardcode RPC URLs, private keys or wallet secrets in this file.
 */
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || undefined,
  },
};
