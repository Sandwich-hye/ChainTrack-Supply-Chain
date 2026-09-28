import React from 'react';
import TransactionForm from './TransactionForm';
import ProductOverview from './ProductOverview';
import { requireFreshProduct } from '../services/contractService';

export default function WarehouseDashboard({address,selectedProduct,refreshProduct,contextKey}) {
  const product = selectedProduct?.product;
  const refresh = () => product && refreshProduct(product.productId,contextKey);
  return <section className="dashboard"><p className="eyebrow">Clothing warehouse</p><h2>Warehouse operations</h2><p className="muted">Receive and dispatch the selected clothing shipment.</p>
    {!product ? <p className="empty-state">Search and select a product above to begin.</p> : <><ProductOverview product={product} title="Current Product"/>
      <div className="form-grid">{Number(product.currentStatus) === 0 && <TransactionForm address={address} title="Confirm Warehouse Entry" description="Confirm the complete expected quantity was physically received." method="recordWarehouseEntry" generatedFields={[{label:'Expected Quantity',value:product.quantity.toString()}]} fields={[{name:'warehouseId',label:'Warehouse Reference',placeholder:'Auckland Clothing Distribution Centre'}]} confirmation="I confirm the full expected quantity was physically received." prepare={async args => { const fresh = await requireFreshProduct(selectedProduct,[0]); return [fresh.productId,args[0],fresh.quantity]; }} onSuccess={refresh}/>} {Number(product.currentStatus) === 1 && <TransactionForm address={address} title="Record Warehouse Exit" description="Dispatch the selected shipment from the warehouse." method="recordWarehouseExit" fields={[]} prepare={async () => { const fresh = await requireFreshProduct(selectedProduct,[1]); return [fresh.productId]; }} onSuccess={refresh}/>} {[2,3,4,5].includes(Number(product.currentStatus)) && <p className="muted">Waiting for the next supply-chain role.</p>}</div></>}
  </section>;
}
