import { BrowserProvider, type Signer } from "ethers";
import { useSyncExternalStore } from "react";
import { NETWORKS, type NetKey } from "./config";

interface Eip1193 {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, fn: (...a: unknown[]) => void): void;
  removeListener?(event: string, fn: (...a: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export interface WalletState {
  hasProvider: boolean;
  account: string | null;
  chainId: number | null;
  busy: boolean;
}

const DISCONNECT_KEY = "bt.disconnected";
const store = (k: string, v?: string | null) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage can be blocked, the wallet still works for this tab */
  }
  return null;
};

let state: WalletState = {
  hasProvider: typeof window !== "undefined" && !!window.ethereum,
  account: null,
  chainId: null,
  busy: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<WalletState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let wired = false;
function wire() {
  if (wired || typeof window === "undefined" || !window.ethereum) return;
  wired = true;
  const eth = window.ethereum;
  eth.on?.("accountsChanged", (a) => {
    const list = a as string[];
    set({ account: list[0] ?? null });
    if (list[0]) store(DISCONNECT_KEY, null);
  });
  eth.on?.("chainChanged", (c) => set({ chainId: parseInt(c as string, 16) }));
  void (async () => {
    try {
      const c = (await eth.request({ method: "eth_chainId" })) as string;
      set({ chainId: parseInt(c, 16) });
      if (store(DISCONNECT_KEY) !== "1") {
        const a = (await eth.request({ method: "eth_accounts" })) as string[];
        set({ account: a[0] ?? null });
      }
    } catch {
      /* ignore, the user can still press Connect */
    }
  })();
}

function subscribe(l: () => void) {
  wire();
  listeners.add(l);
  return () => listeners.delete(l);
}

export const walletErrorMessage = (e: unknown): string => {
  const err = e as { code?: number | string; message?: string; info?: { error?: { code?: number } } };
  const code = err?.code ?? err?.info?.error?.code;
  if (code === 4001 || code === "ACTION_REJECTED") return "You rejected the request in your wallet.";
  if (code === -32002) return "Your wallet already has a pending request. Open it to continue.";
  return err?.message?.split("(")[0]?.trim() || "The wallet returned an error.";
};

export async function connect() {
  if (!window.ethereum) return;
  set({ busy: true });
  try {
    const a = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    store(DISCONNECT_KEY, null);
    const c = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    set({ account: a[0] ?? null, chainId: parseInt(c, 16) });
  } finally {
    set({ busy: false });
  }
}

/** MetaMask cannot revoke access from a page, so this only forgets the account in this app. */
export function disconnect() {
  store(DISCONNECT_KEY, "1");
  set({ account: null });
}

/** Ask the wallet to show its account picker. */
export async function changeWallet() {
  if (!window.ethereum) return;
  await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
  const a = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  store(DISCONNECT_KEY, null);
  set({ account: a[0] ?? null });
}

/** Switch to the chain, adding it first when the wallet does not know it. */
export async function switchTo(net: NetKey) {
  if (!window.ethereum) return;
  const cfg = NETWORKS[net];
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainIdHex }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902 || (e as { code?: number }).code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: cfg.chainIdHex,
            chainName: cfg.label,
            nativeCurrency: { name: cfg.symbol, symbol: cfg.symbol, decimals: 18 },
            rpcUrls: [cfg.rpc],
            blockExplorerUrls: [cfg.explorer],
          },
        ],
      });
    } else throw e;
  }
}

export async function getSigner(): Promise<Signer> {
  if (!window.ethereum) throw new Error("No wallet found.");
  return new BrowserProvider(window.ethereum).getSigner();
}

export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
