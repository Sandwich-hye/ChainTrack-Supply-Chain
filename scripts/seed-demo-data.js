/**
 * Seed demo data for the SupplyChain contract.
 *
 * Runs the full one-product lifecycle using separate signer accounts for each
 * role, so a demo / Track Product view has a realistic event history:
 *   createProduct -> recordWarehouseEntry -> recordWarehouseExit ->
 *   recordPickup -> updateTransportLocation (x1-2) -> confirmDelivery
 *
 * Run with:
 *   npx hardhat run scripts/seed-demo-data.js --network localhost
 *
 * SKELETON — Codex (Phase 2) completes the details:
 *  - resolve or deploy the contract
 *  - grant SUPPLIER_ROLE / WAREHOUSE_ROLE / TRANSPORT_ROLE / RETAILER_ROLE to
 *    distinct accounts from the admin account
 *  - execute the lifecycle, printing each transaction hash
 */
const hre = require("hardhat");

async function main() {
  // TODO(codex): const signers = await hre.ethers.getSigners();
  // TODO(codex): const [admin, supplier, warehouse, transport, retailer] = signers;
  // TODO(codex): resolve deployed address (env var or fresh deploy) and attach
  // TODO(codex): await contract.connect(admin).grantRole(await contract.SUPPLIER_ROLE(), supplier.address);
  // TODO(codex): ... grant the other three roles ...
  // TODO(codex): run createProduct / recordWarehouseEntry / recordWarehouseExit /
  //              recordPickup / updateTransportLocation / confirmDelivery
  // TODO(codex): console.log each tx.hash
  throw new Error("seed-demo-data.js skeleton — not implemented yet (Phase 2 / Codex)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
