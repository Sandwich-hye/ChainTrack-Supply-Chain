import React from 'react';

const stages = ['Created','In Warehouse','Dispatched','Picked Up','Delivered'];
// Legacy In Transit (status 4) is shown as Picked Up; Delivered (status 5) is the final stage.
const stageIndex = status => status >= 5 ? 4 : Math.min(status,3);
const stateOf = (index,current) => index < current ? 'complete' : index === current ? 'current' : 'future';
export default function ShipmentJourney({status}) {
  const current = stageIndex(Number(status));
  return <section className="journey-panel" aria-label="Shipment Journey">
    <h3>Shipment Journey</h3>
    <ol className="journey-stepper">{stages.map((stage,index) => { const state = stateOf(index,current); return <li key={stage} className={`journey-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
      <span className="journey-marker" aria-hidden="true">{state === 'complete' ? '✓' : state === 'current' ? '●' : ''}</span><span className="journey-label">{stage}</span>
    </li>; })}</ol>
  </section>;
}
