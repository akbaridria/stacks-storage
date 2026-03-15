import "dotenv/config";

const NETWORK_API_URLS: Record<string, string> = {
  mainnet: "https://stacks-node-api.mainnet.stacks.co",
  testnet: "https://stacks-node-api.testnet.stacks.co",
  devnet: "http://localhost:3999",
};

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${key}`);
  return v;
}

const network = env("STACKS_NETWORK", "testnet");

export const config = {
  network,
  stacksApiUrl: env("STACKS_API_URL", NETWORK_API_URLS[network] ?? NETWORK_API_URLS.testnet),
  acnPrivateKey: env("ACN_PRIVATE_KEY"),
  contractDeployer: env("CONTRACT_DEPLOYER"),
  keyEncryptionSecret: env("KEY_ENCRYPTION_SECRET"),
  x402FacilitatorUrl: env("X402_FACILITATOR_URL", ""),
  ipfsProvider: env("IPFS_PROVIDER", "local") as "pinata" | "local",
  pinataJwt: process.env.PINATA_JWT ?? "",
  port: Number(env("PORT", "3100")),
} as const;
