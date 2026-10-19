import { describe,it,expect } from 'vitest';
import { getReadContract,trackProduct,listSupplierProducts,listWarehouseProducts,listTransportProducts,listRetailerProducts,listWarehouseShipments,listTransportShipments,listRetailerShipments,listRoleAssignments,generateProductId,ROLE_IDS,DEPLOYMENT_BLOCK } from './contractService';
describe.skipIf(process.env.RUN_LOCAL_INTEGRATION !== 'true')('live local deployment integration',() => {
  it('reads the seeded Delivered product and identical five-event timelines through both searches',async () => {
    const contract = await getReadContract();
    expect(await contract.businessNames('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')).toBe('Auckland Clothing Distribution Centre');
    const seededDrivers = await contract.getDrivers('0x90F79bf6EB2c4f870365E785982E1f101E93b906');
    expect(seededDrivers.some(driver => driver.name === 'John')).toBe(true);
    const byId = await trackProduct('productId','1001',contract);
    const byTracking = await trackProduct('trackingNumber','trk-2026-000001',contract);
    expect(byId.product.trackingNumber).toBe('TRK-2026-000001');
    expect(byId.timeline[0].fields.trackingNumber).toBe('TRK-2026-000001');
    for (const partial of ['TRK-2026-','TRK-2026-00000','CLASSIC DENIM JACKET']) await expect(contract.getProductIdByTrackingNumber(partial)).rejects.toThrow(/Unknown tracking number/);
    const seededTracking = byId.timeline.filter(event => event.fields.trackingNumber).map(event => event.fields.trackingNumber);
    expect(seededTracking.length).toBeGreaterThan(0);
    expect(seededTracking.every(value => value === 'TRK-2026-000001' && !value.startsWith('SC-'))).toBe(true);
    expect(byId).toEqual(byTracking);
    expect(byId.product.name).toBe('Classic Denim Jacket');
    expect(byId.product.currentStatus).toBe(5n);
    expect(byId.timeline.map(e => e.event)).toEqual(['ProductCreated','WarehouseEntry','WarehouseExit','TransportPickup','GoodsDelivered']);
    expect(byId.timeline.every(e => e.blockNumber >= DEPLOYMENT_BLOCK)).toBe(true);
    expect(byId.timeline[1].fields.warehouseId).toBe('Auckland Clothing Distribution Centre');
    expect(byId.timeline[2].fields.quantity).toBe('10');
    expect(seededDrivers.map(driver => driver.driverId)).toContain(byId.timeline[3].fields.driverId);
    expect(byId.timeline.at(-1).fields.shopId).toBe('Queen Street Clothing Store');
    const supplierProducts = await listSupplierProducts(byId.product.supplier,contract);
    expect(supplierProducts.map(product => product.productId)).toContain(1001n);
    expect((await listWarehouseProducts(contract)).map(product => product.productId)).not.toContain(1001n);
    expect((await listTransportProducts(byId.product.assignedTransport,contract)).map(product => product.productId)).not.toContain(1001n);
    expect((await listRetailerProducts(byId.product.destinationRetailer,contract)).map(product => product.productId)).not.toContain(1001n);
    const ids = products => products.map(product => product.productId);
    for (const shipments of [await listWarehouseShipments(byId.timeline[1].fields.staff,contract),await listTransportShipments(byId.product.assignedTransport,contract),await listRetailerShipments(byId.product.destinationRetailer,contract)]) {
      expect(ids(shipments.history)).toContain(1001n); expect(ids(shipments.active)).not.toContain(1001n);
    }
    const assignments = await listRoleAssignments(contract);
    expect(assignments.Supplier).toContain(byId.product.supplier); expect(assignments.Warehouse).toContain(byId.timeline[1].fields.staff);
    expect(assignments.Transport).toContain(byId.product.assignedTransport); expect(assignments.Retailer).toContain(byId.product.destinationRetailer);
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

    const retailerAddress = await retailer.getAddress();
    const transportAddress = await transport.getAddress();
    const created = await submit(supplier,'createProduct',[productId,name,quantity,retailerAddress],'ProductCreated',0);
    expect(created.supplier).toBe(await supplier.getAddress());
    expect(created.name).toBe(name);
    expect(created.quantity).toBe(quantity);
    expect(created.destinationRetailer).toBe(retailerAddress);
    const trackingNumber = created.trackingNumber;
    expect(trackingNumber).toMatch(/^TRK-2026-\d{6}$/); expect(trackingNumber).not.toBe('TRK-2026-000001');
    expect(await contract.getProductIdByTrackingNumber(trackingNumber)).toBe(productId);
    expect(trackingNumber.startsWith('SC-')).toBe(false); expect(trackingNumber).not.toContain(productId.toString());
    expect((await listWarehouseProducts(contract)).map(product => product.productId)).toContain(productId);
    let product = await contract.getProduct(productId);
    expect(product.productId).toBe(productId);
    expect(product.name).toBe(name);
    expect(product.quantity).toBe(quantity);
    expect(product.supplier).toBe(await supplier.getAddress());
    expect(product.destinationRetailer).toBe(retailerAddress);
    expect(product.trackingNumber).toBe(trackingNumber);

    const entry = await submit(warehouse,'recordWarehouseEntry',[productId,'Auckland Clothing Distribution Centre',product.quantity],'WarehouseEntry',1);
    expect(entry.staff).toBe(await warehouse.getAddress());
    expect(entry.warehouseId).toBe('Auckland Clothing Distribution Centre');
    expect(entry.quantity).toBe(quantity);
    expect((await listWarehouseProducts(contract)).map(product => product.productId)).toContain(productId);
    product = await contract.getProduct(productId);
    expect(product.quantity).toBe(quantity);

    const exit = await submit(warehouse,'recordWarehouseExit',[productId,transportAddress],'WarehouseExit',2);
    expect(exit.staff).toBe(await warehouse.getAddress());
    expect(exit.assignedTransport).toBe(transportAddress);
    expect((await listTransportProducts(transportAddress,contract)).map(product => product.productId)).toContain(productId);
    expect(exit.quantity).toBe(quantity);
    expect((await contract.getProduct(productId)).trackingNumber).toBe(trackingNumber);

    const ownDrivers = await contract.getDrivers(transportAddress);
    const john = ownDrivers.find(driver => driver.name === 'John');
    expect(john).toBeTruthy();
    const pickup = await submit(transport,'recordPickup',[productId,john.driverId],'TransportPickup',3);
    expect(pickup.transportCompany).toBe(await transport.getAddress());
    expect(pickup.trackingNumber).toBe(trackingNumber);
    expect(pickup.driverId).toBe(john.driverId);
    expect((await contract.getProduct(productId)).trackingNumber).toBe(trackingNumber);
    expect((await contract.getProduct(productId)).assignedTransport).toBe(transportAddress);
    expect(await contract.getProductIdByTrackingNumber(trackingNumber)).toBe(productId);

    expect((await listRetailerProducts(retailerAddress,contract)).map(product => product.productId)).toContain(productId);

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
    expect(byId.timeline.map(log => log.event)).toEqual(['ProductCreated','WarehouseEntry','WarehouseExit','TransportPickup','GoodsDelivered']);
    expect(byId.timeline.map(log => log.transactionHash)).toEqual(submitted);
    expect(byId.timeline[4].fields.shopId).toBe('Queen Street Clothing Store');
    expect(byId.product.currentStatus).toBe(5n);
  },120000);
});
