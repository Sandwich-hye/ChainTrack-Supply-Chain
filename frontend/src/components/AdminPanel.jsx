import React, { useState } from "react";
import { getWriteContract, toReadableError } from "../services/contractService";

/**
 * SKELETON — Admin panel. Logic left for Codex (Phase 2).
 *
 * Uses the built-in AccessControl grantRole / revokeRole.
 *
 * IMPORTANT: this panel must expose ONLY the four business roles
 * (SUPPLIER_ROLE, WAREHOUSE_ROLE, TRANSPORT_ROLE, RETAILER_ROLE).
 * It must NOT provide any control for granting or revoking DEFAULT_ADMIN_ROLE.
 */
const BUSINESS_ROLES = ["SUPPLIER_ROLE", "WAREHOUSE_ROLE", "TRANSPORT_ROLE", "RETAILER_ROLE"];

export default function AdminPanel() {
  const [account, setAccount] = useState("");
  const [role, setRole] = useState(BUSINESS_ROLES[0]);

  async function handleGrant(event) {
    event.preventDefault();
    // TODO(codex): const roleHash = await contract[role]();
    // TODO(codex): await contract.grantRole(roleHash, account)
  }

  async function handleRevoke(event) {
    event.preventDefault();
    // TODO(codex): await contract.revokeRole(roleHash, account)
  }

  return (
    <section>
      <h2>Admin</h2>
      <form>
        <input placeholder="Account address" value={account} onChange={(e) => setAccount(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {BUSINESS_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="button" onClick={handleGrant}>Grant</button>
        <button type="button" onClick={handleRevoke}>Revoke</button>
      </form>
    </section>
  );
}
