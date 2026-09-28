import React, { useEffect, useState } from 'react';
import TransactionForm from './TransactionForm';
import ProductOverview from './ProductOverview';
import { generateTrackingNumber, requireFreshProduct } from '../services/contractService';

export default function TransportDashboard({address,selectedProduct,refreshProduct,contextKey}) {
  const product = selectedProduct?.product;
  const [tracking,setTracking] = useState('');
  useEffect(() => { let alive = true; if (!product || product.trackingNumber) { setTracking(product?.trackingNumber || ''); return () => { alive = false; }; } generateTrackingNumber(product.productId).then(value => alive && setTracking(value)).catch(() => alive && setTracking('Unavailable')); return () => { alive = false; }; },[product?.productId,product?.trackingNumber]);
  const refresh = () => product && refreshProduct(product.productId,contextKey);
  return <section className="dashboard"><p className="eyebrow">Clothing transport</p><h2>Transport operations</h2><p className="muted">Pick up and update the selected clothing shipment.</p>
    {!product ? <p className="empty-state">Search and select a product above to begin.</p> : <><ProductOverview product={product} title="Current Product"/>
      <div className="form-grid">{Number(product.currentStatus) === 2 && <TransactionForm address={address} title="Confirm Pickup" description="The tracking number is issued automatically for this shipment." method="recordPickup" generatedFields={[{label:'Tracking Number (automatic)',value:tracking || 'Generating…'}]} fields={[{name:'driverId',label:'Driver Reference',placeholder:'DRV-JOHN-01'}]} prepare={async args => { const fresh = await requireFreshProduct(selectedProduct,[2]); const candidate = tracking && tracking !== 'Unavailable' ? tracking : await generateTrackingNumber(fresh.productId); return [fresh.productId,candidate,args[0]]; }} onSuccess={refresh}/>} {[3,4].includes(Number(product.currentStatus)) && <TransactionForm address={address} title="Update Location" description="Record a transport location while the shipment is picked up or in transit." fields={[{name:'location',label:'Location',placeholder:'Auckland CBD'}]} method="updateTransportLocation" prepare={async args => { const fresh = await requireFreshProduct(selectedProduct,[3,4]); return [fresh.productId,args[0]]; }} onSuccess={refresh}/>} {[0,1,5].includes(Number(product.currentStatus)) && <p className="muted">Waiting for the next supply-chain role.</p>}</div></>}
  </section>;
}
