const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture } = require('./helpers');

describe('SupplyChain account names and drivers', function () {
  it('allows only admin to set and edit names for several warehouse wallets', async function () {
    const f = await loadFixture(fixture);
    expect(await f.contract.businessNames(f.warehouse.address)).to.equal('');
    await expect(f.contract.connect(f.warehouse).setBusinessName(f.warehouse.address, 'Other')).to.be.reverted;
    await expect(f.contract.setBusinessName(f.warehouse.address, 'North Warehouse'))
      .to.emit(f.contract, 'BusinessNameSet').withArgs(f.warehouse.address, 'North Warehouse');
    await f.contract.setBusinessName(f.outsider.address, 'South Warehouse');
    await f.contract.grantRole(await f.contract.WAREHOUSE_ROLE(), f.outsider.address);
    await f.contract.setBusinessName(f.warehouse.address, 'Central Warehouse');
    expect(await f.contract.businessNames(f.warehouse.address)).to.equal('Central Warehouse');
    expect(await f.contract.businessNames(f.outsider.address)).to.equal('South Warehouse');
    await expect(f.contract.setBusinessName(f.outsider.address, '')).to.be.revertedWith('Business name required');
  });

  it('generates distinct IDs across Transport accounts and rejects foreign drivers at pickup', async function () {
    const f = await loadFixture(fixture);
    await f.contract.grantRole(await f.contract.TRANSPORT_ROLE(), f.outsider.address);
    await expect(f.contract.connect(f.supplier).registerDriver('Supplier')).to.be.reverted;
    await expect(f.contract.connect(f.outsider).registerDriver('')).to.be.revertedWith('Driver name required');
    await expect(f.contract.connect(f.outsider).registerDriver('John'))
      .to.emit(f.contract, 'DriverRegistered').withArgs(f.outsider.address, 'DRV-4', 'John');
    await f.contract.connect(f.transport).registerDriver('John');
    const own = await f.contract.getDrivers(f.transport.address);
    const other = await f.contract.getDrivers(f.outsider.address);
    expect(own.map(driver => driver.driverId)).to.deep.equal(['DRV-1', 'DRV-2', 'DRV-3', 'DRV-5']);
    expect(other.map(driver => driver.driverId)).to.deep.equal(['DRV-4']);
    expect(new Set([...own,...other].map(driver => driver.driverId)).size).to.equal(5);
    expect(await f.contract.driverCount()).to.equal(5n);
    expect((await f.contract.getDriver(other[0].driverId)).transport).to.equal(f.outsider.address);

    await f.contract.connect(f.supplier).createProduct(1, 'Jacket', 10, f.retailer.address);
    await f.contract.connect(f.warehouse).recordWarehouseEntry(1, 'North Warehouse', 10);
    await f.contract.connect(f.warehouse).recordWarehouseExit(1, f.transport.address);
    await expect(f.contract.connect(f.transport).recordPickup(1, other[0].driverId)).to.be.revertedWith('Driver not registered to transport');
    await expect(f.contract.connect(f.transport).recordPickup(1, 'UNKNOWN')).to.be.revertedWith('Driver not registered to transport');
    await expect(f.contract.connect(f.outsider).recordPickup(1, other[0].driverId)).to.be.revertedWith('Not assigned transport');
    await expect(f.contract.connect(f.transport).recordPickup(1, own[0].driverId)).to.emit(f.contract, 'TransportPickup');
    expect((await f.contract.getProduct(1)).currentStatus).to.equal(3n);
  });
});
