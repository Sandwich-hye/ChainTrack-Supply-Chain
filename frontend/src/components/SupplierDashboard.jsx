import React from 'react';
import TransactionForm, { productId, quantity } from './TransactionForm';
export default function SupplierDashboard(props) { return <section><h2>Supplier</h2><TransactionForm {...props} title="Create product" method="createProduct" fields={[productId,{name:'name',label:'Product name'},quantity]}/></section>; }
