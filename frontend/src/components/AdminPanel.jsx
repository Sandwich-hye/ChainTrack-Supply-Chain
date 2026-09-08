import React from 'react';
import TransactionForm from './TransactionForm';
import { BUSINESS_ROLES } from '../services/contractService';
export default function AdminPanel(props) { const fields = [{name:'role',label:'Business role',type:'role',options:BUSINESS_ROLES},{name:'account',label:'Account address',type:'address'}]; return <section><h2>Admin</h2><TransactionForm {...props} title="Grant role" method="grantRole" fields={fields}/><TransactionForm {...props} title="Revoke role" method="revokeRole" fields={fields}/></section>; }
