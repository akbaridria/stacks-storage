export const ACN_URL = process.env.NEXT_PUBLIC_ACN_URL ?? "http://localhost:3100";
export const STACKS_NETWORK = (process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet") as "mainnet" | "testnet" | "devnet";

export const APP_NAME = "Stacks Storage";
export const APP_ICON = "/icon.svg";

export const FILE_TYPES = ["document", "video", "dataset", "software", "other"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export const IPFS_GATEWAYS = [
  "https://coral-charming-marten-712.mypinata.cloud/ipfs/",
];

export const STACKS_EXPLORER =
  STACKS_NETWORK === "mainnet"
    ? "https://explorer.hiro.so"
    : "https://explorer.hiro.so/?chain=testnet";

export function ustxToStx(ustx: number): string {
  return (ustx / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
