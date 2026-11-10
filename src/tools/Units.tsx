import { allUnits, checkDecimals, toBase, type UnitField } from "../lib/tools";
import { Field, ToolFrame, attempt, useQueryState } from "../components/ui";

const trim0 = (s: string) => s.replace(/\.0$/, "");

const FIELDS: { id: UnitField; label: string; hint: string }[] = [
  { id: "wei", label: "wei", hint: "whole number" },
  { id: "gwei", label: "gwei", hint: "10^9 wei" },
  { id: "bot", label: "BOT", hint: "10^18 wei" },
  { id: "token", label: "token", hint: "custom decimals" },
];

export default function Units() {
  const [q, set] = useQueryState({ f: "bot", v: "1", d: "6" });
  const active = (FIELDS.find((f) => f.id === q.f)?.id ?? "bot") as UnitField;

  const dec = attempt(() => checkDecimals(Number(q.d === "" ? NaN : q.d)));
  const safeDec = dec.value ?? 18;
  const parsed = attempt(() => toBase(active, q.v, safeDec));
  const base = parsed.value;
  const all = allUnits(base, safeDec);

  const shown = (f: UnitField) => (f === active ? q.v : base === null ? "" : trim0(all[f]));
  const code = [
    `import { parseUnits, formatUnits } from "ethers";`,
    ``,
    `const base = ${active === "wei" ? `BigInt("${q.v || "0"}")` : `parseUnits("${q.v || "0"}", ${active === "gwei" ? '"gwei"' : active === "bot" ? 18 : safeDec})`};`,
    `formatUnits(base, 0);       // wei    "${base === null ? "" : all.wei}"`,
    `formatUnits(base, "gwei");  // gwei   "${base === null ? "" : all.gwei}"`,
    `formatUnits(base, 18);      // BOT    "${base === null ? "" : all.bot}"`,
    `formatUnits(base, ${safeDec});       // token  "${base === null ? "" : all.token}"`,
  ].join("\n");

  return (
    <ToolFrame slug="units" mode="convert" status={parsed.error || dec.error ? "err" : base === null ? "idle" : "ok"} code={code}>
      <p className="hint">Type in any field. The others update. The token field uses the decimals you set below, for example 6 for most stablecoins.</p>
      <div className="row2">
        {FIELDS.map((f) => (
          <Field
            key={f.id}
            id={`u-${f.id}`}
            label={`${f.label} · ${f.hint}`}
            value={shown(f.id)}
            inputMode="decimal"
            placeholder="0"
            error={f.id === active ? parsed.error : null}
            onChange={(v) => set({ f: f.id, v })}
          />
        ))}
      </div>
      <div style={{ maxWidth: 220 }}>
        <Field id="u-dec" label="token decimals" value={q.d} inputMode="numeric" error={dec.error} onChange={(d) => set({ d })} />
      </div>
    </ToolFrame>
  );
}
