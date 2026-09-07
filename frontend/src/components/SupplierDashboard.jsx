import React, { useState } from "react";
import { getWriteContract, toReadableError } from "../services/contractService";

/**
 * SKELETON — Supplier dashboard. Logic left for Codex (Phase 2).
 * Action: createProduct(productId, name, quantity)  [SUPPLIER_ROLE]
 */
export default function SupplierDashboard() {
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  async function handleCreateProduct(event) {
    event.preventDefault();
    // TODO(codex): const contract = await getWriteContract();
    // TODO(codex): await (await contract.createProduct(productId, name, quantity)).wait();
    // TODO(codex): surface tx hash + success / toReadableError(err)
  }

  return (
    <section>
      <h2>Supplier</h2>
      <form onSubmit={handleCreateProduct}>
        <input placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button type="submit">Create Product</button>
      </form>
    </section>
  );
}
