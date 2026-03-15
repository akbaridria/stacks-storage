import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const acn = accounts.get("acn")!;
const wallet1 = accounts.get("wallet_1")!;

const FILE_ID = "a".repeat(64);
const CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
const PRICE = 5_000_000;

describe("file-registry", () => {
  describe("set-acn", () => {
    it("allows owner (deployer) to set ACN", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "set-acn",
        [Cl.standardPrincipal(acn)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const getAcn = simnet.callReadOnlyFn(
        "file-registry",
        "get-acn",
        [],
        deployer
      );
      expect(getAcn.result).toBePrincipal(acn);
    });

    it("rejects non-owner from setting ACN", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "set-acn",
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(100));
    });
  });

  describe("register-file", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "file-registry",
        "set-acn",
        [Cl.standardPrincipal(acn)],
        deployer
      );
    });

    it("allows ACN to register a file", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii(CID),
          Cl.uint(PRICE),
          Cl.standardPrincipal(wallet1),
        ],
        acn
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const getFile = simnet.callReadOnlyFn(
        "file-registry",
        "get-file",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(getFile.result).toBeSome(
        Cl.tuple({
          cid: Cl.stringAscii(CID),
          "price-ustx": Cl.uint(PRICE),
          seller: Cl.standardPrincipal(wallet1),
          active: Cl.bool(true),
          "access-count": Cl.uint(0),
        })
      );
    });

    it("rejects non-ACN from registering a file", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii(CID),
          Cl.uint(PRICE),
          Cl.standardPrincipal(wallet1),
        ],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(100));
    });

    it("rejects duplicate file-id registration", () => {
      simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii(CID),
          Cl.uint(PRICE),
          Cl.standardPrincipal(wallet1),
        ],
        acn
      );
      const result = simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii("other-cid"),
          Cl.uint(1),
          Cl.standardPrincipal(wallet1),
        ],
        acn
      );
      expect(result.result).toBeErr(Cl.uint(102));
    });
  });

  describe("update-price", () => {
    const NEW_PRICE = 10_000_000;

    beforeEach(() => {
      simnet.callPublicFn(
        "file-registry",
        "set-acn",
        [Cl.standardPrincipal(acn)],
        deployer
      );
      simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii(CID),
          Cl.uint(PRICE),
          Cl.standardPrincipal(wallet1),
        ],
        acn
      );
    });

    it("allows seller to update price", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "update-price",
        [Cl.stringAscii(FILE_ID), Cl.uint(NEW_PRICE)],
        wallet1
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const getFile = simnet.callReadOnlyFn(
        "file-registry",
        "get-file",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(getFile.result).toBeSome(
        Cl.tuple({
          cid: Cl.stringAscii(CID),
          "price-ustx": Cl.uint(NEW_PRICE),
          seller: Cl.standardPrincipal(wallet1),
          active: Cl.bool(true),
          "access-count": Cl.uint(0),
        })
      );
    });

    it("rejects non-seller from updating price", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "update-price",
        [Cl.stringAscii(FILE_ID), Cl.uint(NEW_PRICE)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(100));
    });

    it("rejects update for unknown file-id", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "update-price",
        [Cl.stringAscii("b".repeat(64)), Cl.uint(NEW_PRICE)],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(101));
    });
  });

  describe("deactivate", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "file-registry",
        "set-acn",
        [Cl.standardPrincipal(acn)],
        deployer
      );
      simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii(CID),
          Cl.uint(PRICE),
          Cl.standardPrincipal(wallet1),
        ],
        acn
      );
    });

    it("allows seller to deactivate file", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "deactivate",
        [Cl.stringAscii(FILE_ID)],
        wallet1
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const getFile = simnet.callReadOnlyFn(
        "file-registry",
        "get-file",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(getFile.result).toBeSome(
        Cl.tuple({
          cid: Cl.stringAscii(CID),
          "price-ustx": Cl.uint(PRICE),
          seller: Cl.standardPrincipal(wallet1),
          active: Cl.bool(false),
          "access-count": Cl.uint(0),
        })
      );
    });

    it("rejects non-seller from deactivating", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "deactivate",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(100));
    });
  });

  describe("record-access", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "file-registry",
        "set-acn",
        [Cl.standardPrincipal(acn)],
        deployer
      );
      simnet.callPublicFn(
        "file-registry",
        "register-file",
        [
          Cl.stringAscii(FILE_ID),
          Cl.stringAscii(CID),
          Cl.uint(PRICE),
          Cl.standardPrincipal(wallet1),
        ],
        acn
      );
    });

    it("allows ACN to record access and increments access-count", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "record-access",
        [Cl.stringAscii(FILE_ID)],
        acn
      );
      expect(result.result).toBeOk(Cl.bool(true));

      const getCount = simnet.callReadOnlyFn(
        "file-registry",
        "get-access-count",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(getCount.result).toBeOk(Cl.uint(1));

      simnet.callPublicFn(
        "file-registry",
        "record-access",
        [Cl.stringAscii(FILE_ID)],
        acn
      );
      const getCount2 = simnet.callReadOnlyFn(
        "file-registry",
        "get-access-count",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(getCount2.result).toBeOk(Cl.uint(2));
    });

    it("rejects non-ACN from recording access", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "record-access",
        [Cl.stringAscii(FILE_ID)],
        wallet1
      );
      expect(result.result).toBeErr(Cl.uint(100));
    });

    it("rejects record-access on deactivated file", () => {
      simnet.callPublicFn(
        "file-registry",
        "deactivate",
        [Cl.stringAscii(FILE_ID)],
        wallet1
      );
      const result = simnet.callPublicFn(
        "file-registry",
        "record-access",
        [Cl.stringAscii(FILE_ID)],
        acn
      );
      expect(result.result).toBeErr(Cl.uint(103));
    });

    it("rejects record-access for unknown file-id", () => {
      const result = simnet.callPublicFn(
        "file-registry",
        "record-access",
        [Cl.stringAscii("b".repeat(64))],
        acn
      );
      expect(result.result).toBeErr(Cl.uint(101));
    });
  });

  describe("get-access-count", () => {
    it("returns err for unknown file-id", () => {
      const result = simnet.callReadOnlyFn(
        "file-registry",
        "get-access-count",
        [Cl.stringAscii(FILE_ID)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(101));
    });
  });
});
