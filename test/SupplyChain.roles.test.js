/**
 * Role / AccessControl behaviour.
 *
 * SKELETON — structure only. Test bodies are left for Codex (Phase 2).
 * `it("...")` with no callback is a Mocha *pending* test — it will show as
 * pending, not fail, when running `npx hardhat test`.
 *
 * AccessControl 5.x reverts with the custom error
 * `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)` —
 * assert with `revertedWithCustomError`, not a string match.
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain — roles & access control", function () {
  // TODO(codex): deploy fixture returning { contract, admin, supplier, warehouse, transport, retailer, outsider }

  describe("admin role bootstrap", function () {
    it("grants DEFAULT_ADMIN_ROLE to the deployer");
    it("does not grant any business role to the deployer by default");
  });

  describe("role administration", function () {
    it("lets the admin grant each business role");
    it("lets the admin revoke a previously granted role");
    it("reverts when a non-admin tries to grant a role");
    it("reverts when a non-admin tries to revoke a role");
  });

  describe("role-gated operations (positive)", function () {
    it("allows a SUPPLIER_ROLE account to call createProduct");
    it("allows a WAREHOUSE_ROLE account to call recordWarehouseEntry / recordWarehouseExit");
    it("allows a TRANSPORT_ROLE account to call recordPickup / updateTransportLocation");
    it("allows a RETAILER_ROLE account to call confirmDelivery");
  });

  describe("role-gated operations (negative)", function () {
    it("rejects createProduct from a non-supplier");
    it("rejects recordWarehouseEntry / recordWarehouseExit from a non-warehouse account");
    it("rejects recordPickup / updateTransportLocation from a non-transport account");
    it("rejects confirmDelivery from a non-retailer");
  });

  describe("revocation", function () {
    it("blocks a formerly-authorised account after its role is revoked");
  });
});
