const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture } = require('./helpers');

async function assignedFixture() {
  const f = await fixture();
  await f.contract.connect(f.supplier).createProduct(1, 'Classic Denim Jacket', 10, f.retailer.address);
  await f.contract.connect(f.warehouse).recordWarehouseEntry(1, 'Auckland Clothing Distribution Centre', 10);
  await f.contract.connect(f.warehouse).recordWarehouseExit(1, f.transport.address);
  return f;
}

describe('SupplyChain shipment assignments', function () {
  it('stores destination retailer and assigned transport', async function () {
    const f = await loadFixture(assignedFixture);
    const product = await f.contract.getProduct(1);
    expect(product.destinationRetailer).to.equal(f.retailer.address);
    expect(product.assignedTransport).to.equal(f.transport.address);
  });

  it('requires assigned accounts to hold their corresponding roles', async function () {
    const f = await loadFixture(fixture);
    await expect(f.contract.connect(f.supplier).createProduct(1, 'Jacket', 10, '0x0000000000000000000000000000000000000000')).to.be.revertedWith('Destination retailer required');
    await expect(f.contract.connect(f.supplier).createProduct(1, 'Jacket', 10, f.outsider.address)).to.be.revertedWith('Destination retailer lacks role');
    await f.contract.connect(f.admin).grantRole(await f.contract.RETAILER_ROLE(), f.outsider.address);
    await f.contract.connect(f.supplier).createProduct(1, 'Jacket', 10, f.outsider.address);
    await f.contract.connect(f.warehouse).recordWarehouseEntry(1, 'Warehouse', 10);
    await expect(f.contract.connect(f.warehouse).recordWarehouseExit(1, '0x0000000000000000000000000000000000000000')).to.be.revertedWith('Assigned transport required');
    await expect(f.contract.connect(f.warehouse).recordWarehouseExit(1, f.outsider.address)).to.be.revertedWith('Assigned transport lacks role');
  });

  it('restricts transport actions to the assigned transport account', async function () {
    const f = await loadFixture(assignedFixture);
    await f.contract.connect(f.admin).grantRole(await f.contract.TRANSPORT_ROLE(), f.outsider.address);
    await expect(f.contract.connect(f.outsider).recordPickup(1, 'DRV-1')).to.be.revertedWith('Not assigned transport');
    await f.contract.connect(f.transport).recordPickup(1, 'DRV-1');
    await expect(f.contract.connect(f.outsider).updateTransportLocation(1, 'Auckland CBD')).to.be.revertedWith('Not assigned transport');
  });

  it('restricts delivery to the destination retailer', async function () {
    const f = await loadFixture(assignedFixture);
    await f.contract.connect(f.transport).recordPickup(1, 'DRV-1');
    await f.contract.connect(f.transport).updateTransportLocation(1, 'Auckland CBD');
    await f.contract.connect(f.admin).grantRole(await f.contract.RETAILER_ROLE(), f.outsider.address);
    await expect(f.contract.connect(f.outsider).confirmDelivery(1, 'Other Store', 10)).to.be.revertedWith('Not destination retailer');
  });

  it('lets the destination retailer confirm delivery directly after pickup', async function () {
    const f = await loadFixture(assignedFixture);
    await f.contract.connect(f.transport).recordPickup(1, 'DRV-2');
    await f.contract.connect(f.admin).grantRole(await f.contract.RETAILER_ROLE(), f.outsider.address);
    await expect(f.contract.connect(f.outsider).confirmDelivery(1, 'Other Store', 10)).to.be.revertedWith('Not destination retailer');
    await expect(f.contract.connect(f.retailer).confirmDelivery(1, 'Queen Street Clothing Store', 10)).to.emit(f.contract, 'GoodsDelivered');
    expect((await f.contract.getProduct(1)).currentStatus).to.equal(5);
  });
});
