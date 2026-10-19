import { describe,it,expect,vi } from 'vitest';
import { compareLogs,queryHistory,trackProduct,listSupplierProducts,listWarehouseProducts,listTransportProducts,listRetailerProducts,listWarehouseShipments,listTransportShipments,listRetailerShipments,listRoleAssignments,shortenMiddle,accountLabel,driverName,uint,toReadableError,detectRoles,ROLE_IDS,EVENTS,generateProductId,normalizeTrackingNumber,trackingNumberFromReceipt } from './contractService';
import { Interface } from 'ethers';
import { ABI } from './contractService';
describe('contract service',() => {
  it('uses ethers v6 block/transaction/index order rather than timestamps',() => {
    const logs = [{blockNumber:2,transactionIndex:0,index:0},{blockNumber:1,transactionIndex:2,index:0},{blockNumber:1,transactionIndex:1,index:3},{blockNumber:1,transactionIndex:1,index:2}];
    expect(logs.sort(compareLogs).map(l => [l.blockNumber,l.transactionIndex,l.index])).toEqual([[1,1,2],[1,1,3],[1,2,0],[2,0,0]]);
  });
  it('uses deployment block and bounded ranges for all six event filters',async () => {
    const contract = {filters:Object.fromEntries(EVENTS.map(n => [n,vi.fn(id => ({n,id}))])),queryFilter:vi.fn(async () => [])};
    await queryHistory(contract,1n,900,1401);
    expect(contract.queryFilter).toHaveBeenCalledTimes(12);
    expect(contract.queryFilter.mock.calls.every(([,from,to]) => from >= 900 && to-from < 500)).toBe(true);
    expect(contract.queryFilter.mock.calls.at(-1).slice(1)).toEqual([1400,1401]);
  });
  it('both search modes use the same product and history path',async () => {
    const log = {blockNumber:10,transactionIndex:0,index:1,transactionHash:'0xabc',fragment:{name:'ProductCreated',inputs:[{name:'productId'},{name:'timestamp'}]},args:[1n,100n]};
    const contract = {runner:{provider:{getBlockNumber:async () => 10}},filters:Object.fromEntries(EVENTS.map(n => [n,() => n])),queryFilter:vi.fn(async name => name === 'ProductCreated' ? [log] : []),getProduct:vi.fn(async () => ({productId:1n})),getProductIdByTrackingNumber:vi.fn(async () => 1n)};
    expect(await trackProduct('productId','1',contract,10)).toEqual(await trackProduct('trackingNumber','TRACK',contract,10));
    expect(contract.getProduct).toHaveBeenCalledWith(1n,{blockTag:10});
    expect(contract.getProductIdByTrackingNumber).toHaveBeenCalledWith('TRACK');
  });
  it('lists products from supplier-filtered ProductCreated events and current reads',async () => {
    const log = {blockNumber:10,transactionIndex:0,index:0,args:{productId:7n}};
    const contract = {runner:{provider:{getBlockNumber:async () => 10}},filters:{ProductCreated:vi.fn((...args) => args)},queryFilter:vi.fn(async () => [log]),getProduct:vi.fn(async productId => ({productId}))};
    expect(await listSupplierProducts('supplier',contract,10,10)).toEqual([{productId:7n}]);
    expect(contract.filters.ProductCreated).toHaveBeenCalledWith(null,'supplier',null);
    expect(contract.getProduct).toHaveBeenCalledWith(7n,{blockTag:10});
  });
  it('reconstructs operational queues from assignment events and current status',async () => {
    const retailer = '0x00000000000000000000000000000000000000aa'; const transport = '0x00000000000000000000000000000000000000bb';
    const products = {1n:{productId:1n,currentStatus:0n,destinationRetailer:'0x00000000000000000000000000000000000000cc'},2n:{productId:2n,currentStatus:2n,assignedTransport:transport},3n:{productId:3n,currentStatus:4n,assignedTransport:transport},4n:{productId:4n,currentStatus:3n,destinationRetailer:retailer},5n:{productId:5n,currentStatus:1n,destinationRetailer:'0x00000000000000000000000000000000000000dd'}};
    const logs = {created:[{blockNumber:1,transactionIndex:0,index:0,args:{productId:1n}},{blockNumber:1,transactionIndex:0,index:1,args:{productId:4n}},{blockNumber:1,transactionIndex:0,index:2,args:{productId:5n}}],exit:[{blockNumber:2,transactionIndex:0,index:0,args:{productId:2n}}]};
    const contract = {runner:{provider:{getBlockNumber:async () => 2}},filters:{ProductCreated:vi.fn(() => 'created'),WarehouseExit:vi.fn(() => 'exit')},queryFilter:vi.fn(async filter => logs[filter]),getProduct:vi.fn(async id => products[id])};
    expect((await listWarehouseProducts(contract,1,2)).map(p => p.productId)).toEqual([1n,5n]);
    expect((await listTransportProducts(transport,contract,1,2)).map(p => p.productId)).toEqual([2n]);
    expect((await listRetailerProducts(retailer,contract,1,2)).map(p => p.productId)).toEqual([4n]);
  });
  it('splits each role into disjoint active and history lists from one block snapshot',async () => {
    const me = '0x00000000000000000000000000000000000000aa'; const other = '0x00000000000000000000000000000000000000bb';
    const p = (id,status,extra = {}) => ({productId:id,currentStatus:status,assignedTransport:me,destinationRetailer:me,...extra});
    const products = {1n:p(1n,0n),2n:p(2n,1n),3n:p(3n,3n),4n:p(4n,5n),5n:p(5n,5n,{assignedTransport:other,destinationRetailer:other}),6n:p(6n,2n)};
    const log = id => ({blockNumber:Number(id),transactionIndex:0,index:0,args:{productId:id}});
    const logs = {created:[1n,2n,3n,4n,6n].map(log),createdForMe:[1n,2n,3n,4n,6n].map(log),entryByMe:[2n,3n,4n].map(log),exitToMe:[3n,4n,5n,6n].map(log)};
    const contract = {runner:{provider:{getBlockNumber:async () => 9}},filters:{ProductCreated:vi.fn((...args) => args[2] ? 'createdForMe' : 'created'),WarehouseEntry:vi.fn(() => 'entryByMe'),WarehouseExit:vi.fn(() => 'exitToMe')},queryFilter:vi.fn(async filter => logs[filter]),getProduct:vi.fn(async (id,options) => { expect(options).toEqual({blockTag:9}); return products[id]; })};
    const ids = ({active,history}) => ({active:active.map(x => x.productId),history:history.map(x => x.productId)});
    expect(ids(await listWarehouseShipments(me,contract,1,9))).toEqual({active:[1n,2n],history:[3n,4n]});
    expect(contract.filters.WarehouseEntry).toHaveBeenCalledWith(null,me);
    expect(ids(await listTransportShipments(me,contract,1,9))).toEqual({active:[3n,6n],history:[4n]});
    expect(ids(await listRetailerShipments(me,contract,1,9))).toEqual({active:[1n,2n,3n,6n],history:[4n]});
  });
  it('keeps another warehouse from seeing an accepted warehouse shipment',async () => {
    const me = '0x00000000000000000000000000000000000000aa'; const other = '0x00000000000000000000000000000000000000bb';
    const products = {
      1n:{productId:1n,currentStatus:0n},
      2n:{productId:2n,currentStatus:1n},
      3n:{productId:3n,currentStatus:5n},
      4n:{productId:4n,currentStatus:1n},
      5n:{productId:5n,currentStatus:5n},
    };
    const log = id => ({blockNumber:Number(id),transactionIndex:0,index:0,args:{productId:id}});
    const events = {
      created:[1n,2n,3n,4n,5n].map(log),
      entryMe:[2n,3n].map(log),
      entryOther:[4n,5n].map(log),
    };
    const contract = {
      runner:{provider:{getBlockNumber:async () => 5}},
      filters:{ProductCreated:vi.fn(() => 'created'),WarehouseEntry:vi.fn((_,staff) => staff === me ? 'entryMe' : 'entryOther')},
      queryFilter:vi.fn(async filter => events[filter]),
      getProduct:vi.fn(async id => products[id]),
    };
    const ids = ({active,history}) => ({active:active.map(product => product.productId),history:history.map(product => product.productId)});
    expect(ids(await listWarehouseShipments(me,contract,1,5))).toEqual({active:[1n,2n],history:[3n]});
    expect(ids(await listWarehouseShipments(other,contract,1,5))).toEqual({active:[1n,4n],history:[5n]});
  });
  it('reconstructs current role holders from RoleGranted/RoleRevoked events and confirms them with hasRole',async () => {
    const [a,b,c] = ['0x00000000000000000000000000000000000000a1','0x00000000000000000000000000000000000000b2','0x00000000000000000000000000000000000000c3'];
    const log = (block,role,account) => ({blockNumber:block,transactionIndex:0,index:0,args:{role:ROLE_IDS[role],account}});
    const events = {granted:[log(2,'Transport',a),log(3,'Transport',b),log(4,'Retailer',c),log(1,'Admin',a)],revoked:[log(5,'Transport',a)]};
    const current = {[ROLE_IDS.Transport]:[b],[ROLE_IDS.Retailer]:[c]};
    const contract = {runner:{provider:{getBlockNumber:async () => 5}},filters:{RoleGranted:vi.fn(() => 'granted'),RoleRevoked:vi.fn(() => 'revoked')},queryFilter:vi.fn(async filter => events[filter]),hasRole:vi.fn(async (role,account) => (current[role] || []).includes(account))};
    expect(await listRoleAssignments(contract,1,5)).toEqual({Supplier:[],Warehouse:[],Transport:[b],Retailer:[c]});
    expect(contract.hasRole).toHaveBeenCalledWith(ROLE_IDS.Transport,a,{blockTag:5});
    expect(contract.hasRole.mock.calls.every(([role]) => role !== ROLE_IDS.Admin)).toBe(true);
  });
  it('formats long values for display only',() => {
    expect(shortenMiddle('104423329876543210987654321096027')).toBe('10442332…096027');
    expect(shortenMiddle('1001')).toBe('1001');
    expect(accountLabel('0x90F79bf6EB2c4f870365E785982E1f101E93b906',{['0x90F79bf6EB2c4f870365E785982E1f101E93b906'.toLowerCase()]:'Auckland Clothing Transport'})).toBe('Auckland Clothing Transport · 0x90F7…b906');
    expect(accountLabel('0x00000000000000000000000000000000000000a1')).toBe('0x0000…00a1');
    expect(driverName('DRV-JOHN-01',{['DRV-JOHN-01']:'John'})).toBe('John');
    expect(driverName('DRV-UNKNOWN')).toBe('Driver name unavailable');
  });
  it('keeps all roles on a multi-role account',async () => {
    expect(await detectRoles({hasRole:async role => [ROLE_IDS.Admin,ROLE_IDS.Supplier,ROLE_IDS.Transport].includes(role)},'account')).toEqual(['Admin','Supplier','Transport']);
  });
  it('validates integers without floating-point precision loss',() => {
    expect(uint('9007199254740993')).toBe(9007199254740993n);
    for (const value of ['-1','1.5','1e4','']) expect(() => uint(value)).toThrow();
    expect(() => uint('0','Quantity',true)).toThrow();
    expect(() => uint((2n**256n).toString())).toThrow();
  });
  it('decodes AccessControl custom errors and wallet rejection',() => {
    const data = new Interface(ABI).encodeErrorResult('AccessControlUnauthorizedAccount',['0x0000000000000000000000000000000000000001',ROLE_IDS.Supplier]);
    expect(toReadableError({data})).toContain('required role');
    expect(toReadableError({code:'ACTION_REJECTED'})).toContain('rejected');
    expect(toReadableError({reason:'Quantity mismatch'})).toContain('original product quantity');
    expect(toReadableError({reason:'Invalid status for delivery'})).toContain('lifecycle stage');
  });
  it('generates an unused uint256 Product ID after probing the contract',async () => {
    const words = [new Uint32Array([0,0,0,7]),new Uint32Array([0,0,0,8])];
    const contract = {getProduct:vi.fn()
      .mockResolvedValueOnce({productId:7n})
      .mockRejectedValueOnce({reason:'Product does not exist'})};
    expect(await generateProductId(contract,{getRandomValues:array => { array.set(words.shift()); return array; }})).toBe(8n);
    expect(contract.getProduct.mock.calls.map(([id]) => id)).toEqual([7n,8n]);
  });
  it('resolves tracking numbers exactly after trimming and upper-casing',async () => {
    expect(normalizeTrackingNumber('  trk-2026-000001 ')).toBe('TRK-2026-000001');
    const contract = {runner:{provider:{getBlockNumber:async () => 3}},filters:Object.fromEntries(EVENTS.map(n => [n,() => n])),queryFilter:vi.fn(async () => []),getProduct:vi.fn(async () => ({productId:8n})),getProductIdByTrackingNumber:vi.fn(async () => 8n)};
    await trackProduct('trackingNumber',' trk-2026-000001',contract,1);
    expect(contract.getProductIdByTrackingNumber).toHaveBeenCalledWith('TRK-2026-000001');
    expect(toReadableError({reason:'Unknown tracking number'})).toBe('No shipment found for this tracking number.');
  });
  it('reads the issued tracking number from the createProduct receipt',() => {
    const iface = new Interface(ABI);
    const created = iface.encodeEventLog('ProductCreated',[1n,'0x00000000000000000000000000000000000000a1','0x00000000000000000000000000000000000000b2','Coat',2n,'TRK-2026-000003',9n]);
    expect(trackingNumberFromReceipt({logs:[{topics:['0x01'],data:'0x'},created]})).toBe('TRK-2026-000003');
    expect(trackingNumberFromReceipt({logs:[]})).toBe('');
  });});
