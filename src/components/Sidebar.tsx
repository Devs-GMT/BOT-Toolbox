import { Link, NavLink } from "react-router-dom";
import { APP_NET, LINKS, NETWORKS, TOOLS } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { Icon, Mark } from "./icons";
import { Odometer } from "./ui";

/** The app sidebar. `demo` renders the same markup as inert anchors for the landing-page window. */
export default function Sidebar({ demo = false, active = null }: { demo?: boolean; active?: number | "verify" | null }) {
  const st = useChainStatus(APP_NET);
  const net = NETWORKS[APP_NET];

  const inner = (icon: Parameters<typeof Icon>[0]["name"], label: string, n?: string) => (
    <>
      <span className="ni"><Icon name={icon} size={16} /></span>
      <span className="nl">{label}</span>
      {n && <span className="n">{n}</span>}
    </>
  );

  return (
    <aside className="side" aria-label="Tools">
      {demo ? (
        <a className="brand"><Mark /><span>bot/toolbox</span></a>
      ) : (
        <Link to="/" className="brand" aria-label="BOT Toolbox home"><Mark /><span>bot/toolbox</span></Link>
      )}

      <div className="side-label">Tools</div>
      {TOOLS.map((t, i) =>
        demo ? (
          <a key={t.slug} className="nav" tabIndex={-1} aria-current={active === i ? "page" : undefined}>{inner(t.slug, t.name, String(i + 1))}</a>
        ) : (
          <NavLink key={t.slug} to={`/tools/${t.slug}`} className="nav" title={`${t.name} (alt ${i + 1})`}>{inner(t.slug, t.name, String(i + 1))}</NavLink>
        )
      )}

      <div className="side-label">Statements</div>
      {demo ? (
        <a className="nav" tabIndex={-1} aria-current={active === "verify" ? "page" : undefined}>{inner("check", "Verify")}</a>
      ) : (
        <Link to="/verify" className="nav">{inner("check", "Verify")}</Link>
      )}
      {(
        <>
          <a className="nav" tabIndex={demo ? -1 : undefined} href={LINKS.docs} target="_blank" rel="noopener noreferrer">{inner("ext", "BOT Chain docs")}</a>
          {net.faucet && <a className="nav" tabIndex={demo ? -1 : undefined} href={net.faucet} target="_blank" rel="noopener noreferrer">{inner("gas", "Faucet")}</a>}
        </>
      )}

      <div className="grow" />

      <div className="sstat" aria-live="polite">
        <div className="sstat-hd"><i className={`sq ${st.ok ? "ok" : "warn"}`} />{st.ok ? "All tools normal" : "RPC not responding"}</div>
        <dl>
          <dt>network</dt><dd>{net.label}</dd>
          <dt>block</dt><dd>{st.loaded ? <Odometer value={st.blockNumber} /> : "…"}</dd>
          <dt>gas</dt><dd>{st.loaded ? `${(Number(st.gasPrice) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} gwei` : "…"}</dd>
        </dl>
      </div>
      {demo ? <span className="side-back">← Back to the site</span> : <Link to="/" className="side-back">← Back to the site</Link>}
    </aside>
  );
}
