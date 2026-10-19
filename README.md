# Clothing Supply Chain Tracker

## 1. Project Overview

The Clothing Supply Chain Tracker is a focused blockchain MVP for following one clothing shipment through four operational roles:

```text
Supplier → Warehouse → Transport → Retailer
```

The React frontend reads the current product record and the ordered blockchain event history. Public visitors can track a shipment by its exact Tracking Number without connecting a wallet. Role holders can connect MetaMask to submit the operations allowed for their role.

This is an academic-project-scale demonstration of a shared shipment record, not a commercial inventory or enterprise resource planning platform.

## 2. Why Clothing Supply Chain

Clothing provides a concrete, easy-to-demonstrate shipment: a supplier registers a garment product, a warehouse receives and dispatches it, a transport role picks it up, and a retailer confirms delivery. Product name, quantity, store reference, and shipment status make each handoff visible without requiring a larger business system.

## 3. User Roles

| Role | Current capabilities |
| --- | --- |
| **Admin** | Grants a business role and saves its Business / Account Name through one form with two wallet transactions. Existing names can be edited in the assignment table, and roles can be revoked there. The deploying account receives the contract's admin role. |
| **Supplier** | Creates a product from a name, positive quantity, and destination Retailer. The internal Product ID is generated automatically and the contract issues the Tracking Number (for example `TRK-2026-000001`) at creation. Products created by the connected Supplier account appear in **My Products**. |
| **Warehouse** | Discovers incoming Created shipments, records entry using the stored product quantity and its registered warehouse name, assigns a Transport account, then records warehouse exit. Multiple warehouse accounts can hold the role. |
| **Transport** | Registers drivers under its own account, discovers shipments assigned to that account, and confirms pickup with one of its registered drivers; the shipment keeps the Tracking Number issued at creation. |
| **Retailer** | Discovers incoming shipments assigned to the connected account and confirms delivery using the product's stored quantity and the store's automatic reference. |
| **Public viewer** | Tracks a shipment by exact Tracking Number and reads the current Product Overview, Shipment Journey, and Event History. A wallet is not required for public reads. |

The contract enforces write permissions with OpenZeppelin `AccessControl`. The frontend detects the connected account's roles and only renders the corresponding role dashboards.

Account dropdowns read current role holders and names from the deployed contract. They include every authorized account, omit revoked accounts, and show a shortened address for an unnamed wallet. The Supplier selects a destination Retailer; the Warehouse selects a Transport account. There is no Warehouse selector because any authorized Warehouse may accept a Created shipment. The Transport dashboard's **My Drivers** section registers and lists drivers for the connected Transport wallet, and Pickup uses that same list.

## 4. Supply Chain Workflow

The UI presents the five lifecycle stages as:

```text
Created → In Warehouse → Dispatched → Picked Up → Delivered
```

1. **Created** — the Supplier registers a new product and destination Retailer. The contract stores its name, quantity, supplier and destination addresses, creation time, and initial status.
2. **In Warehouse** — the Warehouse records receipt using the product's existing quantity. A partial or mismatched quantity is rejected.
3. **Dispatched** — the Warehouse assigns a Transport account and records exit. The contract uses the stored quantity and does not ask for a second quantity value.
4. **Picked Up** — the assigned Transport account confirms pickup with the selected driver. The Tracking Number issued at creation is unchanged. The shipment then goes directly to the destination Retailer.
5. **Delivered** — the destination Retailer confirms the full stored quantity. Delivered is terminal in this contract.

The contract still contains a legacy `updateTransportLocation` operation (status `InTransit`). The frontend workflow does not use it, and delivery does not require it.

## 5. Main Features

