# Phase 2 verification — 2026-09-08

Phase 2 implementation was already present in the working tree at the start of this run. Reviewed it and performed fresh installation, compilation, tests, deployment, seeding and frontend build. No smart-contract change was needed; `git diff --exit-code -- contracts/SupplyChain.sol` returned 0.

Results: 76 contract tests passing, zero failing; 13 frontend tests passing, zero failing/skipped (including live local integration). The intentional rejected-wallet test logs ACTION_REJECTED to stderr; that is expected debug output, not a failed test.

Modified/added this run: ../00_Progress_Tracker.md, this report, captured verification/*.txt, and deployment-generated frontend/src/config/deployment.json and frontend/src/abi/SupplyChain.json (same local address/block and ABI). Existing Phase 2 changes are inventoried below separately to preserve their provenance.

Sepolia support was inspected, not executed. Funded separate accounts and RPC credentials are required. Actual MetaMask extension approval/rejection is a manual demo check; automated wallet tests use a mocked EIP-1193 provider. The local node remains running at 127.0.0.1:8545 for inspection.

Local commands (repository root; node in a separate terminal):
```sh
npx hardhat node --hostname 127.0.0.1
npm run deploy:local
npm run seed:local
cd frontend
npm run dev
```
Search 1001 / DEMO-1001. A newly started node must be redeployed and reseeded.

Sepolia commands (after setting root .env keys/RPC and funding all five accounts):
```sh
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/seed-demo-data.js --network sepolia
cd frontend
# Set frontend/.env VITE_RPC_URL, then:
npm run build
```

## Actual terminal outputs

The following blocks are read directly from this run's captured outputs. ANSI color escapes alone are removed for readability. Full raw captures remain alongside this file.

## root-install

```text

up to date in 14s

126 packages are looking for funding
  run `npm fund` for details

```


## frontend-install

```text

up to date in 4s

26 packages are looking for funding
  run `npm fund` for details

```


## compile

```text
Nothing to compile

```


## compile-force

```text
Compiled 6 Solidity files successfully (evm target: paris).

```


## contract-tests

```text

  SupplyChain product lifecycle
    √ runs the full separate-account lifecycle with exact events and state at every stage
    √ rejects duplicate product IDs without overwriting state

  SupplyChain quantity invariants
    √ rejects zero quantity
    √ stores positive quantity
    √ rejects quantity 0 at entry
    √ rejects quantity 0 at delivery
    √ rejects quantity 9 at entry
    √ rejects quantity 9 at delivery
    √ rejects quantity 11 at entry
    √ rejects quantity 11 at delivery
    √ accepts exact quantities and emits stored quantity on exit

  SupplyChain roles and access control
    √ bootstraps only the admin role on the deployer
    √ admin grants and revokes SUPPLIER_ROLE
    √ non-admin cannot grantRole SUPPLIER_ROLE
    √ non-admin cannot revokeRole SUPPLIER_ROLE
    √ admin grants and revokes WAREHOUSE_ROLE
    √ non-admin cannot grantRole WAREHOUSE_ROLE
    √ non-admin cannot revokeRole WAREHOUSE_ROLE
    √ admin grants and revokes TRANSPORT_ROLE
    √ non-admin cannot grantRole TRANSPORT_ROLE
    √ non-admin cannot revokeRole TRANSPORT_ROLE
    √ admin grants and revokes RETAILER_ROLE
    √ non-admin cannot grantRole RETAILER_ROLE
    √ non-admin cannot revokeRole RETAILER_ROLE
    √ allows the correct role to createProduct
    √ rejects every other role and revoked role for createProduct
    √ allows the correct role to recordWarehouseEntry
    √ rejects every other role and revoked role for recordWarehouseEntry
    √ allows the correct role to recordWarehouseExit
    √ rejects every other role and revoked role for recordWarehouseExit
    √ allows the correct role to recordPickup
    √ rejects every other role and revoked role for recordPickup
    √ allows the correct role to updateTransportLocation
    √ rejects every other role and revoked role for updateTransportLocation
    √ allows the correct role to confirmDelivery
    √ rejects every other role and revoked role for confirmDelivery

  SupplyChain state transitions
    √ rejects unknown product in recordWarehouseEntry
    √ rejects unknown product in recordWarehouseExit
    √ rejects unknown product in recordPickup
    √ rejects unknown product in updateTransportLocation
    √ rejects unknown product in confirmDelivery
    √ rejects unknown product reads
    √ rejects recordWarehouseExit from status 0
    √ rejects recordPickup from status 0
    √ rejects updateTransportLocation from status 0
    √ rejects confirmDelivery from status 0
    √ rejects recordWarehouseEntry from status 1
    √ rejects recordPickup from status 1
    √ rejects updateTransportLocation from status 1
    √ rejects confirmDelivery from status 1
    √ rejects recordWarehouseEntry from status 2
    √ rejects recordWarehouseExit from status 2
    √ rejects updateTransportLocation from status 2
    √ rejects confirmDelivery from status 2
    √ rejects recordWarehouseEntry from status 3
    √ rejects recordWarehouseExit from status 3
    √ rejects recordPickup from status 3
    √ rejects confirmDelivery from status 3
    √ rejects recordWarehouseEntry from status 4
    √ rejects recordWarehouseExit from status 4
    √ rejects recordPickup from status 4
    √ rejects recordWarehouseEntry from status 5
    √ rejects recordWarehouseExit from status 5
    √ rejects recordPickup from status 5
    √ rejects updateTransportLocation from status 5
    √ rejects confirmDelivery from status 5
    √ rejects empty field: Name required
    √ rejects empty field: Warehouse ID required
    √ rejects empty field: Tracking number required
    √ rejects empty field: Driver ID required
    √ rejects empty field: Location required
    √ rejects empty field: Shop ID required

  SupplyChain tracking numbers
    √ assigns tracking number and resolves product ID including ID zero
    √ rejects reuse across products and accepts distinct tracking numbers
    √ rejects lookup: Tracking number required
    √ rejects lookup: Unknown tracking number

·-------------------------------------------|---------------------------|-------------|-----------------------------·
|           Solc version: 0.8.24            ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 60000000 gas  │
············································|···························|·············|······························
|  Methods                                                                                                          │
················|···························|·············|·············|·············|···············|··············
|  Contract     ·  Method                   ·  Min        ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  confirmDelivery          ·      37417  ·      37477  ·      37468  ·           13  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  createProduct            ·     146750  ·     166662  ·     166313  ·           57  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  grantRole                ·      51428  ·      51440  ·      51434  ·            4  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  recordPickup             ·      83879  ·     103791  ·     103141  ·           31  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  recordWarehouseEntry     ·      54556  ·      54568  ·      54568  ·           45  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  recordWarehouseExit      ·      35556  ·      35568  ·      35568  ·           40  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  revokeRole               ·      29530  ·      29542  ·      29536  ·           10  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  SupplyChain  ·  updateTransportLocation  ·      35378  ·      37990  ·      37661  ·           24  ·          -  │
················|···························|·············|·············|·············|···············|··············
|  Deployments                              ·                                         ·  % of limit   ·             │
············································|·············|·············|·············|···············|··············
|  SupplyChain                              ·          -  ·          -  ·    1549808  ·        2.6 %  ·          -  │
·-------------------------------------------|-------------|-------------|-------------|---------------|-------------·

  76 passing (4s)


```


## local-deploy

```text
SupplyChain deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Deployment block: 1
Chain ID: 31337
Deployment transaction: 0xaa9f82f69f11fbfd312204c32422a318c51f2ce180bafcc2469319ff60874dcf
Frontend configuration exported: D:\project\Block Chain\supply-chain-blockchain\frontend\src\config\deployment.json

```


## local-seed

```text
Grant SUPPLIER_ROLE to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8: 0x7e94154bc2b1b31bf630fd2b0b392ca75ef4e790b6a8af66d234baacb0e05b08 (block 2)
Grant WAREHOUSE_ROLE to 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC: 0x0ed6633dc77a92eeae3b807e4d81fdd64e506dd0203fdd4345ba8e99c814f408 (block 3)
Grant TRANSPORT_ROLE to 0x90F79bf6EB2c4f870365E785982E1f101E93b906: 0x15af3b4eff41f4b363f3b163e82b392d0cee7b44e12d57e12cc402e93ad922d6 (block 4)
Grant RETAILER_ROLE to 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65: 0x83206643f7a5f9b5f889ee03eac10804ee4f0af30fad808ef8da5db7cdcae35e (block 5)
Create: 0xc2dacfcdd3505fbbfecc55073a559721f84db008d4a4e53437e9f616fcdddea2 (block 6)
Warehouse entry: 0x22bd3cd6bc98b961b02d973513311c5fc9a339f20fc7b93bf08a405497e128f5 (block 7)
Warehouse exit: 0x28bd7a38b97a6fbef1502f2f562387b26948b5adba4554f0a3c1bac0597021d7 (block 8)
Pickup: 0x154662284115346776ee1004adc3f168a87edd721a82fa0fc2d9c13d00da92e7 (block 9)
Location update: 0x2708074679751b3bf6c4b7125f4509d4d73978b66dce5155e0609f5954915bfb (block 10)
Location update: 0xe7198572e9bd091410dcd65cc35e2615afcce6db63c5c94aa45d51d018ac8dd3 (block 11)
Delivery: 0x0147f29cbd887c4b05fab7cdfbffee8cc23db7c8410578b85a670db6232ab65a (block 12)
Final product: {
  "productId": "1001",
  "name": "Fictional orchard tea",
  "quantity": "10",
  "supplier": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "createdAt": "1788838188",
  "currentStatus": "5",
  "trackingNumber": "DEMO-1001"
}

```


## frontend-tests

```text

> supply-chain-frontend@1.0.0 test
> vitest run


 RUN  v3.2.7 D:/project/Block Chain/supply-chain-blockchain/frontend

 ✓ src/services/contractService.test.js (6 tests) 19ms
stdout | src/services/local.integration.test.js > live local deployment integration > reads the seeded Delivered product and identical seven-event timelines through both searches
Live contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3 deployment block: 1 status: Delivered, matching timeline events: 7

 ✓ src/services/local.integration.test.js (1 test) 384ms
   ✓ live local deployment integration > reads the seeded Delivered product and identical seven-event timelines through both searches  383ms
node.exe : stderr | src/frontend.test.jsx > dashboard transactions > shows a readable rejected-transaction error and re
stores the form
所在位置 C:\nvm4w\nodejs\npm.ps1:29 字符: 3
+   & $NODE_EXE $NPM_CLI_JS $args
+   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (stderr | src/fr...stores the form:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
Contract transaction failed { code: 'ACTION_REJECTED' }

 ✓ src/frontend.test.jsx (6 tests) 326ms

 Test Files  3 passed (3)
      Tests  13 passed (13)
   Start at  15:29:52
   Duration  3.10s (transform 254ms, setup 0ms, collect 1.45s, tests 730ms, environment 1.36s, prepare 981ms)


```


## frontend-build

```text

> supply-chain-frontend@1.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 181 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.37 kB │ gzip:   0.27 kB
dist/assets/index-27f79zwY.css    1.11 kB │ gzip:   0.59 kB
dist/assets/index-DkDV7Q-M.js   432.22 kB │ gzip: 150.57 kB
✓ built in 1.81s

```

## Working-tree file inventory (includes pre-existing Phase 2 work)

```text
 M .env.example
 M README.md
 M frontend/src/App.jsx
 M frontend/src/components/AdminPanel.jsx
 M frontend/src/components/ConnectWallet.jsx
 M frontend/src/components/RetailerDashboard.jsx
 M frontend/src/components/SupplierDashboard.jsx
 M frontend/src/components/TrackProduct.jsx
 M frontend/src/components/TransportDashboard.jsx
 M frontend/src/components/WarehouseDashboard.jsx
 M frontend/src/hooks/useWallet.js
 M frontend/src/services/contractService.js
 M scripts/deploy.js
 M scripts/seed-demo-data.js
 M test/SupplyChain.productFlow.test.js
 M test/SupplyChain.quantityInvariants.test.js
 M test/SupplyChain.roles.test.js
 M test/SupplyChain.stateTransitions.test.js
 M test/SupplyChain.trackingNumber.test.js
?? baseline-compile.txt
?? baseline-install.txt
?? first-tests.txt
?? frontend-install.txt
?? frontend/.env.example
?? frontend/index.html
?? frontend/package-lock.json
?? frontend/package.json
?? frontend/src/abi/
?? frontend/src/components/TransactionForm.jsx
?? frontend/src/config/
?? frontend/src/frontend.test.jsx
?? frontend/src/main.jsx
?? frontend/src/services/contractService.test.js
?? frontend/src/services/local.integration.test.js
?? frontend/src/styles.css
?? local-deploy.txt
?? local-node.txt
?? local-seed.txt
?? test/helpers.js
?? verification/
```

