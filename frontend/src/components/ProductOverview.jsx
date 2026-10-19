import React from 'react';
import StatusBadge from './StatusBadge';
import { businessName } from '../services/contractService';
import { useDirectory } from '../services/directory';

export default function ProductOverview({product,title = 'Product Overview'}) {
  const {names} = useDirectory();
  if (!product) return null;
  const transport = product.assignedTransport && product.assignedTransport !== '0x0000000000000000000000000000000000000000' ? businessName(product.assignedTransport,names) : 'Not assigned';
  return <section className="product-summary" aria-label={title}>
    <div className="product-title"><h3>{product.name}</h3><StatusBadge status={product.currentStatus}/></div>
    <dl><dt>Tracking Number</dt><dd className="tracking-number">{product.trackingNumber || 'Not assigned'}</dd>
      <dt>Quantity</dt><dd>{product.quantity.toString()}</dd>
      <dt>Supplier</dt><dd>{businessName(product.supplier,names)}</dd>
      <dt>Destination Retailer</dt><dd>{businessName(product.destinationRetailer,names) || 'Not assigned'}</dd>
      <dt>Transport Company</dt><dd>{transport}</dd></dl>
    <details className="technical-details"><summary>Technical Details</summary>
      <dl><dt>Product ID</dt><dd className="address">{product.productId.toString()}</dd></dl>
    </details>
  </section>;
}
