import { formatUnits } from "ethers";
import { APP_NET, NETWORKS, type NetKey } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { gasCost } from "../lib/tools";
import { Field, Notice, Result, Seg, ToolFrame, attempt, useQueryState } from "../components/ui";

const PRESETS = [
  { label: "simple transfer", gas: "21000" },
  { label: "token transfer", gas: "50000" },
  { label: "contract deploy", gas: "1000000" },
];

const trim = (s: string) => s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

export default function Gas() {
  const [q, set] = useQueryState({ g: "", n: APP_NET as string });
  const net = (q.n === "testnet" ? "testnet" : "mainnet") as NetKey;
  const cfg = NETWORKS[net];
  const st = useChainStatus(net);

  const gas = attempt(() => {
    const v = q.g.trim().replace(/,/g, "");
    if (!v) return null;
    if (!/^\d+$/.test(v)) throw new Error("Gas units are a whole number.");
    return BigInt(v);
  });
  const cost = gas.value !== null && st.loaded ? gasCost(gas.value, st.gasPrice) : null;

  const code = `import { JsonRpcProvider, formatEther } from "ethers";\n\nconst p = new JsonRpcProvider("${cfg.rpc}");\nconst { gasPrice } = await p.getFeeData();\nformatEther(${q.g || "21000"}n * gasPrice!); // cost in ${cfg.symbol}`;

  return (
    <ToolFrame slug="gas" mode="price" status={!st.ok ? "err" : st.loaded ? "live" : "idle"} code={code}>
      <Seg label="network" value={net} options={[{ id: "mainnet", label: "mainnet" }, { id: "testnet", label: "testnet" }]} onChange={(n) => set({ n })} />
      {!st.ok && <Notice kind="warn">RPC not responding. Trying again every few seconds. The cost below uses the last price we saw, if any.</Notice>}
      <Result label={`gas price · refreshes every 3 s`} value={st.loaded ? `${trim(formatUnits(st.gasPrice, "gwei"))} gwei` : null} highlight empty={st.ok ? "loading…" : "RPC not responding"} />
      <Field id="g-gas" label="gas units" value={q.g} inputMode="numeric" placeholder="e.g. 21000" error={gas.error} onChange={(g) => set({ g })} />
      <div>
        <div className="lbl" style={{ marginBottom: 8 }}>rough examples, real usage varies</div>
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => set({ g: p.gas })}>
              {p.label} · ~{Number(p.gas).toLocaleString("en-US")}
            </button>
          ))}
        </div>
      </div>
      <div className="row2">
        <Result label={`cost in ${cfg.symbol}`} value={cost === null ? null : trim(formatUnits(cost, 18))} highlight />
        <Result label="cost in gwei" value={cost === null ? null : trim(formatUnits(cost, "gwei"))} />
      </div>
    </ToolFrame>
  );
}
