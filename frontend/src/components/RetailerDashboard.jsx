import React from 'react';
import TransactionForm from './TransactionForm';
import ProductOverview from './ProductOverview';
import { requireFreshProduct } from '../services/contractService';

export default function RetailerDashboard({address,selectedProduct,refreshProduct,contextKey}) {
  const product = selectedProduct?.product;
  const refresh = () => product && refreshProduct(product.productId,contextKey);
  return <section className="dashboard"><p className="eyebrow">Clothing retail store</p><h2>Retailer operations</h2><p className="muted">Confirm delivery of the selected shipment.</p>
    {!product ? <p className="empty-state">Search and select a product above to begin.</p> : <><ProductOverview product={product} title="Current Product"/>
      {Number(product.currentStatus) === 4 ? <TransactionForm address={address} title="Confirm Delivery" description="Confirm the complete expected quantity was physically received at the store." method="confirmDelivery" generatedFields={[{label:'Expected Quantity',value:product.quantity.toString()}]} fields={[{name:'shopId',label:'Store Reference',placeholder:'Queen Street Clothing Store'}]} confirmation="I confirm the full expected quantity was physically received." prepare={async args => { const fresh = await requireFreshProduct(selectedProduct,[4]); return [fresh.productId,args[0],fresh.quantity]; }} onSuccess={refresh}/> : <p className="muted">{Number(product.currentStatus) === 5 ? 'Shipment Delivered.' : 'Waiting for transport to update the shipment.'}</p>}
    </>}
  </section>;
}
