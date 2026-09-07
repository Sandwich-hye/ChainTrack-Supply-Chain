/**
 * Tracking-number assignment, uniqueness and lookup.
 *
 * SKELETON — structure only. Test bodies are left for Codex (Phase 2).
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain — tracking numbers", function () {
  // TODO(codex): deploy fixture + role grants; helper to drive a product to DispatchedFromWarehouse

  describe("assignment", function () {
    it("stores the tracking number on the product at pickup");
    it("marks the tracking hash as used and records the productId by tracking hash");
  });

  describe("uniqueness", function () {
    it("reverts a second recordPickup that reuses an existing tracking number (different product)");
    it("allows a distinct tracking number for a second product");
  });

  describe("getProductIdByTrackingNumber", function () {
    it("resolves a known tracking number to the correct product ID");
    it("reverts for an empty tracking number");
    it("reverts for an unknown / never-used tracking number");
  });
});
