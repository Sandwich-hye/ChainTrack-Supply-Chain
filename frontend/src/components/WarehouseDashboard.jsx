import React from 'react';
import TransactionForm, { productId, quantity } from './TransactionForm';
export default function WarehouseDashboard(props) { return <section><h2>Warehouse</h2><TransactionForm {...props} title="Record warehouse entry" method="recordWarehouseEntry" fields={[productId,{name:'warehouseId',label:'Warehouse ID'},quantity]}/><TransactionForm {...props} title="Record warehouse exit" method="recordWarehouseExit" fields={[productId]}/></section>; }