- Role-based blockchain operations for Admin, Supplier, Warehouse, Transport, and Retailer.
- Automatic Product ID generation when Create Product is submitted, using secure browser randomness and an on-chain existence check. The ID is not a user input.
- Human-readable Tracking Numbers (`TRK-2026-000001`, `TRK-2026-000002`, …) issued by the contract at product creation from an on-chain sequence. One Tracking Number follows the shipment through every stage.
- Product selection shared between Track Shipment and the role dashboards.
- Warehouse Incoming Shipments, Transport Assigned Shipments, and Retailer Incoming Deliveries reconstructed from blockchain events and current Product reads.
- Supplier **My Products** list reconstructed from `ProductCreated` events and current Product reads.
- Fresh on-chain product reads before role actions, so downstream quantity comes from the selected Product.
- Product Details showing the Tracking Number, quantity, supplier, destination Retailer, Transport Company, and current status, with the internal Product ID under Technical Details.
- Shipment Journey showing the five lifecycle stages and the current stage number.
- Event History reconstructed from ordered contract events.
- Track Shipment by exact Tracking Number (trimmed and upper-cased before lookup).
- A local filter on each role list (My Products, the active queues, and History) narrows the products already loaded for that role by Product Name or Tracking Number (case-insensitive, partial). It never searches beyond that role's own list.
- Wallet, account, role, network, loading, error, and disconnection states.
- Public tracking reads without requiring MetaMask.

## 6. Blockchain Architecture

```text
React/Vite frontend
        ↓
ethers.js v6
        ↓
SupplyChain.sol
        ↓
Ethereum-compatible network
```

The frontend uses ethers.js to read from a JSON-RPC provider and to submit signed transactions through MetaMask. MetaMask is needed for interactive browser writes and role detection; it is not needed for public product searches. The frontend is a client application and is not itself a decentralized storage layer.

Hardhat Local is the development and automated-integration network. Sepolia is supported by the deployment configuration for a public-network demonstration when suitable RPC endpoints, accounts, and funds are supplied through environment variables.

The frontend does not use a backend or event indexer. It queries the contract's event logs directly, bounds log requests to 500-block ranges, and orders records by block number, transaction index, and log index.

## 7. Why Blockchain?

Blockchain is useful for this scenario when separate organizational roles need to share an auditable lifecycle record without one participant owning the only authoritative database. Each state-changing handoff produces an event that can be read publicly and ordered from the chain.

A conventional database would be simpler for a single trusted organization. The blockchain adds value here only when multiple parties need a shared record and independent visibility into the handoffs. This MVP keeps the scope deliberately small: one product is one shipment, with one Tracking Number, no partial shipments, and no multi-leg transport.

## 8. Smart Contract / On-chain Records

The contract is [`contracts/SupplyChain.sol`](contracts/SupplyChain.sol). It stores mutable current state in a `Product` struct:

```text
productId, name, quantity, supplier, destinationRetailer,
assignedTransport, createdAt, currentStatus, trackingNumber
```

The Solidity enum names are:

```text
Created
InWarehouse
DispatchedFromWarehouse
PickedUp
InTransit
Delivered
```

### State-changing operations

| Role | Contract operation | Purpose |
| --- | --- | --- |
| Admin | `setBusinessName(account, name)` | Creates or edits a wallet's on-chain name. Unnamed wallets display a shortened address. |
| Transport | `registerDriver(name)` | The contract generates a globally unique internal Driver ID owned by the calling Transport account. The UI shows the driver's name. |
| Supplier | `createProduct(productId, name, quantity, destinationRetailer)` | Creates a non-empty product with a positive quantity, unused ID, and role-bearing destination Retailer, and assigns the next Tracking Number (`TRK-2026-` plus a six-digit sequence from `shipmentCount`). |
| Warehouse | `recordWarehouseEntry(productId, warehouseId, quantity)` | Records full receipt while status is `Created`. |
| Warehouse | `recordWarehouseExit(productId, assignedTransport)` | Assigns a role-bearing Transport account and dispatches an in-warehouse product using its stored quantity. |
| Transport | `recordPickup(productId, driverId)` | The assigned Transport account records one of its own registered drivers while status is `DispatchedFromWarehouse`. The Tracking Number is not changed. |
| Transport | `updateTransportLocation(productId, location)` | Legacy, unused by the frontend. The assigned Transport account records a non-empty location and sets status to `InTransit`. |
| Retailer | `confirmDelivery(productId, shopId, receivedQuantity)` | The destination Retailer confirms full delivery while status is `PickedUp` (or legacy `InTransit`); this sets terminal status `Delivered`. |

