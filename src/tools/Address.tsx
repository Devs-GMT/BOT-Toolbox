import { formatEther } from "ethers";
import { useEffect, useState } from "react";
import { NETWORKS, type NetKey } from "../lib/config";
import { getProvider, withRetry } from "../lib/rpc";
import { inspectAddress } from "../lib/tools";
import { ExtLink, Field, Notice, Result, ToolFrame, useQueryState } from "../components/ui";

interface Live {
  state: "loading" | "ok" | "down";
  size?: number;
  balance?: string;
}

function useLive(address: string | undefined): Record<NetKey, Live> {
  const [live, setLive] = useState<Record<NetKey, Live>>({ mainnet: { state: "loading" }, testnet: { state: "loading" } });
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLive({ mainnet: { state: "loading" }, testnet: { state: "loading" } });
    (["mainnet", "testnet"] as NetKey[]).forEach(async (net) => {
      try {
        const p = getProvider(net);
        const [code, bal] = await Promise.all([withRetry(() => p.getCode(address)), withRetry(() => p.getBalance(address))]);
        if (!cancelled) setLive((l) => ({ ...l, [net]: { state: "ok", size: (code.length - 2) / 2, balance: formatEther(bal) } }));
      } catch {
        if (!cancelled) setLive((l) => ({ ...l, [net]: { state: "down" } }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [address]);
  return live;
}

export default function Address() {
  const [q, set] = useQueryState({ a: "" });
  const info = inspectAddress(q.a);
  const live = useLive(info.valid ? info.checksum : undefined);
  const anyDown = info.valid && (live.mainnet.state === "down" || live.testnet.state === "down");

  const code = `import { getAddress, isAddress, JsonRpcProvider } from "ethers";\n\nisAddress("${q.a}");     // ${info.valid}\ngetAddress("${(info.lower ?? q.a).toLowerCase()}"); // checksummed\n\nconst p = new JsonRpcProvider("${NETWORKS.testnet.rpc}");\n(await p.getCode(address)).length > 2;  // is it a contract?\nawait p.getBalance(address);             // balance in wei`;

  return (
    <ToolFrame slug="address" mode="inspect" status={q.a && !info.valid ? "err" : info.valid ? "ok" : "idle"} code={code}>
      <Field
        id="ad-in"
        label="address"
        value={q.a}
        placeholder="e.g. 0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
        error={q.a && !info.valid ? info.reason : null}
        onChange={(a) => set({ a })}
      />
      {info.valid && info.badChecksum && (
        <Notice kind="warn">
          <b>The checksum is wrong.</b> The capital letters in what you pasted do not match. This usually means a typo or a copy error. The corrected address is below, check it against the source before you use it.
        </Notice>
      )}
      <Result label="checksum address" value={info.checksum} highlight />
      <Result label="lowercase" value={info.lower} />

      {info.valid && (
        <div className="res">
          <div className="lbl">on chain</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>network</th>
                <th>type</th>
                <th>balance</th>
                <th>explorer</th>
              </tr>
            </thead>
            <tbody>
              {(["mainnet", "testnet"] as NetKey[]).map((n) => {
                const l = live[n];
                const cfg = NETWORKS[n];
                return (
                  <tr key={n}>
                    <td>{cfg.label}</td>
                    <td>{l.state === "loading" ? "checking…" : l.state === "down" ? "RPC not responding" : l.size ? `contract · ${l.size} bytes` : "no code (wallet)"}</td>
                    <td>{l.state === "ok" ? `${Number(l.balance).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${cfg.symbol}` : "–"}</td>
                    <td>
                      <ExtLink href={`${cfg.explorer}/address/${info.checksum}`}>view</ExtLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {anyDown && <div className="hint">Live checks need the public RPC. The checksum above works offline.</div>}
        </div>
      )}
    </ToolFrame>
  );
}
