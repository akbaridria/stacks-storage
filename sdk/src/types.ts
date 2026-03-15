export type NetworkType = "mainnet" | "testnet" | "devnet";

export type Comparator = "==" | ">=" | "<=" | ">" | "<";

export type ConditionMethod =
  | "x402-payment"
  | "stx-balance"
  | "sip010-balance"
  | "sip009-owner"
  | "contract-call"
  | "block-height";

export interface Condition {
  id: number;
  method: ConditionMethod;
  contractAddress?: string;
  function?: string;
  parameters?: string[];
  returnValueTest: {
    comparator: Comparator;
    value: string;
  };
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

export interface StacksStorageConfig {
  acnUrl: string;
  network: NetworkType;
}

export interface UploadOptions {
  priceUstx: number;
  conditions?: ConditionGroup | null;
}

export interface UploadResult {
  fileId: string;
  cid: string;
  txId: string;
}

export interface AccessOptions {
  wallet: {
    address: string;
    privateKey: string;
  };
}

export interface AccessResult {
  file: Blob;
  txId: string;
  cid: string;
  encryptedKey: string;
}

export interface RegisterRequest {
  fileId: string;
  cid: string;
  priceUstx: number;
  seller: string;
  encryptedKey: string;
  conditions: ConditionGroup | null;
}

export interface RegisterResponse {
  txId: string;
  fileId: string;
  cid: string;
}

export interface AccessGrantedResponse {
  cid: string;
  encryptedKey: string;
  buyerAddress: string;
  txId: string;
}
