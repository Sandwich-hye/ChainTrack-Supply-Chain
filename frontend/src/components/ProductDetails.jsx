import React, { useEffect, useRef, useState } from 'react';
import { businessName, driverName, getReadContract } from '../services/contractService';
import { useDirectory } from '../services/directory';
import StatusBadge from './StatusBadge';
import ProductOverview from './ProductOverview';
import ShipmentJourney from './ShipmentJourney';

const eventPresentation = {
  ProductCreated: {title:'Product created',status:0},
  WarehouseEntry: {title:'Warehouse entry',status:1},
  WarehouseExit: {title:'Warehouse dispatch',status:2},
  TransportPickup: {title:'Transport pickup',status:3},
  TransportStatusUpdated: {title:'Transport location updated',status:4},
  GoodsDelivered: {title:'Delivery confirmed',status:5},
};
const fieldLabels = {productId:'Product ID',name:'Product name',supplier:'Supplier',destinationRetailer:'Destination Retailer',assignedTransport:'Transport Company',quantity:'Quantity',warehouse:'Warehouse account',staff:'Warehouse',warehouseId:'Warehouse Reference',transportCompany:'Transport Company',trackingNumber:'Tracking Number',driverId:'Driver',location:'Location',retailer:'Retailer',shopId:'Store Reference',receivedQuantity:'Received quantity',timestamp:'Recorded at',status:'Status'};
// Every event belongs to the product shown in the drawer; its internal ID is under Technical Details instead of repeated per event.
const hiddenEventFields = new Set(['productId']);
const businessAddressFields = new Set(['supplier','destinationRetailer','assignedTransport','warehouse','staff','transportCompany','retailer']);
// Display-only mapping; the event data itself is unchanged.
function displayValue(name,value,names,drivers) {
  if (name === 'timestamp') return new Date(Number(value)*1000).toLocaleString();
  if (name === 'status') return <StatusBadge status={value}/>;
  if (name === 'driverId') return driverName(value,drivers);
  return businessAddressFields.has(name) ? businessName(value,names) : value;
}

// One Product Details drawer for Track Product searches and every role list; role actions are passed in as children.
export default function ProductDetails({result,onClose,children}) {
  const {names} = useDirectory(); const [driverNames,setDriverNames] = useState({});
  useEffect(() => {
    let active = true;
    const ids = [...new Set((result?.timeline || []).filter(entry => entry.event === 'TransportPickup').map(entry => entry.fields.driverId))];
    if (!ids.length) return undefined;
    getReadContract().then(contract => Promise.all(ids.map(async id => [id,(await contract.getDriver(id)).name])))
      .then(entries => { if (active) setDriverNames(Object.fromEntries(entries)); }).catch(error => console.error('Driver names could not be loaded',error));
    return () => { active = false; };
  },[result]);
  const closeButton = useRef(null);
  const open = Boolean(result);
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement; const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeButton.current?.focus();
    const onKey = event => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown',onKey);
    return () => { document.removeEventListener('keydown',onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
  },[open,onClose]);
  if (!result) return null;
  const {product,timeline} = result;
  return <div className="drawer-layer">
    <div className="drawer-backdrop" onClick={onClose}/>
    <section className="drawer product-details" role="dialog" aria-modal="true" aria-label="Product Details">
      <header className="drawer-header"><h2>Product Details</h2><button type="button" className="drawer-close" aria-label="Close" ref={closeButton} onClick={onClose}>×</button></header>
      <div className="drawer-body">
        <ProductOverview product={product}/>
        <ShipmentJourney status={product.currentStatus}/>
        <div className="product-actions">{children}</div>
        <div className="history-panel"><div className="history-heading"><h3>Event History</h3><span className="muted">{timeline.length} events</span></div>
          <ol className="timeline">{timeline.map(entry => {
            const presentation = eventPresentation[entry.event];
            return <li key={`${entry.transactionHash}-${entry.index}`} className={`timeline-status-${presentation?.status}`}><div className="event-heading"><div><h4>{presentation?.title || entry.event}</h4><span className="event-code">{entry.event}</span></div>{presentation && <StatusBadge status={entry.fields.status ?? presentation.status}/>}</div>
              <dl>{Object.entries(entry.fields).filter(([name]) => !hiddenEventFields.has(name)).map(([name,value]) => <React.Fragment key={name}><dt>{fieldLabels[name] || name}</dt><dd>{displayValue(name,value,names,driverNames)}</dd></React.Fragment>)}</dl><p className="hash">Transaction: {entry.transactionHash}</p><small className="event-order">Block {entry.blockNumber} · Transaction index {entry.transactionIndex} · Log {entry.index}</small></li>;
          })}</ol>
        </div>
      </div>
    </section>
  </div>;
}
