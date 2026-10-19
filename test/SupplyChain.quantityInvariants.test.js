const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { fixture, advance } = require('./helpers');
describe('SupplyChain quantity invariants', function () {
  it('rejects zero quantity', async function () {
    const f = await loadFixture(fixture); await expect(f.contract.connect(f.supplier).createProduct(1,'Tea',0,f.retailer.address)).to.be.revertedWith('Quantity must be greater than zero');
  });
  it('stores positive quantity', async function () {
    const f = await loadFixture(fixture); await advance(f,0); expect((await f.contract.getProduct(1)).quantity).to.equal(10);
  });
  for (const quantity of [0,9,11]) for (const delivery of [false,true]) it(`rejects quantity ${quantity} at ${delivery ? 'delivery' : 'entry'}`, async function () {
    const f = await loadFixture(fixture); await advance(f,delivery ? 4 : 0);
    const call = delivery ? f.contract.connect(f.retailer).confirmDelivery(1,'SHOP',quantity) : f.contract.connect(f.warehouse).recordWarehouseEntry(1,'WH',quantity);
    await expect(call).to.be.revertedWith('Quantity mismatch');
  });
  it('accepts exact quantities and emits stored quantity on exit', async function () {
    const f = await loadFixture(fixture); await advance(f,1);
    await expect(f.contract.connect(f.warehouse).recordWarehouseExit(1,f.transport.address)).to.emit(f.contract,'WarehouseExit').withArgs(1,f.warehouse.address,f.transport.address,10,anyValue);
    await f.contract.connect(f.transport).recordPickup(1,'DRV-3'); await f.contract.connect(f.transport).updateTransportLocation(1,'L');
    await expect(f.contract.connect(f.retailer).confirmDelivery(1,'S',10)).to.emit(f.contract,'GoodsDelivered').withArgs(1,f.retailer.address,'S',10,anyValue);
  });
});
