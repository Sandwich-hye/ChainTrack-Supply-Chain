import React, { useState } from "react";
import {
  getReadContract,
  DEPLOYMENT_BLOCK,
  toReadableError,
} from "../services/contractService";

/**
 * SKELETON — Track Product view. Logic left for Codex (Phase 2).
 *
 * This view reconstructs the full audit trail from blockchain EVENTS, not from
 * the current Product struct.
 *
 * TODO(codex) — history reconstruction must support:
 *   1. Search by Product ID.
 *   2. Search by Tracking Number:
 *        - call getProductIdByTrackingNumber(trackingNumber) to resolve the ID
 *        - then follow exactly the same code path as a Product ID search
 *        - both search modes MUST produce an identical timeline for one product.
 *   3. queryFilter across ALL event types:
 *        ProductCreated, WarehouseEntry, WarehouseExit, TransportPickup,
 *        TransportStatusUpdated, GoodsDelivered
 *      On Sepolia, use DEPLOYMENT_BLOCK as `fromBlock` (never scan from genesis).
 *   4. Merge the events from every filter into a single list.
 *   5. Sort by BLOCKCHAIN LOG ORDER, in this precedence:
 *        a. blockNumber
 *        b. transactionIndex
 *        c. event / log index (log.index)
 *      Do NOT sort primarily by the event `timestamp` field.
 *   6. Render all relevant fields per event type in the timeline.
 */
export default function TrackProduct() {
  const [mode, setMode] = useState("productId"); // "productId" | "trackingNumber"
  const [query, setQuery] = useState("");
  const [timeline, setTimeline] = useState([]);

  async function handleSearch(event) {
    event.preventDefault();
    // TODO(codex): resolve productId (directly, or via getProductIdByTrackingNumber)
    // TODO(codex): run queryFilter for every event type from DEPLOYMENT_BLOCK
    // TODO(codex): merge + sort by [blockNumber, transactionIndex, log index]
    // TODO(codex): setTimeline(sortedEvents)
  }

  return (
    <section>
      <h2>Track Product</h2>
      <form onSubmit={handleSearch}>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="productId">Product ID</option>
          <option value="trackingNumber">Tracking Number</option>
        </select>
        <input placeholder="Search value" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit">Search</button>
      </form>

      <ol>
        {timeline.map((entry, i) => (
          <li key={i}>{/* TODO(codex): render per-event-type fields */}</li>
        ))}
      </ol>
    </section>
  );
}
