import { BrowserProvider, JsonRpcProvider, Contract, Interface, ZeroHash, id, isAddress, MaxUint256 } from 'ethers';
import artifact from '../abi/SupplyChain.json';
import deployment from '../config/deployment.json';
const env = import.meta.env || {};
export const ABI = artifact.abi;
export const CONTRACT_ADDRESS = env.VITE_CONTRACT_ADDRESS || deployment.address;
export const CHAIN_ID = Number(env.VITE_CHAIN_ID || deployment.chainId);
export const DEPLOYMENT_BLOCK = Number(env.VITE_DEPLOYMENT_BLOCK ?? deployment.deploymentBlock);
export const BUSINESS_ROLES = ['Supplier','Warehouse','Transport','Retailer'];
export const ROLE_IDS = Object.fromEntries(['Admin',...BUSINESS_ROLES].map(role => [role,role === 'Admin' ? ZeroHash : id(`${role.toUpperCase()}_ROLE`)]));
export const STATUSES = ['Created','In Warehouse','Dispatched','Picked Up','In Transit','Delivered'];
export const EVENTS = ['ProductCreated','WarehouseEntry','WarehouseExit','TransportPickup','TransportStatusUpdated','GoodsDelivered'];
let readProvider;
function validateConfig() {
  if (!isAddress(CONTRACT_ADDRESS)) throw new Error('Deploy the contract and restart the frontend to load its address.');
  if (!Number.isSafeInteger(CHAIN_ID) || CHAIN_ID <= 0) throw new Error('Invalid configured chain ID.');
  if (!Number.isSafeInteger(DEPLOYMENT_BLOCK) || DEPLOYMENT_BLOCK < 0 || (CHAIN_ID === 11155111 && DEPLOYMENT_BLOCK === 0)) throw new Error('Configure the actual deployment block before querying Sepolia.');
}
export function uint(value, label = 'Product ID', positive = false) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${label} must be a whole non-negative number.`);
  const n = BigInt(value);
  if (n > MaxUint256 || (positive && n === 0n)) throw new Error(`${label} must be ${positive ? 'greater than zero and ' : ''}within uint256 range.`);
  return n;
}
function hasRevertReason(error, reason) {
  return [error?.reason, error?.shortMessage, error?.message].some(value => typeof value === 'string' && value.includes(reason));
}
export async function generateProductId(contract, random = globalThis.crypto) {
  contract ||= await getReadContract();
  if (!random?.getRandomValues) throw new Error('Secure browser randomness is unavailable.');
  for (let attempt = 0; attempt < 10; attempt++) {
    const words = random.getRandomValues(new Uint32Array(4));
    const candidate = Array.from(words).reduce((value, word) => (value << 32n) | BigInt(word), 0n);
    if (candidate === 0n) continue;
    try { await contract.getProduct(candidate); }
    catch (error) {
      if (hasRevertReason(error, 'Product does not exist')) return candidate;
      throw error;
    }
  }
  throw new Error('Could not find an unused Product ID. Try again.');
}
export async function generateTrackingNumber(productId, contract) {
  contract ||= await getReadContract();
  const base = `SC-${CHAIN_ID}-${CONTRACT_ADDRESS.slice(2,10).toUpperCase()}-${uint(productId).toString()}`;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt ? `${base}-${attempt + 1}` : base;
    try { await contract.getProductIdByTrackingNumber(candidate); }
    catch (error) {
      if (hasRevertReason(error, 'Unknown tracking number')) return candidate;
      throw error;
    }
  }
  throw new Error('Could not find an unused tracking number. Try again.');
}
export async function listSupplierProducts(supplier, contract, fromBlock = DEPLOYMENT_BLOCK, toBlock) {
  contract ||= await getReadContract();
  const end = toBlock ?? await contract.runner.provider.getBlockNumber();
  const logs = [];
  const filter = contract.filters.ProductCreated(null,supplier);
  for (let start = fromBlock; start <= end; start += 500) {
    const stop = Math.min(start + 499,end);
    logs.push(...await contract.queryFilter(filter,start,stop));
  }
  const productIds = [...new Set(logs.sort(compareLogs).map(log => log.args.productId.toString()))];
  return Promise.all(productIds.map(productId => contract.getProduct(BigInt(productId),{blockTag:end})));
}
export async function getProvider() {
  if (!window.ethereum) throw new Error('Install MetaMask to connect a wallet.');
  return new BrowserProvider(window.ethereum);
}
export async function getReadContract() {
  validateConfig();
  const url = env.VITE_RPC_URL || (CHAIN_ID === 31337 ? 'http://127.0.0.1:8545' : '');
  if (!url) throw new Error('Configure VITE_RPC_URL for public reads on this network.');
  readProvider ||= new JsonRpcProvider(url);
  if (Number((await readProvider.getNetwork()).chainId) !== CHAIN_ID) throw new Error(`Wrong network: expected chain ${CHAIN_ID}.`);
  if (await readProvider.getCode(CONTRACT_ADDRESS) === '0x') throw new Error('Contract not found on this network. Deploy again after resetting the local node.');
  return new Contract(CONTRACT_ADDRESS, ABI, readProvider);
}
export async function getWriteContract(expectedAddress) {
  validateConfig();
  const provider = await getProvider();
  if (Number((await provider.getNetwork()).chainId) !== CHAIN_ID) throw new Error(`Wrong network: switch MetaMask to chain ${CHAIN_ID}.`);
  const accounts = await provider.send('eth_accounts',[]);
  if (!accounts.length) throw new Error('Wallet disconnected. Connect MetaMask first.');
  if (expectedAddress && accounts[0].toLowerCase() !== expectedAddress.toLowerCase()) throw new Error('Wallet account changed. Retry with the current account.');
  if (await provider.getCode(CONTRACT_ADDRESS) === '0x') throw new Error('Contract not found on this network.');
  return new Contract(CONTRACT_ADDRESS,ABI,await provider.getSigner(accounts[0]));
}
export async function requireFreshProduct(selectedProduct, allowedStatuses) {
  if (!selectedProduct?.product) throw new Error('Select a product before continuing.');
  const product = await (await getReadContract()).getProduct(selectedProduct.product.productId);
  if (!allowedStatuses.includes(Number(product.currentStatus))) throw new Error('This action is not allowed at the current lifecycle stage. Refresh the product.');
  return product;
}
export async function detectRoles(contract,address) {
  const entries = await Promise.all(Object.entries(ROLE_IDS).map(async ([name,role]) => [name,await contract.hasRole(role,address)]));
  return entries.filter(([,enabled]) => enabled).map(([name]) => name);
}
export function compareLogs(a,b) { return a.blockNumber-b.blockNumber || a.transactionIndex-b.transactionIndex || a.index-b.index; }
export async function queryHistory(contract,productId,fromBlock = DEPLOYMENT_BLOCK,toBlock) {
  const end = toBlock ?? await contract.runner.provider.getBlockNumber();
  const logs = [];
  // Bounded requests also work with public RPC providers that cap eth_getLogs ranges.
  for (let start = fromBlock; start <= end; start += 500) {
    const stop = Math.min(start+499,end);
    for (const name of EVENTS) logs.push(...await contract.queryFilter(contract.filters[name](productId),start,stop));
  }
  return logs.sort(compareLogs).map(log => ({
    event: log.fragment.name, blockNumber:log.blockNumber, transactionIndex:log.transactionIndex,index:log.index,transactionHash:log.transactionHash,
    fields: Object.fromEntries(log.fragment.inputs.map((input,i) => [input.name,log.args[i].toString()])),
  }));
}
export async function trackProduct(mode,query,contract,fromBlock = DEPLOYMENT_BLOCK) {
  contract ||= await getReadContract();
  const productId = mode === 'trackingNumber' ? await contract.getProductIdByTrackingNumber(query.trim()) : uint(query.trim());
  const blockTag = await contract.runner.provider.getBlockNumber();
  const product = await contract.getProduct(productId,{blockTag});
  const timeline = await queryHistory(contract,productId,fromBlock,blockTag);
  return { product, timeline };
}
export function toReadableError(error) {
  const code = error?.code ?? error?.info?.error?.code;
  if (code === 'ACTION_REJECTED' || code === 4001 || error?.info?.error?.code === 4001) return 'Transaction rejected in MetaMask. No change was submitted.';
  let message = error?.reason || error?.shortMessage || error?.message || 'Unknown error';
  const data = error?.data || error?.info?.error?.data;
  try { if (typeof data === 'string' && new Interface(ABI).parseError(data)?.name === 'AccessControlUnauthorizedAccount') return 'This account does not have the required role.'; } catch { /* retain original message */ }
  if (/AccessControlUnauthorizedAccount/.test(message)) return 'This account does not have the required role.';
  const messages = {
    'Product does not exist':'Product not found. Check the Product ID.',
    'Product already exists':'This Product ID is already registered.',
    'Quantity must be greater than zero':'Quantity must be greater than zero.',
    'Quantity mismatch':'Quantity must match the original product quantity.',
    'Tracking number already used':'This tracking number is already assigned to a product.',
    'Unknown tracking number':'Tracking number not found.',
  };
  for (const [reason,text] of Object.entries(messages)) if (message.includes(reason)) return text;
  if (/Invalid status/.test(message)) return 'This action is not allowed at the current lifecycle stage. Check the product timeline.';
  if (/required/i.test(message)) return message;
  return message;
}
