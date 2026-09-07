import React, { useState } from "react";
import { getWriteContract, toReadableError } from "../services/contractService";

/**
 * SKELETON — Transport dashboard. Logic left for Codex (Phase 2).
 * Actions:
 *  - recordPickup(productId, trackingNumber, driverId)   [TRANSPORT_ROLE]
 *  - updateTransportLocation(productId, location)        [TRANSPORT_ROLE]
 *
 * NOTE: there is NO status dropdown — updateTransportLocation always sets
 * InTransit on-chain. The UI only collects a location string.
 */
export default function TransportDashboard() {
  const [pickupProductId, setPickupProductId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [driverId, setDriverId] = useState("");
  const [locationProductId, setLocationProductId] = useState("");
  const [location, setLocation] = useState("");

  async function handlePickup(event) {
    event.preventDefault();
    // TODO(codex): await contract.recordPickup(pickupProductId, trackingNumber, driverId)
  }

  async function handleLocationUpdate(event) {
    event.preventDefault();
    // TODO(codex): await contract.updateTransportLocation(locationProductId, location)
  }

  return (
    <section>
      <h2>Transport</h2>

      <form onSubmit={handlePickup}>
        <h3>Record pickup</h3>
        <input placeholder="Product ID" value={pickupProductId} onChange={(e) => setPickupProductId(e.target.value)} />
        <input placeholder="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
        <input placeholder="Driver ID" value={driverId} onChange={(e) => setDriverId(e.target.value)} />
        <button type="submit">Record Pickup</button>
      </form>

      <form onSubmit={handleLocationUpdate}>
        <h3>Update location</h3>
        <input placeholder="Product ID" value={locationProductId} onChange={(e) => setLocationProductId(e.target.value)} />
        <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <button type="submit">Update Location</button>
      </form>
    </section>
  );
}
