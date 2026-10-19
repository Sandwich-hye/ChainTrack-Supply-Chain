import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import SupplierDashboard from './components/SupplierDashboard';
import WarehouseDashboard, { WarehouseActions } from './components/WarehouseDashboard';
import TransportDashboard, { TransportActions } from './components/TransportDashboard';
import RetailerDashboard, { RetailerActions } from './components/RetailerDashboard';
import AdminPanel from './components/AdminPanel';
import TrackShipment from './components/TrackProduct';
import ProductDetails from './components/ProductDetails';
import { useWallet } from './hooks/useWallet';
import { CHAIN_ID, CONTRACT_ADDRESS, DEPLOYMENT_BLOCK, trackProduct } from './services/contractService';
import { DirectoryProvider } from './services/directory';

const panels = {Supplier:SupplierDashboard,Warehouse:WarehouseDashboard,Transport:TransportDashboard,Retailer:RetailerDashboard};
const actions = {Warehouse:WarehouseActions,Transport:TransportActions,Retailer:RetailerActions};

export default function App() {
  const wallet = useWallet();
  const [selectedProduct,setSelectedProduct] = useState(null);
  const deploymentKey = `${CHAIN_ID}:${CONTRACT_ADDRESS}:${DEPLOYMENT_BLOCK}`;
  const contextKey = `${deploymentKey}:${wallet.address || ''}:${wallet.chainId || ''}`;
  const previousContext = useRef(contextKey); const currentContext = useRef(contextKey); currentContext.current = contextKey;
  useEffect(() => { if (previousContext.current !== contextKey) { previousContext.current = contextKey; setSelectedProduct(null); } },[contextKey]);
  const selectProduct = useCallback((result,expectedContext) => { if (currentContext.current === expectedContext) setSelectedProduct(result); },[]);
  const refreshProduct = useCallback(async (productId,expectedContext) => { const result = await trackProduct('productId',productId.toString()); if (currentContext.current === expectedContext) setSelectedProduct(result); return result; },[]);
  const closeProduct = useCallback(() => setSelectedProduct(null),[]);
  // Role queues reload whenever the selected product changes stage, e.g. after a role action; closing the drawer does not reload them.
  const [revision,setRevision] = useState('');
  useEffect(() => { if (selectedProduct) setRevision(`${selectedProduct.product.productId}:${selectedProduct.product.currentStatus}`); },[selectedProduct]);
  const shared = {address:wallet.address,selectedProduct,selectProduct,refreshProduct,contextKey};
  const roleKey = role => `${wallet.address}-${wallet.chainId}-${role}`;
  const rolePanels = wallet.roles.filter(role => panels[role]);
  const roleActions = wallet.roles.filter(role => actions[role]);
  return <DirectoryProvider key={contextKey} contextKey={contextKey} address={wallet.address}><div className="app">
    <header className="page-header"><h1>Clothing Supply Chain Tracker</h1><ConnectWallet wallet={wallet}/></header>
    {wallet.error && <p role="alert" className="wallet-alert">{wallet.error}</p>}
    <main>
      <TrackShipment selectProduct={selectProduct} contextKey={contextKey}/>
      {rolePanels.length > 0 && <div className="role-grid">{rolePanels.map(role => { const Panel = panels[role]; return <Panel key={roleKey(role)} {...shared} revision={revision}/>; })}</div>}
      {wallet.roles.includes('Admin') && <AdminPanel key={roleKey('Admin')} {...shared} refreshRoles={wallet.refresh}/>}
    </main>
    <ProductDetails result={selectedProduct} onClose={closeProduct}>{roleActions.map(role => { const Actions = actions[role]; return <Actions key={roleKey(role)} {...shared}/>; })}</ProductDetails>
  </div></DirectoryProvider>;
}
