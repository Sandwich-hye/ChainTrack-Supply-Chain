import React from 'react';
import TransactionForm from './TransactionForm';
import { ShipmentQueues } from './ProductList';
import { ActionNotice, useActionFeedback } from './ActionFeedback';
import { listTransportShipments, requireFreshProduct } from '../services/contractService';
import { useDrivers } from '../services/directory';

export default function TransportDashboard({address,selectedProduct,selectProduct,contextKey,revision = ''}) {
  const {drivers,loading,error,refresh} = useDrivers(address);
  return <section className="dashboard"><h2>Transport</h2>
    <section className="registered-drivers" aria-label="My Drivers"><h3>My Drivers</h3>
      <TransactionForm address={address} title="Register Driver" successMessage="Driver registered" method="registerDriver" fields={[{name:'name',label:'Driver Name'}]} onSuccess={refresh}/>
      {error && <p role="status" className="notice-warning">{error}</p>}
      {loading ? <p>Loading drivers…</p> : drivers.length ? <ul>{drivers.map(driver => <li key={driver.driverId}>{driver.name}</li>)}</ul> : <p>No drivers registered to this Transport account.</p>}
    </section>
    <ShipmentQueues activeTitle="Assigned Shipments" activeEmpty="No assigned shipments" load={address ? () => listTransportShipments(address) : null} loadKey={`${address}|${contextKey}|${revision}`} selectedProduct={selectedProduct} selectProduct={selectProduct} contextKey={contextKey}/>
  </section>;
}

export function TransportActions({address,selectedProduct,refreshProduct,contextKey}) {
  const {drivers,loading,error} = useDrivers(address);
  const product = selectedProduct?.product;
  const [notice,complete] = useActionFeedback(product,refreshProduct,contextKey);
  if (!product) return null;
  // The tracking number was issued at creation; pickup only records the driver.
  return <>
    <ActionNotice text={notice}/>
    {Number(product.currentStatus) === 2 && <>{error && <p role="status" className="notice-warning">{error}</p>}{!drivers.length && !error && !loading && <p>Register a driver in My Drivers before pickup.</p>}<TransactionForm address={address} title="Confirm Pickup" successMessage="Pickup confirmed" method="recordPickup" generatedFields={[{label:'Tracking Number',value:product.trackingNumber}]} fields={[{name:'driverId',label:'Driver',options:drivers.map(driver => ({label:driver.name,value:driver.driverId})),emptyOption:loading ? 'Loading drivers…' : error ? 'Driver list unavailable' : 'No registered drivers'}]} prepare={async args => { const fresh = await requireFreshProduct(selectedProduct,[2]); return [fresh.productId,args[0]]; }} onSuccess={complete('Pickup confirmed')}/></>}
  </>;
}
