import { Contract, Interface, getBytes, hashMessage, id, verifyMessage, type Signer } from "ethers";
import { APP_NET, MAX_TEXT_BYTES, STATEMENTS_ABI, STATEMENTS_ADDRESS } from "./config";
import { getProvider, withRetry } from "./rpc";
import { utf8Length } from "./tools";

export const statementsAddress = STATEMENTS_ADDRESS[APP_NET];
export const isDeployed = statementsAddress !== "";
const iface = new Interface(STATEMENTS_ABI);

export interface StatementView {
  id: number;
  signer: string;
  messageHash: string;
  signature: string;
  text: string;
  at: number; // unix seconds
}

function reader(): Contract {
  if (!isDeployed) throw new Error("The Statements contract is not deployed on this network yet.");
  return new Contract(statementsAddress, STATEMENTS_ABI, getProvider(APP_NET));
}

export async function getTotal(): Promise<number> {
  return Number(await withRetry(() => reader().total()));
}

/** Returns null when the id does not exist. Fields are read by index because ethers' Result has its own `at` method. */
export async function getStatement(idNum: number): Promise<StatementView | null> {
  const c = reader();
  try {
    const s = await withRetry(() => c.getStatement(idNum), 3, 350);
    return { id: idNum, signer: s[0], messageHash: s[1], signature: s[2], text: s[3], at: Number(s[4]) };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

function isNotFound(e: unknown): boolean {
  const data = (e as { data?: string })?.data;
  if (data) {
    try {
      return iface.parseError(data)?.name === "StatementNotFound";
    } catch {
      /* fall through */
    }
  }
  return /StatementNotFound/.test((e as Error)?.message ?? "");
}

export async function idsForHash(messageHash: string): Promise<number[]> {
  const r = (await withRetry(() => reader().statementsFor(messageHash))) as bigint[];
  return r.map(Number);
}

export async function idsBySigner(signer: string): Promise<number[]> {
  const r = (await withRetry(() => reader().statementsBy(signer))) as bigint[];
  return r.map(Number);
}

// ---------- signing helpers (offline) ----------

export type SignMode = "text" | "hash";

export interface Draft {
  mode: SignMode;
  messageHash: string;
  /** What the wallet will be asked to sign: the readable text, or the 32 raw bytes of the hash. */
  toSign: string | Uint8Array;
  /** Text stored on chain. Empty in hash-only mode. */
  publicText: string;
}

export function makeDraft(message: string, mode: SignMode): Draft {
  const messageHash = id(message);
  if (mode === "text") return { mode, messageHash, toSign: message, publicText: message };
  return { mode, messageHash, toSign: getBytes(messageHash), publicText: "" };
}

export function draftProblem(message: string, mode: SignMode): string | null {
  if (!message) return "Write a message first.";
  if (mode === "text" && utf8Length(message) > MAX_TEXT_BYTES)
    return `Public text is limited to ${MAX_TEXT_BYTES} bytes (this is ${utf8Length(message)}). Shorten it or use hash-only mode.`;
  return null;
}

/** Recover the signer of an EIP-191 personal_sign signature over a string or raw bytes. */
export function recover(message: string | Uint8Array, signature: string): string {
  return verifyMessage(message, signature);
}

export const digestOf = (message: string | Uint8Array) => hashMessage(message);

// ---------- recording ----------

export function describeContractError(e: unknown): string {
  const err = e as { data?: string; code?: string | number; shortMessage?: string; info?: { error?: { data?: string } } };
  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) return "You rejected the transaction in your wallet.";
  const data = err?.data ?? err?.info?.error?.data;
  if (data) {
    try {
      const parsed = iface.parseError(data);
      if (parsed?.name === "TextTooLong") return `The text is too long (${parsed.args[0]} bytes, the limit is ${MAX_TEXT_BYTES}).`;
      if (parsed?.name === "TextHashMismatch") return "The text does not match the message hash, so nothing was sent.";
      if (parsed?.name?.startsWith("ECDSA")) return "The contract could not read that signature.";
    } catch {
      /* unknown error, use the generic text below */
    }
  }
  if (/insufficient funds/i.test(err?.shortMessage ?? "")) return APP_NET === "testnet" ? "Not enough tBOT for gas. Use the faucet." : "Not enough BOT for gas. Add a little BOT to your wallet and try again.";
  return err?.shortMessage || "The transaction failed. Try again.";
}

export async function recordStatement(
  signer: Signer,
  draft: Draft,
  signature: string
): Promise<{ txHash: string; id: number | null }> {
  if (!isDeployed) throw new Error("The Statements contract is not deployed on this network yet.");
  // Blocked before sending: the contract would revert on this too.
  if (draft.publicText && id(draft.publicText) !== draft.messageHash) throw new Error("The text does not match the message hash.");
  const c = new Contract(statementsAddress, STATEMENTS_ABI, signer);
  const tx = await c.record(draft.messageHash, signature, draft.publicText);
  const receipt = await tx.wait();
  let newId: number | null = null;
  for (const log of receipt?.logs ?? []) {
    try {
      const p = iface.parseLog(log);
      if (p?.name === "Recorded") newId = Number(p.args[0]);
    } catch {
      /* not our event */
    }
  }
  return { txHash: tx.hash as string, id: newId };
}
