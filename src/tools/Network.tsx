import { useEffect, useState } from "react";
import { NETWORKS, type NetKey } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { switchTo, useWallet, walletErrorMessage } from "../lib/wallet";
import { CopyButton, ExtLink, Notice, Odometer, ToolFrame } from "../components/ui";

function NetCard({ net }: { net: NetKey }) {
  const cfg = NETWORKS[net];
  const st = useChainStatus(net);
  const w = useWallet();
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const since = st.loaded ? Math.max(0, Math.floor(now / 1000 - st.blockTimestamp)) : null;
  const code = `await window.ethereum.request({\n  method: "wallet_addEthereumChain",\n  params: [{\n    chainId: "${cfg.chainIdHex}",\n    chainName: "${cfg.label}",\n    nativeCurrency: { name: "${cfg.symbol}", symbol: "${cfg.symbol}", decimals: 18 },\n    rpcUrls: ["${cfg.rpc}"],\n    blockExplorerUrls: ["${cfg.explorer}"],\n  }],\n});`;

  return (
    <ToolFrame slug="network" mode={net} status={!st.ok ? "err" : st.loaded ? "live" : "idle"} code={code}>
      <dl className="kv">
        <dt>network</dt>
        <dd>{cfg.label}</dd>
        <dt>chain id</dt>
        <dd>
          {cfg.chainId} <span className="muted">({cfg.chainIdHex})</span>
        </dd>
        <dt>currency</dt>
        <dd>{cfg.symbol}</dd>
        <dt>RPC</dt>
        <dd>
          {cfg.rpc} <CopyButton text={cfg.rpc} />
        </dd>
        <dt>explorer</dt>
        <dd>
          <ExtLink href={cfg.explorer}>{cfg.explorer.replace("https://", "")}</ExtLink>
        </dd>
        <dt>faucet</dt>
        <dd>{cfg.faucet ? <ExtLink href={cfg.faucet}>{cfg.faucet.replace("https://", "")}</ExtLink> : <span className="muted">none, this is mainnet</span>}</dd>
        <dt>block height</dt>
        <dd>{st.loaded ? <Odometer value={st.blockNumber} /> : st.ok ? "loading…" : "RPC not responding"}</dd>
        <dt>since last block</dt>
        <dd>{since === null ? "–" : `${since} s`}</dd>
      </dl>
      {err && <Notice kind="bad">{err}</Notice>}
      <div>
        <button
          type="button"
          className="btn btn-ink btn-sm"
          disabled={!w.hasProvider}
          onClick={async () => {
            setErr(null);
            try {
              await switchTo(net);
            } catch (e) {
              setErr(walletErrorMessage(e));
            }
          }}
        >
          {w.hasProvider ? (w.chainId === cfg.chainId ? "✓ in your wallet · switch" : "add to MetaMask") : "no wallet found"}
        </button>
      </div>
    </ToolFrame>
  );
}

export default function Network() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <NetCard net="testnet" />
      <NetCard net="mainnet" />
    </div>
  );
}
