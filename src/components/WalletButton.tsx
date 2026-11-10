import { useEffect, useRef, useState } from "react";
import { APP_NET, NETWORKS } from "../lib/config";
import { short } from "../lib/tools";
import { changeWallet, connect, disconnect, switchTo, useWallet, walletErrorMessage } from "../lib/wallet";
import { copyText } from "./ui";

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const net = NETWORKS[APP_NET];

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(walletErrorMessage(e));
    }
  };

  if (!w.hasProvider) {
    return (
      <a className="btn btn-line btn-sm" href="https://metamask.io/download" target="_blank" rel="noopener noreferrer" title="Every tool except signing works without a wallet">
        {compact ? "get MetaMask" : "install MetaMask"}
      </a>
    );
  }
  if (!w.account) {
    return (
      <button className="btn btn-line btn-sm" disabled={w.busy} onClick={() => run(connect)} title={err ?? undefined}>
        {w.busy ? "connecting…" : "connect wallet"}
      </button>
    );
  }
  const wrong = w.chainId !== net.chainId;
  return (
    <div className="menu-wrap" ref={ref} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {wrong && (
        <button className="btn btn-accent btn-sm" onClick={() => run(() => switchTo(APP_NET))} title={err ?? undefined}>
          switch to {net.label}
        </button>
      )}
      <button className="pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i className={`sq ${wrong ? "warn" : "ok"}`} />
        {short(w.account, 6, 4)}
      </button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { void copyText(w.account!); setOpen(false); }}>copy address</button>
          <button role="menuitem" onClick={() => { setOpen(false); void run(changeWallet); }}>change wallet</button>
          <button role="menuitem" onClick={() => { setOpen(false); void run(() => switchTo(APP_NET)); }}>switch to {net.label}</button>
          <div className="sep" />
          <button role="menuitem" onClick={() => { disconnect(); setOpen(false); }}>disconnect</button>
        </div>
      )}
    </div>
  );
}
