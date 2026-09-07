import { BrowserProvider, Contract } from "ethers";

/**
 * SKELETON — central contract access layer. Implementation left for Codex (Phase 2).
 *
 * Responsibilities (Phase 2):
 *  - hold the deployed contract address + deployment block
 *    (from import.meta.env.VITE_CONTRACT_ADDRESS / VITE_DEPLOYMENT_BLOCK)
 *  - import the compiled ABI from ../../artifacts (or a copied abi.json)
 *  - expose getReadContract() (provider) and getWriteContract() (signer)
 *  - map common revert reasons / MetaMask errors to readable UI messages
 *  - expose the deployment block for use as `fromBlock` in queryFilter on Sepolia
 */

export const CONTRACT_ADDRESS = import.meta.env?.VITE_CONTRACT_ADDRESS || "";
export const DEPLOYMENT_BLOCK = Number(import.meta.env?.VITE_DEPLOYMENT_BLOCK || 0);

// TODO(codex): import ABI, e.g.
// import SupplyChainArtifact from "../abi/SupplyChain.json";
// export const ABI = SupplyChainArtifact.abi;
export const ABI = [];

export async function getProvider() {
  // TODO(codex): return new BrowserProvider(window.ethereum)
  throw new Error("contractService.getProvider — not implemented yet (Phase 2 / Codex)");
}

export async function getReadContract() {
  // TODO(codex): new Contract(CONTRACT_ADDRESS, ABI, provider)
  throw new Error("contractService.getReadContract — not implemented yet (Phase 2 / Codex)");
}

export async function getWriteContract() {
  // TODO(codex): new Contract(CONTRACT_ADDRESS, ABI, await provider.getSigner())
  throw new Error("contractService.getWriteContract — not implemented yet (Phase 2 / Codex)");
}

export function toReadableError(error) {
  // TODO(codex): translate ACTION_REJECTED / revert strings / wrong-network into UI copy
  return error?.message || "Unknown error";
}
