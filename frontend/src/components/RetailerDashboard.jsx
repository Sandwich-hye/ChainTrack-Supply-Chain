import React from 'react';
import TransactionForm, { productId, quantity } from './TransactionForm';
export default function RetailerDashboard(props) { return <section><h2>Retailer</h2><TransactionForm {...props} title="Confirm delivery" method="confirmDelivery" fields={[productId,{name:'shopId',label:'Shop ID'},{...quantity,label:'Received quantity'}]}/></section>; }
