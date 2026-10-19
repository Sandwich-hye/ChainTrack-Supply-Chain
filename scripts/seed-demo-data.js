const hre = require('hardhat');
const config = require('../frontend/src/config/deployment.json');
async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== config.chainId) throw new Error('Deployment configuration is for a different chain. Deploy first.');
  if (await hre.ethers.provider.getCode(config.address) === '0x') throw new Error('No deployed contract. Deploy first.');
  let actors = await hre.ethers.getSigners();
  if (network.chainId === 11155111n) {
    const names = ['SUPPLIER_PRIVATE_KEY','WAREHOUSE_PRIVATE_KEY','TRANSPORT_PRIVATE_KEY','RETAILER_PRIVATE_KEY'];
    if (names.some(name => !process.env[name])) throw new Error('Set all four business-role private keys in the root .env and fund each account with Sepolia ETH.');
    actors = [actors[0], ...names.map(name => new hre.ethers.Wallet(process.env[name], hre.ethers.provider))];
  }
  if (actors.length < 5 || new Set(actors.slice(0,5).map(a => a.address.toLowerCase())).size !== 5) throw new Error('Five distinct funded accounts are required.');
  const [admin,supplier,warehouse,transport,retailer] = actors;
  const contract = await hre.ethers.getContractAt('SupplyChain', config.address, admin);
  const id = BigInt(process.env.DEMO_PRODUCT_ID || '1001');
  try { await contract.getProduct(id); throw new Error('Demo product already exists. Set a new DEMO_PRODUCT_ID.'); }
  catch (error) { if (!String(error).includes('Product does not exist')) throw error; }
  async function send(label, promise) { const tx = await promise; const receipt = await tx.wait(); console.log(`${label}: ${receipt.hash} (block ${receipt.blockNumber})`); return receipt; }
  const roles = ['SUPPLIER_ROLE','WAREHOUSE_ROLE','TRANSPORT_ROLE','RETAILER_ROLE'];
  for (let i=0;i<4;i++) await send(`Grant ${roles[i]} to ${actors[i+1].address}`, contract.grantRole(await contract[roles[i]](),actors[i+1].address));
  for (const [account,name] of [[supplier.address,'Clothing Supplier'],[warehouse.address,'Auckland Clothing Distribution Centre'],[transport.address,'Auckland Clothing Transport'],[retailer.address,'Queen Street Clothing Store']]) {
    await send(`Name ${account}`,contract.setBusinessName(account,name));
  }
  const driverReceipt = await send('Register driver',contract.connect(transport).registerDriver('John'));
  const john = driverReceipt.logs.map(log => { try { return contract.interface.parseLog(log); } catch { return null; } }).find(log => log?.name === 'DriverRegistered');
  if (!john) throw new Error('DriverRegistered event was not found after registration.');
  await send('Create',contract.connect(supplier).createProduct(id,'Classic Denim Jacket',10,retailer.address));
  console.log('Tracking number:', (await contract.getProduct(id)).trackingNumber);
  await send('Warehouse entry',contract.connect(warehouse).recordWarehouseEntry(id,'Auckland Clothing Distribution Centre',10));
  await send('Warehouse exit',contract.connect(warehouse).recordWarehouseExit(id,transport.address));
  await send('Pickup',contract.connect(transport).recordPickup(id,john.args.driverId));
  await send('Delivery',contract.connect(retailer).confirmDelivery(id,'Queen Street Clothing Store',10));
  const p = await contract.getProduct(id);
  console.log('Final product:', JSON.stringify(p.toObject(),(_,value) => typeof value === 'bigint' ? value.toString() : value,2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
