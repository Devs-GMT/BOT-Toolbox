import { decodeCall, encodeArgs, encodeCall } from "../lib/tools";
import { Field, Notice, Result, Seg, ToolFrame, attempt, useQueryState } from "../components/ui";

type Mode = "encode" | "decode" | "args";
const MODES: { id: Mode; label: string }[] = [
  { id: "encode", label: "encode call" },
  { id: "decode", label: "decode calldata" },
  { id: "args", label: "constructor args" },
];

const DEAD = "0x000000000000000000000000000000000000dEaD";

export default function Abi() {
  const [q, set] = useQueryState({
    m: "encode",
    sig: "transfer(address,uint256)",
    vals: `["${DEAD}", "1000"]`,
    data: "",
    types: "address,uint256",
    cvals: `["${DEAD}", "1000"]`,
  });
  const mode = (MODES.find((m) => m.id === q.m)?.id ?? "encode") as Mode;

  const enc = attempt(() => (mode === "encode" ? encodeCall(q.sig, q.vals) : null));
  const dec = attempt(() => (mode === "decode" && q.data.trim() ? decodeCall(q.sig, q.data) : null));
  const args = attempt(() => (mode === "args" ? encodeArgs(q.types, q.cvals) : null));
  const err = (mode === "encode" && enc.error) || (mode === "decode" && q.data.trim() ? dec.error : null) || (mode === "args" && args.error) || null;

  const code =
    mode === "encode"
      ? `import { Interface } from "ethers";\n\nconst iface = new Interface(["function ${q.sig}"]);\niface.encodeFunctionData("${q.sig.split("(")[0].trim()}", ${q.vals});`
      : mode === "decode"
        ? `import { Interface } from "ethers";\n\nconst iface = new Interface(["function ${q.sig}"]);\niface.decodeFunctionData("${q.sig.split("(")[0].trim()}", "${q.data}");`
        : `import { AbiCoder } from "ethers";\n\nAbiCoder.defaultAbiCoder().encode(\n  ${JSON.stringify(q.types.split(",").map((t) => t.trim()))},\n  ${q.cvals}\n); // paste without 0x if the explorer asks for raw hex`;

  return (
    <ToolFrame slug="abi" mode={mode} status={err ? "err" : "ok"} code={code}>
      <Seg label="abi mode" value={mode} options={MODES} onChange={(m) => set({ m })} />

      {mode !== "args" && (
        <Field id="a-sig" label="function signature" value={q.sig} placeholder="transfer(address,uint256)" onChange={(sig) => set({ sig })} />
      )}

      {mode === "encode" && (
        <>
          <Field
            id="a-vals"
            label="values (JSON array)"
            multiline
            value={q.vals}
            error={enc.error}
            hint="Put big numbers in quotes so they keep every digit."
            onChange={(vals) => set({ vals })}
          />
          <Result label="calldata" value={enc.value} highlight />
        </>
      )}

      {mode === "decode" && (
        <>
          <Field id="a-data" label="calldata" multiline rows={4} value={q.data} placeholder="0xa9059cbb…" error={dec.error} onChange={(data) => set({ data })} />
          {dec.value && (
            <div className="res">
              <div className="lbl">decoded · {dec.value.name} · selector {dec.value.selector}</div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>value</th>
                  </tr>
                </thead>
                <tbody>
                  {(dec.value.args as unknown[]).map((v, i) => (
                    <tr key={i}>
                      <td>{i}</td>
                      <td>{typeof v === "string" ? v : JSON.stringify(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Result label="as JSON" value={JSON.stringify(dec.value.args)} />
            </div>
          )}
        </>
      )}

      {mode === "args" && (
        <>
          <Notice>Explorers ask for constructor arguments as ABI-encoded hex with no selector. List the constructor types, then the values.</Notice>
          <Field id="a-types" label="constructor types" value={q.types} placeholder="address,uint256" onChange={(types) => set({ types })} />
          <Field id="a-cvals" label="values (JSON array)" multiline value={q.cvals} error={args.error} onChange={(cvals) => set({ cvals })} />
          <Result label="encoded arguments" value={args.value} highlight />
          <Result label="without 0x" value={args.value ? args.value.slice(2) : null} />
        </>
      )}
    </ToolFrame>
  );
}
