// Single source of truth for chains, endpoints and the Statements contract.

export type NetKey = "mainnet" | "testnet";

export interface NetConfig {
  key: NetKey;
  label: string;
  chainId: number;
  chainIdHex: string;
  rpc: string;
  explorer: string;
  faucet?: string;
  symbol: string;
  blockTimeSeconds: number; // documented value, the Time tool measures the real one
}

export const NETWORKS: Record<NetKey, NetConfig> = {
  mainnet: {
    key: "mainnet",
    label: "BOT Chain",
    chainId: 677,
    chainIdHex: "0x2a5",
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    symbol: "BOT",
    blockTimeSeconds: 0.75,
  },
  testnet: {
    key: "testnet",
    label: "BOT Chain Testnet",
    chainId: 968,
    chainIdHex: "0x3c8",
    rpc: "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    faucet: "https://faucet.botchain.ai/basic",
    symbol: "tBOT",
    blockTimeSeconds: 0.75,
  },
};

/** Statements contract per network. Empty string means "not deployed yet". */
export const STATEMENTS_ADDRESS: Record<NetKey, string> = {
  mainnet: "",
  testnet: "0x641c69B5641774A744F26f83B431c67638F912c3",
};

/**
 * Which network the app records and verifies statements on.
 * Flip to "mainnet" once the mainnet contract address above is filled in.
 */
export const APP_NET: NetKey = "testnet";

export const LINKS = {
  botchain: "https://botchain.ai",
  docs: "https://dev-docs.botchain.ai/docs/intro",
  github: "https://github.com/Devs-GMT/BOT-Toolbox",
  x: "", // set when the project account exists; hidden while empty
};

export const STATEMENTS_ABI = [
  "function record(bytes32 messageHash, bytes signature, string text) returns (uint256 id)",
  "function total() view returns (uint256)",
  "function getStatement(uint256 id) view returns (tuple(address signer, bytes32 messageHash, bytes signature, string text, uint64 at))",
  "function statementsFor(bytes32 messageHash) view returns (uint256[])",
  "function statementsBy(address signer) view returns (uint256[])",
  "event Recorded(uint256 indexed id, address indexed signer, bytes32 indexed messageHash)",
  "error TextTooLong(uint256 length)",
  "error TextHashMismatch(bytes32 expected, bytes32 given)",
  "error StatementNotFound(uint256 id)",
  "error ECDSAInvalidSignature()",
  "error ECDSAInvalidSignatureLength(uint256 length)",
  "error ECDSAInvalidSignatureS(bytes32 s)",
];

export const MAX_TEXT_BYTES = 280;

export const TOOLS = [
  { slug: "units", name: "Units", blurb: "wei, gwei, BOT and custom decimals", metric: "3 units" },
  { slug: "hash", name: "Hash", blurb: "keccak256, selectors, event topics", metric: "3 modes" },
  { slug: "abi", name: "ABI", blurb: "encode and decode calldata", metric: "encode / decode" },
  { slug: "address", name: "Address", blurb: "checksum, code size, balance", metric: "4 checks" },
  { slug: "time", name: "Time", blurb: "unix, dates, blocks", metric: "± timezones" },
  { slug: "gas", name: "Gas", blurb: "live gas price and cost", metric: "live" },
  { slug: "network", name: "Network", blurb: "both chains from one config", metric: "2 chains" },
  { slug: "sign", name: "Sign", blurb: "EIP-191 sign, verify, record", metric: "EIP-191" },
] as const;

export type ToolSlug = (typeof TOOLS)[number]["slug"];
