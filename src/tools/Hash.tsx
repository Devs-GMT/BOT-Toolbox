import { EventFragment } from "ethers";
import { keccakHex, keccakText, normaliseSignature, selectorOf, topicOf } from "../lib/tools";
import { Field, Result, Seg, ToolFrame, attempt, useQueryState } from "../components/ui";

type Mode = "selector" | "topic" | "normalise" | "text" | "hex";
const MODES: { id: Mode; label: string }[] = [
  { id: "selector", label: "selector" },
  { id: "topic", label: "event topic" },
  { id: "normalise", label: "normalise" },
  { id: "text", label: "keccak text" },
  { id: "hex", label: "keccak hex" },
];

export default function Hash() {
  const [q, set] = useQueryState({ m: "selector", sig: "transfer(address,uint256)", text: "", hex: "" });
  const mode = (MODES.find((m) => m.id === q.m)?.id ?? "selector") as Mode;

  const sel = attempt(() => (mode === "selector" && q.sig.trim() ? { sel: selectorOf(q.sig), norm: normaliseSignature(q.sig) } : null));
  const top = attempt(() =>
    mode === "topic" && q.sig.trim() ? { topic: topicOf(q.sig), norm: EventFragment.from(q.sig.trim()).format("sighash") } : null
  );
  const nor = attempt(() => (mode === "normalise" && q.sig.trim() ? normaliseSignature(q.sig) : null));
  const txt = mode === "text" ? keccakText(q.text) : null;
  const hex = attempt(() => (mode === "hex" && q.hex.trim() ? keccakHex(q.hex) : null));

  const err = (mode === "selector" && sel.error) || (mode === "topic" && top.error) || (mode === "normalise" && nor.error) || (mode === "hex" && hex.error) || null;
  const sigPlaceholder = mode === "topic" ? "Transfer(address,address,uint256)" : "transfer(address,uint256)";

  const code =
    mode === "selector"
      ? `import { id } from "ethers";\n\nid("${normaliseOr(q.sig)}").slice(0, 10); // "${sel.value?.sel ?? ""}"`
      : mode === "topic"
        ? `import { EventFragment } from "ethers";\n\nEventFragment.from("${q.sig}").topicHash; // "${top.value?.topic ?? ""}"`
        : mode === "normalise"
          ? `import { Fragment } from "ethers";\n\nFragment.from("${q.sig}").format("sighash"); // "${nor.value ?? ""}"`
          : mode === "text"
            ? `import { id } from "ethers";\n\nid(${JSON.stringify(q.text)}); // "${txt ?? ""}"`
            : `import { keccak256 } from "ethers";\n\nkeccak256("${q.hex}"); // "${hex.value ?? ""}"`;

  const hasInput = mode === "text" ? true : mode === "hex" ? q.hex.trim() !== "" : q.sig.trim() !== "";

  return (
    <ToolFrame slug="hash" mode={mode} status={err ? "err" : hasInput ? "ok" : "idle"} code={code}>
      <Seg label="hash mode" value={mode} options={MODES} onChange={(m) => set({ m })} />

      {(mode === "selector" || mode === "topic" || mode === "normalise") && (
        <Field
          id="h-sig"
          label={mode === "topic" ? "event signature" : "function signature"}
          value={q.sig}
          placeholder={sigPlaceholder}
          error={err}
          hint="Spaces and parameter names are fine, they are removed."
          onChange={(sig) => set({ sig })}
        />
      )}
      {mode === "text" && <Field id="h-text" label="text" multiline value={q.text} placeholder="hello" onChange={(text) => set({ text })} />}
      {mode === "hex" && <Field id="h-hex" label="hex bytes" multiline value={q.hex} placeholder="0x68656c6c6f" error={err} onChange={(hex) => set({ hex })} />}

      {mode === "selector" && (
        <>
          <Result label="selector (first 4 bytes)" value={sel.value?.sel} highlight />
          <Result label="normalised signature" value={sel.value?.norm} />
        </>
      )}
      {mode === "topic" && (
        <>
          <Result label="topic0" value={top.value?.topic} highlight />
          <Result label="normalised signature" value={top.value?.norm} />
        </>
      )}
      {mode === "normalise" && <Result label="normalised" value={nor.value} highlight />}
      {mode === "text" && <Result label="keccak256" value={txt} highlight />}
      {mode === "hex" && <Result label="keccak256" value={hex.value} highlight />}
    </ToolFrame>
  );
}

function normaliseOr(sig: string) {
  try {
    return normaliseSignature(sig);
  } catch {
    return sig;
  }
}
