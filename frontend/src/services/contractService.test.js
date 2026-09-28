import { describe,it,expect,vi } from 'vitest';
import { compareLogs,queryHistory,trackProduct,uint,toReadableError,detectRoles,ROLE_IDS,EVENTS,generateProductId,generateTrackingNumber } from './contractService';
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
  it('generates an application tracking number and probes uniqueness',async () => {
    const contract = {getProductIdByTrackingNumber:vi.fn()
      .mockResolvedValueOnce(1001n)
      .mockRejectedValueOnce({reason:'Unknown tracking number'})};
    const value = await generateTrackingNumber(7n,contract);
    expect(value).toMatch(/^SC-\d+-[A-F0-9]{8}-7-2$/);
    expect(contract.getProductIdByTrackingNumber.mock.calls.map(([tracking]) => tracking)).toEqual([
      expect.stringMatching(/^SC-\d+-[A-F0-9]{8}-7$/),value,
    ]);
  });
});
