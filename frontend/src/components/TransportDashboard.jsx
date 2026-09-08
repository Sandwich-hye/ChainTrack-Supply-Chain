import React from 'react';
import TransactionForm, { productId } from './TransactionForm';
export default function TransportDashboard(props) { return <section><h2>Transport</h2><TransactionForm {...props} title="Record pickup" method="recordPickup" fields={[productId,{name:'trackingNumber',label:'Tracking number'},{name:'driverId',label:'Driver ID'}]}/><TransactionForm {...props} title="Update transport location" method="updateTransportLocation" fields={[productId,{name:'location',label:'Location'}]}/></section>; }
