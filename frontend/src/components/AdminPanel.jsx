import React from 'react';
import TransactionForm from './TransactionForm';
import { BUSINESS_ROLES } from '../services/contractService';
export default function AdminPanel(props) {
  const fields = [{name:'role',label:'Business role',type:'role',options:BUSINESS_ROLES},{name:'account',label:'Account address',type:'address'}];
  return <section className="dashboard"><p className="eyebrow">Access management</p><h2>Admin</h2><p className="muted">Manage business-role permissions for wallet accounts.</p><div className="form-grid">
    <TransactionForm {...props} title="Grant role" description="Assign the selected business role to an Ethereum account." method="grantRole" fields={fields}/>
    <TransactionForm {...props} title="Revoke role" description="Remove the selected business role from an Ethereum account. Other assigned roles remain unchanged." method="revokeRole" fields={fields}/>
  </div></section>;
}
