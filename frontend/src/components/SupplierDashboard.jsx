import React, { useState } from 'react';
import TransactionForm from './TransactionForm';
import ProductList, { useProductQuery } from './ProductList';
import { generateProductId, listSupplierProducts, trackingNumberFromReceipt } from '../services/contractService';
import { useRoleOptions } from '../services/directory';

export default function SupplierDashboard({address,selectedProduct,selectProduct,contextKey,revision = ''}) {
  const [created,setCreated] = useState(0);
  const retailers = useRoleOptions('Retailer');
  const products = useProductQuery(address ? () => listSupplierProducts(address) : null,`${address}|${contextKey}|${revision}|${created}`);
  const prepare = async args => [await generateProductId(),...args];
  return <section className="dashboard supplier-panel"><h2>Supplier</h2>
    {retailers.error && <p role="status" className="notice-warning">{retailers.error}</p>}
    {!retailers.loading && !retailers.error && !retailers.options.length && <p className="list-empty">No authorized Retailer accounts. Ask an admin to grant the Retailer role.</p>}
    <TransactionForm address={address} title="Create Product" successMessage={receipt => { const tracking = trackingNumberFromReceipt(receipt); return tracking ? `Product created · ${tracking}` : 'Product created'; }} method="createProduct" fields={[{name:'name',label:'Product Name',placeholder:'Classic Cotton T-Shirt'},{name:'quantity',label:'Quantity',type:'uint',positive:true,min:1,step:1},{name:'destinationRetailer',label:'Destination Retailer',options:retailers.options,emptyOption:retailers.loading ? 'Loading retailers…' : retailers.error ? 'Directory unavailable' : 'No authorized retailers'}]} prepare={prepare} onSuccess={() => setCreated(value => value + 1)}/>
    <ProductList title="My Products" empty="No products yet" newestFirst products={products.data || []} pending={products.pending} error={products.error} selectedProduct={selectedProduct} selectProduct={selectProduct} contextKey={contextKey}/>
  </section>;
}
