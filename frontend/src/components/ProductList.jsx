import React, { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge';
import { trackProduct } from '../services/contractService';

// Loads role product data once per loadKey; one result can feed several lists (e.g. active + history).
export function useProductQuery(load,loadKey) {
  const [state,setState] = useState({data:null,pending:false,error:''});
  useEffect(() => {
    let alive = true;
    if (!load) { setState({data:null,pending:false,error:''}); return () => { alive = false; }; }
    setState(s => ({...s,pending:true,error:''}));
    load().then(data => alive && setState({data,pending:false,error:''})).catch(e => {
      console.warn('Shipment data refresh failed',e);
      if (alive) setState(s => ({...s,pending:false,error:'Shipment data could not be refreshed. Try again or reload the page.'}));
    });
    return () => { alive = false; };
  },[loadKey]);
  return state;
}

// A role's actionable queue and its history from one {active,history} snapshot; both lists use the shared drawer.
export function ShipmentQueues({load,loadKey,activeTitle,activeEmpty,historyEmpty = 'No history yet',...listProps}) {
  const query = useProductQuery(load,loadKey);
  return <>
    <ProductList title={activeTitle} empty={activeEmpty} products={query.data?.active || []} pending={query.pending} error={query.error} {...listProps}/>
    <ProductList title="History" empty={historyEmpty} newestFirst products={query.data?.history || []} pending={query.pending} {...listProps}/>
  </>;
}

const matchesFilter = (product,needle) => !needle || String(product.name).toLowerCase().includes(needle) || String(product.trackingNumber || '').toLowerCase().includes(needle);

// Shared product list: business fields first (name, tracking number, quantity, status); the internal Product ID stays out of the row.
// Selecting goes through the same path as Track Shipment, opening the shared drawer. The local filter only narrows this
// role's already-loaded products by name or tracking number (case-insensitive substring); it never queries the chain.
export default function ProductList({title,products = [],pending = false,error = '',empty,selectedProduct,selectProduct,contextKey,newestFirst = false}) {
  const [selecting,setSelecting] = useState(''); const [selectError,setSelectError] = useState(''); const [filter,setFilter] = useState('');
  const selectedId = selectedProduct?.product?.productId?.toString();
  const select = async product => {
    const id = product.productId.toString(); setSelecting(id); setSelectError('');
    try { selectProduct?.(await trackProduct('productId',id),contextKey); } catch (e) { console.warn('Shipment details could not be loaded',e); setSelectError('Shipment details could not be loaded. Try again.'); } finally { setSelecting(''); }
  };
  const needle = filter.trim().toLowerCase();
  const shownProducts = (newestFirst ? [...products].reverse() : products).filter(product => matchesFilter(product,needle));
  return <div className="product-list-panel">
    <div className="history-heading"><h3>{title}</h3><span className="muted">{products.length}</span></div>
    {products.length > 0 && <input type="search" className="list-filter" aria-label={`Filter ${title}`} placeholder="Name or tracking number" value={filter} onChange={e => setFilter(e.target.value)}/>}
    {error && <p role="status" className="notice-warning">{error}</p>}
    {selectError && <p role="alert">{selectError}</p>}
    {pending && !products.length && <p className="list-empty">Loading…</p>}
    {!pending && !error && !products.length && <p className="list-empty">{empty}</p>}
    {products.length > 0 && !shownProducts.length && <p className="list-empty">No matches</p>}
    {shownProducts.length > 0 && <ul className="supplier-product-list">{shownProducts.map(product => { const id = product.productId.toString(); const selected = id === selectedId; return <li key={id}>
      <button type="button" className={`supplier-product${selected ? ' is-selected' : ''}`} aria-current={selected ? 'true' : undefined} disabled={selecting === id} onClick={() => select(product)}>
        <span><strong>{product.name}</strong><small><span className="tracking-number">{product.trackingNumber || 'No tracking number'}</span> · Quantity {product.quantity.toString()}</small></span><StatusBadge status={product.currentStatus}/>
      </button></li>; })}</ul>}
  </div>;
}
