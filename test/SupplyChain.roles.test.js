const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { fixture, roles, steps, advance } = require('./helpers');
describe('SupplyChain roles and access control', function () {
  it('bootstraps only the admin role on the deployer', async function () {
    const f = await loadFixture(fixture);
    expect(await f.contract.hasRole(await f.contract.DEFAULT_ADMIN_ROLE(), f.admin.address)).to.equal(true);
    for (const role of roles) expect(await f.contract.hasRole(await f.contract[role](), f.admin.address)).to.equal(false);
  });
  for (let i = 0; i < roles.length; i++) {
    it(`admin grants and revokes ${roles[i]}`, async function () {
      const f = await loadFixture(fixture); const role = await f.contract[roles[i]]();
      expect(await f.contract.hasRole(role, f.actors[i].address)).to.equal(true);
      await f.contract.revokeRole(role, f.actors[i].address);
      expect(await f.contract.hasRole(role, f.actors[i].address)).to.equal(false);
    });
    for (const method of ['grantRole', 'revokeRole']) it(`non-admin cannot ${method} ${roles[i]}`, async function () {
      const f = await loadFixture(fixture);
      for (const actor of [...f.actors, f.outsider]) await expect(f.contract.connect(actor)[method](await f.contract[roles[i]](), f.outsider.address))
        .to.be.revertedWithCustomError(f.contract, 'AccessControlUnauthorizedAccount').withArgs(actor.address, await f.contract.DEFAULT_ADMIN_ROLE());
    });
  }
  for (let i = 0; i < steps.length; i++) {
    const [actor, method, args] = steps[i]; const roleName = `${actor.toUpperCase()}_ROLE`;
    it(`allows the correct role to ${method}`, async function () {
      const f = await loadFixture(fixture); await advance(f, i - 1);
      await expect(f.contract.connect(f[actor])[method](...args)).not.to.be.reverted;
    });
    it(`rejects every other role and revoked role for ${method}`, async function () {
      const f = await loadFixture(fixture); await advance(f, i - 1); const role = await f.contract[roleName]();
      for (const account of [f.admin, ...f.actors, f.outsider].filter(Boolean).filter(a => a.address !== f[actor].address)) {
        await expect(f.contract.connect(account)[method](...args)).to.be.revertedWithCustomError(f.contract, 'AccessControlUnauthorizedAccount').withArgs(account.address, role);
      }
      await f.contract.revokeRole(role, f[actor].address);
      await expect(f.contract.connect(f[actor])[method](...args)).to.be.revertedWithCustomError(f.contract, 'AccessControlUnauthorizedAccount').withArgs(f[actor].address, role);
    });
  }
});
