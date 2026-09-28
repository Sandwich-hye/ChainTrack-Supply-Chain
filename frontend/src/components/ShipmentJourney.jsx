import React from 'react';

const stages = ['Created','In Warehouse','Dispatched','Picked Up','In Transit','Delivered'];
export default function ShipmentJourney({status}) {
  const current = Number(status);
  return <section className="journey-panel" aria-label="Shipment Journey">
    <div className="history-heading"><h3>Shipment Journey</h3><span className="muted">Stage {current + 1} of {stages.length}</span></div>
    <ol className="journey-stages">{stages.map((stage,index) => <li key={stage} className={index < current ? 'journey-complete' : index === current ? 'journey-current' : 'journey-future'}>
      <span aria-hidden="true">{index < current ? '✓' : index === current ? '●' : '○'}</span><span>{stage}</span>
    </li>)}</ol>
  </section>;
}
