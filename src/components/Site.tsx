import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { APP_NET, LINKS, NETWORKS, TOOLS } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { getTotal, isDeployed, statementsAddress } from "../lib/statements";
import { short } from "../lib/tools";
import { Mark } from "./icons";
import { CopyButton, Odometer } from "./ui";
import WalletButton from "./WalletButton";

export function SiteNav() {
  return (
    <header className="snav">
      <Link to="/" className="brand" aria-label="BOT Toolbox home">
        <Mark />
        bot/toolbox
      </Link>
      <nav className="snav-links" aria-label="Main">
        <Link to="/tools/units">tools</Link>
        <Link to="/verify">statements</Link>
        <a href={LINKS.github} target="_blank" rel="noopener noreferrer">docs</a>
        <span className="snav-wallet"><WalletButton compact /></span>
        <Link to="/tools" className="btn btn-ink btn-sm">open toolbox →</Link>
      </nav>
    </header>
  );
}

export function useStatementsTotal(): number | null | "down" {
  const [n, setN] = useState<number | null | "down">(null);
  useEffect(() => {
    if (!isDeployed) return;
    let stop = false;
    const load = () =>
      getTotal()
        .then((v) => !stop && setN(v))
        .catch(() => !stop && setN((p) => (typeof p === "number" ? p : "down")));
    load();
    const t = setInterval(load, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);
  return n;
}

function Line({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <div className="sc-line">
      <i className={`sq ${ok === null ? "idle" : ok ? "ok" : "warn"}`} />
      {children}
    </div>
  );
}

export function Footer() {
  const main = useChainStatus("mainnet");
  const test = useChainStatus("testnet");
  const app = useChainStatus(APP_NET);
  const total = useStatementsTotal();
  const net = NETWORKS[APP_NET];
  const allOk = main.ok && test.ok;
  const down = [!main.ok && "677", !test.ok && "968"].filter(Boolean).join(" and ");
  const rpcLine = (s: typeof main) => (s.loaded ? (s.ok ? "✓ OK" : "not responding") : s.ok ? "checking…" : "not responding");

  return (
    <footer className="foot" aria-label="Site footer">
      <div className="foot-top">
        <div className="foot-brand">
          <Link to="/" className="brand"><Mark />bot/toolbox</Link>
          <p>Built for BOT Chain builders.</p>
        </div>
        <div className="foot-check">
          <h2 className="mono" style={{ color: allOk ? "var(--ink)" : "var(--warn)" }}>{allOk ? "All tools normal" : `RPC ${down} not responding`}</h2>
          <div className="syscheck" role="status" aria-live="polite">
            <Line ok={main.loaded ? main.ok : null}>RPC 677 {rpcLine(main)}</Line>
            <Line ok={test.loaded ? test.ok : null}>RPC 968 {rpcLine(test)}</Line>
            <Line ok={app.loaded ? app.ok : null}>Latest block {app.loaded ? <Odometer value={app.blockNumber} /> : "…"}</Line>
            <Line ok={app.loaded ? app.ok : null}>Gas {app.loaded ? `${(Number(app.gasPrice) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} gwei` : "…"}</Line>
          </div>
          <div className="foot-chain">
            <a href={LINKS.botchain} target="_blank" rel="noopener noreferrer" aria-label="BOT Chain, opens botchain.ai" className="bclogo">
              <img src="/brand/botchain-white.svg" alt="BOT Chain" height={22} />
            </a>
            {isDeployed ? (
              <>
                <span className="mono foot-addr">
                  Statements · {short(statementsAddress, 6, 4)} <CopyButton text={statementsAddress} />
                </span>
                <a className="btn btn-accent btn-sm" href={`${net.explorer}/address/${statementsAddress}`} target="_blank" rel="noopener noreferrer">
                  View on explorer ↗
                </a>
                <span className="mono foot-count" title={`Statements recorded on ${net.label}`}>
                  STATEMENTS {typeof total === "number" ? total.toLocaleString("en-US") : total === "down" ? "–" : "…"}
                </span>
              </>
            ) : (
              <span className="mono foot-addr muted">Statements contract not deployed yet</span>
            )}
          </div>
          {APP_NET === "testnet" && isDeployed && <div className="hint" style={{ marginTop: 8 }}>Showing the {net.label} contract. Mainnet goes live after the mainnet deploy.</div>}
        </div>
      </div>
      <div className="foot-cols">
        <div>
          <h3>Tools</h3>
          {TOOLS.map((t) => <Link key={t.slug} to={`/tools/${t.slug}`}>{t.name}</Link>)}
        </div>
        <div>
          <h3>Resources</h3>
          <a href={LINKS.github} target="_blank" rel="noopener noreferrer">Docs</a>
          <Link to="/guides/function-selector">Guides</Link>
          <a href={LINKS.docs} target="_blank" rel="noopener noreferrer">BOT Chain docs</a>
          <a href={NETWORKS.testnet.faucet} target="_blank" rel="noopener noreferrer">Faucet</a>
        </div>
        <div>
          <h3>Project</h3>
          <a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          {LINKS.x && <a href={LINKS.x} target="_blank" rel="noopener noreferrer">X</a>}
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
      <p className="foot-bottom mono">© 2026 BOT Toolbox · runs in your browser · never paste your private key anywhere</p>
    </footer>
  );
}

export function SiteShell() {
  return (
    <>
      <SiteNav />
      <main style={{ minHeight: "60vh" }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
