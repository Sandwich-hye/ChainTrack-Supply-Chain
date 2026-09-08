import React, { useState } from 'react';
import { trackProduct, toReadableError, STATUSES } from '../services/contractService';
export default function TrackProduct() {
  const [mode,setMode] = useState('productId'); const [query,setQuery] = useState(''); const [result,setResult] = useState(null); const [pending,setPending] = useState(false); const [error,setError] = useState('');
  async function search(event) {
    event.preventDefault(); setPending(true); setError(''); setResult(null);
    try { setResult(await trackProduct(mode,query)); } catch (e) { console.error('Product search failed',e); setError(toReadableError(e)); } finally { setPending(false); }
  }
  return <section><h2>Track product</h2><p>Product state and event history are public. No wallet connection is needed to search.</p>
    <form onSubmit={search}><fieldset disabled={pending}><label>Search by<select value={mode} onChange={e => setMode(e.target.value)}><option value="productId">Product ID</option><option value="trackingNumber">Tracking number</option></select></label><label>Search value<input required value={query} onChange={e => setQuery(e.target.value)}/></label><button>{pending ? 'Searching…' : 'Search'}</button></fieldset></form>
    {error && <p role="alert">{error}</p>}{result && <><h3>{result.product.name}</h3><p>Product {result.product.productId.toString()} · Quantity {result.product.quantity.toString()} · {STATUSES[Number(result.product.currentStatus)]}</p><p className="hash">Supplier: {result.product.supplier}</p>
      <ol className="timeline">{result.timeline.map(entry => <li key={`${entry.transactionHash}-${entry.index}`}><h4>{entry.event}</h4><dl>{Object.entries(entry.fields).map(([name,value]) => <React.Fragment key={name}><dt>{name}</dt><dd>{name === 'timestamp' ? new Date(Number(value)*1000).toLocaleString() : name === 'status' ? STATUSES[Number(value)] : value}</dd></React.Fragment>)}</dl><p className="hash">Transaction: {entry.transactionHash}</p><small>Block {entry.blockNumber} · Transaction index {entry.transactionIndex} · Log {entry.index}</small></li>)}</ol></>}
  </section>;
}
