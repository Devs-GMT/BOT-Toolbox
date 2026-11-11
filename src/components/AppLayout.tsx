import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { APP_NET, NETWORKS, TOOLS } from "../lib/config";
import { useChainStatus } from "../lib/rpc";
import { Icon, Mark } from "./icons";
import { openPalette } from "./CommandPalette";
import PageHead from "./PageHead";
import Sidebar from "./Sidebar";
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
      <Sidebar />
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
        <div className="bgfield" aria-hidden="true" />
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
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.title = meta ? `${meta.name} · BOT Toolbox` : "BOT Toolbox";
  }, [meta]);
  // the header and cards rise in one after another whenever the tool changes
  useLayoutEffect(() => {
    if (!meta || !box.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const kids = [...box.current.querySelectorAll<HTMLElement>(".ph > *, .tcard")];
    const tw = gsap.fromTo(kids, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, clearProps: "opacity,transform" });
    return () => void tw.kill();
  }, [meta]);
  if (!meta) return <NotFound inApp />;
  const C = COMPONENTS[meta.slug];
  return (
    <div ref={box} key={meta.slug} className="tp">
      <PageHead slug={meta.slug} />
      <C />
    </div>
  );
}
