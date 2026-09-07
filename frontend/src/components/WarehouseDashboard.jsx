import React, { useState } from "react";
import { getWriteContract, toReadableError } from "../services/contractService";

/**
 * SKELETON — Warehouse dashboard. Logic left for Codex (Phase 2).
 * Actions:
 *  - recordWarehouseEntry(productId, warehouseId, quantity)  [WAREHOUSE_ROLE]
 *  - recordWarehouseExit(productId)                          [WAREHOUSE_ROLE]
 *
 * NOTE: warehouse exit takes ONLY the product ID — do not re-ask for
 * warehouseId or quantity on exit.
 */
export default function WarehouseDashboard() {
  const [entryProductId, setEntryProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [entryQuantity, setEntryQuantity] = useState("");
  const [exitProductId, setExitProductId] = useState("");

  async function handleWarehouseEntry(event) {
    event.preventDefault();
    // TODO(codex): await contract.recordWarehouseEntry(entryProductId, warehouseId, entryQuantity)
  }

  async function handleWarehouseExit(event) {
    event.preventDefault();
    // TODO(codex): await contract.recordWarehouseExit(exitProductId)
  }

  return (
    <section>
      <h2>Warehouse</h2>

      <form onSubmit={handleWarehouseEntry}>
        <h3>Record entry</h3>
        <input placeholder="Product ID" value={entryProductId} onChange={(e) => setEntryProductId(e.target.value)} />
        <input placeholder="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <input placeholder="Quantity" value={entryQuantity} onChange={(e) => setEntryQuantity(e.target.value)} />
        <button type="submit">Record Entry</button>
      </form>

      <form onSubmit={handleWarehouseExit}>
        <h3>Record exit</h3>
        <input placeholder="Product ID" value={exitProductId} onChange={(e) => setExitProductId(e.target.value)} />
        <button type="submit">Record Exit</button>
      </form>
    </section>
  );
}
