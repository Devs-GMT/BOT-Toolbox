import { useEffect } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { APP_NET, NETWORKS, TOOLS } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { Icon, Mark } from "./icons";
import { openPalette } from "./CommandPalette";
import { Odometer } from "./ui";
import WalletButton from "./WalletButton";
import Abi from "../tools/Abi";
import Address from "../tools/Address";
import Gas from "../tools/Gas";
import Hash from "../tools/Hash";
import Network from "../tools/Network";
import Sign from "../tools/Sign";
import Time from "../tools/Time";
import Units from "../tools/Units";
import NotFound from "../pages/NotFound";

const COMPONENTS = { units: Units, hash: Hash, abi: Abi, address: Address, time: Time, gas: Gas, network: Network, sign: Sign };

export function AppLayout() {
  const st = useChainStatus(APP_NET);
  const net = NETWORKS[APP_NET];
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <div className="app">
      <aside className="side" aria-label="Tools">
        <Link to="/" className="brand" aria-label="BOT Toolbox home">
          <Mark />
          <span>bot/toolbox</span>
        </Link>
        {TOOLS.map((t, i) => (
          <NavLink key={t.slug} to={`/tools/${t.slug}`} className="nav" title={`${t.name} (alt ${i + 1})`}>
            <Icon name={t.slug} />
            <span>{t.name}</span>
            <span className="n">{i + 1}</span>
          </NavLink>
        ))}
        <div className="grow" />
        <Link to="/verify" className="nav" title="Verify a statement">
          <Icon name="check" />
          <span>Verify</span>
        </Link>
      </aside>
      <header className="top">
        <Link to="/" className="brand brand-m" aria-label="BOT Toolbox home">
          <Mark size={24} />
        </Link>
        <button className="cmdbar" onClick={openPalette} aria-label="Open command bar">
          <Icon name="search" size={16} />
          <span>Find a tool…</span>
          <span className="kbd">{isMac ? "⌘ K" : "ctrl k"}</span>
        </button>
        <span style={{ flex: 1 }} className="hide-m" />
        <span className="pill hide-m" title={`${net.label}, chain ${net.chainId}`}>
          <i className={`sq ${st.ok ? "ok" : "err"}`} />
          {net.label}
        </span>
        <span className="pill hide-m mono" title="Latest block">{st.loaded ? <Odometer value={st.blockNumber} /> : "…"}</span>
        <WalletButton />
      </header>
      <main className="main">
        <div className="main-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function ToolPage() {
  const { tool } = useParams();
  const meta = TOOLS.find((t) => t.slug === tool);
  useEffect(() => {
    document.title = meta ? `${meta.name} · BOT Toolbox` : "BOT Toolbox";
  }, [meta]);
  if (!meta) return <NotFound inApp />;
  const C = COMPONENTS[meta.slug];
  return (
    <>
      <div className="tool-title">
        <h1>{meta.name}</h1>
        <p>{meta.blurb}.</p>
      </div>
      <C />
    </>
  );
}
