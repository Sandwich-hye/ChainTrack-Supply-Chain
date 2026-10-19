const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, advance } = require('./helpers');
describe('SupplyChain tracking numbers', function () {
  it('assigns a tracking number at creation and resolves it to the internal product ID, including ID zero', async function () {
    const f = await loadFixture(fixture);
    await advance(f,0,0);
    expect((await f.contract.getProduct(0)).trackingNumber).to.equal('TRK-2026-000001');
    expect(await f.contract.getProductIdByTrackingNumber('TRK-2026-000001')).to.equal(0);
    expect(await f.contract.shipmentCount()).to.equal(1);
  });
  it('emits the tracking number in ProductCreated', async function () {
    const f = await loadFixture(fixture);
    const tx = f.contract.connect(f.supplier).createProduct(77n, 'Classic Denim Jacket', 10, f.retailer.address);
    await expect(tx).to.emit(f.contract, 'ProductCreated').withArgs(77n, f.supplier.address, f.retailer.address, 'Classic Denim Jacket', 10, 'TRK-2026-000001', (value) => value > 0n);
  });
  it('gives every product a distinct sequential tracking number regardless of product ID', async function () {
    const f = await loadFixture(fixture);
    const ids = [2n ** 255n, 5n, 123456789n];
    for (const id of ids) await f.contract.connect(f.supplier).createProduct(id, 'Item', 1, f.retailer.address);
    const numbers = await Promise.all(ids.map(async id => (await f.contract.getProduct(id)).trackingNumber));
    expect(numbers).to.deep.equal(['TRK-2026-000001', 'TRK-2026-000002', 'TRK-2026-000003']);
    for (const [index, id] of ids.entries()) expect(await f.contract.getProductIdByTrackingNumber(numbers[index])).to.equal(id);
  });
  it('keeps the creation tracking number through pickup and delivery', async function () {
    const f = await loadFixture(fixture);
    await advance(f,2);
    await expect(f.contract.connect(f.transport).recordPickup(1, 'DRV-2')).to.emit(f.contract, 'TransportPickup').withArgs(1, f.transport.address, 'TRK-2026-000001', 'DRV-2', (value) => value > 0n);
    await f.contract.connect(f.retailer).confirmDelivery(1, 'Queen Street Clothing Store', 10);
    expect((await f.contract.getProduct(1)).trackingNumber).to.equal('TRK-2026-000001');
    expect(await f.contract.shipmentCount()).to.equal(1);
  });
  it('does not consume a tracking number when createProduct reverts', async function () {
    const f = await loadFixture(fixture);
    await advance(f,0);
    await expect(f.contract.connect(f.supplier).createProduct(1, 'Duplicate', 1, f.retailer.address)).to.be.revertedWith('Product already exists');
    await f.contract.connect(f.supplier).createProduct(2, 'Next', 1, f.retailer.address);
    expect((await f.contract.getProduct(2)).trackingNumber).to.equal('TRK-2026-000002');
  });
  for (const [value,reason] of [['','Tracking number required'],['TRK-2026-999999','Unknown tracking number'],['trk-2026-000001','Unknown tracking number']]) it(`rejects lookup ${JSON.stringify(value)}: ${reason}`, async function () {
    const f = await loadFixture(fixture); await advance(f,0);
    await expect(f.contract.getProductIdByTrackingNumber(value)).to.be.revertedWith(reason);
  });
});
