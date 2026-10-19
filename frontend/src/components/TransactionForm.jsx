import React, { useState } from 'react';
import { getWriteContract, toReadableError, uint, ROLE_IDS, BUSINESS_ROLES } from '../services/contractService';
import { refreshAfterConfirmation, waitForConfirmedReceipt } from '../services/transactionFlow';
import { isAddress } from 'ethers';
// Options may be a list or a function of the earlier resolved values (e.g. revoke accounts depend on the chosen role).
const optionList = (field,resolved) => field.options ? (typeof field.options === 'function' ? field.options(resolved) : field.options).map(v => typeof v === 'string' ? {label:v,value:v} : v) : null;
function resolveValues(fields,values) {
  const resolved = {};
  for (const field of fields) {
    const options = optionList(field,resolved);
    resolved[field.name] = options ? (options.some(option => option.value === values[field.name]) ? values[field.name] : '') : values[field.name] ?? '';
  }
  return resolved;
}
export default function TransactionForm({title,description,method,fields,address,onSuccess,prepare,confirmation,generatedFields = [],disabled = false,successMessage = 'Transaction confirmed.'}) {
  const [values,setValues] = useState({}); const [confirmed,setConfirmed] = useState(false); const [phase,setPhase] = useState('idle'); const [hash,setHash] = useState(''); const [message,setMessage] = useState(''); const [warning,setWarning] = useState(''); const [error,setError] = useState('');
  const pending = phase !== 'idle';
  const resolved = resolveValues(fields,values);
  const missingOptions = fields.some(field => field.options && !optionList(field,resolved).length);
  const missingSelection = fields.some(field => field.options && !resolved[field.name]);
  async function submit(event) {
    event.preventDefault(); if (pending || disabled) return;
    setError(''); setWarning(''); setHash(''); setPhase('preparing'); setMessage('Preparing transaction…');
    let receipt; let args;
    try {
      if (confirmation && !confirmed) throw new Error('Confirm the full expected quantity was physically received.');
      const supplied = fields.map(field => {
        const value = String(resolved[field.name]).trim();
        if (!value) throw new Error(`${field.label} required`);
        if (field.type === 'uint') return uint(value,field.label,field.positive);
        if (field.type === 'address' && !isAddress(value)) throw new Error('Enter a valid Ethereum account address.');
        if (field.type === 'role') { if (!BUSINESS_ROLES.includes(value)) throw new Error('Invalid business role.'); return ROLE_IDS[value]; }
        return value;
      });
      args = prepare ? await prepare(supplied) : supplied;
      const contract = await getWriteContract(address); setPhase('wallet'); setMessage('Waiting for wallet approval…');
      const tx = await contract[method](...args); setHash(tx.hash); setMessage('Transaction submitted. Waiting for confirmation…');
      setPhase('confirmation'); receipt = await waitForConfirmedReceipt(tx);
    } catch (e) {
      if (e.code === 'CONFIRMATION_UNKNOWN') setWarning(toReadableError(e));
      else setError(toReadableError(e));
      setMessage(''); setPhase('idle'); return;
    }
    setHash(receipt.hash); setPhase('refresh');
    let displayWarning = false;
    try { setMessage(typeof successMessage === 'function' ? successMessage(receipt,args) : successMessage); }
    catch (e) { console.warn('Transaction summary could not be displayed',e); setMessage('Transaction confirmed.'); displayWarning = true; }
    setValues({}); setConfirmed(false);
    const refreshWarning = await refreshAfterConfirmation(() => onSuccess?.(receipt,args));
    if (refreshWarning || displayWarning) setWarning(refreshWarning ? 'Transaction confirmed, but data could not be refreshed.' : 'Transaction confirmed, but its details could not be displayed.');
    setPhase('idle');
  }
  return <form className={`transaction-form ${method === 'revokeRole' ? 'revoke-form' : ''}`} onSubmit={submit}><h3>{title}</h3>{description && <p className="form-description">{description}</p>}<fieldset disabled={pending}>
    {generatedFields.map(field => <div className="read-only-field" key={field.label}><span>{field.label}</span><strong>{field.value ?? field.placeholder ?? 'Generating…'}</strong></div>)}
    {fields.map(field => { const options = optionList(field,resolved); return <label key={field.name}>{field.label}{options ? <select value={resolved[field.name]} disabled={!options.length} onChange={e => setValues({...values,[field.name]:e.target.value})}><option value="">{options.length ? `Select ${field.label}` : field.emptyOption || 'No options available'}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required type={field.inputType || (field.type === 'uint' && field.positive ? 'number' : 'text')} min={field.min} step={field.step} inputMode={field.type === 'uint' ? 'numeric' : 'text'} placeholder={field.placeholder} value={resolved[field.name]} onChange={e => setValues({...values,[field.name]:e.target.value})}/>}</label>; })}
    {confirmation && <label className="quantity-confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>{confirmation}</label>}
    <button disabled={disabled || missingOptions || missingSelection || (confirmation && !confirmed)} className={method === 'revokeRole' ? 'button-danger' : undefined} type="submit">{pending ? 'Pending…' : title}</button></fieldset>
    <div className="form-feedback"><p className={phase === 'preparing' || phase === 'wallet' || phase === 'confirmation' ? 'notice-pending' : 'notice-success'} role="status">{message}</p>{hash && <p className="hash">Transaction: {hash}</p>}{warning && <p className="notice-warning" role="status">{warning}</p>}{error && <p role="alert">{error}</p>}</div>
  </form>;
}
export const productId = {name:'productId',label:'Product ID',type:'uint'};
export const quantity = {name:'quantity',label:'Quantity',type:'uint',positive:true};
