const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, steps, advance } = require('./helpers');
describe('SupplyChain product lifecycle', function () {
  it('runs the full separate-account lifecycle with exact events and state at every stage', async function () {
    const f = await loadFixture(fixture);
    const flow = [...steps]; flow.splice(5, 0, ['transport', 'updateTransportLocation', [1, 'City depot'], 'TransportStatusUpdated', 4]);
    for (const [actor, method, args, event, status] of flow) {
      const values = [...args];
      if (method === 'createProduct') values[3] = f.retailer.address;
      if (method === 'recordWarehouseExit') values[1] = f.transport.address;
      const tx = await f.contract.connect(f[actor])[method](...values); const receipt = await tx.wait();
      const block = await f.contract.runner.provider.getBlock(receipt.blockNumber);
      const expected = {
        ProductCreated: [1, f.supplier.address, f.retailer.address, 'Demo tea', 10, 'TRK-2026-000001', block.timestamp],
        WarehouseEntry: [1, f.warehouse.address, 'WH-1', 10, block.timestamp],
        WarehouseExit: [1, f.warehouse.address, f.transport.address, 10, block.timestamp],
        TransportPickup: [1, f.transport.address, 'TRK-2026-000001', 'DRV-1', block.timestamp],
        TransportStatusUpdated: [1, 'TRK-2026-000001', args[1], 4, block.timestamp],
        GoodsDelivered: [1, f.retailer.address, 'SHOP-1', 10, block.timestamp],
      };
      await expect(tx).to.emit(f.contract, event).withArgs(...expected[event]);
      const p = await f.contract.getProduct(1);
      expect(p.currentStatus).to.equal(status); expect(p.quantity).to.equal(10);
      expect(p.productId).to.equal(1); expect(p.name).to.equal('Demo tea'); expect(p.supplier).to.equal(f.supplier.address);
      expect(p.trackingNumber).to.equal('TRK-2026-000001');
      if (status === 0) expect(p.createdAt).to.equal(block.timestamp);
    }
    expect(await f.contract.getProductIdByTrackingNumber('TRK-2026-000001')).to.equal(1);
  });
  it('rejects duplicate product IDs without overwriting state', async function () {
    const f = await loadFixture(fixture); await advance(f, 0);
    await expect(f.contract.connect(f.supplier).createProduct(1, 'Other', 20, f.retailer.address)).to.be.revertedWith('Product already exists');
    expect((await f.contract.getProduct(1)).name).to.equal('Demo tea');
  });
});
