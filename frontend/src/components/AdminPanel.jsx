import React, { useEffect, useRef, useState } from 'react';
import { isAddress } from 'ethers';
import { BUSINESS_ROLES, ROLE_IDS, getWriteContract, shortAddress, toReadableError } from '../services/contractService';
import { refreshAfterConfirmation, waitForConfirmedReceipt } from '../services/transactionFlow';
import { useDirectory } from '../services/directory';

const sameAccount = (a,b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea'); area.value = text; area.setAttribute('readonly',''); area.style.position = 'fixed'; area.style.opacity = '0';
  document.body.appendChild(area); area.select();
  try { if (!document.execCommand?.('copy')) throw new Error('Copy failed.'); } finally { area.remove(); }
}

function GrantRoleForm({address,onRoleGranted,onNameSaved}) {
  const [wallet,setWallet] = useState(''); const [role,setRole] = useState(BUSINESS_ROLES[0]); const [name,setName] = useState('');
  const [busy,setBusy] = useState(false); const [feedback,setFeedback] = useState(null); const [warning,setWarning] = useState('');
  async function submit(event) {
    event.preventDefault();
    setWarning('');
    const account = wallet.trim();
    if (!isAddress(account)) { setFeedback({type:'error',text:'Enter a valid Ethereum wallet address.'}); return; }
    if (!name.trim()) { setFeedback({type:'error',text:'Business / Account Name required.'}); return; }
    setBusy(true); let granted = false;
    try {
      const contract = await getWriteContract(address);
      setFeedback({type:'pending',text:'Approve the role grant in your wallet…'});
      const grantTx = await contract.grantRole(ROLE_IDS[role],account);
      setFeedback({type:'pending',text:'Role grant submitted. Waiting for confirmation…'});
      await waitForConfirmedReceipt(grantTx);
      granted = true;
      if (await refreshAfterConfirmation(() => onRoleGranted(role,account))) setWarning('Role granted, but data could not be refreshed.');
      setFeedback({type:'pending',text:'Role granted. Approve the account name transaction…'});
      const nameTx = await contract.setBusinessName(account,name.trim());
      setFeedback({type:'pending',text:'Account name submitted. Waiting for confirmation…'});
      await waitForConfirmedReceipt(nameTx);
      setFeedback({type:'pending',text:'Transactions confirmed. Refreshing account data…'});
      if (await refreshAfterConfirmation(() => onNameSaved(account,name.trim()))) setWarning('Transactions confirmed, but data could not be refreshed.');
      setFeedback({type:'success',text:'Role granted and account name saved.'});
      setWallet(''); setName('');
    } catch (error) {
      const uncertain = error.code === 'CONFIRMATION_UNKNOWN';
      setFeedback({type:uncertain ? 'uncertain' : granted ? 'partial' : 'error',text:uncertain ? `${granted ? 'Role granted. ' : ''}${toReadableError(error)}` : granted ? `Role granted, but the name was not saved: ${toReadableError(error)} Use Edit name to retry.` : toReadableError(error)});
    } finally { setBusy(false); }
  }
  return <form className="transaction-form" onSubmit={submit}><h3>Grant Role</h3><fieldset disabled={busy}>
    <label>Wallet Address<input required value={wallet} placeholder="0x…" onChange={event => setWallet(event.target.value)}/></label>
    <label>Role<select value={role} onChange={event => setRole(event.target.value)}>{BUSINESS_ROLES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <label>Business / Account Name<input required value={name} onChange={event => setName(event.target.value)}/></label>
    <button type="submit" disabled={busy}>{busy ? 'Pending…' : 'Grant Role'}</button>
  </fieldset>{(feedback || warning) && <div className="form-feedback">{feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={feedback.type === 'pending' ? 'notice-pending' : feedback.type === 'success' ? 'notice-success' : feedback.type === 'partial' || feedback.type === 'uncertain' ? 'notice-warning' : undefined}>{feedback.text}</p>}{warning && <p role="status" className="notice-warning">{warning}</p>}</div>}</form>;
}

export default function AdminPanel({address,contextKey,refreshRoles}) {
  const directory = useDirectory();
  const {assignments,names,loading, error:loadError} = directory;
  const [editing,setEditing] = useState(''); const [editedName,setEditedName] = useState('');
  const [confirming,setConfirming] = useState(''); const [busy,setBusy] = useState(''); const [copied,setCopied] = useState(''); const [feedback,setFeedback] = useState(null); const [warning,setWarning] = useState('');
  const alive = useRef(true); useEffect(() => () => { alive.current = false; },[]);
  const afterChange = async (role,account,enabled) => { directory.updateRole(role,account,enabled); directory.refresh(); if (sameAccount(account,address)) await refreshRoles?.(); };
  const rows = assignments ? BUSINESS_ROLES.flatMap(role => assignments[role].map(account => ({role,account,key:`${role}:${account}`}))) : [];
  async function copy(row) {
    try { await copyText(row.account); setCopied(row.key); setTimeout(() => alive.current && setCopied(value => value === row.key ? '' : value),1500); }
    catch { setFeedback({type:'error',text:'Could not copy the address.'}); }
  }
  async function revoke(row) {
    setBusy(row.key); setWarning(''); setFeedback({type:'pending',text:'Waiting for wallet approval…'});
    let receipt;
    try {
      const contract = await getWriteContract(address); const tx = await contract.revokeRole(ROLE_IDS[row.role],row.account);
      setFeedback({type:'pending',text:'Transaction submitted. Waiting for confirmation…'});
      receipt = await waitForConfirmedReceipt(tx);
    } catch (e) { setFeedback({type:e.code === 'CONFIRMATION_UNKNOWN' ? 'uncertain' : 'error',text:toReadableError(e)}); }
    if (receipt) {
      setFeedback({type:'success',text:'Role revoked'});
      if (await refreshAfterConfirmation(() => afterChange(row.role,row.account,false))) setWarning('Transaction confirmed, but data could not be refreshed.');
    }
    setBusy(''); setConfirming('');
  }
  async function saveName(account,name) {
    setWarning('');
    if (!name.trim()) { setFeedback({type:'error',text:'Business name required'}); return; }
    setBusy(account); setFeedback({type:'pending',text:'Waiting for wallet approval…'});
    let receipt;
    try {
      const contract = await getWriteContract(address);
      const tx = await contract.setBusinessName(account,name.trim());
      setFeedback({type:'pending',text:'Transaction submitted. Waiting for confirmation…'});
      receipt = await waitForConfirmedReceipt(tx);
    } catch (e) { setFeedback({type:e.code === 'CONFIRMATION_UNKNOWN' ? 'uncertain' : 'error',text:toReadableError(e)}); }
    if (receipt) {
      setFeedback({type:'success',text:'Business name saved'}); setEditing('');
      if (await refreshAfterConfirmation(() => { directory.updateName(account,name.trim()); directory.refresh(); })) setWarning('Transaction confirmed, but data could not be refreshed.');
    }
    setBusy('');
  }
  return <section className="dashboard admin-panel"><h2>Admin</h2>
    <div className="role-assignments"><div className="history-heading"><h3>Current Role Assignments</h3><span className="muted">{rows.length}</span></div>
      {loadError && <p role="status" className="notice-warning">{loadError}</p>}
      {loading && !rows.length && !loadError && <p className="list-empty">Loading…</p>}
      {!loading && !rows.length && !loadError && <p className="list-empty">No role assignments</p>}
      {rows.length > 0 && <table className="assignment-table"><thead><tr><th scope="col">Role</th><th scope="col">Business / Account</th><th scope="col">Address</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
        <tbody>{rows.map(row => { const name = names[row.account.toLowerCase()]; return <tr key={row.key}>
          <td data-label="Role">{row.role}</td>
          <td data-label="Business / Account">{editing === row.key ? <form className="name-edit" onSubmit={event => { event.preventDefault(); saveName(row.account,editedName); }}><input aria-label={`Name for ${row.account}`} value={editedName} onChange={event => setEditedName(event.target.value)} required/><button type="submit" disabled={Boolean(busy)}>Save</button><button type="button" className="button-secondary" onClick={() => setEditing('')}>Cancel</button></form> : name || <span className="muted">{shortAddress(row.account)}</span>}</td>
          <td data-label="Address"><span className="address" title={row.account}>{shortAddress(row.account)}</span></td>
          <td className="row-actions-cell"><div className="row-actions">{confirming === row.key
            ? <><button type="button" className="button-danger" disabled={Boolean(busy)} aria-label={`Confirm revoke ${row.role} from ${row.account}`} onClick={() => revoke(row)}>{busy === row.key ? 'Revoking…' : 'Confirm'}</button><button type="button" className="button-secondary" disabled={busy === row.key} onClick={() => setConfirming('')}>Cancel</button></>
            : <><button type="button" className="button-secondary" aria-label={`Edit name for ${row.account}`} onClick={() => { setEditing(row.key); setEditedName(name || ''); }}>Edit name</button><button type="button" className="button-secondary" aria-label={`Copy address ${row.account}`} onClick={() => copy(row)}>{copied === row.key ? 'Copied' : 'Copy'}</button><button type="button" className="button-danger" disabled={Boolean(busy)} aria-label={`Revoke ${row.role} from ${row.account}`} onClick={() => setConfirming(row.key)}>Revoke</button></>}</div></td>
        </tr>; })}</tbody></table>}
      {(feedback || warning) && <div className="form-feedback">{feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={feedback.type === 'pending' ? 'notice-pending' : feedback.type === 'success' ? 'notice-success' : feedback.type === 'uncertain' ? 'notice-warning' : undefined}>{feedback.text}</p>}{warning && <p role="status" className="notice-warning">{warning}</p>}</div>}
    </div>
    <GrantRoleForm address={address} onRoleGranted={(role,account) => afterChange(role,account,true)} onNameSaved={(account,name) => { directory.updateName(account,name); directory.refresh(); }}/>
  </section>;
}
