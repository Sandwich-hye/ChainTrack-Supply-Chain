import React from 'react';
import StatusBadge from './StatusBadge';

export default function ProductOverview({product,title = 'Product Overview'}) {
  if (!product) return null;
  return <section className="product-summary" aria-label={title}>
    <p className="eyebrow">{title}</p><h3>{product.name}</h3>
    <dl><dt>Product ID</dt><dd>{product.productId.toString()}</dd>
      <dt>Quantity</dt><dd>{product.quantity.toString()}</dd>
      <dt>Supplier</dt><dd className="address">{product.supplier}</dd>
      <dt>Tracking Number</dt><dd>{product.trackingNumber || 'Not assigned yet'}</dd>
      <dt>Current Status</dt><dd><StatusBadge status={product.currentStatus}/></dd></dl>
  </section>;
}
