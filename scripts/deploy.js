/**
 * Deploy SupplyChain.sol.
 *
 * Works against the local Hardhat network and Sepolia (configured via env vars
 * in hardhat.config.js). Run with:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network sepolia
 *
 * SKELETON — Codex (Phase 2) completes the details:
 *  - deploy the contract
 *  - print the deployed address
 *  - print the deployment block number (needed as `fromBlock` for queryFilter)
 *  - optionally write address + block to a file the frontend can consume
 */
const hre = require("hardhat");

async function main() {
  // TODO(codex): const [deployer] = await hre.ethers.getSigners();
  // TODO(codex): const factory = await hre.ethers.getContractFactory("SupplyChain");
  // TODO(codex): const contract = await factory.deploy();
  // TODO(codex): await contract.waitForDeployment();
  // TODO(codex): const address = await contract.getAddress();
  // TODO(codex): const deploymentTx = contract.deploymentTransaction();
  // TODO(codex): const receipt = await deploymentTx.wait();
  // TODO(codex): console.log("SupplyChain deployed to:", address);
  // TODO(codex): console.log("Deployment block:", receipt.blockNumber);
  throw new Error("deploy.js skeleton — not implemented yet (Phase 2 / Codex)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
