import "dotenv/config";
import { generateWallet } from "@stacks/wallet-sdk";

const NETWORK_API_URLS: Record<string, string> = {
  mainnet: "https://api.mainnet.hiro.so",
  testnet: "https://api.testnet.hiro.so",
  devnet: "http://localhost:3999",
};

export type Config = {
  network: string;
  stacksApiUrl: string;
  acnPrivateKey: string;
  contractDeployer: string;
  keyEncryptionSecret: string;
  x402FacilitatorUrl: string;
  ipfsProvider: "pinata" | "local";
  pinataJwt: string;
  port: number;
};

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function envOptional(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

let cachedConfig: Config | null = null;

export function setConfig(cfg: Config): void {
  cachedConfig = cfg;
}

export function getConfigSync(): Config {
  if (!cachedConfig) {
    throw new Error("Config not loaded. Ensure getConfig() is awaited before importing app.");
  }
  return cachedConfig;
}

export async function getConfig(): Promise<Config> {
  const network = env("STACKS_NETWORK", "testnet");
  const mnemonic = envOptional("ACN_MNEMONIC");
  if (!mnemonic) {
    throw new Error("Missing ACN_MNEMONIC. Set it to the 12- or 24-word BIP39 phrase (same mnemonic used to deploy contracts).");
  }

  const password = envOptional("ACN_MNEMONIC_PASSPHRASE") ?? "C3h16o6foto1!";
  const wallet = await generateWallet({
    secretKey: mnemonic.trim().replace(/\s+/g, " "),
    password,
  });
  const stxKey = wallet.accounts[0]?.stxPrivateKey;
  if (!stxKey) {
    throw new Error("Failed to derive Stacks private key from ACN_MNEMONIC.");
  }
  const acnPrivateKey = stxKey;

  const cfg: Config = {
    network,
    stacksApiUrl: env("STACKS_API_URL", NETWORK_API_URLS[network] ?? NETWORK_API_URLS.testnet),
    acnPrivateKey,
    contractDeployer: env("CONTRACT_DEPLOYER"),
    keyEncryptionSecret: env("KEY_ENCRYPTION_SECRET"),
    x402FacilitatorUrl: env("X402_FACILITATOR_URL", ""),
    ipfsProvider: env("IPFS_PROVIDER", "local") as "pinata" | "local",
    pinataJwt: process.env.PINATA_JWT ?? "",
    port: Number(env("PORT", "3100")),
  };
  return cfg;
}
