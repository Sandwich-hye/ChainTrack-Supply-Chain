import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import SupplierDashboard from './components/SupplierDashboard';
import WarehouseDashboard from './components/WarehouseDashboard';
import TransportDashboard from './components/TransportDashboard';
import RetailerDashboard from './components/RetailerDashboard';
import AdminPanel from './components/AdminPanel';
import TrackProduct from './components/TrackProduct';
import { useWallet } from './hooks/useWallet';
import { CHAIN_ID, CONTRACT_ADDRESS, DEPLOYMENT_BLOCK, trackProduct } from './services/contractService';

export default function App() {
  const wallet = useWallet();
  const [selectedProduct,setSelectedProduct] = useState(null);
  const deploymentKey = `${CHAIN_ID}:${CONTRACT_ADDRESS}:${DEPLOYMENT_BLOCK}`;
  const contextKey = `${deploymentKey}:${wallet.address || ''}:${wallet.chainId || ''}`;
  const previousContext = useRef(contextKey); const currentContext = useRef(contextKey); currentContext.current = contextKey;
  useEffect(() => { if (previousContext.current !== contextKey) { previousContext.current = contextKey; setSelectedProduct(null); } },[contextKey]);
  const selectProduct = useCallback((result,expectedContext) => { if (currentContext.current === expectedContext) setSelectedProduct(result); },[]);
  const refreshProduct = useCallback(async (productId,expectedContext) => { const result = await trackProduct('productId',productId.toString()); if (currentContext.current === expectedContext) setSelectedProduct(result); return result; },[]);
  const dashboards = {Supplier:SupplierDashboard,Warehouse:WarehouseDashboard,Transport:TransportDashboard,Retailer:RetailerDashboard,Admin:AdminPanel};
  return <div className="app">
    <header className="page-header"><div><p className="eyebrow">Clothing supply chain</p><h1>Clothing Supply Chain Tracker</h1></div></header>
    <ConnectWallet wallet={wallet}/>
    <main><TrackProduct selectedProduct={selectedProduct} selectProduct={selectProduct} contextKey={contextKey} deploymentKey={deploymentKey}/>{wallet.roles.map(role => { const Dashboard = dashboards[role]; return <Dashboard key={`${wallet.address}-${wallet.chainId}-${role}`} address={wallet.address} selectedProduct={selectedProduct} selectProduct={selectProduct} refreshProduct={refreshProduct} contextKey={contextKey}/>; })}</main>
  </div>;
}
