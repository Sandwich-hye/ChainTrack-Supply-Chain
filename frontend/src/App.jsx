import React from "react";
import ConnectWallet from "./components/ConnectWallet";
import SupplierDashboard from "./components/SupplierDashboard";
import WarehouseDashboard from "./components/WarehouseDashboard";
import TransportDashboard from "./components/TransportDashboard";
import RetailerDashboard from "./components/RetailerDashboard";
import AdminPanel from "./components/AdminPanel";
import TrackProduct from "./components/TrackProduct";
import { useWallet } from "./hooks/useWallet";

/**
 * SKELETON — layout + wiring only. Business logic is left for Codex (Phase 2).
 *
 * Role-aware dashboards are a UI convenience, NOT a confidentiality control:
 * all product state and event logs remain publicly readable on Sepolia.
 */
export default function App() {
  const { address, roles } = useWallet();

  // TODO(codex): decide which dashboards to show based on `roles`
  //   (an account may hold more than one role — do not assume exactly one).

  return (
    <div className="app">
      <header>
        <h1>Supply Chain Tracker</h1>
        <ConnectWallet />
      </header>

      <main>
        {/* TODO(codex): gate each dashboard on the matching role in `roles` */}
        <SupplierDashboard />
        <WarehouseDashboard />
        <TransportDashboard />
        <RetailerDashboard />
        <AdminPanel />
        <TrackProduct />
      </main>

      <footer>
        <small>Connected: {address || "not connected"}</small>
      </footer>
    </div>
  );
}
