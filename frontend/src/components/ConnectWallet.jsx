import React from 'react';
import { CHAIN_ID } from '../services/contractService';
export default function ConnectWallet({wallet}) {
  const networkName = id => id === 31337 ? 'Hardhat Local' : id === 11155111 ? 'Sepolia' : `Chain ${id}`;
  const wrongNetwork = wallet.chainId && wallet.chainId !== CHAIN_ID;
  return <div className="wallet" aria-label="Wallet and network">
    <div className="wallet-top"><div><h2>Wallet connection</h2><p className="muted">Connect to perform role-restricted actions.</p></div>
      <div className="button-group">{wallet.address ? <><button className="button-secondary" onClick={wallet.disconnect}>Disconnect from app</button><button className="button-secondary" disabled={wallet.busy} onClick={() => wallet.refresh()}>Refresh roles</button></> : <button disabled={wallet.busy} onClick={wallet.connect}>{wallet.busy ? 'Connecting…' : 'Connect MetaMask'}</button>}</div>
    </div>
    <dl className="wallet-details"><div><dt>Wallet</dt><dd className="address">{wallet.address || 'Wallet not connected'}</dd></div>
      <div><dt>Network</dt><dd><span className={`badge ${wrongNetwork ? 'badge-warning' : 'badge-neutral'}`}>{wallet.chainId ? `${networkName(wallet.chainId)} · ${wallet.chainId}` : 'Not connected'}</span><small className="network-target">Expected: {networkName(CHAIN_ID)} · {CHAIN_ID}</small></dd></div>
      <div><dt>Roles</dt><dd className="role-list">{wallet.busy ? 'Checking wallet…' : wallet.roles.length ? wallet.roles.map(role => <span className="badge badge-neutral" key={role}>{role}</span>) : wallet.address ? (wrongNetwork ? 'Unavailable on this network' : wallet.error ? 'Unable to load roles' : 'No business roles') : 'Connect to view roles'}</dd></div>
    </dl>
    {wallet.error && <p role="alert">{wallet.error}</p>}
    {wallet.address && !wallet.busy && !wallet.error && !wrongNetwork && !wallet.roles.length && <p className="wallet-note">This account has no assigned business roles. Contact an administrator for access to operations.</p>}
  </div>;
}
