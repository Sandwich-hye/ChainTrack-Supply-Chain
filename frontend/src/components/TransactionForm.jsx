import React, { useState } from 'react';
import { getWriteContract, toReadableError, uint, ROLE_IDS, BUSINESS_ROLES } from '../services/contractService';
import { isAddress } from 'ethers';
export default function TransactionForm({title,description,method,fields,address,onSuccess,prepare,confirmation,generatedFields = [],disabled = false}) {
  const [values,setValues] = useState({}); const [confirmed,setConfirmed] = useState(false); const [pending,setPending] = useState(false); const [hash,setHash] = useState(''); const [message,setMessage] = useState(''); const [error,setError] = useState('');
  async function submit(event) {
    event.preventDefault(); if (pending || disabled) return;
    setError(''); setHash(''); setPending(true); setMessage('Waiting for wallet approval…');
    let transactionConfirmed = false;
    try {
      if (confirmation && !confirmed) throw new Error('Confirm the full expected quantity was physically received.');
      const supplied = fields.map(field => {
        const value = String(values[field.name] ?? field.options?.[0] ?? '').trim();
        if (!value) throw new Error(`${field.label} required`);
        if (field.type === 'uint') return uint(value,field.label,field.positive);
        if (field.type === 'address' && !isAddress(value)) throw new Error('Enter a valid Ethereum account address.');
        if (field.type === 'role') { if (!BUSINESS_ROLES.includes(value)) throw new Error('Invalid business role.'); return ROLE_IDS[value]; }
        return value;
      });
      const args = prepare ? await prepare(supplied) : supplied;
      const contract = await getWriteContract(address); const tx = await contract[method](...args); setHash(tx.hash); setMessage('Transaction submitted. Waiting for confirmation…');
      let receipt;
      try { receipt = await tx.wait(); } catch (e) { if (e.code !== 'TRANSACTION_REPLACED' || e.cancelled) throw e; receipt = e.receipt; }
      if (!receipt || receipt.status !== 1) throw new Error('Transaction failed.');
      transactionConfirmed = true; setHash(receipt.hash); setMessage('Transaction confirmed.');
      await onSuccess?.(receipt,args);
      setValues({}); setConfirmed(false);
    } catch (e) { console.error('Contract transaction failed or refresh failed',e); setError(transactionConfirmed ? `Transaction confirmed, but product refresh failed: ${toReadableError(e)}` : toReadableError(e)); if (!transactionConfirmed) setMessage(''); }
    finally { setPending(false); }
  }
  return <form className={`transaction-form ${method === 'revokeRole' ? 'revoke-form' : ''}`} onSubmit={submit}><h3>{title}</h3>{description && <p className="form-description">{description}</p>}<fieldset disabled={pending}>
    {generatedFields.map(field => <label key={field.label}>{field.label}<input readOnly value={field.value ?? ''} placeholder={field.placeholder || 'Generating…'}/></label>)}
    {fields.map(field => <label key={field.name}>{field.label}{field.options ? <select value={values[field.name] ?? field.options[0]} onChange={e => setValues({...values,[field.name]:e.target.value})}>{field.options.map(v => <option key={v}>{v}</option>)}</select> : <input required type={field.inputType || (field.type === 'uint' && field.positive ? 'number' : 'text')} min={field.min} step={field.step} inputMode={field.type === 'uint' ? 'numeric' : 'text'} placeholder={field.placeholder} value={values[field.name] || ''} onChange={e => setValues({...values,[field.name]:e.target.value})}/>}</label>)}
    {confirmation && <label className="quantity-confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>{confirmation}</label>}
    <button disabled={disabled || (confirmation && !confirmed)} className={method === 'revokeRole' ? 'button-danger' : undefined} type="submit">{pending ? 'Pending…' : title}</button></fieldset><p className={pending ? 'notice-pending' : 'notice-success'} role="status">{message}</p>{hash && <p className="hash">Transaction: {hash}</p>}{error && <p role="alert">{error}</p>}
  </form>;
}
export const productId = {name:'productId',label:'Product ID',type:'uint'};
export const quantity = {name:'quantity',label:'Quantity',type:'uint',positive:true};
