import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { APP_NET, LINKS, NETWORKS, TOOLS } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { getTotal, isDeployed, statementsAddress } from "../lib/statements";
import { short } from "../lib/tools";
import { Mark } from "./icons";
import { CopyButton, Odometer } from "./ui";
import WalletButton from "./WalletButton";

/** Two floating glass tiles, as on the reference. They switch to a dark glass over any element marked data-dark. */
export function SiteNav() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // One scroll check drives both the nav tiles (probe at the top) and the page colour (probe lower down,
    // per element via data-dark-at), so the whole page fades between paper and dark like the reference.
    const check = () => {
      const vh = window.innerHeight;
      const els = [...document.querySelectorAll<HTMLElement>("[data-dark]")];
      // data-nav-dark: dark only behind the nav tiles, the page itself stays light (verify, guides, legal footer)
      const navEls = [...els, ...document.querySelectorAll<HTMLElement>("[data-nav-dark]")];
      const page = els.some((el) => {
        const t = parseFloat(el.dataset.darkAt ?? "0.62");
        const r = el.getBoundingClientRect();
        return r.top <= vh * t && r.bottom >= vh * t;
      });
      const behindNav = navEls.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= 40 && r.bottom >= 40;
      });
      setDark(page || behindNav);
      document.body.classList.toggle("dark", page);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      document.body.classList.remove("dark");
    };
  }, []);
  return (
    <header className={`topnav${dark ? " on-dark" : ""}`}>
      <Link to="/" className="tile brandtile" aria-label="BOT Toolbox home">
        <Mark size={24} />
        bot/toolbox
      </Link>
      <nav className="tile links" aria-label="Main">
        <Link to="/tools/units" className="hide-s">Tools</Link>
        <Link to="/verify" className="hide-s">Statements</Link>
        <Link to="/docs" className="hide-s">Docs</Link>
        <span className="vr" />
        <span className="wallet-s"><WalletButton compact /></span>
        <Link to="/tools" className="btn btn-ink" style={{ marginLeft: 6 }}>Open the toolbox</Link>
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

/** Dark footer with dashed column rules; the right column is the live BOT Chain system check. */
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
    <footer aria-label="Site footer">
      <div className="foot">
        <div>
          <h3>Tools</h3>
          {TOOLS.map((t) => <Link className="fl" key={t.slug} to={`/tools/${t.slug}`}>{t.name}</Link>)}
        </div>
        <div>
          <h3>Resources</h3>
          <Link className="fl" to="/docs">Docs</Link>
          <Link className="fl" to="/guides/function-selector">Guides</Link>
          <a className="fl" href={LINKS.docs} target="_blank" rel="noopener noreferrer">BOT Chain docs</a>
          <a className="fl" href={NETWORKS.testnet.faucet} target="_blank" rel="noopener noreferrer">Faucet</a>
        </div>
        <div>
          <h3>Project</h3>
          {LINKS.x && <a className="fl" href={LINKS.x} target="_blank" rel="noopener noreferrer">X</a>}
          <Link className="fl" to="/privacy">Privacy</Link>
          <Link className="fl" to="/terms">Terms</Link>
        </div>
        <div className="fcheck">
          <div className="fpills">
            <span className={`fpill solid${allOk ? "" : " warn"}`} role="status"><i />{allOk ? "All tools normal" : `RPC ${down} not responding`}</span>
            <span className="fpill line">Built for BOT Chain builders</span>
          </div>
          <div className="syscheck" aria-live="polite">
            <Line ok={main.loaded ? main.ok : null}>RPC 677 {rpcLine(main)}</Line>
            <Line ok={test.loaded ? test.ok : null}>RPC 968 {rpcLine(test)}</Line>
            <Line ok={app.loaded ? app.ok : null}>Latest block {app.loaded ? <Odometer value={app.blockNumber} /> : "…"}</Line>
            <Line ok={app.loaded ? app.ok : null}>Gas {app.loaded ? `${(Number(app.gasPrice) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} gwei` : "…"}</Line>
          </div>
          <div className="fchain">
            <a href={LINKS.botchain} target="_blank" rel="noopener noreferrer" aria-label="BOT Chain, opens botchain.ai" className="bclogo">
              <img src="/brand/botchain-white.svg" alt="BOT Chain" height={20} />
            </a>
            {isDeployed ? (
              <>
                <span className="foot-addr">Statements · {short(statementsAddress, 6, 4)} <CopyButton text={statementsAddress} /></span>
                <a className="btn btn-accent btn-sm" href={`${net.explorer}/address/${statementsAddress}`} target="_blank" rel="noopener noreferrer">View on explorer ↗</a>
                <span className="foot-count" title={`Statements recorded on ${net.label}`}>
                  STATEMENTS {typeof total === "number" ? total.toLocaleString("en-US") : total === "down" ? "–" : "…"}
                </span>
              </>
            ) : (
              <span className="foot-addr">Statements contract not deployed yet</span>
            )}
          </div>
          {APP_NET === "testnet" && isDeployed && <p className="fnote">Showing the {net.label} contract. Mainnet goes live after the mainnet deploy.</p>}
        </div>
      </div>
      <div className="fbottom">
        <span>© 2026 BOT Toolbox · runs in your browser · never paste your private key anywhere</span>
        <Mark size={22} />
      </div>
    </footer>
  );
}

/** Light pages (verify, guides, legal) with the floating nav and the dark footer. */
export function SiteShell() {
  return (
    <>
      <SiteNav />
      <main style={{ minHeight: "60vh" }}>
        <Outlet />
      </main>
      <div className="tail solid" data-nav-dark>
        <Footer />
      </div>
    </>
  );
}
