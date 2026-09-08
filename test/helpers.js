const { ethers } = require('hardhat');
const roles = ['SUPPLIER_ROLE', 'WAREHOUSE_ROLE', 'TRANSPORT_ROLE', 'RETAILER_ROLE'];
async function fixture() {
  const [admin, supplier, warehouse, transport, retailer, outsider] = await ethers.getSigners();
  const contract = await ethers.deployContract('SupplyChain');
  await contract.waitForDeployment();
  const actors = [supplier, warehouse, transport, retailer];
  for (let i = 0; i < roles.length; i++) await contract.grantRole(await contract[roles[i]](), actors[i].address);
  return { contract, admin, supplier, warehouse, transport, retailer, outsider, actors };
}
const steps = [
  ['supplier', 'createProduct', [1, 'Demo tea', 10], 'ProductCreated', 0],
  ['warehouse', 'recordWarehouseEntry', [1, 'WH-1', 10], 'WarehouseEntry', 1],
  ['warehouse', 'recordWarehouseExit', [1], 'WarehouseExit', 2],
  ['transport', 'recordPickup', [1, 'TRACK-1', 'DRIVER-1'], 'TransportPickup', 3],
  ['transport', 'updateTransportLocation', [1, 'Harbour'], 'TransportStatusUpdated', 4],
  ['retailer', 'confirmDelivery', [1, 'SHOP-1', 10], 'GoodsDelivered', 5],
];
async function advance(f, stage, id = 1) {
  for (const [actor, method, args] of steps.slice(0, stage + 1)) {
    const values = [...args]; values[0] = id;
    if (method === 'recordPickup') values[1] = `TRACK-${id}`;
    await f.contract.connect(f[actor])[method](...values);
  }
}
module.exports = { fixture, roles, steps, advance };
