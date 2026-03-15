import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const acn = accounts.get("acn")!;
const wallet1 = accounts.get("wallet_1")!;

const AMOUNT = 1_000_000; // 1 STX in microSTX
const SELLER_SHARE = 970_000; // 97%
const TREASURY_SHARE = 30_000; // 3%

describe("acn-payments", () => {
  describe("set-treasury", () => {
    it("allows owner (deployer) to set treasury", () => {
      const result = simnet.callPublicFn(
        "acn-payments",
        "set-treasury",
        [Cl.standardPrincipal(wallet1)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const getTreasury = simnet.callReadOnlyFn(
        "acn-payments",
        "get-treasury",
        [],
        deployer
      );
      expect(getTreasury.result).toBePrincipal(wallet1);
    });

    it("rejects non-owner from setting treasury", () => {
      const result = simnet.callPublicFn(
        "acn-payments",
        "set-treasury",
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(200));
    });
  });

  describe("distribute-payment", () => {
    it("splits payment 97% to seller, 3% to treasury", () => {
      simnet.callPublicFn(
        "acn-payments",
        "set-treasury",
        [Cl.standardPrincipal(wallet1)],
        deployer
      );

      const assetsBefore = simnet.getAssetsMap();
      const deployerStxBefore = assetsBefore.get("STX")?.get(deployer) ?? 0n;
      const wallet1StxBefore = assetsBefore.get("STX")?.get(wallet1) ?? 0n;

      const result = simnet.callPublicFn(
        "acn-payments",
        "distribute-payment",
        [Cl.standardPrincipal(wallet1), Cl.uint(AMOUNT)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const assetsAfter = simnet.getAssetsMap();
      const deployerStxAfter = assetsAfter.get("STX")?.get(deployer) ?? 0n;
      const wallet1StxAfter = assetsAfter.get("STX")?.get(wallet1) ?? 0n;

      expect(deployerStxAfter).toBe(deployerStxBefore - BigInt(AMOUNT));
      expect(wallet1StxAfter).toBe(wallet1StxBefore + BigInt(SELLER_SHARE) + BigInt(TREASURY_SHARE));
    });

    it("rejects zero amount", () => {
      const result = simnet.callPublicFn(
        "acn-payments",
        "distribute-payment",
        [Cl.standardPrincipal(wallet1), Cl.uint(0)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(201));
    });

    it("transfers correct amounts to seller and treasury (different principals)", () => {
      simnet.callPublicFn(
        "acn-payments",
        "set-treasury",
        [Cl.standardPrincipal(acn)],
        deployer
      );

      const amount = 100_000;
      const sellerAmount = Math.floor((amount * 97) / 100);
      const treasuryAmount = amount - sellerAmount;

      const result = simnet.callPublicFn(
        "acn-payments",
        "distribute-payment",
        [Cl.standardPrincipal(wallet1), Cl.uint(amount)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const stxTransfers = result.events?.filter(
        (e: { event: string }) => e.event === "stx_transfer_event"
      ) ?? [];
      expect(stxTransfers.length).toBe(2);

      const toWallet1 = stxTransfers.find(
        (e: { data: { recipient: string } }) => e.data?.recipient === wallet1
      );
      const toAcn = stxTransfers.find(
        (e: { data: { recipient: string } }) => e.data?.recipient === acn
      );
      expect(toWallet1?.data?.amount).toBe(String(sellerAmount));
      expect(toAcn?.data?.amount).toBe(String(treasuryAmount));
    });
  });

  describe("get-treasury", () => {
    it("returns deployer as initial treasury", () => {
      const result = simnet.callReadOnlyFn(
        "acn-payments",
        "get-treasury",
        [],
        deployer
      );
      expect(result.result).toBePrincipal(deployer);
    });
  });
});
