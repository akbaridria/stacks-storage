import type { Condition, ConditionGroup, Comparator } from "../types.js";
import {
  getAddressBalances,
  getBlockHeight,
  callReadOnly,
} from "./stacks.js";

function compare(actual: bigint, comparator: Comparator, expected: bigint): boolean {
  switch (comparator) {
    case "==": return actual === expected;
    case ">=": return actual >= expected;
    case "<=": return actual <= expected;
    case ">":  return actual > expected;
    case "<":  return actual < expected;
  }
}

function toBigInt(value: string): bigint {
  if (value === "true") return 1n;
  if (value === "false") return 0n;
  return BigInt(value);
}

async function evaluateSingle(
  condition: Condition,
  buyerAddress: string,
  paymentVerified: boolean
): Promise<boolean> {
  const { comparator, value } = condition.returnValueTest;
  const expected = toBigInt(value);

  switch (condition.method) {
    case "x402-payment": {
      const actual = paymentVerified ? 1n : 0n;
      return compare(actual, comparator, expected);
    }

    case "stx-balance": {
      const balances = await getAddressBalances(buyerAddress);
      return compare(balances.stx, comparator, expected);
    }

    case "sip010-balance": {
      if (!condition.contractAddress) return false;
      const balances = await getAddressBalances(buyerAddress);
      const tokenKey = Object.keys(balances.fungibleTokens).find((k) =>
        k.startsWith(condition.contractAddress!)
      );
      const balance = tokenKey ? balances.fungibleTokens[tokenKey] : 0n;
      return compare(balance, comparator, expected);
    }

    case "sip009-owner": {
      if (!condition.contractAddress) return false;
      const balances = await getAddressBalances(buyerAddress);
      const nftKey = Object.keys(balances.nonFungibleTokens).find((k) =>
        k.startsWith(condition.contractAddress!)
      );
      const count = nftKey ? balances.nonFungibleTokens[nftKey] : 0n;
      return compare(count, comparator, expected);
    }

    case "contract-call": {
      if (!condition.contractAddress || !condition.function) return false;
      const args = (condition.parameters ?? []).map((p) =>
        p === ":userAddress" ? buyerAddress : p
      );
      const result = (await callReadOnly(
        condition.contractAddress,
        condition.function,
        args,
        buyerAddress
      )) as { value?: unknown };
      const actual = toBigInt(String(result.value ?? "0"));
      return compare(actual, comparator, expected);
    }

    case "block-height": {
      const height = await getBlockHeight();
      return compare(BigInt(height), comparator, expected);
    }

    default:
      return false;
  }
}

export async function evaluate(
  group: ConditionGroup | null,
  buyerAddress: string,
  paymentVerified: boolean
): Promise<boolean> {
  if (!group || group.conditions.length === 0) return true;

  const results = await Promise.all(
    group.conditions.map((c) => evaluateSingle(c, buyerAddress, paymentVerified))
  );

  return group.operator === "AND"
    ? results.every(Boolean)
    : results.some(Boolean);
}
