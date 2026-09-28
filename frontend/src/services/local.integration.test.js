import { describe,it,expect } from 'vitest';
import { getReadContract,trackProduct,generateProductId,generateTrackingNumber,ROLE_IDS,DEPLOYMENT_BLOCK } from './contractService';
describe.skipIf(process.env.RUN_LOCAL_INTEGRATION !== 'true')('live local deployment integration',() => {
  it('reads the seeded Delivered product and identical seven-event timelines through both searches',async () => {
    const contract = await getReadContract();
    const byId = await trackProduct('productId','1001',contract);
    const byTracking = await trackProduct('trackingNumber','DEMO-1001',contract);
    expect(byId).toEqual(byTracking);
    expect(byId.product.currentStatus).toBe(5n);
    expect(byId.timeline.map(e => e.event)).toEqual(['ProductCreated','WarehouseEntry','WarehouseExit','TransportPickup','TransportStatusUpdated','TransportStatusUpdated','GoodsDelivered']);
    expect(byId.timeline.every(e => e.blockNumber >= DEPLOYMENT_BLOCK)).toBe(true);
    expect(byId.timeline[2].fields.quantity).toBe('10');
    expect(byId.timeline[3].fields.driverId).toBe('DEMO-DRIVER');
    expect(byId.timeline.at(-1).fields.shopId).toBe('DEMO-SHOP');
    console.log('Live contract:',await contract.getAddress(),'deployment block:',DEPLOYMENT_BLOCK,'status: Delivered, matching timeline events:',byId.timeline.length);
  },30000);

  it('runs a fresh clothing shipment through all four local accounts and public tracking',async () => {
    const contract = await getReadContract();
    const provider = contract.runner.provider;
    const accounts = await provider.send('eth_accounts',[]);
    expect(accounts.length).toBeGreaterThanOrEqual(5);
    const [supplier,warehouse,transport,retailer] = await Promise.all([1,2,3,4].map(index => provider.getSigner(index)));
    for (const [role,signer] of [['Supplier',supplier],['Warehouse',warehouse],['Transport',transport],['Retailer',retailer]]) {
      expect(await contract.hasRole(ROLE_IDS[role],await signer.getAddress())).toBe(true);
    }

    const productId = await generateProductId(contract);
    expect(productId).toBeGreaterThan(0n);
    expect(productId).toBeLessThan(2n ** 256n);
    expect(productId).not.toBe(1001n);
    const name = 'Classic Cotton T-Shirt';
    const quantity = 20n;
    const submitted = [];
    async function submit(signer,method,args,event,status) {
      const tx = await contract.connect(signer)[method](...args);
      const receipt = await tx.wait();
      expect(receipt.status).toBe(1);
      const emitted = receipt.logs.map(log => { try { return contract.interface.parseLog(log); } catch { return null; } }).filter(Boolean);
      expect(emitted.map(log => log.name)).toContain(event);
      expect((await contract.getProduct(productId)).currentStatus).toBe(BigInt(status));
      submitted.push(receipt.hash);
      return emitted.find(log => log.name === event).args;
    }

    const created = await submit(supplier,'createProduct',[productId,name,quantity],'ProductCreated',0);
    expect(created.supplier).toBe(await supplier.getAddress());
    expect(created.name).toBe(name);
    expect(created.quantity).toBe(quantity);
    let product = await contract.getProduct(productId);
    expect(product.productId).toBe(productId);
    expect(product.name).toBe(name);
    expect(product.quantity).toBe(quantity);
    expect(product.supplier).toBe(await supplier.getAddress());

    const entry = await submit(warehouse,'recordWarehouseEntry',[productId,'Auckland Clothing Distribution Centre',product.quantity],'WarehouseEntry',1);
    expect(entry.staff).toBe(await warehouse.getAddress());
    expect(entry.warehouseId).toBe('Auckland Clothing Distribution Centre');
    expect(entry.quantity).toBe(quantity);
    product = await contract.getProduct(productId);
    expect(product.quantity).toBe(quantity);

    const exit = await submit(warehouse,'recordWarehouseExit',[productId],'WarehouseExit',2);
    expect(exit.staff).toBe(await warehouse.getAddress());
    expect(exit.quantity).toBe(quantity);

    const trackingNumber = await generateTrackingNumber(productId,contract);
    expect(trackingNumber).not.toBe('DEMO-1001');
    const pickup = await submit(transport,'recordPickup',[productId,trackingNumber,'DRV-JOHN-01'],'TransportPickup',3);
    expect(pickup.transportCompany).toBe(await transport.getAddress());
    expect(pickup.trackingNumber).toBe(trackingNumber);
    expect(pickup.driverId).toBe('DRV-JOHN-01');
    expect((await contract.getProduct(productId)).trackingNumber).toBe(trackingNumber);
    expect(await contract.getProductIdByTrackingNumber(trackingNumber)).toBe(productId);

    const location = await submit(transport,'updateTransportLocation',[productId,'Auckland CBD'],'TransportStatusUpdated',4);
    expect(location.location).toBe('Auckland CBD');
    expect(location.trackingNumber).toBe(trackingNumber);
    expect(location.status).toBe(4n);

    product = await contract.getProduct(productId);
    const delivery = await submit(retailer,'confirmDelivery',[productId,'Queen Street Clothing Store',product.quantity],'GoodsDelivered',5);
    expect(delivery.retailer).toBe(await retailer.getAddress());
    expect(delivery.shopId).toBe('Queen Street Clothing Store');
    expect(delivery.quantity).toBe(quantity);

    product = await contract.getProduct(productId);
    expect(product.name).toBe(name);
    expect(product.quantity).toBe(quantity);
    expect(product.supplier).toBe(await supplier.getAddress());
    expect(product.trackingNumber).toBe(trackingNumber);
    expect(product.currentStatus).toBe(5n);
    expect(await contract.getProductIdByTrackingNumber(trackingNumber)).toBe(productId);

    const byId = await trackProduct('productId',productId.toString(),contract);
    const byTracking = await trackProduct('trackingNumber',trackingNumber,contract);
    expect(byTracking).toEqual(byId);
    expect(byId.timeline.map(log => log.event)).toEqual(['ProductCreated','WarehouseEntry','WarehouseExit','TransportPickup','TransportStatusUpdated','GoodsDelivered']);
    expect(byId.timeline.map(log => log.transactionHash)).toEqual(submitted);
    expect(byId.timeline[4].fields.location).toBe('Auckland CBD');
    expect(byId.timeline[5].fields.shopId).toBe('Queen Street Clothing Store');
    expect(byId.product.currentStatus).toBe(5n);
  },120000);
});
