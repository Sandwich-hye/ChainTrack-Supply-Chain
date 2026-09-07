import React, { useState } from "react";
import { getWriteContract, toReadableError } from "../services/contractService";

/**
 * SKELETON — Retailer dashboard. Logic left for Codex (Phase 2).
 * Action: confirmDelivery(productId, shopId, receivedQuantity)  [RETAILER_ROLE]
 */
export default function RetailerDashboard() {
  const [productId, setProductId] = useState("");
  const [shopId, setShopId] = useState("");
  const [receivedQuantity, setReceivedQuantity] = useState("");

  async function handleConfirmDelivery(event) {
    event.preventDefault();
    // TODO(codex): await contract.confirmDelivery(productId, shopId, receivedQuantity)
  }

  return (
    <section>
      <h2>Retailer</h2>
      <form onSubmit={handleConfirmDelivery}>
        <input placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input placeholder="Shop ID" value={shopId} onChange={(e) => setShopId(e.target.value)} />
        <input placeholder="Received Quantity" value={receivedQuantity} onChange={(e) => setReceivedQuantity(e.target.value)} />
        <button type="submit">Confirm Delivery</button>
      </form>
    </section>
  );
}
