import React, { useEffect, useRef } from 'react';
import { CHAIN_ID, shortAddress } from '../services/contractService';

export const networkName = id => id === 31337 ? 'Hardhat Local' : id === 11155111 ? 'Sepolia' : `Chain ${id}`;

export default function ConnectWallet({wallet}) {
  const menu = useRef(null);
  // The chip toggles natively via <details>; outside pointer presses and Escape also close it.
  useEffect(() => {
    const close = () => { if (menu.current?.open) menu.current.open = false; };
    const onPointer = event => { if (menu.current && !menu.current.contains(event.target)) close(); };
    const onKey = event => { if (event.key === 'Escape' && menu.current?.open) { close(); menu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown',onPointer); document.addEventListener('keydown',onKey);
    return () => { document.removeEventListener('pointerdown',onPointer); document.removeEventListener('keydown',onKey); };
  },[]);
  const wrongNetwork = wallet.chainId && wallet.chainId !== CHAIN_ID;
  if (!wallet.address) return <div className="wallet" aria-label="Wallet and network"><button disabled={wallet.busy} onClick={wallet.connect}>{wallet.busy ? 'Connecting…' : 'Connect MetaMask'}</button></div>;
  const roleSummary = wallet.busy ? 'Checking roles…' : wrongNetwork ? 'Wrong network' : wallet.roles.length ? wallet.roles.join(' · ') : wallet.error ? 'Roles unavailable' : 'No business roles';
  return <details className="wallet" aria-label="Wallet and network" ref={menu}>
    <summary className="wallet-summary">
      <strong className="wallet-roles">{roleSummary}</strong>
      <span className="address">{shortAddress(wallet.address)}</span>
      <span className={`wallet-network${wrongNetwork ? ' is-warning' : ''}`}>{networkName(wallet.chainId)} · {wallet.chainId}</span>
    </summary>
    <div className="wallet-panel">
      <dl className="wallet-details">
        <dt>Wallet</dt><dd className="address">{wallet.address}</dd>
        <dt>Network</dt><dd><span className={`badge ${wrongNetwork ? 'badge-warning' : 'badge-neutral'}`}>{networkName(wallet.chainId)} · {wallet.chainId}</span>{wrongNetwork && <small className="network-target">Expected: {networkName(CHAIN_ID)} · {CHAIN_ID}</small>}</dd>
        <dt>Roles</dt><dd className="role-list">{wallet.roles.length ? wallet.roles.map(role => <span className="badge badge-neutral" key={role}>{role}</span>) : roleSummary}</dd>
      </dl>
      <div className="button-group"><button className="button-secondary" disabled={wallet.busy} onClick={() => wallet.refresh()}>Refresh roles</button><button className="button-secondary" onClick={wallet.disconnect}>Disconnect</button></div>
    </div>
  </details>;
}
