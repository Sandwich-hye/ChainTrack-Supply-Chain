# Supply Chain Blockchain 鈥?MVP v1

COMP842 Applied Blockchains and Cryptocurrencies 鈥?group project.

A minimal, publicly-verifiable supply-chain tracking system: a supplier registers
a product, a warehouse records entry/exit, a transport company records pickup and
location updates, and a retailer confirms delivery. Every step is written directly
to a smart contract by the participant's own wallet and preserved as an
append-only blockchain event.

> **Status:** Phase 2 implemented. `SupplyChain.sol` remains approved and unchanged. Tests and
> the React frontend are functional; see Phase 2 operation and verification below.

---

## Two-layer architecture

```
React frontend + ethers.js v6 + MetaMask
        |  direct signed transactions / reads
        v
   SupplyChain.sol   (OpenZeppelin AccessControl)
     - mutable current Product state
     - append-only event logs = history
        |
        v
Hardhat local network (development / testing)
Sepolia testnet       (public-verifiability demo)
```

There are exactly two layers: the client (browser + MetaMask) and the contract.
Reads and writes go straight from the user's wallet to the chain.

### Why there is no backend in the MVP

A REST API, database, or off-chain event indexer would add operational surface and
a trusted intermediary without changing what the demo proves. For a single-product
scope the contract itself is the source of truth, and history is reconstructed
live in the browser from events via `queryFilter`. A backend/indexing layer is
noted as future work for production scale, not a gap in the MVP.

---

## Role-based write permissions

Written with OpenZeppelin `AccessControl`. Four business roles:

| Role             | Allowed operations                                    |
|------------------|-------------------------------------------------------|
| `SUPPLIER_ROLE`  | `createProduct`                                       |
| `WAREHOUSE_ROLE` | `recordWarehouseEntry`, `recordWarehouseExit`         |
| `TRANSPORT_ROLE` | `recordPickup`, `updateTransportLocation`             |
| `RETAILER_ROLE`  | `confirmDelivery`                                     |

The deployer receives `DEFAULT_ADMIN_ROLE` in the constructor and manages
participants with the built-in `grantRole()` / `revokeRole()`. There are no custom
registration functions.

Single admin (the deployer), no multi-sig 鈥?documented as a known limitation and
future work.

---

## Public-read visibility on Sepolia

`AccessControl` restricts **state-changing** functions only. On a public network
such as Sepolia, the current product state and all event logs remain **publicly
observable** by anyone.

- Wallet connection and role-aware dashboards are **UI behaviour**, not
  confidentiality controls.
- The `products` mapping is `private` purely for API encapsulation 鈥?this is
  **not** a confidentiality claim.
- Real read-confidentiality would require a permissioned network, or
  encryption / keeping sensitive data off-chain.

---

## Mutable current state vs. immutable historical log

- The `Product` struct stores **mutable current state** 鈥?notably
  `currentStatus`, which is updated in place as the shipment progresses.
- Historical supply-chain records are **append-only blockchain event logs**.
- No function can modify or delete an already emitted event.
- The complete audit trail is reconstructed from the **ordered event stream**,
  not from the current `Product` struct.
- There is intentionally no on-chain `HistoryRecord[]` array.

This is deliberately **not** a claim that "nothing is ever updated".

---

## Scope

- **One product = one shipment = one tracking number.**
- No partial shipments.
- No multi-leg transport.
- `Status.Delivered` is terminal 鈥?no return / refund flow.

Lifecycle:

```
Created -> InWarehouse -> DispatchedFromWarehouse -> PickedUp -> InTransit -> Delivered
```

---

## Local Hardhat development vs. Sepolia demo

- **Local Hardhat network** 鈥?used for the live end-to-end demo and the automated
  test suite. Fast, free, disposable accounts, deterministic.
- **Sepolia testnet** 鈥?used once to prove public verifiability: deploy, run the
  seed script, and show the transactions and events on Etherscan.

---

## Install and compile

Requirements: Node.js 18+ and npm.

```bash
cd supply-chain-blockchain
npm install
npx hardhat compile
```

Run the test suite:

```bash
npx hardhat test
```

Run a local node and deploy (scripts completed in Phase 2):

