// Pure, offline logic for the tools. No network, no React.
import {
  AbiCoder,
  EventFragment,
  Fragment,
  FunctionFragment,
  Interface,
  formatUnits,
  getAddress,
  id,
  isAddress,
  isHexString,
  keccak256,
  parseUnits,
  toUtf8Bytes,
} from "ethers";

/** An error that is safe to show under a field. */
export class InputError extends Error {}
const fail = (m: string): never => {
  throw new InputError(m);
};

export const UINT256_MAX = (1n << 256n) - 1n;

// ---------- units ----------

export type UnitField = "wei" | "gwei" | "bot" | "token";

export function unitDecimals(field: UnitField, tokenDecimals: number): number {
  return field === "wei" ? 0 : field === "gwei" ? 9 : field === "bot" ? 18 : tokenDecimals;
}

export function checkDecimals(d: number): number {
  if (!Number.isInteger(d) || d < 0 || d > 77) fail("Decimals must be a whole number from 0 to 77.");
  return d;
}

/** Parse a decimal string in one field to the shared integer base. Empty input gives null. */
export function toBase(field: UnitField, value: string, tokenDecimals: number): bigint | null {
  const v = value.trim().replace(/,/g, "");
  if (v === "") return null;
  const d = unitDecimals(field, checkDecimals(tokenDecimals));
  if (!/^\d*\.?\d*$/.test(v) || v === ".") fail("Enter a positive number, digits and one dot only.");
  let out: bigint;
  try {
    out = parseUnits(v, d);
  } catch {
    return fail(d === 0 ? "Wei is a whole number. Remove the decimals." : `Too many decimals: this field allows ${d}.`);
  }
  if (out > UINT256_MAX) fail("Value is larger than uint256.");
  return out;
}

export function fromBase(base: bigint, field: UnitField, tokenDecimals: number): string {
  return formatUnits(base, unitDecimals(field, tokenDecimals));
}

export function allUnits(base: bigint | null, tokenDecimals: number): Record<UnitField, string> {
  if (base === null) return { wei: "", gwei: "", bot: "", token: "" };
  return {
    wei: fromBase(base, "wei", tokenDecimals),
    gwei: fromBase(base, "gwei", tokenDecimals),
    bot: fromBase(base, "bot", tokenDecimals),
    token: fromBase(base, "token", tokenDecimals),
  };
}

// ---------- hash ----------

export function keccakText(text: string): string {
  return id(text);
}

export function keccakHex(hex: string): string {
  const h = hex.trim();
  if (!isHexString(h)) return fail("Not valid hex. Use 0x followed by hex digits.");
  if (h.length % 2 !== 0) return fail("Hex has an odd number of digits.");
  return keccak256(h);
}

/** Remove spaces, parameter names and keywords: `transfer(address to, uint256 amount)` becomes `transfer(address,uint256)`. */
export function normaliseSignature(sig: string): string {
  const s = sig.trim();
  if (!s) return fail("Enter a signature, for example transfer(address,uint256).");
  try {
    return Fragment.from(s).format("sighash");
  } catch {
    try {
      return Fragment.from(`function ${s}`).format("sighash");
    } catch {
      return fail("Could not parse the signature. Use the form name(type,type).");
    }
  }
}

export function selectorOf(sig: string): string {
  const n = normaliseSignature(sig);
  return id(n).slice(0, 10);
}

export function topicOf(sig: string): string {
  const s = sig.trim();
  if (!s) return fail("Enter an event signature, for example Transfer(address,address,uint256).");
  try {
    return EventFragment.from(s).topicHash;
  } catch {
    return fail("Could not parse the event signature.");
  }
}

// ---------- abi ----------

function jsonSafe(v: unknown): unknown {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v && typeof v === "object" && "toArray" in (v as object)) return jsonSafe((v as { toArray(): unknown[] }).toArray());
  return v;
}

export function parseValues(text: string): unknown[] {
  const t = text.trim();
  if (!t) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return fail('Values must be a JSON array, for example ["0xAbc...", "1000"]. Put numbers in quotes.');
  }
  if (!Array.isArray(parsed)) return fail("Values must be a JSON array.");
  return parsed;
}

function fnFragment(sig: string): FunctionFragment {
  const s = sig.trim();
  if (!s) return fail("Enter a function signature, for example transfer(address,uint256).");
  try {
    return FunctionFragment.from(s.startsWith("function ") ? s : `function ${s}`);
  } catch {
    return fail("Could not parse the function signature.");
  }
}

