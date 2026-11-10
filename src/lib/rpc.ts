import { JsonRpcProvider, Network } from "ethers";
import { useSyncExternalStore } from "react";
import { NETWORKS, type NetKey } from "./config";

const providers: Partial<Record<NetKey, JsonRpcProvider>> = {};

export function getProvider(net: NetKey): JsonRpcProvider {
  let p = providers[net];
  if (!p) {
    const cfg = NETWORKS[net];
    // staticNetwork skips the chain-id probe, which the public RPCs sometimes reset.
    p = new JsonRpcProvider(cfg.rpc, cfg.chainId, { staticNetwork: Network.from(cfg.chainId), batchMaxCount: 1 });
    providers[net] = p;
  }
  return p;
}

/** The public RPCs reset connections now and then, so reads retry before they give up. */
export async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseDelay = 350): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, baseDelay * (i + 1)));
    }
  }
  throw last;
}

export interface ChainStatus {
  loaded: boolean;
  /** False only after two failed polls in a row, so one reset never shows an error. */
  ok: boolean;
  blockNumber: number;
  blockTimestamp: number;
  gasPrice: bigint;
  updatedAt: number;
}

const EMPTY: ChainStatus = { loaded: false, ok: true, blockNumber: 0, blockTimestamp: 0, gasPrice: 0n, updatedAt: 0 };

const state: Record<NetKey, ChainStatus> = { mainnet: EMPTY, testnet: EMPTY };
const failures: Record<NetKey, number> = { mainnet: 0, testnet: 0 };
const subs: Record<NetKey, Set<() => void>> = { mainnet: new Set(), testnet: new Set() };
let timer: ReturnType<typeof setInterval> | null = null;
const POLL_MS = 3000;

async function pollOne(net: NetKey) {
  try {
    const p = getProvider(net);
    const [block, gp] = await withRetry(() => Promise.all([p.getBlock("latest"), p.send("eth_gasPrice", [])]), 2, 250);
    if (!block) throw new Error("no block");
    failures[net] = 0;
    state[net] = {
      loaded: true,
      ok: true,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      gasPrice: BigInt(gp),
      updatedAt: Date.now(),
    };
  } catch {
    failures[net] += 1;
    state[net] = { ...state[net], ok: failures[net] < 2 };
  }
  subs[net].forEach((l) => l());
}

function tick() {
  if (typeof document !== "undefined" && document.hidden) return;
  (Object.keys(subs) as NetKey[]).forEach((n) => {
    if (subs[n].size > 0) void pollOne(n);
  });
}

function subscribe(net: NetKey) {
  return (listener: () => void) => {
    subs[net].add(listener);
    if (!timer) timer = setInterval(tick, POLL_MS);
    if (!state[net].loaded) void pollOne(net);
    return () => {
      subs[net].delete(listener);
      if (subs.mainnet.size + subs.testnet.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  };
}

/** One shared poller (every 3 seconds) feeds every component that reads the chain head or gas price. */
export function useChainStatus(net: NetKey): ChainStatus {
  return useSyncExternalStore(subscribe(net), () => state[net], () => EMPTY);
}

const blockTimeCache: Partial<Record<NetKey, { at: number; value: number }>> = {};

/** Average seconds per block, measured over the last `span` blocks. */
export async function measureBlockTime(net: NetKey, span = 100): Promise<number> {
  const hit = blockTimeCache[net];
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const p = getProvider(net);
  const head = await withRetry(() => p.getBlock("latest"));
  if (!head) throw new Error("no block");
  const old = await withRetry(() => p.getBlock(Math.max(0, head.number - span)));
  if (!old || head.number === old.number) throw new Error("no block");
  const value = (head.timestamp - old.timestamp) / (head.number - old.number);
  blockTimeCache[net] = { at: Date.now(), value };
  return value;
}
