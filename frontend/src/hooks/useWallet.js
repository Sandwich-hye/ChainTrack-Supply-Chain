import { useCallback, useEffect, useState } from "react";

/**
 * SKELETON — wallet connection hook. Implementation left for Codex (Phase 2).
 *
 * Responsibilities (Phase 2):
 *  - connect via window.ethereum (MetaMask), expose address + signer
 *  - detect network / chainId (warn when not on the expected network)
 *  - listen for `accountsChanged` and `chainChanged` and update state
 *  - handle disconnect / locked wallet
 *  - derive `roles` by calling `hasRole` for each of the four business roles
 *    (SUPPLIER_ROLE, WAREHOUSE_ROLE, TRANSPORT_ROLE, RETAILER_ROLE) plus
 *    DEFAULT_ADMIN_ROLE — an account may hold several.
 */
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [roles, setRoles] = useState([]);

  const connect = useCallback(async () => {
    // TODO(codex): request accounts, build BrowserProvider, set address/chainId
    throw new Error("useWallet.connect — not implemented yet (Phase 2 / Codex)");
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setRoles([]);
  }, []);

  useEffect(() => {
    // TODO(codex): subscribe to accountsChanged / chainChanged; cleanup on unmount
  }, []);

  return { address, chainId, roles, connect, disconnect };
}
