import React from 'react';
import TransactionForm from './TransactionForm';
import { ShipmentQueues } from './ProductList';
import { ActionNotice, useActionFeedback } from './ActionFeedback';
import { businessName, listWarehouseShipments, requireFreshProduct } from '../services/contractService';
import { useDirectory, useRoleOptions } from '../services/directory';

export default function WarehouseDashboard({address,selectedProduct,selectProduct,contextKey,revision = ''}) {
  return <section className="dashboard"><h2>Warehouse</h2>
    <ShipmentQueues activeTitle="Incoming Shipments" activeEmpty="No incoming shipments" load={address ? () => listWarehouseShipments(address) : null} loadKey={`${address}|${contextKey}|${revision}`} selectedProduct={selectedProduct} selectProduct={selectProduct} contextKey={contextKey}/>
  </section>;
}

export function WarehouseActions({address,selectedProduct,refreshProduct,contextKey}) {
  const {names} = useDirectory();
  const transports = useRoleOptions('Transport');
  const warehouseReference = businessName(address,names);
  const product = selectedProduct?.product;
  const [notice,complete] = useActionFeedback(product,refreshProduct,contextKey);
  if (!product) return null;
  const status = Number(product.currentStatus);
  return <>
    <ActionNotice text={notice}/>
    {status === 0 && <TransactionForm address={address} title="Confirm Warehouse Entry" successMessage="Warehouse entry recorded" method="recordWarehouseEntry" generatedFields={[{label:'Expected Quantity',value:product.quantity.toString()},{label:'Warehouse Reference',value:warehouseReference}]} fields={[]} prepare={async () => { const fresh = await requireFreshProduct(selectedProduct,[0]); return [fresh.productId,warehouseReference,fresh.quantity]; }} onSuccess={complete('Warehouse entry recorded')}/>}
    {status === 1 && <>{transports.error && <p role="status" className="notice-warning">{transports.error}</p>}{!transports.loading && !transports.error && !transports.options.length && <p className="list-empty">No authorized Transport accounts. Ask an admin to grant the Transport role.</p>}<TransactionForm address={address} title="Dispatch Shipment" successMessage="Shipment dispatched" method="recordWarehouseExit" fields={[{name:'assignedTransport',label:'Transport Company',options:transports.options,emptyOption:transports.loading ? 'Loading transports…' : transports.error ? 'Directory unavailable' : 'No authorized transports'}]} prepare={async args => { const fresh = await requireFreshProduct(selectedProduct,[1]); return [fresh.productId,args[0]]; }} onSuccess={complete('Shipment dispatched')}/></>}
  </>;
}
