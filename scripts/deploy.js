const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');
async function main() {
  const contract = await hre.ethers.deployContract('SupplyChain');
  await contract.waitForDeployment();
  const receipt = await contract.deploymentTransaction().wait();
  const network = await hre.ethers.provider.getNetwork();
  const config = { address: await contract.getAddress(), chainId: Number(network.chainId), deploymentBlock: receipt.blockNumber };
  const target = path.join(__dirname, '../frontend/src/config/deployment.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n');
  const abiDir = path.join(__dirname, '../frontend/src/abi');
  fs.mkdirSync(abiDir, { recursive: true });
  fs.writeFileSync(path.join(abiDir, 'SupplyChain.json'), JSON.stringify({ abi: (await hre.artifacts.readArtifact('SupplyChain')).abi }, null, 2) + '\n');
  console.log('SupplyChain deployed to:', config.address);
  console.log('Deployment block:', config.deploymentBlock);
  console.log('Chain ID:', config.chainId);
  console.log('Deployment transaction:', receipt.hash);
  console.log('Frontend configuration exported:', target);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
