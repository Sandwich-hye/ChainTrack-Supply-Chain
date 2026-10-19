import React from 'react';
import TransactionForm from './TransactionForm';
import { ShipmentQueues } from './ProductList';
import { ActionNotice, useActionFeedback } from './ActionFeedback';
import { businessName, listRetailerShipments, requireFreshProduct } from '../services/contractService';
import { useDirectory } from '../services/directory';

export default function RetailerDashboard({address,selectedProduct,selectProduct,contextKey,revision = ''}) {
  return <section className="dashboard"><h2>Retailer</h2>
    <ShipmentQueues activeTitle="Incoming Deliveries" activeEmpty="No incoming deliveries" load={address ? () => listRetailerShipments(address) : null} loadKey={`${address}|${contextKey}|${revision}`} selectedProduct={selectedProduct} selectProduct={selectProduct} contextKey={contextKey}/>
  </section>;
}

export function RetailerActions({address,selectedProduct,refreshProduct,contextKey}) {
  const {names} = useDirectory();
  const product = selectedProduct?.product;
  const [notice,complete] = useActionFeedback(product,refreshProduct,contextKey);
  if (!product) return null;
  const storeReference = businessName(address,names);
  return <>
    <ActionNotice text={notice}/>
    {[3,4].includes(Number(product.currentStatus)) && <TransactionForm address={address} title="Confirm Delivery" successMessage="Delivery confirmed" method="confirmDelivery" generatedFields={[{label:'Expected Quantity',value:product.quantity.toString()},{label:'Store Reference',value:storeReference}]} fields={[]} prepare={async () => { const fresh = await requireFreshProduct(selectedProduct,[3,4]); return [fresh.productId,storeReference,fresh.quantity]; }} onSuccess={complete('Delivery confirmed')}/>}
  </>;
}
