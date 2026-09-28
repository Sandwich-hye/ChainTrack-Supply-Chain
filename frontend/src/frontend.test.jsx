// @vitest-environment jsdom
import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup,renderHook,act } from '@testing-library/react';
import TransactionForm,{productId,quantity} from './components/TransactionForm';
import AdminPanel from './components/AdminPanel';
import WarehouseDashboard from './components/WarehouseDashboard';
import TransportDashboard from './components/TransportDashboard';
import SupplierDashboard from './components/SupplierDashboard';
import TrackProduct from './components/TrackProduct';
import ShipmentJourney from './components/ShipmentJourney';
import { useWallet } from './hooks/useWallet';
import * as service from './services/contractService';
vi.mock('./services/contractService',async importOriginal => ({...await importOriginal(),getWriteContract:vi.fn(),detectRoles:vi.fn(),trackProduct:vi.fn(),generateProductId:vi.fn(),listSupplierProducts:vi.fn()}));
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); delete window.ethereum; });
describe('dashboard transactions',() => {
  it('keeps Product ID automatic and lets a supplier select a blockchain product',async () => {
    service.generateProductId.mockResolvedValue(42n); service.listSupplierProducts.mockResolvedValue([{productId:42n,name:'Classic Denim Jacket',quantity:10n,currentStatus:0n,supplier:'supplier'}]);
    const createProduct = vi.fn(async () => ({hash:'0xcreate',wait:vi.fn(async () => ({status:1,hash:'0xcreate'}))})); service.getWriteContract.mockResolvedValue({createProduct});
    service.trackProduct.mockResolvedValue({product:{productId:42n,name:'Classic Denim Jacket',quantity:10n,currentStatus:0n,supplier:'supplier',trackingNumber:''},timeline:[]});
    const refreshProduct = vi.fn(async () => undefined); const selectProduct = vi.fn();
    render(<SupplierDashboard address="supplier" refreshProduct={refreshProduct} selectProduct={selectProduct} contextKey="supplier-context"/>);
    await waitFor(() => expect(screen.getByText('Classic Denim Jacket')).toBeTruthy());
    expect(screen.queryByLabelText('Product ID')).toBeNull();
    fireEvent.change(screen.getByLabelText('Product Name'),{target:{value:'Classic Denim Jacket'}}); fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'10'}}); fireEvent.click(screen.getByText('Create Product',{selector:'button'}));
    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(42n,'Classic Denim Jacket',10n));
    await waitFor(() => expect(screen.getByText('Created Product ID:')).toBeTruthy());
    fireEvent.click(screen.getByText('Classic Denim Jacket'));
    await waitFor(() => expect(selectProduct).toHaveBeenCalled());
  });
  it('submits exact arguments and shows pending then confirmed hash',async () => {
    let confirm; const wait = vi.fn(() => new Promise(resolve => {confirm=resolve;}));
    const createProduct = vi.fn(async () => ({hash:'0xsubmitted',wait})); service.getWriteContract.mockResolvedValue({createProduct});
    render(<TransactionForm title="Create" method="createProduct" fields={[productId,{name:'name',label:'Name'},quantity]} address="account"/>);
    for (const [label,value] of [['Product ID','7'],['Name','Tea'],['Quantity','10']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
    fireEvent.click(screen.getByText('Create',{selector:'button'}));
    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(7n,'Tea',10n));
    expect(screen.getByText('Pending…').matches(':disabled')).toBe(true);
    await act(async () => confirm({status:1,hash:'0xconfirmed'}));
    expect(screen.getByText('Transaction confirmed.')).toBeTruthy(); expect(screen.getByText('Transaction: 0xconfirmed')).toBeTruthy();
  });
  it('shows a readable rejected-transaction error and restores the form',async () => {
    service.getWriteContract.mockRejectedValue({code:'ACTION_REJECTED'});
    render(<TransactionForm title="Exit" method="recordWarehouseExit" fields={[productId]}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'1'}}); fireEvent.click(screen.getByText('Exit',{selector:'button'}));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('rejected'));
    expect(screen.getByText('Exit',{selector:'button'}).disabled).toBe(false);
  });
  it('exposes only business roles, one exit field, and no transport status selector',() => {
    const admin = render(<AdminPanel/>); expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([...service.BUSINESS_ROLES,...service.BUSINESS_ROLES]); admin.unmount();
    const warehouse = render(<WarehouseDashboard selectedProduct={{product:{productId:1n,name:'Classic Cotton T-Shirt',quantity:20n,currentStatus:1n,supplier:'supplier',trackingNumber:''}}}/>); const exit = screen.getByText('Record Warehouse Exit',{selector:'button'}).closest('form'); expect(exit.querySelectorAll('input')).toHaveLength(0); warehouse.unmount();
    render(<TransportDashboard/>); expect(screen.queryByRole('combobox')).toBeNull();
  });
  it('requires full quantity confirmation before submitting a receipt',async () => {
    const entry = vi.fn(async () => ({hash:'0xentry',wait:vi.fn(async () => ({status:1,hash:'0xentry'}))})); service.getWriteContract.mockResolvedValue({recordWarehouseEntry:entry});
    render(<TransactionForm title="Confirm" method="recordWarehouseEntry" fields={[{name:'warehouseId',label:'Warehouse Reference'}]} confirmation="Full quantity received" prepare={async args => [1n,args[0],20n]} address="account"/>);
    fireEvent.change(screen.getByLabelText('Warehouse Reference'),{target:{value:'Auckland Clothing Distribution Centre'}}); fireEvent.click(screen.getByText('Confirm',{selector:'button'}));
    expect(entry).not.toHaveBeenCalled(); fireEvent.click(screen.getByLabelText('Full quantity received')); fireEvent.click(screen.getByText('Confirm',{selector:'button'}));
    await waitFor(() => expect(entry).toHaveBeenCalledWith(1n,'Auckland Clothing Distribution Centre',20n));
  });
});
describe('wallet events',() => {
  it('handles multiple roles, account change, wrong chain, disconnection and cleanup',async () => {
    let accounts = ['0x1111111111111111111111111111111111111111']; let chain = '0x7a69'; const listeners = {};
    window.ethereum = {request:vi.fn(async ({method}) => method === 'eth_chainId' ? chain : accounts),on:vi.fn((name,fn) => {listeners[name]=fn;}),removeListener:vi.fn()};
    service.getWriteContract.mockResolvedValue({}); service.detectRoles.mockResolvedValue(['Supplier','Transport']);
    const {result,unmount} = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.roles).toEqual(['Supplier','Transport']));
    accounts = ['0x2222222222222222222222222222222222222222'];
    await act(async () => listeners.accountsChanged(accounts)); await waitFor(() => expect(result.current.address).toBe(accounts[0]));
    chain = '0x1'; await act(async () => listeners.chainChanged(chain)); await waitFor(() => expect(result.current.error).toContain('Wrong network')); expect(result.current.roles).toEqual([]);
    accounts = []; await act(async () => listeners.accountsChanged([])); await waitFor(() => expect(result.current.address).toBeNull());
    await act(async () => listeners.disconnect()); expect(result.current.roles).toEqual([]);
    const wallet = window.ethereum; unmount(); expect(wallet.removeListener).toHaveBeenCalledTimes(3);
  });
  it('handles absent MetaMask',async () => {
    const {result} = renderHook(() => useWallet()); await act(async () => result.current.connect()); expect(result.current.error).toContain('Install MetaMask');
  });
});
describe('track product rendering',() => {
  it('renders the six-stage shipment journey without a percentage',() => {
    const view = render(<ShipmentJourney status={3n}/>); expect(screen.getByText('Stage 4 of 6')).toBeTruthy(); expect(screen.getByText('In Transit')).toBeTruthy(); expect(screen.queryByText(/%/)).toBeNull();
    view.unmount(); render(<ShipmentJourney status={5n}/>); expect(screen.getByText('Stage 6 of 6')).toBeTruthy(); expect(screen.getByText('Delivered')).toBeTruthy();
  });
  it('renders every event field and routes tracking searches correctly',async () => {
    service.trackProduct.mockResolvedValue({product:{name:'Tea',productId:1n,quantity:10n,currentStatus:5n,supplier:'supplier-wallet'},timeline:[{event:'TransportPickup',transactionHash:'0xhash',blockNumber:2,transactionIndex:0,index:0,fields:{productId:'1',transportCompany:'transport-wallet',trackingNumber:'TRACK',driverId:'DRIVER',timestamp:'100'}}]});
    render(<TrackProduct selectedProduct={{product:{productId:1n}}}/>); fireEvent.change(screen.getByLabelText('Search by'),{target:{value:'trackingNumber'}}); fireEvent.change(screen.getByLabelText('Search value'),{target:{value:'TRACK'}}); fireEvent.click(screen.getByText('Search',{selector:'button'}));
    await waitFor(() => expect(screen.getByText('TransportPickup')).toBeTruthy());
    expect(service.trackProduct).toHaveBeenCalledWith('trackingNumber','TRACK');
    for (const value of ['transport-wallet','TRACK','DRIVER','Driver Reference','Transaction: 0xhash']) expect(screen.getByText(value)).toBeTruthy();
    expect(screen.getByText('Selected',{selector:'button'}).disabled).toBe(true);
  });
  it('clears a search result when the wallet context changes',async () => {
    service.trackProduct.mockResolvedValue({product:{name:'Tea',productId:1n,quantity:10n,currentStatus:5n,supplier:'supplier-wallet'},timeline:[{event:'TransportPickup',transactionHash:'0xhash',blockNumber:2,transactionIndex:0,index:0,fields:{productId:'1',trackingNumber:'TRACK',driverId:'DRIVER',timestamp:'100'}}]});
    const view = render(<TrackProduct contextKey="account-one"/>); fireEvent.change(screen.getByLabelText('Search value'),{target:{value:'1'}}); fireEvent.click(screen.getByText('Search',{selector:'button'}));
    await waitFor(() => expect(screen.getByText('TransportPickup')).toBeTruthy());
    view.rerender(<TrackProduct contextKey="account-two"/>);
    await waitFor(() => expect(screen.getByText('No product selected')).toBeTruthy());
    expect(screen.queryByText('TransportPickup')).toBeNull();
  });
});
