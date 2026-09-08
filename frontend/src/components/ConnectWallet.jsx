import React from 'react';
import { CHAIN_ID } from '../services/contractService';
export default function ConnectWallet({wallet}) {
  return <div className="wallet"><p>{wallet.address || 'Wallet not connected'}{wallet.chainId && ` · Chain ${wallet.chainId}`} · Expected chain {CHAIN_ID}</p>
    {wallet.address ? <><button onClick={wallet.disconnect}>Disconnect from app</button><button disabled={wallet.busy} onClick={() => wallet.refresh()}>Refresh roles</button></> : <button disabled={wallet.busy} onClick={wallet.connect}>{wallet.busy ? 'Connecting…' : 'Connect MetaMask'}</button>}
    {wallet.error && <p role="alert">{wallet.error}</p>}{wallet.address && <p>Roles: {wallet.roles.join(', ') || 'No business roles'}</p>}
  </div>;
}
