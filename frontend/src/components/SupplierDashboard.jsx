import React, { useEffect, useState } from 'react';
import TransactionForm from './TransactionForm';
import StatusBadge from './StatusBadge';
import { generateProductId, listSupplierProducts, trackProduct, toReadableError } from '../services/contractService';

export default function SupplierDashboard({address,refreshProduct,selectProduct,contextKey}) {
  const [createdProductId,setCreatedProductId] = useState(''); const [products,setProducts] = useState([]); const [productsPending,setProductsPending] = useState(false); const [productsError,setProductsError] = useState(''); const [selecting,setSelecting] = useState(''); const [reloadKey,setReloadKey] = useState(0);
  useEffect(() => { let alive = true; if (!address) { setProducts([]); return () => { alive = false; }; } setProductsPending(true); setProductsError(''); listSupplierProducts(address).then(values => alive && setProducts(values)).catch(error => alive && setProductsError(toReadableError(error))).finally(() => alive && setProductsPending(false)); return () => { alive = false; }; },[address,contextKey,reloadKey]);
  const create = async (_receipt,args) => { const result = await refreshProduct(args[0],contextKey); setCreatedProductId(args[0].toString()); setReloadKey(value => value + 1); return result; };
  const prepare = async args => [await generateProductId(),...args];
  const select = async product => { setSelecting(product.productId.toString()); try { const result = await trackProduct('productId',product.productId.toString()); selectProduct?.(result,contextKey); } catch (error) { setProductsError(toReadableError(error)); } finally { setSelecting(''); } };
  return <section className="dashboard"><p className="eyebrow">Clothing supplier</p><h2>Create clothing product</h2><p className="muted">Register a clothing shipment.</p>
    <TransactionForm address={address} title="Create Product" method="createProduct" fields={[{name:'name',label:'Product Name',placeholder:'Classic Cotton T-Shirt'},{name:'quantity',label:'Quantity',type:'uint',positive:true,min:1,step:1}]} prepare={prepare} onSuccess={create}/>
    {createdProductId && <p className="notice-success" role="status">Created Product ID: <span className="address">{createdProductId}</span></p>}
    <div className="supplier-products"><div className="history-heading"><h3>My Products</h3><span className="muted">{products.length} product{products.length === 1 ? '' : 's'}</span></div>
      {productsPending && <p className="notice-pending" role="status">Loading products…</p>}
      {productsError && <p role="alert">{productsError}</p>}
      {!productsPending && !productsError && !products.length && <p className="empty-state">No products created yet.</p>}
      {!productsPending && !productsError && products.length > 0 && <ul className="supplier-product-list">{products.map(product => <li key={product.productId.toString()}><button type="button" className="supplier-product" disabled={selecting === product.productId.toString()} onClick={() => select(product)}><span><strong>{product.name}</strong><small>Product ID {product.productId.toString()} · Quantity {product.quantity.toString()}</small></span><StatusBadge status={product.currentStatus}/></button></li>)}</ul>}
    </div>
  </section>;
}
