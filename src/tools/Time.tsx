import { useEffect, useState } from "react";
import { APP_NET, NETWORKS, type NetKey } from "../lib/config";
import { measureBlockTime, useChainStatus } from "../lib/rpc";
import { blockToTime, groupDigits, relativeTime, timeToBlock, unixToMs, type TimeUnit } from "../lib/tools";
import { Field, Notice, Result, Seg, ToolFrame, attempt, useQueryState } from "../components/ui";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmtLocal = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "medium", timeZone: tz }).format(new Date(ms)) + ` (${tz})`;

export default function Time() {
  const [q, set] = useQueryState({ ts: "", u: "s", d: "", n: APP_NET as string, b: "" });
  const unit = (q.u === "ms" ? "ms" : "s") as TimeUnit;
  const net = (q.n === "mainnet" ? "mainnet" : "testnet") as NetKey;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fromUnix = attempt(() => (q.ts.trim() ? unixToMs(q.ts, unit) : null));
  const ms = fromUnix.value;

  const dateParsed = attempt(() => {
    if (!q.d.trim()) return null;
    const t = Date.parse(q.d.trim().replace(" ", "T"));
    if (Number.isNaN(t)) throw new Error("Not a date. Try 2026-11-10T22:20:00Z or 2026-11-10 22:20.");
    return t;
  });

  // block <-> time, using the live head and a measured average block time
  const head = useChainStatus(net);
  const [avg, setAvg] = useState<{ v: number; measured: boolean }>({ v: NETWORKS[net].blockTimeSeconds, measured: false });
  useEffect(() => {
    let cancelled = false;
    setAvg({ v: NETWORKS[net].blockTimeSeconds, measured: false });
    measureBlockTime(net)
      .then((v) => !cancelled && setAvg({ v, measured: true }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [net]);
  const headBlock = head.loaded ? { number: head.blockNumber, timestamp: head.blockTimestamp } : null;

  const blk = attempt(() => {
    if (!q.b.trim()) return null;
    if (!/^\d+$/.test(q.b.trim())) throw new Error("A block number is a whole number.");
    if (!headBlock) return null;
    return blockToTime(Number(q.b), headBlock, avg.v);
  });
  const blockFromTime = ms !== null && headBlock ? timeToBlock(ms / 1000, headBlock, avg.v) : null;

  const code = `const ms = ${ms ?? "Date.now()"};\nnew Date(ms).toISOString();                      // UTC\nnew Date(ms).toLocaleString("en-GB", { timeZone: "${tz}" });\nMath.floor(ms / 1000);                          // unix seconds\n\n// block <-> time: head.timestamp + (block - head.number) * avgSeconds\nconst head = await provider.getBlock("latest");`;

  return (
    <ToolFrame slug="time" mode="convert" status={fromUnix.error || dateParsed.error ? "err" : "ok"} code={code}>
      <div className="row2" style={{ alignItems: "end" }}>
        <Field id="t-ts" label="unix timestamp" value={q.ts} inputMode="numeric" placeholder={String(Math.floor(now / 1000))} error={fromUnix.error} onChange={(ts) => set({ ts })} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Seg label="unit" value={unit} options={[{ id: "s", label: "seconds" }, { id: "ms", label: "ms" }]} onChange={(u) => set({ u })} />
          <button type="button" className="btn btn-line btn-sm" onClick={() => set({ ts: String(unit === "s" ? Math.floor(Date.now() / 1000) : Date.now()) })}>
            now
          </button>
        </div>
      </div>
      <Result label={`local time · ${tz}`} value={ms === null ? null : safe(() => fmtLocal(ms))} highlight />
      <Result label="UTC (ISO 8601)" value={ms === null ? null : safe(() => new Date(ms).toISOString())} />
      <Result label="relative" value={ms === null ? null : relativeTime(ms, now)} />

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />

      <Field
        id="t-date"
        label="date to unix"
        value={q.d}
        placeholder="2026-11-10T22:20:00Z"
        hint="Without a Z or offset the date is read in your timezone."
        error={dateParsed.error}
        onChange={(d) => set({ d })}
      />
      <div className="row2">
        <Result label="unix seconds" value={dateParsed.value === null ? null : String(Math.floor(dateParsed.value / 1000))} highlight />
        <Result label="unix milliseconds" value={dateParsed.value === null ? null : String(dateParsed.value)} />
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />

      <div className="lbl">block ↔ time</div>
      <Seg label="network" value={net} options={[{ id: "testnet", label: "testnet" }, { id: "mainnet", label: "mainnet" }]} onChange={(n) => set({ n })} />
      {!head.ok && <Notice kind="warn">RPC not responding. Block conversions need the live chain head. Everything above still works.</Notice>}
      <dl className="kv">
        <dt>latest block</dt>
        <dd>{head.loaded ? `#${groupDigits(head.blockNumber)}` : head.ok ? "loading…" : "RPC not responding"}</dd>
        <dt>avg block time</dt>
        <dd>
          {avg.v.toFixed(2)} s {avg.measured ? "(measured over the last 100 blocks)" : "(documented value, measuring…)"}
        </dd>
      </dl>
      <div className="row2">
        <Field id="t-blk" label="block number" value={q.b} inputMode="numeric" placeholder={head.loaded ? String(head.blockNumber) : "…"} error={blk.error} onChange={(b) => set({ b })} />
        <Result label="approx. time of that block" value={blk.value === null ? null : safe(() => `${new Date(blk.value! * 1000).toISOString()} (${relativeTime(blk.value! * 1000, now)})`)} />
      </div>
      <Result label="approx. block at the timestamp above" value={blockFromTime === null ? null : `#${groupDigits(blockFromTime)}`} empty="Enter a unix timestamp above" />
    </ToolFrame>
  );
}

function safe(fn: () => string): string | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