```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/seed-demo-data.js --network localhost
```

### Environment

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.
RPC URLs, private keys and API keys are read from the environment only 鈥?nothing
is hardcoded in `hardhat.config.js`.

```
SEPOLIA_RPC_URL=...
PRIVATE_KEY=...
ETHERSCAN_API_KEY=...
```

---

## Repository layout

```
supply-chain-blockchain/
鈹溾攢鈹€ contracts/SupplyChain.sol          # fully implemented
鈹溾攢鈹€ scripts/deploy.js                  # implemented (Phase 2)
鈹溾攢鈹€ scripts/seed-demo-data.js          # implemented (Phase 2)
鈹溾攢鈹€ test/                              # 5 contract test suites (Phase 2)
鈹溾攢鈹€ frontend/src/                      # React application (Phase 2)
鈹溾攢鈹€ hardhat.config.js
鈹溾攢鈹€ package.json / package-lock.json
鈹溾攢鈹€ .env.example
鈹斺攢鈹€ README.md
```

## Phase 2 operation

The contract is unchanged from the approved Phase 1 implementation. The five
Hardhat test suites, deployment/seed scripts, and React/ethers application are implemented.
Use Node.js 22 and install root and frontend dependencies separately:

```sh
npm install
npx hardhat compile
npx hardhat test
cd frontend
npm install
npm test
npm run build
```

For a local demo, leave a node running in one terminal:

```sh
npx hardhat node --hostname 127.0.0.1
```

In another terminal, from the repository root:

```sh
npm run deploy:local
npm run seed:local
cd frontend
npm run dev
```

Open the URL printed by Vite. Track Product ID `1001` or tracking number
`DEMO-1001`; both show the same seven-event Delivered history. Connect MetaMask
to localhost RPC `http://127.0.0.1:8545`, chain ID `31337`. Use the local node's
first account as admin, then accounts 2鈥? as Supplier, Warehouse, Transport,
and Retailer respectively. These disposable local accounts are for local demos.
Create a fresh product ID to rehearse the full flow; the seeded product is terminal.
After role grants/revocations use Refresh roles (account/chain changes also refresh).
Disconnect from app clears app state; revoke site access in MetaMask if desired.
Contract authorization remains authoritative even if a dashboard is stale.

Deployment writes `frontend/src/config/deployment.json` and the compiled ABI to
`frontend/src/abi/SupplyChain.json`. Redeploy after resetting the local node;
restart/rebuild the frontend after changing deployments or environment variables.
Public searches use a JSON-RPC provider and work without MetaMask. History queries
start at the deployment block, use 500-block requests, and sort by block,
transaction index, and ethers v6 log `index`. State and history share a block
snapshot. TransportStatusUpdated has no actor field in the approved event shape;
its transaction hash is displayed for transaction-sender inspection.

### Sepolia

Set root `.env`: `SEPOLIA_RPC_URL`, `PRIVATE_KEY` (admin), and the four distinct
business-role keys listed in `.env.example`. Fund all five accounts with Sepolia
ETH before seeding. Do not use real participant data. Then run:

```sh
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/seed-demo-data.js --network sepolia
```

Set `VITE_RPC_URL` in `frontend/.env` to a browser-accessible Sepolia endpoint,
then run `npm run build` in `frontend`. Deployment exports chain 11155111 and its
actual deployment block; never set that block to zero. Frontend env values are
public and must contain no private keys. The script prints every transaction hash
for Etherscan evidence. Re-seeding requires a new `DEMO_PRODUCT_ID`.
Pre-seed before the presentation; reserve just one Sepolia write for the live demo.
Sepolia deployment and real MetaMask signing require human-provided accounts and
are distinct from the automated local verification.

### Verification evidence

See `verification/Phase2-results.md` for actual installation, compilation,
contract tests/gas, frontend tests/build, deployment and seed output. To repeat
the live frontend service test after local deployment/seeding, in PowerShell:

```powershell
cd frontend
$env:RUN_LOCAL_INTEGRATION='true'
npm test
```

Gas evidence can be regenerated from the root with `$env:REPORT_GAS='true'`
followed by `npx hardhat test`. No fiat price service is needed for gas units.

