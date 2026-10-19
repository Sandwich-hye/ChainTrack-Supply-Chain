import React, { useEffect, useRef, useState } from 'react';
import { normalizeTrackingNumber, trackProduct, toReadableError } from '../services/contractService';

const NOT_FOUND = toReadableError({reason:'Unknown tracking number'});

// Public shipment tracking by Tracking Number only: an exact on-chain lookup (trimmed, upper-cased) that opens the shared drawer.
// Product Name filtering lives in each role's own lists, not here.
export default function TrackShipment({selectProduct,contextKey}) {
  const [query,setQuery] = useState(''); const [pending,setPending] = useState(false); const [notice,setNotice] = useState(null);
  const request = useRef(0); const previousContext = useRef(contextKey);
  useEffect(() => {
    if (previousContext.current === contextKey) return;
    previousContext.current = contextKey; request.current += 1;
    setQuery(''); setNotice(null); setPending(false);
  },[contextKey]);
  async function search(event) {
    event.preventDefault();
    const trackingNumber = normalizeTrackingNumber(query);
    if (!trackingNumber) { request.current += 1; setPending(false); setNotice({text:'Enter a tracking number.',role:'alert'}); return; }
    const current = ++request.current; setPending(true); setNotice(null);
    try { const found = await trackProduct('trackingNumber',trackingNumber); if (current === request.current) selectProduct?.(found,contextKey); }
    catch (e) {
      if (current !== request.current) return;
      const message = toReadableError(e);
      if (message === NOT_FOUND) setNotice({text:'Shipment not found',role:'status'});
      else { console.error('Shipment search failed',e); setNotice({text:message,role:'alert',error:true}); }
    } finally { if (current === request.current) setPending(false); }
  }
  return <section className="tracking-section">
    <form className="search-form" onSubmit={search} noValidate><h2>Track Shipment</h2><fieldset disabled={pending}>
      <label className="search-value">Tracking Number<input type="search" autoComplete="off" spellCheck={false} placeholder="TRK-2026-000001" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <button>{pending ? 'Searching…' : 'Search'}</button></fieldset>
      {notice && <p className={notice.error ? undefined : 'list-empty search-notice'} role={notice.role}>{notice.text}</p>}
    </form>
  </section>;
}
