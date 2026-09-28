import React, { useState } from 'react';
import { trackProduct, toReadableError } from '../services/contractService';
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
const fieldLabels = {productId:'Product ID',name:'Product name',supplier:'Supplier',quantity:'Quantity',warehouse:'Warehouse account',warehouseId:'Warehouse Reference',transportCompany:'Transport company',trackingNumber:'Tracking number',driverId:'Driver Reference',location:'Location',retailer:'Retailer',shopId:'Store Reference',receivedQuantity:'Received quantity',timestamp:'Recorded at',status:'Status'};
export default function TrackProduct({selectedProduct,selectProduct,contextKey}) {
  const [mode,setMode] = useState('productId'); const [query,setQuery] = useState(''); const [result,setResult] = useState(null); const [pending,setPending] = useState(false); const [error,setError] = useState('');
  async function search(event) {
    event.preventDefault(); setPending(true); setError(''); setResult(null);
    try { const found = await trackProduct(mode,query); setResult(found); } catch (e) { console.error('Product search failed',e); setError(toReadableError(e)); } finally { setPending(false); }
  }
  return <section className="tracking-section"><div className="section-heading"><p className="eyebrow">Product visibility</p><h2>Track product</h2><p className="muted">Search product records and shipment history. No wallet connection required.</p></div>
    <form className="search-form" onSubmit={search}><fieldset disabled={pending}><label>Search by<select value={mode} onChange={e => setMode(e.target.value)}><option value="productId">Product ID</option><option value="trackingNumber">Tracking number</option></select></label><label className="search-value">Search value<input required placeholder={mode === 'productId' ? 'Enter a product ID' : 'Enter a tracking number'} value={query} onChange={e => setQuery(e.target.value)}/></label><button>{pending ? 'Searching…' : 'Search'}</button></fieldset></form>
    {error && <p role="alert">{error}</p>}
    {pending && <p className="notice-pending" role="status">Loading product record and event history…</p>}
    {!result && !pending && !error && <div className="empty-state"><span className="empty-mark" aria-hidden="true">⌕</span><h3>No product selected</h3><p>Enter a Product ID or Tracking Number to view its current status and recorded events.</p></div>}
    {result && <div className="tracking-results">
      <div><ProductOverview product={result.product}/><button type="button" disabled={selectedProduct?.product?.productId?.toString() === result.product.productId.toString()} onClick={() => selectProduct?.(result,contextKey)}>{selectedProduct?.product?.productId?.toString() === result.product.productId.toString() ? 'Selected' : 'Select this product'}</button><ShipmentJourney status={result.product.currentStatus}/></div>
      <div className="history-panel"><div className="history-heading"><h3>Event history</h3><span className="muted">{result.timeline.length} recorded events</span></div><p className="history-note">Shown in blockchain order.</p>
        <ol className="timeline">{result.timeline.map(entry => {
          const presentation = eventPresentation[entry.event];
          return <li key={`${entry.transactionHash}-${entry.index}`} className={`timeline-status-${presentation?.status}`}><div className="event-heading"><div><h4>{presentation?.title || entry.event}</h4><span className="event-code">{entry.event}</span></div>{presentation && <StatusBadge status={entry.fields.status ?? presentation.status}/>}</div>
            <dl>{Object.entries(entry.fields).map(([name,value]) => <React.Fragment key={name}><dt>{fieldLabels[name] || name}</dt><dd>{name === 'timestamp' ? new Date(Number(value)*1000).toLocaleString() : name === 'status' ? <StatusBadge status={value}/> : value}</dd></React.Fragment>)}</dl><p className="hash">Transaction: {entry.transactionHash}</p><small className="event-order">Block {entry.blockNumber} · Transaction index {entry.transactionIndex} · Log {entry.index}</small></li>;
        })}</ol>
      </div>
    </div>}
  </section>;
}
