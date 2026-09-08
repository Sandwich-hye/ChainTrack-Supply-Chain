import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAIN_ID, detectRoles, getWriteContract, toReadableError } from '../services/contractService';
export function useWallet() {
  const [state,setState] = useState({address:null,chainId:null,roles:[],error:'',busy:false});
  const generation = useRef(0); const disconnected = useRef(false);
  const refresh = useCallback(async (request = false) => {
    const ticket = ++generation.current;
    setState(s => ({...s,roles:[],busy:true,error:''}));
    try {
      if (!window.ethereum) throw new Error('Install MetaMask to connect a wallet.');
      const accounts = await window.ethereum.request({method:request ? 'eth_requestAccounts' : 'eth_accounts'});
      const chainId = Number(await window.ethereum.request({method:'eth_chainId'}));
      const address = accounts[0] || null;
      if (ticket !== generation.current) return;
      setState({address,chainId,roles:[],busy:true,error:''});
      if (address && chainId !== CHAIN_ID) throw new Error(`Wrong network: switch MetaMask to chain ${CHAIN_ID}.`);
      const roles = address ? await detectRoles(await getWriteContract(address),address) : [];
      if (ticket === generation.current) setState({address,chainId,roles,error:'',busy:false});
    } catch (error) {
      if (ticket === generation.current) setState(s => ({...s,roles:[],busy:false,error:toReadableError(error)}));
    }
  },[]);
  const connect = useCallback(() => { disconnected.current = false; return refresh(true); },[refresh]);
  const disconnect = useCallback(() => { disconnected.current = true; generation.current++; setState({address:null,chainId:null,roles:[],error:'',busy:false}); },[]);
  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet) return;
    const changed = () => { if (!disconnected.current) void refresh(); };
    const lost = () => { generation.current++; setState({address:null,chainId:null,roles:[],error:'Wallet disconnected.',busy:false}); };
    wallet.on('accountsChanged',changed); wallet.on('chainChanged',changed); wallet.on('disconnect',lost);
    void refresh();
    return () => { generation.current++; wallet.removeListener('accountsChanged',changed); wallet.removeListener('chainChanged',changed); wallet.removeListener('disconnect',lost); };
  },[refresh]);
  return {...state,connect,disconnect,refresh};
}