export function encodeCall(sig: string, valuesText: string): string {
  const frag = fnFragment(sig);
  const values = parseValues(valuesText);
  if (values.length !== frag.inputs.length)
    fail(`Expected ${frag.inputs.length} value${frag.inputs.length === 1 ? "" : "s"}, got ${values.length}.`);
  try {
    return new Interface([frag]).encodeFunctionData(frag, values);
  } catch (e) {
    return fail(cleanAbiError(e));
  }
}

export function decodeCall(sig: string, data: string): { name: string; selector: string; args: unknown } {
  const frag = fnFragment(sig);
  const d = data.trim();
  if (!isHexString(d) || d.length % 2 !== 0) fail("Calldata must be even-length hex starting with 0x.");
  const iface = new Interface([frag]);
  try {
    const args = iface.decodeFunctionData(frag, d);
    return { name: frag.name, selector: frag.selector, args: jsonSafe(args) };
  } catch (e) {
    return fail(cleanAbiError(e, "These bytes do not match that signature. Check the selector and the types."));
  }
}

/** Encode raw arguments without a selector. This is what explorers ask for as "constructor arguments". */
export function encodeArgs(typesText: string, valuesText: string): string {
  const types = splitTypes(typesText);
  const values = parseValues(valuesText);
  if (values.length !== types.length) fail(`Expected ${types.length} value${types.length === 1 ? "" : "s"}, got ${values.length}.`);
  try {
    return AbiCoder.defaultAbiCoder().encode(types, values);
  } catch (e) {
    return fail(cleanAbiError(e));
  }
}

export function splitTypes(text: string): string[] {
  const t = text.trim().replace(/^\(|\)$/g, "");
  if (!t) return [];
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of t) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function cleanAbiError(e: unknown, fallback = "Those values do not fit the types."): string {
  const m = e instanceof Error ? e.message : "";
  const short = m.split(" (")[0];
  return short && short.length < 120 ? short : fallback;
}

// ---------- address ----------

export interface AddressInfo {
  valid: boolean;
  checksum?: string;
  lower?: string;
  /** True when the input has mixed case that does not match the checksum. */
  badChecksum?: boolean;
  reason?: string;
}

export function inspectAddress(input: string): AddressInfo {
  const s = input.trim();
  if (!s) return { valid: false };
  const withPrefix = /^[0-9a-fA-F]{40}$/.test(s) ? "0x" + s : s;
  if (!/^0x[0-9a-fA-F]{40}$/.test(withPrefix)) return { valid: false, reason: "An address is 0x followed by 40 hex digits." };
  const lower = withPrefix.toLowerCase();
  const checksum = getAddress(lower);
  const mixed = withPrefix.slice(2) !== withPrefix.slice(2).toLowerCase() && withPrefix.slice(2) !== withPrefix.slice(2).toUpperCase();
  return { valid: true, checksum, lower, badChecksum: mixed && isAddress(withPrefix) === false };
}

// ---------- time ----------

export type TimeUnit = "s" | "ms";

export function unixToMs(value: string, unit: TimeUnit): number {
  const v = value.trim();
  if (!/^-?\d+$/.test(v)) return fail("Enter a whole number.");
  const n = Number(v) * (unit === "s" ? 1000 : 1);
  if (!Number.isFinite(n) || Math.abs(n) > 8.64e15) return fail("That is outside the range of dates JavaScript supports.");
  return n;
}

export function relativeTime(ms: number, nowMs: number): string {
  const diff = ms - nowMs;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31557600000],
    ["month", 2629800000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  for (const [u, size] of steps) if (abs >= size || u === "second") return rtf.format(Math.round(diff / size), u);
  return "now";
}

export interface HeadBlock {
  number: number;
  timestamp: number; // seconds
}

export function blockToTime(block: number, head: HeadBlock, avgSeconds: number): number {
  return head.timestamp + (block - head.number) * avgSeconds; // unix seconds
}

export function timeToBlock(unixSeconds: number, head: HeadBlock, avgSeconds: number): number {
  return Math.round(head.number + (unixSeconds - head.timestamp) / avgSeconds);
}

// ---------- gas ----------

export function gasCost(gas: bigint, gasPriceWei: bigint): bigint {
  return gas * gasPriceWei;
}

// ---------- shared formatting ----------

export const short = (a: string, head = 6, tail = 4) => (a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);

export const utf8Length = (s: string) => toUtf8Bytes(s).length;

/** Group digits: 29953374 becomes 29,953,374. */
export const groupDigits = (n: number | bigint | string) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
