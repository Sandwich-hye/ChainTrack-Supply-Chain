const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, steps, advance } = require('./helpers');
describe('SupplyChain state transitions', function () {
  for (const [actor, method, args] of steps.slice(1)) it(`rejects unknown product in ${method}`, async function () {
    const f = await loadFixture(fixture);
    await expect(f.contract.connect(f[actor])[method](...args)).to.be.revertedWith('Product does not exist');
  });
  it('rejects unknown product reads', async function () {
    const f = await loadFixture(fixture); await expect(f.contract.getProduct(99)).to.be.revertedWith('Product does not exist');
  });
  const reasons = ['','warehouse entry','warehouse exit','pickup','location update','delivery'];
  for (let stage = 0; stage < 6; stage++) for (let op = 1; op < 6; op++) {
    if (stage === op - 1 || (op === 4 && stage === 4)) continue;
    it(`rejects ${steps[op][1]} from status ${stage}`, async function () {
      const f = await loadFixture(fixture); await advance(f, stage); const [actor, method, args] = steps[op];
      await expect(f.contract.connect(f[actor])[method](...args)).to.be.revertedWith(`Invalid status for ${reasons[op]}`);
      expect((await f.contract.getProduct(1)).currentStatus).to.equal(stage);
    });
  }
  for (const [op, field, reason] of [[0,1,'Name required'],[1,1,'Warehouse ID required'],[3,1,'Tracking number required'],[3,2,'Driver ID required'],[4,1,'Location required'],[5,1,'Shop ID required']]) {
    it(`rejects empty field: ${reason}`, async function () {
      const f = await loadFixture(fixture); await advance(f, op - 1);
      const [actor, method, args] = steps[op]; const values = [...args]; values[field] = '';
      await expect(f.contract.connect(f[actor])[method](...values)).to.be.revertedWith(reason);
    });
  }
});
