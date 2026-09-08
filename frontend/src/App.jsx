import React from 'react';
import ConnectWallet from './components/ConnectWallet';
import SupplierDashboard from './components/SupplierDashboard';
import WarehouseDashboard from './components/WarehouseDashboard';
import TransportDashboard from './components/TransportDashboard';
import RetailerDashboard from './components/RetailerDashboard';
import AdminPanel from './components/AdminPanel';
import TrackProduct from './components/TrackProduct';
import { useWallet } from './hooks/useWallet';
export default function App() {
  const wallet = useWallet();
  const dashboards = {Supplier:SupplierDashboard,Warehouse:WarehouseDashboard,Transport:TransportDashboard,Retailer:RetailerDashboard,Admin:AdminPanel};
  return <div className="app"><header><h1>Supply Chain Tracker</h1><ConnectWallet wallet={wallet}/></header><main><TrackProduct/>{wallet.roles.map(role => { const Dashboard = dashboards[role]; return <Dashboard key={`${wallet.address}-${wallet.chainId}-${role}`} address={wallet.address}/>; })}</main><footer>One product · One shipment · An event trail for every stage</footer></div>;
}

