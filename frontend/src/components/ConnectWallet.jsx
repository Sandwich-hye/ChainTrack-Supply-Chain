import React from "react";
import { useWallet } from "../hooks/useWallet";

/**
 * SKELETON — MetaMask connect button. Logic left for Codex (Phase 2).
 */
export default function ConnectWallet() {
  const { address, chainId, connect, disconnect } = useWallet();

  // TODO(codex): show network warning when chainId is not the expected one
  // TODO(codex): show a truncated address + disconnect when connected

  if (address) {
    return (
      <button type="button" onClick={disconnect}>
        {address.slice(0, 6)}…{address.slice(-4)} (disconnect)
      </button>
    );
  }

  return (
    <button type="button" onClick={connect}>
      Connect MetaMask
    </button>
  );
}
