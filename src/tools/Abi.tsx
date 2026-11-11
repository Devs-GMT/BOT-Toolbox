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
    sig: "",
    vals: "",
    data: "",
    types: "",
    cvals: "",
  });
  const mode = (MODES.find((m) => m.id === q.m)?.id ?? "encode") as Mode;

  const enc = attempt(() => (mode === "encode" && q.sig.trim() ? encodeCall(q.sig, q.vals) : null));
  const dec = attempt(() => (mode === "decode" && q.data.trim() && q.sig.trim() ? decodeCall(q.sig, q.data) : null));
  const args = attempt(() => (mode === "args" && (q.types.trim() || q.cvals.trim()) ? encodeArgs(q.types, q.cvals) : null));
  const err = (mode === "encode" && enc.error) || (mode === "decode" && q.data.trim() ? dec.error : null) || (mode === "args" && args.error) || null;

  // the code drawer shows a worked example until something is typed
  const sigC = q.sig || "transfer(address,uint256)";
  const valsC = q.vals || `["${DEAD}", "1000"]`;
  const typesC = q.types || "address,uint256";
  const cvalsC = q.cvals || `["${DEAD}", "1000"]`;
  const code =
    mode === "encode"
      ? `import { Interface } from "ethers";\n\nconst iface = new Interface(["function ${sigC}"]);\niface.encodeFunctionData("${sigC.split("(")[0].trim()}", ${valsC});`
      : mode === "decode"
        ? `import { Interface } from "ethers";\n\nconst iface = new Interface(["function ${sigC}"]);\niface.decodeFunctionData("${sigC.split("(")[0].trim()}", "${q.data || "0xa9059cbb…"}");`
        : `import { AbiCoder } from "ethers";\n\nAbiCoder.defaultAbiCoder().encode(\n  ${JSON.stringify(typesC.split(",").map((t) => t.trim()))},\n  ${cvalsC}\n); // paste without 0x if the explorer asks for raw hex`;

  return (
    <ToolFrame slug="abi" mode={mode} status={err ? "err" : enc.value || dec.value || args.value ? "ok" : "idle"} code={code}>
      <Seg label="abi mode" value={mode} options={MODES} onChange={(m) => set({ m })} />

      {mode !== "args" && (
        <Field id="a-sig" label="function signature" value={q.sig} placeholder="e.g. transfer(address,uint256)" onChange={(sig) => set({ sig })} />
      )}

      {mode === "encode" && (
        <>
          <Field
            id="a-vals"
            label="values (JSON array)"
            multiline
            value={q.vals}
            error={enc.error}
            placeholder={`e.g. ["${DEAD}", "1000"]`}
            hint="Put big numbers in quotes so they keep every digit."
            onChange={(vals) => set({ vals })}
          />
          <Result label="calldata" value={enc.value} highlight />
        </>
      )}

      {mode === "decode" && (
        <>
          <Field id="a-data" label="calldata" multiline rows={4} value={q.data} placeholder="e.g. 0xa9059cbb000000000000000000000000…" error={dec.error} onChange={(data) => set({ data })} />
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
          <Field id="a-types" label="constructor types" value={q.types} placeholder="e.g. address,uint256" onChange={(types) => set({ types })} />
          <Field id="a-cvals" label="values (JSON array)" multiline value={q.cvals} placeholder={`e.g. ["${DEAD}", "1000"]`} error={args.error} onChange={(cvals) => set({ cvals })} />
          <Result label="encoded arguments" value={args.value} highlight />
          <Result label="without 0x" value={args.value ? args.value.slice(2) : null} />
        </>
      )}
    </ToolFrame>
  );
}
