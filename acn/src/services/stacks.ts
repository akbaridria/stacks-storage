import {
  makeContractCall,
  broadcastTransaction,
  Cl,
  cvToJSON,
  getAddressFromPrivateKey,
  PostConditionMode,
  type ClarityValue,
} from "@stacks/transactions";
import {
  STACKS_MAINNET,
  STACKS_TESTNET,
  STACKS_DEVNET,
  type StacksNetwork,
} from "@stacks/network";
import { getConfigSync } from "../config.js";
import type { OnChainFile } from "../types.js";

const NETWORKS: Record<string, StacksNetwork> = {
  mainnet: STACKS_MAINNET,
  testnet: STACKS_TESTNET,
  devnet: STACKS_DEVNET,
};

const config = getConfigSync();
const network = NETWORKS[config.network] ?? STACKS_TESTNET;

export const acnAddress = getAddressFromPrivateKey(config.acnPrivateKey, network);

const { contractDeployer, stacksApiUrl, acnPrivateKey } = config;

async function submitContractCall(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[]
): Promise<string> {
  const tx = await makeContractCall({
    contractAddress: contractDeployer,
    contractName,
    functionName,
    functionArgs,
    senderKey: acnPrivateKey,
    network,
    postConditionMode: PostConditionMode.Allow,
    fee: 10_000n,
  });

  const result = await broadcastTransaction({ transaction: tx, network });
  if ("error" in result && result.error) {
    throw new Error(`Broadcast failed: ${JSON.stringify(result)}`);
  }
  return `0x${result.txid}`;
}

export async function registerFile(
  fileId: string,
  cid: string,
  priceUstx: number,
  seller: string
): Promise<string> {
  return submitContractCall("file-registry", "register-file", [
    Cl.stringAscii(fileId),
    Cl.stringAscii(cid),
    Cl.uint(priceUstx),
    Cl.standardPrincipal(seller),
  ]);
}

export async function recordAccess(fileId: string): Promise<string> {
  return submitContractCall("file-registry", "record-access", [
    Cl.stringAscii(fileId),
  ]);
}

export async function distributePayment(
  seller: string,
  amountUstx: number
): Promise<string> {
  return submitContractCall("acn-payments", "distribute-payment", [
    Cl.standardPrincipal(seller),
    Cl.uint(amountUstx),
  ]);
}

// ── Chain reads (direct API calls for reliability) ──

export async function getFileOnChain(
  fileId: string
): Promise<OnChainFile | null> {
  const body = JSON.stringify({
    sender: acnAddress,
    arguments: [Cl.serialize(Cl.stringAscii(fileId))],
  });

  const res = await fetch(
    `${stacksApiUrl}/v2/contracts/call-read/${contractDeployer}/file-registry/get-file`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body }
  );
  if (!res.ok) return null;

  const json = (await res.json()) as { okay: boolean; result: string };
  if (!json.okay) return null;

  const cv = cvToJSON(Cl.deserialize(json.result));
  if (cv.type === "none" || !cv.value) return null;

  try {
    // cvToJSON wraps optional tuples in varying depth depending on version.
    // Walk into nested .value until we find the tuple with known keys.
    let node: Record<string, unknown> = cv.value as Record<string, unknown>;
    while (node && typeof node === "object" && "value" in node && !("cid" in node)) {
      node = node.value as Record<string, unknown>;
    }

    const tuple = node as Record<string, { value: string | number | boolean }>;
    if (!tuple?.cid) return null;

    return {
      cid: String(tuple.cid.value),
      priceUstx: Number(tuple["price-ustx"].value),
      seller: String(tuple.seller.value),
      active: Boolean(tuple.active.value),
      accessCount: Number(tuple["access-count"].value),
    };
  } catch {
    console.error("getFileOnChain: unexpected cvToJSON shape:", JSON.stringify(cv, null, 2));
    return null;
  }
}

export async function getStxBalance(principal: string): Promise<bigint> {
  const res = await fetch(`${stacksApiUrl}/v2/accounts/${principal}`);
  if (!res.ok) throw new Error(`Failed to fetch balance for ${principal}`);
  const data = (await res.json()) as { balance: string };
  return BigInt(data.balance);
}

export async function getAddressBalances(
  principal: string
): Promise<{
  stx: bigint;
  fungibleTokens: Record<string, bigint>;
  nonFungibleTokens: Record<string, bigint>;
}> {
  const res = await fetch(
    `${stacksApiUrl}/extended/v1/address/${principal}/balances`
  );
  if (!res.ok) throw new Error(`Failed to fetch balances for ${principal}`);

  const data = (await res.json()) as {
    stx: { balance: string };
    fungible_tokens: Record<string, { balance: string }>;
    non_fungible_tokens: Record<string, { count: string }>;
  };

  const fungibleTokens: Record<string, bigint> = {};
  for (const [k, v] of Object.entries(data.fungible_tokens)) {
    fungibleTokens[k] = BigInt(v.balance);
  }

  const nonFungibleTokens: Record<string, bigint> = {};
  for (const [k, v] of Object.entries(data.non_fungible_tokens)) {
    nonFungibleTokens[k] = BigInt(v.count);
  }

  return {
    stx: BigInt(data.stx.balance),
    fungibleTokens,
    nonFungibleTokens,
  };
}

export async function getBlockHeight(): Promise<number> {
  const res = await fetch(`${stacksApiUrl}/v2/info`);
  if (!res.ok) throw new Error("Failed to fetch chain info");
  const data = (await res.json()) as { stacks_tip_height: number };
  return data.stacks_tip_height;
}

export async function callReadOnly(
  contractId: string,
  functionName: string,
  args: string[],
  senderAddress: string
): Promise<unknown> {
  const [addr, name] = contractId.split(".");
  const body = JSON.stringify({
    sender: senderAddress,
    arguments: args,
  });

  const res = await fetch(
    `${stacksApiUrl}/v2/contracts/call-read/${addr}/${name}/${functionName}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body }
  );
  if (!res.ok) throw new Error(`Read-only call failed: ${contractId}.${functionName}`);

  const data = (await res.json()) as { okay: boolean; result: string };
  if (!data.okay) throw new Error(`Contract returned error: ${data.result}`);

  return cvToJSON(Cl.deserialize(data.result));
}

export async function getTransaction(txId: string): Promise<{
  tx_status: string;
  sender_address: string;
  events: Array<{
    event_type: string;
    asset: { amount: string; sender: string; recipient: string };
  }>;
}> {
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  const res = await fetch(`${stacksApiUrl}/extended/v1/tx/${id}`);
  if (!res.ok) throw new Error(`Transaction not found: ${txId}`);
  return res.json() as Promise<{
    tx_status: string;
    sender_address: string;
    events: Array<{
      event_type: string;
      asset: { amount: string; sender: string; recipient: string };
    }>;
  }>;
}