The contract's read operations are:

- `getProduct(productId)` — returns the current Product record.
- `getProductIdByTrackingNumber(trackingNumber)` — resolves a Tracking Number to its Product ID.
- `businessNames(account)` — reads a wallet's current registered name.
- `getDrivers(transport)` and `getDriver(driverId)` — read transport-owned drivers.

The append-only events used by the frontend history are:

| Event | Recorded information |
| --- | --- |
| `ProductCreated` | Product ID, supplier, destination Retailer, name, quantity, Tracking Number, timestamp |
| `WarehouseEntry` | Product ID, staff account, warehouse reference, quantity, timestamp |
| `WarehouseExit` | Product ID, staff account, assigned Transport, stored quantity, timestamp |
| `TransportPickup` | Product ID, transport account, the existing Tracking Number, driver reference, timestamp |
| `TransportStatusUpdated` | Product ID, Tracking Number, location, status, timestamp |
| `GoodsDelivered` | Product ID, retailer account, store reference, quantity, timestamp |

The contract has no on-chain `HistoryRecord[]`. Current status is updated in the Product record, while historical handoffs remain in blockchain event logs. Event data is publicly observable on a public network; the contract's `private` mappings are not a confidentiality mechanism.

## 9. Project Structure

```text
supply-chain-blockchain/
├─ contracts/
│  └─ SupplyChain.sol
├─ scripts/
│  ├─ deploy.js
│  └─ seed-demo-data.js
├─ test/
│  ├─ helpers.js
│  ├─ SupplyChain.productFlow.test.js
│  ├─ SupplyChain.quantityInvariants.test.js
│  ├─ SupplyChain.roles.test.js
│  ├─ SupplyChain.stateTransitions.test.js
│  └─ SupplyChain.trackingNumber.test.js
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ config/deployment.json
│  │  ├─ abi/SupplyChain.json
│  │  ├─ services/
│  │  └─ hooks/
│  ├─ package.json
│  └─ index.html
├─ hardhat.config.js
├─ package.json
├─ package-lock.json
├─ .env.example
└─ README.md
```

The deployment script refreshes `frontend/src/config/deployment.json` and `frontend/src/abi/SupplyChain.json` for the deployed contract.

## 10. Local Setup

### Prerequisites

- Node.js 18 or newer and npm.
- MetaMask connected to the local Hardhat network for browser write demonstrations.
- PowerShell on Windows, or an equivalent shell for the same commands.

Install dependencies separately for the root Hardhat project and the frontend:

```powershell
cd "D:\project\Block Chain\supply-chain-blockchain"
npm install
cd frontend
npm install
cd ..
```

Start the local system in this order.

**Terminal 1 — start Hardhat Local and keep it running:**

```powershell
cd "D:\project\Block Chain\supply-chain-blockchain"
npx hardhat node
```

The local JSON-RPC endpoint is `http://127.0.0.1:8545` and the chain ID is `31337`.

**Terminal 2 — deploy and seed from the repository root:**

```powershell
cd "D:\project\Block Chain\supply-chain-blockchain"
npm run deploy:local
npm run seed:local
```

**Terminal 3 — start the frontend:**

```powershell
cd "D:\project\Block Chain\supply-chain-blockchain\frontend"
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`.

Hardhat Local state is ephemeral. Restarting the Hardhat node resets the chain, so deploy again and reseed before using the frontend or live integration test. Do not manually edit the generated deployment address or ABI after deployment. Automatic driver ID generation changes the contract's `registerDriver` signature, so the frontend needs a new contract deployment. The old deployment and its data remain on the chain but are not copied to the new contract. `deploy:local` exports the current ABI and address; `seed:local` grants roles, sets demo names, registers the demo driver, and creates the sample shipment.

## 11. Demo Accounts

Hardhat provides disposable development accounts. The current local role mapping is:

| Account | Development role |
| --- | --- |
| `#0` | Admin / deployer |
| `#1` | Supplier |
| `#2` | Warehouse |
| `#3` | Transport |
| `#4` | Retailer |

