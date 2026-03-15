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

export interface FileRecord {
  fileId: string;
  cid: string;
  encryptedKey: string;
  conditions: ConditionGroup | null;
  seller: string;
  priceUstx: number;
  createdAt: string;
  name: string;
  description: string;
  fileType: string;
  fileSize: number;
}

export interface PublicFileRecord {
  fileId: string;
  cid: string;
  conditions: ConditionGroup | null;
  seller: string;
  priceUstx: number;
  createdAt: string;
  name: string;
  description: string;
  fileType: string;
  fileSize: number;
}

export interface OnChainFile {
  cid: string;
  priceUstx: number;
  seller: string;
  active: boolean;
  accessCount: number;
}
