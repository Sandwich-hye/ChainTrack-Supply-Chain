import { describe,it,expect } from 'vitest';
import { getReadContract,trackProduct,DEPLOYMENT_BLOCK } from './contractService';
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
});
