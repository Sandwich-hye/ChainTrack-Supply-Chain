# Supply Chain Blockchain — MVP v1

COMP842 Applied Blockchains and Cryptocurrencies — group project.

A minimal, publicly-verifiable supply-chain tracking system: a supplier registers
a product, a warehouse records entry/exit, a transport company records pickup and
location updates, and a retailer confirms delivery. Every step is written directly
to a smart contract by the participant's own wallet and preserved as an
append-only blockchain event.

> **Status:** Phase 1 scaffold. `SupplyChain.sol` is fully implemented. Tests and
> the React frontend are structured skeletons for Phase 2 (Codex).

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

Single admin (the deployer), no multi-sig — documented as a known limitation and
future work.

---

## Public-read visibility on Sepolia

`AccessControl` restricts **state-changing** functions only. On a public network
such as Sepolia, the current product state and all event logs remain **publicly
observable** by anyone.

- Wallet connection and role-aware dashboards are **UI behaviour**, not
  confidentiality controls.
- The `products` mapping is `private` purely for API encapsulation — this is
  **not** a confidentiality claim.
- Real read-confidentiality would require a permissioned network, or
  encryption / keeping sensitive data off-chain.

---

## Mutable current state vs. immutable historical log

- The `Product` struct stores **mutable current state** — notably
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
- `Status.Delivered` is terminal — no return / refund flow.

Lifecycle:

```
Created -> InWarehouse -> DispatchedFromWarehouse -> PickedUp -> InTransit -> Delivered
```

---

## Local Hardhat development vs. Sepolia demo

- **Local Hardhat network** — used for the live end-to-end demo and the automated
  test suite. Fast, free, disposable accounts, deterministic.
- **Sepolia testnet** — used once to prove public verifiability: deploy, run the
  seed script, and show the transactions and events on Etherscan.

---

## Install and compile

Requirements: Node.js 18+ and npm.

```bash
cd supply-chain-blockchain
npm install
npx hardhat compile
```

Run the (skeleton) test suite:

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
RPC URLs, private keys and API keys are read from the environment only — nothing
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
├── contracts/SupplyChain.sol          # fully implemented
├── scripts/deploy.js                  # skeleton (Phase 2)
├── scripts/seed-demo-data.js          # skeleton (Phase 2)
├── test/                              # 5 skeleton spec files (Phase 2)
├── frontend/src/                      # React skeleton (Phase 2)
├── hardhat.config.js
├── package.json / package-lock.json
├── .env.example
└── README.md
```
