const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, advance } = require('./helpers');
describe('SupplyChain tracking numbers', function () {
  it('assigns tracking number and resolves product ID including ID zero', async function () {
    const f = await loadFixture(fixture);
    for (const id of [0,1]) { await advance(f,3,id); expect((await f.contract.getProduct(id)).trackingNumber).to.equal(`TRACK-${id}`); expect(await f.contract.getProductIdByTrackingNumber(`TRACK-${id}`)).to.equal(id); }
  });
  it('rejects reuse across products and accepts distinct tracking numbers', async function () {
    const f = await loadFixture(fixture); await advance(f,5); await advance(f,2,2);
    await expect(f.contract.connect(f.transport).recordPickup(2,'TRACK-1','D')).to.be.revertedWith('Tracking number already used');
    await f.contract.connect(f.transport).recordPickup(2,'TRACK-2','D'); expect(await f.contract.getProductIdByTrackingNumber('TRACK-2')).to.equal(2);
  });
  for (const [value,reason] of [['','Tracking number required'],['missing','Unknown tracking number']]) it(`rejects lookup: ${reason}`, async function () {
    const f = await loadFixture(fixture); await expect(f.contract.getProductIdByTrackingNumber(value)).to.be.revertedWith(reason);
  });
});
