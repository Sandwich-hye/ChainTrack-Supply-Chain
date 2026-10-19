// @vitest-environment jsdom
import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { render as rtlRender,screen,fireEvent,waitFor,cleanup,renderHook,act,within } from '@testing-library/react';
import TransactionForm,{productId,quantity} from './components/TransactionForm';
import AdminPanel from './components/AdminPanel';
import WarehouseDashboard,{WarehouseActions} from './components/WarehouseDashboard';
import TransportDashboard,{TransportActions} from './components/TransportDashboard';
import SupplierDashboard from './components/SupplierDashboard';
import ProductOverview from './components/ProductOverview';
import TrackShipment from './components/TrackProduct';
import ShipmentJourney from './components/ShipmentJourney';
import RetailerDashboard,{RetailerActions} from './components/RetailerDashboard';
import ProductDetails from './components/ProductDetails';
import App from './App';
import ConnectWallet from './components/ConnectWallet';
import { useActionFeedback } from './components/ActionFeedback';
import { useWallet } from './hooks/useWallet';
import * as service from './services/contractService';
import { DirectoryProvider, useRoleOptions } from './services/directory';
import { Interface } from 'ethers';
import { readFileSync } from 'node:fs';
const styles = readFileSync(`${process.cwd()}/src/styles.css`,'utf8');
const retailerAddress = '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65';
const transportAddress = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const render = (ui,options = {}) => rtlRender(ui,{wrapper:({children}) => <DirectoryProvider contextKey="test-wrapper" address={ui?.props?.address}>{children}</DirectoryProvider>,...options});
vi.mock('./services/contractService',async importOriginal => ({...await importOriginal(),getReadContract:vi.fn(),getWriteContract:vi.fn(),detectRoles:vi.fn(),trackProduct:vi.fn(),generateProductId:vi.fn(),listSupplierProducts:vi.fn(),listWarehouseProducts:vi.fn(),listTransportProducts:vi.fn(),listRetailerProducts:vi.fn(),listWarehouseShipments:vi.fn(),listTransportShipments:vi.fn(),listRetailerShipments:vi.fn(),listRoleAssignments:vi.fn(),loadBusinessNames:vi.fn(),listDrivers:vi.fn(),requireFreshProduct:vi.fn()}));
beforeEach(() => {
  vi.clearAllMocks();
  for (const name of ['listSupplierProducts','listWarehouseProducts','listTransportProducts','listRetailerProducts']) service[name].mockResolvedValue([]);
  for (const name of ['listWarehouseShipments','listTransportShipments','listRetailerShipments']) service[name].mockResolvedValue({active:[],history:[]});
  service.listRoleAssignments.mockResolvedValue({Supplier:[],Warehouse:['0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'],Transport:[transportAddress],Retailer:[retailerAddress]});
  service.loadBusinessNames.mockResolvedValue({[retailerAddress.toLowerCase()]:'Queen Street Clothing Store',[transportAddress.toLowerCase()]:'Auckland Clothing Transport','0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc':'Auckland Clothing Distribution Centre'});
  service.listDrivers.mockResolvedValue([{driverId:'DRV-JOHN-01',name:'John',transport:transportAddress}]);
  service.getReadContract.mockResolvedValue({getDriver:vi.fn(async () => ({name:'John'}))});
});
afterEach(() => { cleanup(); delete window.ethereum; delete navigator.clipboard; });
// Track Shipment has one Tracking Number input and one Search button.
const searchFor = value => { fireEvent.change(screen.getByLabelText('Tracking Number'),{target:{value}}); fireEvent.click(screen.getByRole('button',{name:'Search'})); };
describe('dashboard transactions',() => {
  it('keeps Product ID and Tracking Number automatic, shows the issued tracking number, and lets a supplier select a product',async () => {
    service.generateProductId.mockResolvedValue(42n); service.listSupplierProducts.mockResolvedValue([{productId:42n,name:'Classic Denim Jacket',quantity:10n,currentStatus:0n,supplier:'supplier',trackingNumber:'TRK-2026-000007'}]);
    const created = new Interface(service.ABI).encodeEventLog('ProductCreated',[42n,'0x70997970C51812dc3A010C7d01b50e0d17dc79C8',retailerAddress,'Classic Denim Jacket',10n,'TRK-2026-000007',100n]);
    const createProduct = vi.fn(async () => ({hash:'0xcreate',wait:vi.fn(async () => ({status:1,hash:'0xcreate',logs:[{...created,address:service.CONTRACT_ADDRESS}]}))})); service.getWriteContract.mockResolvedValue({createProduct});
    service.trackProduct.mockResolvedValue({product:{productId:42n,name:'Classic Denim Jacket',quantity:10n,currentStatus:0n,supplier:'supplier',trackingNumber:''},timeline:[]});
    const refreshProduct = vi.fn(async () => undefined); const selectProduct = vi.fn();
    render(<SupplierDashboard address="supplier" refreshProduct={refreshProduct} selectProduct={selectProduct} contextKey="supplier-context"/>);
    await waitFor(() => expect(screen.getByText('Classic Denim Jacket')).toBeTruthy());
    expect(screen.queryByLabelText('Product ID')).toBeNull(); expect(screen.queryByLabelText(/Tracking/i)).toBeNull();
    expect(screen.getByText('TRK-2026-000007')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Product Name'),{target:{value:'Classic Denim Jacket'}}); fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'10'}}); fireEvent.change(screen.getByLabelText('Destination Retailer'),{target:{value:retailerAddress}}); fireEvent.click(screen.getByText('Create Product',{selector:'button'}));
    expect(screen.getByText('Queen Street Clothing Store')).toBeTruthy();
    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(42n,'Classic Denim Jacket',10n,retailerAddress));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Product created · TRK-2026-000007'));
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
  it('keeps a confirmed transaction successful when its data refresh fails',async () => {
    const createProduct = vi.fn(async () => ({hash:'0xsubmitted',wait:vi.fn(async () => ({status:1,hash:'0xconfirmed'}))}));
    service.getWriteContract.mockResolvedValue({createProduct});
    const refresh = vi.fn(async () => { throw new Error('Transaction failed'); });
    render(<TransactionForm title="Create" method="createProduct" fields={[productId]} onSuccess={refresh}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'7'}});
    fireEvent.click(screen.getByText('Create',{selector:'button'}));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Transaction confirmed.')).toBeTruthy();
    expect(screen.getByText('Transaction: 0xconfirmed')).toBeTruthy();
    expect(await screen.findByText(/Transaction confirmed, but data could not be refreshed/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Transaction failed/)).toBeNull();
    expect(createProduct).toHaveBeenCalledTimes(1);
  });
  it('does not turn a successful Supplier creation into a transaction error when its list reload fails',async () => {
    service.generateProductId.mockResolvedValue(42n);
    service.listSupplierProducts.mockResolvedValueOnce([]).mockRejectedValue(new Error('Transaction failed'));
    const createProduct = vi.fn(async () => ({hash:'0xcreated',wait:vi.fn(async () => ({status:1,hash:'0xcreated',logs:[]}))}));
    service.getWriteContract.mockResolvedValue({createProduct});
    render(<SupplierDashboard address="supplier" contextKey="supplier-refresh"/>);
    await waitFor(() => expect(service.listSupplierProducts).toHaveBeenCalledTimes(1));
    await screen.findByText('Queen Street Clothing Store');
    fireEvent.change(screen.getByLabelText('Product Name'),{target:{value:'Jacket'}});
    fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'2'}});
    fireEvent.change(screen.getByLabelText('Destination Retailer'),{target:{value:retailerAddress}});
    fireEvent.click(screen.getByText('Create Product',{selector:'button'}));
    await screen.findByText('Product created');
    expect(await screen.findByText(/Shipment data could not be refreshed/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Transaction failed/)).toBeNull();
    expect(createProduct).toHaveBeenCalledTimes(1);
  });
  it('reports one success after a confirmed transaction and successful refresh',async () => {
    const registerDriver = vi.fn(async () => ({hash:'0xsubmitted',wait:vi.fn(async () => ({status:1,hash:'0xconfirmed'}))}));
    service.getWriteContract.mockResolvedValue({registerDriver});
    const refresh = vi.fn(async () => undefined);
    render(<TransactionForm title="Register" method="registerDriver" fields={[{name:'name',label:'Driver Name'}]} onSuccess={refresh} successMessage="Driver registered"/>);
    fireEvent.change(screen.getByLabelText('Driver Name'),{target:{value:'Alex'}});
    fireEvent.click(screen.getByText('Register',{selector:'button'}));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('status').map(node => node.textContent)).toEqual(['Driver registered']);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('reports a wallet rejection before submission without claiming success',async () => {
    const createProduct = vi.fn(async () => { throw {code:4001}; });
    service.getWriteContract.mockResolvedValue({createProduct});
    render(<TransactionForm title="Create" method="createProduct" fields={[productId]}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'7'}});
    fireEvent.click(screen.getByText('Create',{selector:'button'}));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('rejected in MetaMask'));
    expect(screen.queryByText('Transaction confirmed.')).toBeNull();
    expect(createProduct).toHaveBeenCalledTimes(1);
  });
  it('reports a reverted receipt as failure and skips the refresh callback',async () => {
    const recordPickup = vi.fn(async () => ({hash:'0xsubmitted',wait:vi.fn(async () => ({status:0,hash:'0xreverted'}))}));
    service.getWriteContract.mockResolvedValue({recordPickup});
    const refresh = vi.fn();
    render(<TransactionForm title="Pickup" method="recordPickup" fields={[productId]} onSuccess={refresh}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'7'}});
    fireEvent.click(screen.getByText('Pickup',{selector:'button'}));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Contract transaction reverted'));
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByText('Transaction confirmed.')).toBeNull();
  });
  it('trusts a successful receipt even if the wait call throws after confirmation',async () => {
    const receipt = {status:1,hash:'0xconfirmed'};
    const recordWarehouseEntry = vi.fn(async () => ({hash:'0xsubmitted',wait:vi.fn(async () => { throw {code:'CALL_EXCEPTION',receipt}; })}));
    service.getWriteContract.mockResolvedValue({recordWarehouseEntry});
    const refresh = vi.fn(async () => undefined);
    render(<TransactionForm title="Entry" method="recordWarehouseEntry" fields={[productId]} onSuccess={refresh}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'7'}});
    fireEvent.click(screen.getByText('Entry',{selector:'button'}));
    await waitFor(() => expect(refresh).toHaveBeenCalledWith(receipt,[7n]));
    expect(screen.getByText('Transaction confirmed.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(recordWarehouseEntry).toHaveBeenCalledTimes(1);
  });
  it('reports a reverted receipt carried by a wait error as a contract failure',async () => {
    const recordWarehouseExit = vi.fn(async () => ({hash:'0xsubmitted',wait:vi.fn(async () => { throw {code:'CALL_EXCEPTION',receipt:{status:'0x0'}}; })}));
    service.getWriteContract.mockResolvedValue({recordWarehouseExit});
    render(<TransactionForm title="Dispatch" method="recordWarehouseExit" fields={[productId]}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'7'}});
    fireEvent.click(screen.getByText('Dispatch',{selector:'button'}));
    expect((await screen.findByRole('alert')).textContent).toContain('Contract transaction reverted');
    expect(screen.queryByText('Transaction confirmed.')).toBeNull();
  });
  it('keeps an uncertain confirmation separate from a known revert and never retries',async () => {
    const confirmDelivery = vi.fn(async () => ({hash:'0xsubmitted',wait:vi.fn(async () => { throw new Error('RPC disconnected'); })}));
    service.getWriteContract.mockResolvedValue({confirmDelivery});
    render(<TransactionForm title="Delivery" method="confirmDelivery" fields={[productId]}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'7'}});
    fireEvent.click(screen.getByText('Delivery',{selector:'button'}));
    expect((await screen.findByText(/Transaction confirmation could not be verified/)).className).toBe('notice-warning');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(confirmDelivery).toHaveBeenCalledTimes(1);
  });
  it('shows a persistent action notice only after refreshed status replaces the form',async () => {
    const product = {productId:1n,currentStatus:0n}; const refresh = vi.fn(async () => undefined);
    const view = renderHook(({item}) => useActionFeedback(item,refresh,'ctx'),{initialProps:{item:product}});
    await act(async () => { await view.result.current[1]('Warehouse entry recorded')(); });
    expect(view.result.current[0]).toBe('');
    view.rerender({item:{...product,currentStatus:1n}});
    await waitFor(() => expect(view.result.current[0]).toBe('Warehouse entry recorded'));
  });
  it('shows a readable rejected-transaction error and restores the form',async () => {
    service.getWriteContract.mockRejectedValue({code:'ACTION_REJECTED'});
    render(<TransactionForm title="Exit" method="recordWarehouseExit" fields={[productId]}/>);
    fireEvent.change(screen.getByLabelText('Product ID'),{target:{value:'1'}}); fireEvent.click(screen.getByText('Exit',{selector:'button'}));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('rejected'));
    expect(screen.getByText('Exit',{selector:'button'}).disabled).toBe(false);
  });
  it('exposes business roles, transport assignment at exit, and no transport status selector',() => {
    const admin = render(<AdminPanel/>); expect([...screen.getByLabelText('Role').options].map(o => o.textContent)).toEqual(service.BUSINESS_ROLES); admin.unmount();
    const warehouse = render(<WarehouseActions selectedProduct={{product:{productId:1n,name:'Classic Cotton T-Shirt',quantity:20n,currentStatus:1n,supplier:'supplier',trackingNumber:''}}}/>); expect(screen.getByLabelText('Transport Company')).toBeTruthy(); expect(screen.queryByPlaceholderText('0x...')).toBeNull(); expect(screen.getByText('Dispatch Shipment',{selector:'button'})).toBeTruthy(); warehouse.unmount();
    render(<WarehouseActions address="warehouse" selectedProduct={{product:{productId:1n,name:'Classic Cotton T-Shirt',quantity:20n,currentStatus:0n,supplier:'supplier',trackingNumber:''}}}/>); expect(screen.getByText('warehouse')).toBeTruthy(); expect(screen.getByText('Expected Quantity')).toBeTruthy(); expect(screen.getAllByText('20').length).toBeGreaterThan(0); expect(screen.queryByLabelText('Expected Quantity')).toBeNull(); expect(screen.queryByLabelText('Warehouse Reference')).toBeNull();
    cleanup(); render(<TransportActions selectedProduct={{product:{productId:1n,name:'Classic Cotton T-Shirt',quantity:20n,currentStatus:3n,supplier:'supplier',trackingNumber:'TRK-2026-000001'}}}/>); expect(screen.queryByRole('combobox')).toBeNull();
  });
  it('dispatches through the named Transport Company selector',async () => {
    const fresh = {productId:1n,name:'Classic Cotton T-Shirt',quantity:20n,currentStatus:1n,supplier:'supplier',trackingNumber:''};
    service.requireFreshProduct.mockResolvedValue(fresh); const exit = vi.fn(async () => ({hash:'0xexit',wait:vi.fn(async () => ({status:1,hash:'0xexit'}))})); service.getWriteContract.mockResolvedValue({recordWarehouseExit:exit});
    render(<WarehouseActions address="warehouse" selectedProduct={{product:fresh}} refreshProduct={vi.fn()} contextKey="warehouse-context"/>);
    await waitFor(() => expect(screen.getByLabelText('Transport Company').options).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('Transport Company'),{target:{value:transportAddress}}); fireEvent.click(screen.getByText('Dispatch Shipment',{selector:'button'}));
    await waitFor(() => expect(exit).toHaveBeenCalledWith(1n,transportAddress));
    await waitFor(() => expect(screen.getAllByRole('status').map(node => node.textContent)).toContain('Shipment dispatched'));
  });
  it('requires full quantity confirmation before submitting a receipt',async () => {
    const entry = vi.fn(async () => ({hash:'0xentry',wait:vi.fn(async () => ({status:1,hash:'0xentry'}))})); service.getWriteContract.mockResolvedValue({recordWarehouseEntry:entry});
    render(<TransactionForm title="Confirm" method="recordWarehouseEntry" fields={[{name:'warehouseId',label:'Warehouse Reference'}]} confirmation="Full quantity received" prepare={async args => [1n,args[0],20n]} address="account"/>);
    fireEvent.change(screen.getByLabelText('Warehouse Reference'),{target:{value:'Auckland Clothing Distribution Centre'}}); fireEvent.click(screen.getByText('Confirm',{selector:'button'}));
    expect(entry).not.toHaveBeenCalled(); fireEvent.click(screen.getByLabelText('Full quantity received')); fireEvent.click(screen.getByText('Confirm',{selector:'button'}));
    await waitFor(() => expect(entry).toHaveBeenCalledWith(1n,'Auckland Clothing Distribution Centre',20n));
  });
});
describe('role workflow field rules',() => {
  const shipment = (status,extra = {}) => ({productId:1n,name:'Classic Cotton T-Shirt',quantity:20n,currentStatus:BigInt(status),supplier:'supplier',destinationRetailer:retailerAddress,assignedTransport:transportAddress,trackingNumber:'',...extra});
  const typedLabels = container => within(container).queryAllByRole('textbox').map(input => input.closest('label')?.firstChild?.textContent);
  const optionPairs = select => [...select.options].map(option => [option.textContent,option.value]);
  const explanatory = ['Confirm the complete expected quantity','issued automatically','Assign transport and dispatch','Search and select a product','Register a clothing shipment','Pick up and update','Receive and dispatch','Confirm delivery of the selected','role-restricted','view its current status and recorded events','Shown in blockchain order','Product visibility','Current Product','Clothing supplier','Clothing warehouse','Clothing transport','Clothing retail store','Access management','to begin','Waiting for','Contact an administrator','No product selected','Shipment Delivered.'];
  const expectNoExplanatoryText = container => { for (const text of explanatory) expect(container.textContent).not.toContain(text); };
  const expectNoLocation = container => { expect(within(container).queryByLabelText(/location/i)).toBeNull(); expect(within(container).queryByText(/Update Location/i)).toBeNull(); expect(within(container).queryByRole('button',{name:/location/i})).toBeNull(); };

  it('Supplier types only Product Name and Quantity and selects the Destination Retailer',async () => {
    const view = render(<SupplierDashboard address="supplier" refreshProduct={vi.fn()} contextKey="supplier"/>);
    await waitFor(() => expect(service.listSupplierProducts).toHaveBeenCalledWith('supplier'));
    const retailer = screen.getByLabelText('Destination Retailer');
    expect(retailer.tagName).toBe('SELECT');
    await waitFor(() => expect(optionPairs(retailer)).toEqual([['Select Destination Retailer',''],['Queen Street Clothing Store',retailerAddress]]));
    expect(typedLabels(view.container)).toEqual(['Product Name']);
    expect(screen.getByLabelText('Quantity').type).toBe('number');
    expect(screen.queryByLabelText('Product ID')).toBeNull();
    expectNoExplanatoryText(view.container);
  });

  it('Warehouse shows read-only quantity and warehouse, then selects the Transport Company with no typed fields',async () => {
    const entry = render(<WarehouseActions address="warehouse" selectedProduct={{product:shipment(0)}} contextKey="warehouse"/>);
    expect(entry.container.querySelector('.read-only-field')).toBeTruthy();
    expect(within(entry.container).queryByLabelText('Expected Quantity')).toBeNull();
    expect(within(entry.container).queryByLabelText('Warehouse Reference')).toBeNull();
    expect(within(entry.container).queryAllByRole('textbox')).toEqual([]); expect(within(entry.container).queryAllByRole('spinbutton')).toEqual([]);
    expectNoExplanatoryText(entry.container); entry.unmount();
    const exit = render(<WarehouseActions address="warehouse" selectedProduct={{product:shipment(1)}} contextKey="warehouse"/>);
    const transport = screen.getByLabelText('Transport Company');
    expect(transport.tagName).toBe('SELECT');
    await waitFor(() => expect(optionPairs(transport)).toEqual([['Select Transport Company',''],['Auckland Clothing Transport',transportAddress]]));
    expect(within(exit.container).queryAllByRole('textbox')).toEqual([]);
    expectNoExplanatoryText(exit.container);
  });

  it('Transport shows the existing Tracking Number read-only, selects the Driver, and has no location step',async () => {
    const pickup = render(<TransportActions address={transportAddress} selectedProduct={{product:shipment(2,{trackingNumber:'TRK-2026-000001'})}} contextKey="transport"/>);
    await waitFor(() => expect(screen.getByText('TRK-2026-000001')).toBeTruthy());
    expect(within(pickup.container).queryByLabelText(/Tracking Number/i)).toBeNull();
    const driver = screen.getByLabelText('Driver');
    expect(driver.tagName).toBe('SELECT');
    await waitFor(() => expect(optionPairs(driver)).toEqual([['Select Driver',''],['John','DRV-JOHN-01']]));
    expect(screen.queryByLabelText(/Driver Reference/i)).toBeNull();
    expect(within(pickup.container).queryAllByRole('textbox')).toEqual([]);
    expectNoLocation(pickup.container); expectNoExplanatoryText(pickup.container); pickup.unmount();
    for (const status of [3,4]) {
      const after = render(<TransportActions address={transportAddress} selectedProduct={{product:shipment(status,{trackingNumber:'TRK-2026-000001'})}} contextKey="transport"/>);
      expectNoLocation(after.container); expect(within(after.container).queryAllByRole('textbox')).toEqual([]); expect(within(after.container).queryByRole('button',{name:/Confirm/})).toBeNull();
      after.unmount();
    }
  });

  it('confirms pickup with only the product and the selected John driver, keeping the existing tracking number',async () => {
    const fresh = shipment(2,{trackingNumber:'TRK-2026-000001'}); service.requireFreshProduct.mockResolvedValue(fresh);
    const recordPickup = vi.fn(async () => ({hash:'0xpickup',wait:vi.fn(async () => ({status:1,hash:'0xpickup'}))})); service.getWriteContract.mockResolvedValue({recordPickup});
    render(<TransportActions address={transportAddress} selectedProduct={{product:fresh}} refreshProduct={vi.fn()} contextKey="transport"/>);
    await waitFor(() => expect(screen.getByText('TRK-2026-000001')).toBeTruthy());
    await waitFor(() => expect(screen.getByLabelText('Driver').options).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('Driver'),{target:{value:'DRV-JOHN-01'}});
    fireEvent.click(screen.getByText('Confirm Pickup',{selector:'button'}));
    await waitFor(() => expect(recordPickup).toHaveBeenCalledWith(1n,'DRV-JOHN-01'));
    expect(recordPickup.mock.calls[0]).toHaveLength(2);
  });

  it('Retailer confirms delivery directly from Picked Up with only read-only fields',async () => {
    const fresh = shipment(3,{trackingNumber:'TRK-2026-000001'}); service.requireFreshProduct.mockResolvedValue(fresh);
    const confirmDelivery = vi.fn(async () => ({hash:'0xdelivery',wait:vi.fn(async () => ({status:1,hash:'0xdelivery'}))})); service.getWriteContract.mockResolvedValue({confirmDelivery});
    const view = render(<RetailerActions address={retailerAddress} selectedProduct={{product:fresh}} refreshProduct={vi.fn()} contextKey="retailer"/>);
    expect(within(view.container).queryByLabelText('Expected Quantity')).toBeNull();
    expect(within(view.container).queryByLabelText('Store Reference')).toBeNull();
    expect(within(view.container).queryAllByRole('textbox')).toEqual([]); expect(within(view.container).queryAllByRole('spinbutton')).toEqual([]);
    expectNoLocation(view.container); expectNoExplanatoryText(view.container);
    fireEvent.click(screen.getByText('Confirm Delivery',{selector:'button'}));
    await waitFor(() => expect(confirmDelivery).toHaveBeenCalledWith(1n,service.shortAddress(retailerAddress),20n));
    expect(service.requireFreshProduct).toHaveBeenCalledWith({product:fresh},[3,4]);
  });

  it('discovers Warehouse, Transport and Retailer shipments automatically and selects them without typing a Product ID',async () => {
    const item = shipment(0); const tracked = {product:item,timeline:[]}; service.trackProduct.mockResolvedValue(tracked);
    service.listWarehouseShipments.mockResolvedValue({active:[item],history:[]}); service.listTransportShipments.mockResolvedValue({active:[shipment(2)],history:[]}); service.listRetailerShipments.mockResolvedValue({active:[shipment(3)],history:[]});
    for (const [Dashboard,address,list,heading] of [[WarehouseDashboard,'0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC','listWarehouseShipments','Incoming Shipments'],[TransportDashboard,transportAddress,'listTransportShipments','Assigned Shipments'],[RetailerDashboard,retailerAddress,'listRetailerShipments','Incoming Deliveries']]) {
      const selectProduct = vi.fn();
      const view = render(<Dashboard address={address} selectProduct={selectProduct} refreshProduct={vi.fn()} contextKey={heading}/>);
      expect(screen.getByText(heading)).toBeTruthy();
      expect(service[list]).toHaveBeenCalledWith(address);
      const entry = await screen.findByText('Classic Cotton T-Shirt');
      if (Dashboard !== TransportDashboard) expect(within(view.container).queryAllByRole('textbox')).toEqual([]);
      fireEvent.click(entry);
      await waitFor(() => expect(selectProduct).toHaveBeenCalledWith(tracked,heading));
      expect(service.trackProduct).toHaveBeenLastCalledWith('productId','1');
      view.unmount();
    }
  });

  it('removes explanatory text from wallet and tracking panels',() => {
    const wallet = render(<ConnectWallet wallet={{address:null,chainId:null,roles:[],busy:false,error:''}}/>); expectNoExplanatoryText(wallet.container); wallet.unmount();
    const tracking = render(<TrackShipment/>); expectNoExplanatoryText(tracking.container); expect(tracking.container.querySelector('.empty-state')).toBeNull(); tracking.unmount();
    const admin = render(<AdminPanel/>); expectNoExplanatoryText(admin.container);
  });
});
describe('wallet events',() => {
  it('keeps Admin mounted while refreshing roles for the same wallet',async () => {
    const account = '0x1111111111111111111111111111111111111111';
    window.ethereum = {request:vi.fn(async ({method}) => method === 'eth_chainId' ? '0x7a69' : [account]),on:vi.fn(),removeListener:vi.fn()};
    service.getWriteContract.mockResolvedValue({});
    let finishRefresh;
    service.detectRoles.mockResolvedValueOnce(['Admin']).mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
    const {result} = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.roles).toEqual(['Admin']));
    await act(async () => { void result.current.refresh(); });
    await waitFor(() => expect(finishRefresh).toBeTypeOf('function'));
    expect(result.current.busy).toBe(true);
    expect(result.current.roles).toEqual(['Admin']);
    await act(async () => finishRefresh(['Admin','Retailer']));
    expect(result.current.roles).toEqual(['Admin','Retailer']);
  });
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
  it('uses registered business names and shortens unregistered wallet addresses',async () => {
    render(<DirectoryProvider contextKey="names"><ProductOverview product={{productId:1n,name:'Jacket',quantity:10n,currentStatus:2n,supplier:'0x70997970C51812dc3A010C7d01b50e0d17dc79C8',destinationRetailer:retailerAddress,assignedTransport:transportAddress,trackingNumber:''}}/></DirectoryProvider>);
    expect(await screen.findByText('Queen Street Clothing Store')).toBeTruthy(); expect(screen.getByText('Auckland Clothing Transport')).toBeTruthy(); expect(service.businessName('0x1111111111111111111111111111111111111111')).toBe('0x1111…1111');
  });
  it('renders a connected five-stage stepper whose states derive from status',() => {
    const states = status => { const view = render(<ShipmentJourney status={status}/>); const steps = [...view.container.querySelectorAll('ol.journey-stepper > li.journey-step')].map(step => [step.querySelector('.journey-label').textContent,step.className.replace('journey-step is-','')]); view.unmount(); return steps; };
    const labels = ['Created','In Warehouse','Dispatched','Picked Up','Delivered'];
    const expected = current => labels.map((label,index) => [label,index < current ? 'complete' : index === current ? 'current' : 'future']);
    expect(states(0n)).toEqual(expected(0)); expect(states(1n)).toEqual(expected(1)); expect(states(3n)).toEqual(expected(3));
    expect(states(4n)).toEqual(expected(3)); expect(states(5n)).toEqual(expected(4));
    const view = render(<ShipmentJourney status={1n}/>);
    expect(screen.queryByText(/Stage \d of/)).toBeNull(); expect(screen.queryByText('In Transit')).toBeNull(); expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.getAllByText('In Warehouse')).toHaveLength(1); expect(screen.getByText('In Warehouse').closest('li').getAttribute('aria-current')).toBe('step');
    expect(view.container.querySelectorAll('.journey-step .journey-marker')).toHaveLength(5);
    expect(styles).toMatch(/\.journey-step:not\(:last-child\)::after\s*\{[^}]*content/); expect(styles).toMatch(/\.journey-step\s*\{[^}]*white-space:\s*nowrap/); expect(styles).toMatch(/@container \(max-width: \d+px\)\s*\{\s*\.journey-stepper\s*\{[^}]*flex-direction:\s*column/);
  });
  it('Track Shipment is one Tracking Number input and one Search button, with no Product Name or Product ID search',() => {
    const view = render(<TrackShipment contextKey="ctx"/>);
    expect([...view.container.querySelectorAll('h2, h3')].map(node => node.textContent)).toEqual(['Track Shipment']);
    expect(view.container.querySelectorAll('form')).toHaveLength(1); expect(view.container.querySelectorAll('input')).toHaveLength(1);
    expect(screen.getByLabelText('Tracking Number').placeholder).toBe('TRK-2026-000001');
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Search']);
    expect(view.container.querySelectorAll('select')).toHaveLength(0);
    for (const text of ['Find Products','Product Name','product name','Product ID','Search by']) expect(view.container.textContent).not.toContain(text);
    expect(view.container.querySelector('.empty-state, .search-results')).toBeNull();
  });
  it('opens the shared drawer path for an exact, normalised Tracking Number',async () => {
    const found = {product:{name:'Tea',productId:1n,quantity:10n,currentStatus:5n,supplier:'s',trackingNumber:'TRK-2026-000001'},timeline:[]};
    service.trackProduct.mockResolvedValue(found); const selectProduct = vi.fn();
    render(<TrackShipment selectProduct={selectProduct} contextKey="ctx"/>);
    searchFor('  trk-2026-000001 ');
    await waitFor(() => expect(selectProduct).toHaveBeenCalledWith(found,'ctx'));
    expect(service.trackProduct).toHaveBeenCalledTimes(1); expect(service.trackProduct).toHaveBeenCalledWith('trackingNumber','TRK-2026-000001');
  });
  it('treats partial, invalid and product-name input only as exact Tracking Number lookups that are not found',async () => {
    service.trackProduct.mockRejectedValue({reason:'Unknown tracking number'}); const selectProduct = vi.fn();
    render(<TrackShipment selectProduct={selectProduct} contextKey="ctx"/>);
    for (const [input,exact] of [['TRK-2026-','TRK-2026-'],['TRK-2026-00000','TRK-2026-00000'],['shirt','SHIRT'],['SC-31337-5FBDB231-1608','SC-31337-5FBDB231-1608']]) {
      searchFor(input);
      await waitFor(() => expect(service.trackProduct).toHaveBeenLastCalledWith('trackingNumber',exact));
      expect((await screen.findByText('Shipment not found')).getAttribute('role')).toBe('status');
    }
    expect(service.trackProduct.mock.calls.every(([mode]) => mode === 'trackingNumber')).toBe(true);
    expect(service.listSupplierProducts).not.toHaveBeenCalled(); expect(selectProduct).not.toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('validates empty input without searching',async () => {
    render(<TrackShipment contextKey="ctx"/>);
    for (const value of ['','   ']) {
      searchFor(value);
      expect((await screen.findByText('Enter a tracking number.')).getAttribute('role')).toBe('alert');
    }
    expect(service.trackProduct).not.toHaveBeenCalled();
  });
  it('renders event fields in Product Details without exposing internal product or driver IDs',async () => {
    const found = {product:{name:'Tea',productId:123456789012345678901234567890n,quantity:10n,currentStatus:5n,supplier:'supplier-wallet',trackingNumber:'TRK-2026-000001'},timeline:[{event:'TransportPickup',transactionHash:'0xhash',blockNumber:2,transactionIndex:0,index:0,fields:{productId:'123456789012345678901234567890',transportCompany:'transport-wallet',trackingNumber:'TRK-2026-000001',driverId:'DRIVER',timestamp:'100'}}]};
    render(<ProductDetails result={found}/>);
    const history = screen.getByText('Event History').closest('.history-panel');
    for (const value of ['TransportPickup','transport-wallet','TRK-2026-000001','Driver','Tracking Number','Transaction: 0xhash']) expect(within(history).getByText(value)).toBeTruthy();
    expect(await within(history).findByText('John')).toBeTruthy();
    expect(history.textContent).not.toContain('DRIVER');
    expect(within(history).queryByText('123456789012345678901234567890')).toBeNull(); expect(within(history).queryByText('Product ID')).toBeNull();
  });
  it('drops a search that resolves after the wallet context changes',async () => {
    let resolve; service.trackProduct.mockReturnValue(new Promise(r => { resolve = r; })); const selectProduct = vi.fn();
    const view = render(<TrackShipment selectProduct={selectProduct} contextKey="account-one"/>); searchFor('TRK-2026-000001');
    view.rerender(<TrackShipment selectProduct={selectProduct} contextKey="account-two"/>);
    await act(async () => resolve({product:{productId:1n},timeline:[]}));
    expect(selectProduct).not.toHaveBeenCalled(); expect(screen.getByLabelText('Tracking Number').value).toBe('');
  });
});
describe('product-focused layout',() => {
  const supplierAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const product = (id,name,status = 0n) => ({productId:id,name,quantity:10n,currentStatus:status,supplier:supplierAddress,destinationRetailer:retailerAddress,assignedTransport:'0x0000000000000000000000000000000000000000',trackingNumber:''});
  function connect(roles) {
    window.ethereum = {request:vi.fn(async ({method}) => method === 'eth_chainId' ? '0x7a69' : [supplierAddress]),on:vi.fn(),removeListener:vi.fn()};
    service.getWriteContract.mockResolvedValue({}); service.detectRoles.mockResolvedValue(roles);
  }
  it('shows a compact wallet summary with details behind a disclosure',async () => {
    connect(['Supplier']);
    const view = render(<App/>);
    const summary = await waitFor(() => { const node = view.container.querySelector('.wallet-summary'); expect(node.textContent).toContain('Supplier'); return node; });
    expect(summary.textContent).toContain('0x7099…79C8'); expect(summary.textContent).toContain('Hardhat Local · 31337'); expect(summary.textContent).not.toContain(supplierAddress);
    const panel = view.container.querySelector('details.wallet .wallet-panel');
    expect(panel.textContent).toContain(supplierAddress);
    for (const name of ['Refresh roles','Disconnect']) expect(within(panel).getByRole('button',{name})).toBeTruthy();
    expect(view.container.querySelector('details.wallet').open).toBe(false);
  });
  it('opens one shared Product Details drawer from My Products and Track Product and closes it via Escape, backdrop and ×',async () => {
    connect(['Supplier']);
    const jacket = {product:{...product(42n,'Classic Denim Jacket'),trackingNumber:'TRK-2026-000001'},timeline:[{event:'ProductCreated',transactionHash:'0xcreated',blockNumber:6,transactionIndex:0,index:0,fields:{productId:'42',name:'Classic Denim Jacket',timestamp:'100'}}]};
    const shirt = {product:{...product(7n,'Classic Cotton T-Shirt',1n),trackingNumber:'TRK-2026-000002'},timeline:[]};
    service.listSupplierProducts.mockResolvedValue([jacket.product]);
    service.trackProduct.mockImplementation(async (mode,query) => mode === 'productId' && query === '42' ? jacket : shirt);
    const view = render(<App/>);
    expect(screen.queryByRole('dialog')).toBeNull();
    const listButton = (await screen.findByText('Classic Denim Jacket')).closest('button');
    fireEvent.click(listButton);
    const drawer = await screen.findByRole('dialog',{name:'Product Details'});
    expect(service.trackProduct).toHaveBeenLastCalledWith('productId','42');
    expect(view.container.querySelector('main').contains(drawer)).toBe(false);
    for (const value of ['TRK-2026-000001','Queen Street Clothing Store','Shipment Journey','Event History','ProductCreated','Transaction: 0xcreated']) expect(within(drawer).getAllByText(value).length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(within(drawer).getByRole('button',{name:'Close'}));
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(listButton.classList.contains('is-selected')).toBe(true));
    fireEvent.keyDown(document,{key:'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.overflow).toBe('');
    searchFor('TRK-2026-000002');
    await waitFor(() => expect(service.trackProduct).toHaveBeenLastCalledWith('trackingNumber','TRK-2026-000002'));
    await waitFor(() => expect(within(screen.getByRole('dialog',{name:'Product Details'})).getByText('Classic Cotton T-Shirt')).toBeTruthy());
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(view.container.querySelector('.drawer-backdrop'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(listButton);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'Close'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('keeps role pages to forms and lists, with role actions only inside the drawer',async () => {
    connect(['Supplier','Warehouse']);
    const incoming = product(9n,'Wool Coat');
    service.listWarehouseShipments.mockResolvedValue({active:[incoming],history:[]}); service.trackProduct.mockResolvedValue({product:incoming,timeline:[]});
    const view = render(<App/>);
    const supplier = (await screen.findByRole('heading',{name:'Supplier'})).closest('section');
    expect([...supplier.querySelectorAll('h2, h3')].map(node => node.textContent)).toEqual(['Supplier','Create Product','My Products']);
    const main = view.container.querySelector('main');
    fireEvent.click(await screen.findByText('Wool Coat'));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('Confirm Warehouse Entry',{selector:'button'})).toBeTruthy();
    expect(within(main).queryByText('Confirm Warehouse Entry')).toBeNull();
    expect(main.querySelector('.product-details, .timeline, .journey-panel')).toBeNull();
    expect(drawer.querySelector('form fieldset + .form-feedback')).toBeTruthy();
  });
  it('shows My Drivers and the registration form on the connected Transport page',async () => {
    connect(['Transport']);
    render(<App/>);
    const drivers = await screen.findByRole('region',{name:'My Drivers'});
    expect(within(drivers).getByLabelText('Driver Name')).toBeTruthy();
    expect(within(drivers).queryByLabelText('Driver ID')).toBeNull();
    expect(within(drivers).getByRole('button',{name:'Register Driver'})).toBeTruthy();
  });
  it('shows name, tracking number, quantity and status in lists, keeping the Product ID internal',async () => {
    const longId = 104423329876543210987654321098765432109876543210987654321098765432109876096027n;
    const item = {...product(longId,'Linen Shirt',3n),trackingNumber:'TRK-2026-000009'}; const tracked = {product:item,timeline:[]};
    service.listWarehouseShipments.mockResolvedValue({active:[],history:[item]}); service.trackProduct.mockResolvedValue(tracked); const selectProduct = vi.fn();
    const view = render(<WarehouseDashboard address="warehouse" selectProduct={selectProduct} contextKey="ctx"/>);
    const row = (await screen.findByText('Linen Shirt')).closest('button');
    expect(row.textContent).toBe('Linen ShirtTRK-2026-000009 · Quantity 10Picked Up');
    expect(view.container.textContent).not.toContain('Product ID'); expect(view.container.textContent).not.toContain('1044233');
    fireEvent.click(row);
    await waitFor(() => expect(selectProduct).toHaveBeenCalledWith(tracked,'ctx'));
    expect(service.trackProduct).toHaveBeenCalledWith('productId',longId.toString());
    cleanup(); render(<ProductDetails result={tracked}/>);
    const facts = [...document.querySelectorAll('.product-summary > dl > dt')].map(node => node.textContent);
    expect(facts[0]).toBe('Tracking Number'); expect(facts).not.toContain('Product ID');
    expect(screen.getByText('TRK-2026-000009').tagName).toBe('DD');
    const technical = screen.getByText('Technical Details').closest('details');
    expect(technical.open).toBe(false); expect(within(technical).getByText(longId.toString())).toBeTruthy(); expect(within(technical).getByText('Product ID')).toBeTruthy();
  });
  it('filters each role list locally by Product Name or Tracking Number and opens filtered rows in the shared drawer',async () => {
    const make = (id,name,status) => ({...product(BigInt(id),name,status),trackingNumber:`TRK-2026-00000${id}`});
    const active = [make(1,'Classic Cotton T-Shirt',2n),make(2,'Wool Coat',3n)];
    const history = [make(3,'Linen Shirt',5n),make(4,'Denim Jacket',5n),make(5,'Oxford Shirt',5n)];
    const tracked = {product:history[2],timeline:[]}; service.trackProduct.mockResolvedValue(tracked); const selectProduct = vi.fn();
    service.listTransportShipments.mockResolvedValue({active,history});
    render(<TransportDashboard address={transportAddress} selectProduct={selectProduct} contextKey="ctx"/>);
    const historyFilter = await screen.findByLabelText('Filter History'); expect(screen.getByLabelText('Filter Assigned Shipments')).toBeTruthy();
    const panel = historyFilter.closest('.product-list-panel'); const names = () => [...panel.querySelectorAll('.supplier-product strong')].map(node => node.textContent);
    for (const value of ['shirt','SHIRT','Shirt']) { fireEvent.change(historyFilter,{target:{value}}); expect(names()).toEqual(['Oxford Shirt','Linen Shirt']); }
    fireEvent.change(historyFilter,{target:{value:'trk-2026-000004'}}); expect(names()).toEqual(['Denim Jacket']);
    fireEvent.change(historyFilter,{target:{value:'00000'}}); expect(names()).toEqual(['Oxford Shirt','Denim Jacket','Linen Shirt']);
    fireEvent.change(historyFilter,{target:{value:'Cotton T-Shirt'}}); expect(names()).toEqual([]); expect(within(panel).getByText('No matches')).toBeTruthy();
    expect(within(screen.getByLabelText('Filter Assigned Shipments').closest('.product-list-panel')).getByText('Classic Cotton T-Shirt')).toBeTruthy();
    fireEvent.change(historyFilter,{target:{value:'oxford'}});
    fireEvent.click(within(panel).getByText('Oxford Shirt'));
    await waitFor(() => expect(selectProduct).toHaveBeenCalledWith(tracked,'ctx'));
    expect(service.trackProduct).toHaveBeenCalledWith('productId','5');
    expect(service.listTransportShipments).toHaveBeenCalledTimes(1); expect(service.trackProduct).toHaveBeenCalledTimes(1);
  });
  it('shows the local filter on My Products and hides it on empty lists',async () => {
    service.listSupplierProducts.mockResolvedValue([{...product(8n,'Silk Shirt'),trackingNumber:'TRK-2026-000008'}]);
    render(<SupplierDashboard address="supplier" contextKey="ctx"/>);
    const filter = await screen.findByLabelText('Filter My Products');
    fireEvent.change(filter,{target:{value:'SILK'}}); expect(screen.getByText('Silk Shirt')).toBeTruthy();
    cleanup(); render(<RetailerDashboard address={retailerAddress} contextKey="ctx"/>);
    await screen.findByText('No incoming deliveries');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
  it('closes the wallet panel on outside press and Escape but not on inside press',async () => {
    connect(['Supplier']);
    const view = render(<App/>);
    await waitFor(() => expect(view.container.querySelector('.wallet-summary')?.textContent).toContain('Supplier'));
    const menu = view.container.querySelector('details.wallet');
    menu.open = true; fireEvent.pointerDown(menu.querySelector('.wallet-panel')); expect(menu.open).toBe(true);
    fireEvent.pointerDown(view.container.querySelector('main')); expect(menu.open).toBe(false);
    menu.open = true; fireEvent.keyDown(document,{key:'Escape'}); expect(menu.open).toBe(false);
  });
  it('opens a Retailer History shipment in the same Product Details drawer',async () => {
    connect(['Retailer']);
    const delivered = {...product(11n,'Delivered Parka',5n),trackingNumber:'SC-11'};
    const tracked = {product:delivered,timeline:[{event:'GoodsDelivered',transactionHash:'0xdelivered',blockNumber:9,transactionIndex:0,index:0,fields:{productId:'11',retailer:retailerAddress,shopId:'Queen Street Clothing Store',quantity:'10',timestamp:'100'}}]};
    service.listRetailerShipments.mockResolvedValue({active:[],history:[delivered]}); service.trackProduct.mockResolvedValue(tracked);
    const view = render(<App/>);
    fireEvent.click(await screen.findByText('Delivered Parka'));
    const drawer = await screen.findByRole('dialog',{name:'Product Details'});
    expect(view.container.querySelectorAll('[role=dialog]')).toHaveLength(1);
    for (const text of ['Delivered Parka','SC-11','Shipment Journey','Event History','GoodsDelivered','Transaction: 0xdelivered']) expect(within(drawer).getAllByText(text).length).toBeGreaterThan(0);
    expect(within(drawer).getAllByText('Delivered').length).toBeGreaterThan(0);
    expect(within(drawer).queryByRole('button',{name:'Confirm Delivery'})).toBeNull();
  });});
describe('admin role management',() => {
  const supplier = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; const warehouse = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'; const spareTransport = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
  const current = {Supplier:[supplier],Warehouse:[warehouse],Transport:[transportAddress,spareTransport],Retailer:[retailerAddress]};
  const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
  const cells = row => [...row.cells].slice(0,3).map(cell => cell.textContent);
  it('renders one table row per on-chain assignment, including several accounts for one role',async () => {
    service.listRoleAssignments.mockResolvedValue(current);
    render(<AdminPanel address="admin" contextKey="admin"/>);
    await screen.findByRole('table');
    expect(service.listRoleAssignments).toHaveBeenCalledTimes(1);
    expect(bodyRows().map(cells)).toEqual([['Supplier','0x7099…79C8','0x7099…79C8'],['Warehouse','Auckland Clothing Distribution Centre','0x3C44…93BC'],['Transport','Auckland Clothing Transport','0x90F7…b906'],['Transport','0x9965…A4dc','0x9965…A4dc'],['Retailer','Queen Street Clothing Store','0x15d3…6A65']]);
    expect(document.querySelector('.assignment-grid')).toBeNull();
    expect(screen.queryByText(spareTransport)).toBeNull(); expect(screen.getAllByText('0x9965…A4dc').find(node => node.title).title).toBe(spareTransport);
    expect(screen.queryByText('Revoke role',{selector:'h3'})).toBeNull(); expect(screen.getByText('Grant Role',{selector:'h3'})).toBeTruthy();
  });
  it('copies the full address from a row and shows brief feedback',async () => {
    service.listRoleAssignments.mockResolvedValue(current);
    const writeText = vi.fn(async () => undefined); Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
    render(<AdminPanel address="admin" contextKey="admin"/>);
    await screen.findByRole('table'); const row = bodyRows()[3];
    fireEvent.click(within(row).getByRole('button',{name:`Copy address ${spareTransport}`}));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(spareTransport));
    expect(within(row).getByText('Copied')).toBeTruthy(); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('revokes the exact role and account of a row after inline confirmation and refreshes the list',async () => {
    service.listRoleAssignments.mockResolvedValueOnce(current).mockResolvedValueOnce({...current,Transport:[transportAddress]});
    const revokeRole = vi.fn(async () => ({hash:'0xrevoke',wait:vi.fn(async () => ({status:1,hash:'0xrevoke'}))})); service.getWriteContract.mockResolvedValue({revokeRole});
    const refreshRoles = vi.fn();
    render(<AdminPanel address="admin" contextKey="admin" refreshRoles={refreshRoles}/>);
    await screen.findByRole('table'); const row = bodyRows()[3];
    fireEvent.click(within(row).getByRole('button',{name:`Revoke Transport from ${spareTransport}`}));
    expect(revokeRole).not.toHaveBeenCalled();
    fireEvent.click(within(row).getByRole('button',{name:`Confirm revoke Transport from ${spareTransport}`}));
    await waitFor(() => expect(revokeRole).toHaveBeenCalledWith(service.ROLE_IDS.Transport,spareTransport));
    await waitFor(() => expect(bodyRows()).toHaveLength(4));
    expect(service.listRoleAssignments).toHaveBeenCalledTimes(2); expect(screen.queryByText('0x9965…A4dc')).toBeNull();
    expect(within(screen.getByRole('table').closest('.role-assignments')).getByRole('status').textContent).toBe('Role revoked'); expect(refreshRoles).not.toHaveBeenCalled();
  });
  it('refreshes the connected wallet roles when its own role changes',async () => {
    service.listRoleAssignments.mockResolvedValue(current);
    const revokeRole = vi.fn(async () => ({hash:'0xrevoke',wait:vi.fn(async () => ({status:1,hash:'0xrevoke'}))})); service.getWriteContract.mockResolvedValue({revokeRole});
    const refreshRoles = vi.fn();
    render(<AdminPanel address={warehouse.toLowerCase()} contextKey="admin" refreshRoles={refreshRoles}/>);
    await screen.findByRole('table'); const row = bodyRows()[1];
    fireEvent.click(within(row).getByRole('button',{name:`Revoke Warehouse from ${warehouse}`})); fireEvent.click(within(row).getByRole('button',{name:`Confirm revoke Warehouse from ${warehouse}`}));
    await waitFor(() => expect(refreshRoles).toHaveBeenCalledTimes(1));
    expect(revokeRole).toHaveBeenCalledWith(service.ROLE_IDS.Warehouse,warehouse);
  });
  it('grants a role and saves its account name before reporting success',async () => {
    const grantRole = vi.fn(async () => ({hash:'0xgrant',wait:vi.fn(async () => ({status:1,hash:'0xgrant'}))}));
    const setBusinessName = vi.fn(async () => ({hash:'0xname',wait:vi.fn(async () => ({status:1,hash:'0xname'}))}));
    service.getWriteContract.mockResolvedValue({grantRole,setBusinessName});
    render(<AdminPanel address="admin" contextKey="admin"/>);
    const grant = screen.getByText('Grant Role',{selector:'h3'}).closest('form');
    fireEvent.change(within(grant).getByLabelText('Wallet Address'),{target:{value:spareTransport}});
    fireEvent.change(within(grant).getByLabelText('Role'),{target:{value:'Retailer'}});
    fireEvent.change(within(grant).getByLabelText('Business / Account Name'),{target:{value:'Second Store'}});
    fireEvent.click(within(grant).getByText('Grant Role',{selector:'button'}));
    await waitFor(() => expect(grantRole).toHaveBeenCalledWith(service.ROLE_IDS.Retailer,spareTransport));
    await waitFor(() => expect(setBusinessName).toHaveBeenCalledWith(spareTransport,'Second Store'));
    expect(await within(grant).findByText('Role granted and account name saved.')).toBeTruthy();
    expect(screen.queryByText('Set Account Name',{selector:'h3'})).toBeNull();
  });
  it('reports partial success when the role grant confirms but naming is rejected',async () => {
    const grantRole = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    const setBusinessName = vi.fn(async () => { throw {code:'ACTION_REJECTED'}; });
    service.getWriteContract.mockResolvedValue({grantRole,setBusinessName});
    render(<AdminPanel address="admin"/>);
    const grant = screen.getByText('Grant Role',{selector:'h3'}).closest('form');
    fireEvent.change(within(grant).getByLabelText('Wallet Address'),{target:{value:spareTransport}});
    fireEvent.change(within(grant).getByLabelText('Role'),{target:{value:'Warehouse'}});
    fireEvent.change(within(grant).getByLabelText('Business / Account Name'),{target:{value:'South Warehouse'}});
    fireEvent.click(within(grant).getByText('Grant Role',{selector:'button'}));
    const notice = await within(grant).findByText(/Role granted, but the name was not saved/);
    expect(notice.textContent).toContain('Use Edit name to retry');
    expect(notice.className).toBe('notice-warning');
    expect(within(grant).queryByRole('alert')).toBeNull();
    expect(grantRole).toHaveBeenCalledWith(service.ROLE_IDS.Warehouse,spareTransport);
  });
  it('still saves the account name when the grant refresh callback fails',async () => {
    const grantRole = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    const setBusinessName = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    service.getWriteContract.mockResolvedValue({grantRole,setBusinessName});
    const refreshRoles = vi.fn(async () => { throw new Error('Transaction failed'); });
    render(<AdminPanel address={spareTransport} refreshRoles={refreshRoles}/>);
    const grant = screen.getByText('Grant Role',{selector:'h3'}).closest('form');
    fireEvent.change(within(grant).getByLabelText('Wallet Address'),{target:{value:spareTransport}});
    fireEvent.change(within(grant).getByLabelText('Role'),{target:{value:'Retailer'}});
    fireEvent.change(within(grant).getByLabelText('Business / Account Name'),{target:{value:'Second Store'}});
    fireEvent.click(within(grant).getByText('Grant Role',{selector:'button'}));
    await within(grant).findByText('Role granted and account name saved.');
    expect(setBusinessName).toHaveBeenCalledWith(spareTransport,'Second Store');
    expect(within(grant).getByText('Role granted, but data could not be refreshed.').className).toBe('notice-warning');
    expect(within(grant).queryByRole('alert')).toBeNull();
    expect(grantRole).toHaveBeenCalledTimes(1);
  });
  it('keeps a confirmed role revocation successful when its wallet refresh fails',async () => {
    const revokeRole = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    service.getWriteContract.mockResolvedValue({revokeRole});
    const refreshRoles = vi.fn(async () => { throw new Error('Transaction failed'); });
    render(<AdminPanel address={warehouse.toLowerCase()} refreshRoles={refreshRoles}/>);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button',{name:`Revoke Warehouse from ${warehouse}`}));
    fireEvent.click(screen.getByRole('button',{name:`Confirm revoke Warehouse from ${warehouse}`}));
    await screen.findByText('Role revoked');
    expect(screen.getByText('Transaction confirmed, but data could not be refreshed.').className).toBe('notice-warning');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(revokeRole).toHaveBeenCalledTimes(1);
  });
  it('edits a warehouse name on chain and reloads it after remount',async () => {
    service.listRoleAssignments.mockResolvedValue(current);
    const original = {[warehouse.toLowerCase()]:'North Warehouse'};
    const updated = {[warehouse.toLowerCase()]:'South Warehouse'};
    service.loadBusinessNames.mockResolvedValueOnce(original).mockResolvedValue(updated);
    const setBusinessName = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    service.getWriteContract.mockResolvedValue({setBusinessName});
    const first = render(<AdminPanel address="admin" contextKey="first"/>);
    await screen.findByText('North Warehouse');
    fireEvent.click(screen.getByRole('button',{name:`Edit name for ${warehouse}`}));
    fireEvent.change(screen.getByLabelText(`Name for ${warehouse}`),{target:{value:'South Warehouse'}});
    fireEvent.click(screen.getByText('Save',{selector:'button'}));
    await waitFor(() => expect(setBusinessName).toHaveBeenCalledWith(warehouse,'South Warehouse'));
    await screen.findByText('South Warehouse');
    first.unmount();
    render(<AdminPanel address="admin" contextKey="reconnected"/>);
    await screen.findByText('South Warehouse');
  });
});
describe('registered directory workflow',() => {
  it('uses the connected warehouse name for each of two warehouses',async () => {
    const first = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const second = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    service.listRoleAssignments.mockResolvedValue({Supplier:[],Warehouse:[first,second],Transport:[],Retailer:[]});
    service.loadBusinessNames.mockResolvedValue({[first.toLowerCase()]:'North Warehouse',[second.toLowerCase()]:'South Warehouse'});
    const product = {productId:1n,name:'Jacket',quantity:10n,currentStatus:0n,trackingNumber:''};
    const view = render(<DirectoryProvider contextKey="north"><WarehouseActions address={first} selectedProduct={{product}} contextKey="north"/></DirectoryProvider>);
    await screen.findByText('North Warehouse');
    view.rerender(<DirectoryProvider contextKey="south"><WarehouseActions address={second} selectedProduct={{product}} contextKey="south"/></DirectoryProvider>);
    await screen.findByText('South Warehouse');
  });
  it('registers a driver and selects one from only the connected transport account',async () => {
    const transport = transportAddress;
    service.listDrivers.mockResolvedValueOnce([]).mockResolvedValue([{driverId:'DRV-1',name:'Alex',transport},{driverId:'DRV-2',name:'Sam',transport}]);
    const registerDriver = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    const recordPickup = vi.fn(async () => ({wait:vi.fn(async () => ({status:1}))}));
    service.getWriteContract.mockResolvedValue({registerDriver,recordPickup});
    service.requireFreshProduct.mockResolvedValue({productId:1n,currentStatus:2n});
    const product = {productId:1n,currentStatus:2n,trackingNumber:'TRK-1'};
    render(<DirectoryProvider contextKey="driver-test" address={transport}><TransportDashboard address={transport} contextKey="driver-test"/><TransportActions address={transport} contextKey="driver-test" selectedProduct={{product}} refreshProduct={vi.fn()}/></DirectoryProvider>);
    expect(screen.getByRole('region',{name:'My Drivers'})).toBeTruthy();
    await screen.findByText('No drivers registered to this Transport account.');
    fireEvent.change(screen.getByLabelText('Driver Name'),{target:{value:'Alex'}});
    fireEvent.click(screen.getByText('Register Driver',{selector:'button'}));
    await waitFor(() => expect(registerDriver).toHaveBeenCalledWith('Alex'));
    expect(await within(screen.getByRole('region',{name:'My Drivers'})).findByText('Alex',{selector:'li'})).toBeTruthy();
    expect(screen.getByRole('region',{name:'My Drivers'}).textContent).not.toContain('DRV-1');
    await waitFor(() => expect(screen.getByLabelText('Driver').options).toHaveLength(3));
    expect([...screen.getByLabelText('Driver').options].map(option => option.text)).toEqual(['Select Driver','Alex','Sam']);
    fireEvent.change(screen.getByLabelText('Driver'),{target:{value:'DRV-2'}});
    fireEvent.click(screen.getByText('Confirm Pickup',{selector:'button'}));
    await waitFor(() => expect(recordPickup).toHaveBeenCalledWith(1n,'DRV-2'));
    expect(service.listDrivers.mock.calls.every(([address]) => address === transport)).toBe(true);
  });
  it('lists two warehouse wallets separately in the directory and two retailers in Supplier',async () => {
    const north = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const south = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    const secondRetailer = '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955';
    service.listRoleAssignments.mockResolvedValue({Supplier:[],Warehouse:[north,south],Transport:[],Retailer:[retailerAddress,secondRetailer]});
    service.loadBusinessNames.mockResolvedValue({[north.toLowerCase()]:'North Warehouse',[south.toLowerCase()]:'South Warehouse',[retailerAddress.toLowerCase()]:'Queen Street Store',[secondRetailer.toLowerCase()]:'Harbour Store'});
    function WarehouseOptions() { const {options} = useRoleOptions('Warehouse'); return <select aria-label="Warehouse accounts">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>; }
    render(<DirectoryProvider contextKey="multiple"><WarehouseOptions/><SupplierDashboard address="supplier" contextKey="multiple"/><AdminPanel address="admin"/></DirectoryProvider>);
    await waitFor(() => expect([...screen.getByLabelText('Warehouse accounts').options].map(option => [option.text,option.value])).toEqual([['North Warehouse',north],['South Warehouse',south]]));
    expect(screen.getAllByRole('row').filter(row => row.cells[0]?.textContent === 'Warehouse').map(row => row.cells[1].textContent)).toEqual(['North Warehouse','South Warehouse']);
    expect([...screen.getByLabelText('Destination Retailer').options].map(option => [option.text,option.value])).toEqual([['Select Destination Retailer',''],['Queen Street Store',retailerAddress],['Harbour Store',secondRetailer]]);
  });
  it('updates Supplier dropdown labels after Edit name and removes a revoked retailer without reload',async () => {
    let currentName = 'Old Store'; let retailerEnabled = true;
    service.listRoleAssignments.mockImplementation(async () => ({Supplier:[],Warehouse:[],Transport:[],Retailer:retailerEnabled ? [retailerAddress] : []}));
    service.loadBusinessNames.mockImplementation(async () => ({[retailerAddress.toLowerCase()]:currentName}));
    const setBusinessName = vi.fn(async () => { currentName = 'New Store'; return {wait:vi.fn(async () => ({status:1}))}; });
    const revokeRole = vi.fn(async () => { retailerEnabled = false; return {wait:vi.fn(async () => ({status:1}))}; });
    service.getWriteContract.mockResolvedValue({setBusinessName,revokeRole});
    render(<DirectoryProvider contextKey="editing" address="admin"><AdminPanel address="admin"/><SupplierDashboard address="supplier" contextKey="editing"/></DirectoryProvider>);
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options[1].text).toBe('Old Store'));
    fireEvent.click(screen.getByRole('button',{name:`Edit name for ${retailerAddress}`}));
    fireEvent.change(screen.getByLabelText(`Name for ${retailerAddress}`),{target:{value:'New Store'}});
    fireEvent.click(screen.getByText('Save',{selector:'button'}));
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options[1].text).toBe('New Store'));
    fireEvent.click(screen.getByRole('button',{name:`Revoke Retailer from ${retailerAddress}`}));
    fireEvent.click(screen.getByRole('button',{name:`Confirm revoke Retailer from ${retailerAddress}`}));
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options).toHaveLength(1));
    expect(screen.getByText(/No authorized Retailer accounts/)).toBeTruthy();
  });
  it('adds a newly granted named retailer to Supplier without reconnecting',async () => {
    const newRetailer = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    let granted = false; let registeredName = '';
    service.listRoleAssignments.mockImplementation(async () => ({Supplier:[],Warehouse:[],Transport:[],Retailer:granted ? [newRetailer] : []}));
    service.loadBusinessNames.mockImplementation(async () => registeredName ? {[newRetailer.toLowerCase()]:registeredName} : {});
    const grantRole = vi.fn(async () => { granted = true; return {wait:vi.fn(async () => ({status:1}))}; });
    const setBusinessName = vi.fn(async (_account,name) => { registeredName = name; return {wait:vi.fn(async () => ({status:1}))}; });
    service.getWriteContract.mockResolvedValue({grantRole,setBusinessName});
    render(<DirectoryProvider contextKey="grant" address="admin"><AdminPanel address="admin"/><SupplierDashboard address="supplier" contextKey="grant"/></DirectoryProvider>);
    await screen.findByText(/No authorized Retailer accounts/);
    const grant = screen.getByText('Grant Role',{selector:'h3'}).closest('form');
    fireEvent.change(within(grant).getByLabelText('Wallet Address'),{target:{value:newRetailer}});
    fireEvent.change(within(grant).getByLabelText('Role'),{target:{value:'Retailer'}});
    fireEvent.change(within(grant).getByLabelText('Business / Account Name'),{target:{value:'Harbour Store'}});
    fireEvent.click(within(grant).getByText('Grant Role',{selector:'button'}));
    await waitFor(() => expect([...screen.getByLabelText('Destination Retailer').options].map(option => [option.text,option.value])).toContainEqual(['Harbour Store',newRetailer]));
    expect(await within(grant).findByText('Role granted and account name saved.')).toBeTruthy();
  });
  it('clears a selected account when it is revoked while another account remains',async () => {
    const second = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    let active = [retailerAddress,second];
    service.listRoleAssignments.mockImplementation(async () => ({Supplier:[],Warehouse:[],Transport:[],Retailer:active}));
    service.loadBusinessNames.mockResolvedValue({[retailerAddress.toLowerCase()]:'First Store',[second.toLowerCase()]:'Second Store'});
    service.getWriteContract.mockResolvedValue({revokeRole:vi.fn(async (_role,account) => { active = active.filter(value => value !== account); return {wait:vi.fn(async () => ({status:1}))}; })});
    render(<DirectoryProvider contextKey="revoke" address="admin"><AdminPanel address="admin"/><SupplierDashboard address="supplier" contextKey="revoke"/></DirectoryProvider>);
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options).toHaveLength(3));
    fireEvent.change(screen.getByLabelText('Destination Retailer'),{target:{value:retailerAddress}});
    fireEvent.click(screen.getByRole('button',{name:`Revoke Retailer from ${retailerAddress}`}));
    fireEvent.click(screen.getByRole('button',{name:`Confirm revoke Retailer from ${retailerAddress}`}));
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options).toHaveLength(2));
    expect(screen.getByLabelText('Destination Retailer').value).toBe('');
    expect(screen.getByText('Create Product',{selector:'button'}).disabled).toBe(true);
    expect([...screen.getByLabelText('Destination Retailer').options].map(option => option.value)).toContain(second);
  });
  it('refreshes account options on wallet context change and when the app regains focus',async () => {
    const second = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    let accounts = [retailerAddress];
    service.listRoleAssignments.mockImplementation(async () => ({Supplier:[],Warehouse:[],Transport:[],Retailer:accounts}));
    service.loadBusinessNames.mockResolvedValue({[retailerAddress.toLowerCase()]:'First Store',[second.toLowerCase()]:'Second Store'});
    const view = render(<DirectoryProvider contextKey="wallet-a"><SupplierDashboard address="supplier" contextKey="wallet-a"/></DirectoryProvider>);
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options[1].value).toBe(retailerAddress));
    accounts = [second];
    view.rerender(<DirectoryProvider contextKey="wallet-b"><SupplierDashboard address="supplier" contextKey="wallet-b"/></DirectoryProvider>);
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options[1].value).toBe(second));
    accounts = [retailerAddress];
    fireEvent(window,new Event('focus'));
    await waitFor(() => expect(screen.getByLabelText('Destination Retailer').options[1].value).toBe(retailerAddress));
  });
  it('shows only the connected Transport account’s drivers after a wallet switch',async () => {
    const other = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    service.listDrivers.mockImplementation(async account => account === transportAddress ? [{driverId:'A-1',name:'Alex',transport:transportAddress},{driverId:'B-1',name:'Blair',transport:other}] : [{driverId:'B-1',name:'Blair',transport:other}]);
    const product = {productId:1n,currentStatus:2n,trackingNumber:'TRK-1'};
    const view = render(<DirectoryProvider contextKey="transport-a" address={transportAddress}><TransportActions address={transportAddress} selectedProduct={{product}} contextKey="transport-a"/></DirectoryProvider>);
    await waitFor(() => expect([...screen.getByLabelText('Driver').options].map(option => option.value)).toContain('A-1'));
    expect([...screen.getByLabelText('Driver').options].map(option => option.value)).not.toContain('B-1');
    view.rerender(<DirectoryProvider contextKey="transport-b" address={other}><TransportActions address={other} selectedProduct={{product}} contextKey="transport-b"/></DirectoryProvider>);
    await waitFor(() => expect([...screen.getByLabelText('Driver').options].map(option => option.value)).toContain('B-1'));
    expect([...screen.getByLabelText('Driver').options].map(option => option.value)).not.toContain('A-1');
  });
  it('shows useful empty states instead of demo accounts or drivers',async () => {
    service.listRoleAssignments.mockResolvedValue({Supplier:[],Warehouse:[],Transport:[],Retailer:[]});
    service.loadBusinessNames.mockResolvedValue({}); service.listDrivers.mockResolvedValue([]);
    const product = {productId:1n,currentStatus:1n,trackingNumber:'TRK-1'};
    render(<DirectoryProvider contextKey="empty" address={transportAddress}><SupplierDashboard address="supplier" contextKey="empty"/><WarehouseActions address="warehouse" selectedProduct={{product}} contextKey="empty"/><TransportDashboard address={transportAddress} contextKey="empty"/></DirectoryProvider>);
    await screen.findByText(/No authorized Retailer accounts/);
    expect(screen.getByText(/No authorized Transport accounts/)).toBeTruthy();
    expect(screen.getByText('No drivers registered to this Transport account.')).toBeTruthy();
    expect(screen.getByLabelText('Destination Retailer').disabled).toBe(true);
    expect(screen.getByLabelText('Transport Company').disabled).toBe(true);
    expect(screen.queryByText('Queen Street Clothing Store')).toBeNull();
  });
  it('shows a driver registration failure without exposing an ID',async () => {
    const registerDriver = vi.fn(async () => { throw {reason:'Driver name required'}; });
    service.getWriteContract.mockResolvedValue({registerDriver});
    render(<TransportDashboard address={transportAddress} contextKey="duplicate"/>);
    fireEvent.change(screen.getByLabelText('Driver Name'),{target:{value:'Alex'}});
    fireEvent.click(screen.getByText('Register Driver',{selector:'button'}));
    expect((await screen.findByRole('alert')).textContent).toContain('Driver name required');
    expect(screen.queryByLabelText('Driver ID')).toBeNull();
  });
});
describe('role history',() => {
  const item = (id,name,status) => ({productId:id,name,quantity:5n,currentStatus:status,supplier:'s',destinationRetailer:retailerAddress,assignedTransport:transportAddress,trackingNumber:''});
  const panelFor = title => screen.getByText(title,{selector:'h3'}).closest('.product-list-panel');
  it('keeps handled shipments in each role History, separate from the active queue, and selects them like any product',async () => {
    const cases = [
      [WarehouseDashboard,'0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC','listWarehouseShipments','Incoming Shipments',item(1n,'Denim Jacket',1n),item(2n,'Forwarded Coat',3n)],
      [TransportDashboard,transportAddress,'listTransportShipments','Assigned Shipments',item(3n,'Wool Scarf',2n),item(4n,'Delivered Boots',5n)],
      [RetailerDashboard,retailerAddress,'listRetailerShipments','Incoming Deliveries',item(5n,'Linen Shirt',3n),item(6n,'Delivered Hat',5n)],
    ];
    for (const [Dashboard,address,list,activeTitle,active,done] of cases) {
      service[list].mockResolvedValue({active:[active],history:[done]}); const tracked = {product:done,timeline:[]}; service.trackProduct.mockResolvedValue(tracked); const selectProduct = vi.fn();
      const view = render(<Dashboard address={address} selectProduct={selectProduct} contextKey="ctx"/>);
      expect(service[list]).toHaveBeenCalledWith(address);
      await within(panelFor('History')).findByText(done.name);
      expect(within(panelFor(activeTitle)).getByText(active.name)).toBeTruthy(); expect(within(panelFor(activeTitle)).queryByText(done.name)).toBeNull(); expect(within(panelFor('History')).queryByText(active.name)).toBeNull();
      expect(view.container.querySelectorAll('.supplier-product')).toHaveLength(2);
      fireEvent.click(within(panelFor('History')).getByText(done.name));
      await waitFor(() => expect(selectProduct).toHaveBeenCalledWith(tracked,'ctx'));
      expect(service.trackProduct).toHaveBeenLastCalledWith('productId',done.productId.toString());
      view.unmount();
    }
  });
  it('shows History when there is nothing left to act on',async () => {
    service.listRetailerShipments.mockResolvedValue({active:[],history:[item(6n,'Delivered Hat',5n)]});
    render(<RetailerDashboard address={retailerAddress} contextKey="ctx"/>);
    await within(panelFor('History')).findByText('Delivered Hat');
    expect(within(panelFor('Incoming Deliveries')).getByText('No incoming deliveries')).toBeTruthy();
    expect(within(panelFor('History')).getByText('1')).toBeTruthy(); expect(within(panelFor('Incoming Deliveries')).getByText('0')).toBeTruthy();
  });
});describe('event history names',() => {
  it('shows the driver name and business names without exposing the event ID',async () => {
    const fields = {productId:'1',transportCompany:transportAddress,trackingNumber:'SC-1',driverId:'DRV-JOHN-01',timestamp:'100'};
    render(<DirectoryProvider contextKey="history"><ProductDetails result={{product:{productId:1n,name:'Tea',quantity:1n,currentStatus:3n,supplier:'s'},timeline:[{event:'TransportPickup',transactionHash:'0xh',blockNumber:1,transactionIndex:0,index:0,fields}]}}/></DirectoryProvider>);
    const history = screen.getByText('Event History').closest('.history-panel');
    expect(await within(history).findByText('John')).toBeTruthy(); expect(await within(history).findByText('Auckland Clothing Transport')).toBeTruthy();
    expect(history.textContent).not.toContain('DRV-JOHN-01');
    expect(fields.driverId).toBe('DRV-JOHN-01');
    expect(service.driverName('DRV-OTHER')).toBe('Driver name unavailable');
  });
  it('keeps an internal driver ID hidden when its name lookup fails',async () => {
    service.getReadContract.mockResolvedValue({getDriver:vi.fn(async () => { throw new Error('RPC unavailable'); })});
    const fields = {productId:'1',driverId:'DRV-INTERNAL-7',trackingNumber:'TRK-2026-000001'};
    render(<ProductDetails result={{product:{productId:1n,name:'Tea',quantity:1n,currentStatus:3n,supplier:'s'},timeline:[{event:'TransportPickup',transactionHash:'0xh',blockNumber:1,transactionIndex:0,index:0,fields}]}}/>);
    const history = screen.getByText('Event History').closest('.history-panel');
    expect(within(history).getByText('Driver name unavailable')).toBeTruthy();
    expect(history.textContent).not.toContain('DRV-INTERNAL-7');
  });
});
