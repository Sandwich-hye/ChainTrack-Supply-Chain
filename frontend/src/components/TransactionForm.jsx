import React, { useState } from 'react';
import { getWriteContract, toReadableError, uint, ROLE_IDS, BUSINESS_ROLES } from '../services/contractService';
import { isAddress } from 'ethers';
export default function TransactionForm({title,method,fields,address,onSuccess}) {
  const [values,setValues] = useState({}); const [pending,setPending] = useState(false); const [hash,setHash] = useState(''); const [message,setMessage] = useState(''); const [error,setError] = useState('');
  async function submit(event) {
    event.preventDefault(); if (pending) return;
    setError(''); setHash(''); setPending(true); setMessage('Waiting for wallet approval…');
    try {
      const args = fields.map(field => {
        const value = (values[field.name] ?? field.options?.[0] ?? '').trim();
        if (!value) throw new Error(`${field.label} required`);
        if (field.type === 'uint') return uint(value,field.label,field.positive);
        if (field.type === 'address' && !isAddress(value)) throw new Error('Enter a valid Ethereum account address.');
        if (field.type === 'role') { if (!BUSINESS_ROLES.includes(value)) throw new Error('Invalid business role.'); return ROLE_IDS[value]; }
        return value;
      });
      const contract = await getWriteContract(address); const tx = await contract[method](...args); setHash(tx.hash); setMessage('Transaction submitted. Waiting for confirmation…');
      let receipt;
      try { receipt = await tx.wait(); } catch (e) { if (e.code !== 'TRANSACTION_REPLACED' || e.cancelled) throw e; receipt = e.receipt; }
      if (!receipt || receipt.status !== 1) throw new Error('Transaction failed.');
      setHash(receipt.hash); setMessage('Transaction confirmed.'); onSuccess?.();
    } catch (e) { console.error('Contract transaction failed',e); setError(toReadableError(e)); setMessage(''); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}><h3>{title}</h3><fieldset disabled={pending}>
    {fields.map(field => <label key={field.name}>{field.label}{field.options ? <select value={values[field.name] ?? field.options[0]} onChange={e => setValues({...values,[field.name]:e.target.value})}>{field.options.map(v => <option key={v}>{v}</option>)}</select> : <input required inputMode={field.type === 'uint' ? 'numeric' : 'text'} value={values[field.name] || ''} onChange={e => setValues({...values,[field.name]:e.target.value})}/>}</label>)}
    <button type="submit">{pending ? 'Pending…' : title}</button></fieldset><p role="status">{message}</p>{hash && <p className="hash">Transaction: {hash}</p>}{error && <p role="alert">{error}</p>}
  </form>;
}
export const productId = {name:'productId',label:'Product ID',type:'uint'};
export const quantity = {name:'quantity',label:'Quantity',type:'uint',positive:true};