These accounts and their credentials are for local development only. Never use Hardhat development accounts or their known private keys with real funds or a real production network. Private keys are intentionally not included in this README.

## 12. Demo Seed Data

[`scripts/seed-demo-data.js`](scripts/seed-demo-data.js) defaults to Product `1001`. On a freshly deployed contract the seeded product receives Tracking Number `TRK-2026-000001` at creation.

The default seeded record is:

| Field | Seeded value |
| --- | --- |
| Product ID (internal) | `1001` |
| Tracking Number | `TRK-2026-000001` |
| Name | `Classic Denim Jacket` |
| Quantity | `10` |
| Warehouse reference | `Auckland Clothing Distribution Centre` |
| Driver | `John` (internal reference generated by the contract) |
| Store reference | `Queen Street Clothing Store` |
| Final status | `Delivered` |

This is demo/test data for the clothing scenario. It is useful for showing public tracking and the five-event history. It is not the fresh clothing lifecycle used by the Phase 4 integration test.

The seed script can take a different ID through `DEMO_PRODUCT_ID`, but a Product ID must not already exist on the deployment. A reset local node requires deployment and seeding again.

## 13. Automated Testing

### Hardhat contract tests

From the repository root:

```powershell
npm test
```

The root suite covers:

- the full separate-account lifecycle and duplicate Product ID protection,
- quantity invariants,
- role grants, revocations, and write authorization,
- invalid status transitions and required fields,
- Tracking Number issue at creation, sequential uniqueness, preservation through pickup and delivery, and exact lookup.
- admin-only account names, multiple warehouse names, unique driver registration, transport ownership, and pickup validation.

The verified root result is **85 passing tests**.

### Frontend tests and live local integration

From `frontend/`:

```powershell
cd frontend
$env:RUN_LOCAL_INTEGRATION = 'true'
npm test
```

With `RUN_LOCAL_INTEGRATION=true`, the three frontend test files cover React dashboard behavior, contract-service behavior, the seeded public tracking read, and the fresh Supplier → Warehouse → Transport → Retailer lifecycle. Hardhat Local must still be running, and the current deployment plus expected seed state must exist.

The verified frontend baseline is:

- **3 test files passed**
- **69 tests passed**
- **0 skipped**
- **Full live local lifecycle passed**

Without the environment variable, the live local integration file is skipped by its existing `skipIf` convention; the unit and component tests remain available.

## 14. Production Build

From `frontend/`:

```powershell
cd frontend
npm run build
```

The verified production build completes successfully with Vite.

## 15. Demonstration Flow

For a short demonstration:

1. Start Hardhat Local, deploy, seed, and start the frontend using the order in [Local Setup](#10-local-setup).
2. In **Track Shipment**, enter Tracking Number `TRK-2026-000001`.
3. Show the Product Overview, the five-stage Shipment Journey, and the ordered Event History.
4. Explain that public tracking works without a wallet connection.
5. Explain the role workflow and show the role-specific dashboard only if a write demonstration is needed.
6. Refer to the automated live integration test for the complete fresh clothing lifecycle using generated identifiers and the separate role accounts.

A long manual MetaMask account-switching demonstration is not required to verify the complete workflow; the live integration test exercises those role transitions automatically against the local blockchain.

## 16. Scope and Limitations

- This is an MVP for an academic project, not a production supply-chain platform.
- Hardhat Local state is ephemeral and disappears when the node is restarted.
- Browser write transactions require MetaMask, the correct network, and an account with the required role.
- Role administration requires an authorized admin account; there is no custom participant-registration workflow.
- The contract models one product as one shipment with one Tracking Number.
- There are no partial shipments, multi-leg transport, returns, refunds, inventory management, e-commerce, or ERP features.
- Delivered is terminal in the current contract.
- Product state and event data are publicly readable on a public network; this MVP does not provide data confidentiality.
- The repository makes no claim of production security, independent audit readiness, operational monitoring, or commercial scalability.

## 17. Verified Baseline

```text
Branch:         ui-polish
Stable commit:  54ac143

Frontend:       18/18 passed
Skipped:        0
Live lifecycle: passed
Build:          passed
```
