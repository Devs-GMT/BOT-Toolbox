import { gsap } from "gsap";
import { EventFragment, Wallet, formatEther, getAddress } from "ethers";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "../components/icons";
import { Odometer } from "../components/ui";
import PageHead from "../components/PageHead";
import Sidebar from "../components/Sidebar";
import { APP_NET, NETWORKS, TOOLS, type NetKey, type ToolSlug } from "../lib/config";
import { flash, q, typeTo } from "../lib/motion";
import { getProvider, useChainStatus, withRetry } from "../lib/rpc";
import { getStatement, isDeployed, statementsAddress, type StatementView } from "../lib/statements";
import { allUnits, decodeCall, encodeCall, groupDigits, selectorOf, short, toBase, type UnitField } from "../lib/tools";

/**
 * The hero window plays a looping tour of the real toolbox: it hops between tools through the command
 * palette, fills in each tool with the same markup and classes as the real app, and ends on a real
 * statement read from the chain. Every value is computed by the same code the app uses.
 */

const SIG = "transfer(address,uint256)";
const EVT = "Transfer(address,address,uint256)";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const trim0 = (s: string) => s.replace(/\.0$/, "");
const gwei = (wei: bigint) => (Number(wei) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 });

interface SceneDef { id: string; label: string; nav: number | null; palette: string; palLabel: string; url: string }
const SCENES: SceneDef[] = [
  { id: "hash", label: "Hash", nav: 1, palette: "hash", palLabel: "Hash", url: `/tools/hash?sig=${SIG}` },
  { id: "units", label: "Units", nav: 0, palette: "units", palLabel: "Units", url: "/tools/units" },
  { id: "abi", label: "ABI", nav: 2, palette: "abi", palLabel: "ABI", url: "/tools/abi" },
  { id: "address", label: "Address", nav: 3, palette: "address", palLabel: "Address", url: "/tools/address" },
  { id: "gas", label: "Gas", nav: 5, palette: "gas", palLabel: "Gas", url: "/tools/gas" },
  { id: "sign", label: "Sign", nav: 7, palette: "sign", palLabel: "Sign", url: "/tools/sign" },
  { id: "verify", label: "Verify", nav: null, palette: "verify", palLabel: "Verify a statement", url: "/verify/0" },
];
const PAL_ICON: Record<string, ToolSlug | "check"> = { hash: "hash", units: "units", abi: "abi", address: "address", gas: "gas", sign: "sign", verify: "check" };

interface SceneProps {
  reduced: boolean;
  setUrl: (u: string) => void;
  onProgress: (p: number) => void;
  onDone: () => void;
  register: (tl: gsap.core.Timeline) => void;
}

/** Build a paused timeline for one scene; reduced motion jumps straight to the final state. */
function useScene(p: SceneProps, build: (tl: gsap.core.Timeline) => void, final: () => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    if (p.reduced) {
      final();
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "ref" } });
    build(tl);
    tl.to({}, { duration: 1.6 }); // hold on the finished state
    tl.eventCallback("onUpdate", () => p.onProgress(tl.progress()));
    tl.eventCallback("onComplete", p.onDone);
    p.register(tl);
    return () => void tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** New scene content eases in. It also clears the fade-out that was applied to the previous content. */
function Enter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const main = ref.current?.closest(".main");
    if (main) gsap.set(main, { clearProps: "opacity,transform" });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tw = gsap.fromTo(ref.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.65, ease: "ref" });
    return () => void tw.kill();
  }, []);
  return <div ref={ref}>{children}</div>;
}

function Frame({ slug, mode, children, extra }: { slug: ToolSlug; mode: string; children: ReactNode; extra?: ReactNode }) {
  const idx = TOOLS.findIndex((x) => x.slug === slug) + 1;
  return (
    <Enter>
      <div className="main-in">
        <PageHead slug={slug} demo />
        <section className="tcard">
          <div className="tcard-hd"><span className="name"><span className="ic"><Icon name={slug} size={14} /></span>{String(idx).padStart(2, "0")} {slug}.{mode}</span><span className="st"><i className="sq ok" />ready</span></div>
          <div className="tcard-bd">{children}</div>
          {extra}
        </section>
      </div>
    </Enter>
  );
}

const Fld = ({ label, children, r }: { label: string; children: ReactNode; r?: React.Ref<HTMLDivElement> }) => (
  <div className="field"><label>{label}</label><div className="input" ref={r}>{children}</div></div>
);

// ---------------------------------------------------------------- Hash
function SceneHash(p: SceneProps) {
  const sig = useRef<HTMLSpanElement>(null);
  const lab = useRef<HTMLDivElement>(null);
  const val = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const s1 = useRef<HTMLButtonElement>(null);
  const s2 = useRef<HTMLButtonElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const topic = EventFragment.from(EVT).topicHash;
  const sel = selectorOf(SIG);
  const seg = (a: boolean) => {
    q(s1).setAttribute("aria-pressed", String(a));
    q(s2).setAttribute("aria-pressed", String(!a));
  };
  useScene(
    p,
    (tl) => {
      seg(true);
      q(sig).textContent = "";
      q(val).textContent = "";
      q(lab).textContent = "selector (first 4 bytes)";
      gsap.set(q(pre), { opacity: 0, display: "none" });
      p.setUrl(`/tools/hash?sig=${SIG}`);
      typeTo(tl, q(sig), SIG, 0.5, 1.2);
      tl.call(() => void (q(val).textContent = sel), [], 1.8);
      flash(tl, q(fl), 1.8);
      tl.call(() => { seg(false); q(sig).textContent = ""; q(val).textContent = ""; q(lab).textContent = "topic0"; p.setUrl(`/tools/hash?m=topic&sig=${EVT}`); }, [], 3.4);
      typeTo(tl, q(sig), EVT, 3.6, 1.5);
      tl.call(() => void (q(val).textContent = topic), [], 5.3);
      flash(tl, q(fl), 5.3);
      tl.call(() => void (q(pre).style.display = "block"), [], 6.5).to(q(pre), { opacity: 1, duration: 0.5 }, 6.5);
    },
    () => { q(sig).textContent = SIG; q(lab).textContent = "selector (first 4 bytes)"; q(val).textContent = sel; }
  );
  return (
    <Frame slug="hash" mode="selector" extra={<div className="drawer"><button type="button" tabIndex={-1}><span>copy as code · ethers.js</span><span>hide</span></button><pre ref={pre}><code>{`import { EventFragment } from "ethers";\n\nEventFragment.from("${EVT}").topicHash;`}</code></pre></div>}>
      <div className="seg"><button type="button" ref={s1} aria-pressed="true" tabIndex={-1}>selector</button><button type="button" ref={s2} aria-pressed="false" tabIndex={-1}>event topic</button><button type="button" aria-pressed="false" tabIndex={-1}>normalise</button><button type="button" aria-pressed="false" tabIndex={-1}>keccak text</button></div>
      <Fld label="function signature"><span ref={sig} /><i className="bcaret" /></Fld>
      <div className="res"><div className="lbl" ref={lab} /><div className="res-box hl"><span className="val" ref={val} /><span className="fl" ref={fl} /><span className="copy">copy</span></div></div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Units
function SceneUnits(p: SceneProps) {
  const refs = { wei: useRef<HTMLSpanElement>(null), gwei: useRef<HTMLSpanElement>(null), bot: useRef<HTMLSpanElement>(null), token: useRef<HTMLSpanElement>(null) };
  const boxes = { wei: useRef<HTMLDivElement>(null), gwei: useRef<HTMLDivElement>(null), bot: useRef<HTMLDivElement>(null), token: useRef<HTMLDivElement>(null) };
  const FIELDS: UnitField[] = ["wei", "gwei", "bot", "token"];
  const apply = (active: UnitField, v: string) => {
    const all = allUnits(toBase(active, v, 6), 6);
    FIELDS.forEach((f) => {
      q(refs[f]).textContent = f === active ? v : trim0(all[f]);
      boxes[f].current?.classList.toggle("on", f === active);
    });
    p.setUrl(`/tools/units?f=${active}&v=${v}`);
  };
  const steps: [UnitField, string][] = [["bot", "1"], ["bot", "1.5"], ["gwei", "2"], ["gwei", "20"], ["token", "2.5"], ["token", "250"]];
  useScene(
    p,
    (tl) => {
      FIELDS.forEach((f) => { q(refs[f]).textContent = ""; boxes[f].current?.classList.remove("on"); });
      steps.forEach(([f, v], i) => tl.call(() => apply(f, v), [], 0.5 + i * 0.95));
    },
    () => apply("bot", "1.5")
  );
  const lbl: Record<UnitField, string> = { wei: "wei · whole number", gwei: "gwei · 10^9 wei", bot: "BOT · 10^18 wei", token: "token · custom decimals" };
  return (
    <Frame slug="units" mode="convert">
      <div className="hint">Type in any field. The others update. The token field uses the decimals you set below.</div>
      <div className="row2">
        {FIELDS.map((f) => <Fld key={f} label={lbl[f]} r={boxes[f]}><span ref={refs[f]} /></Fld>)}
      </div>
      <div style={{ maxWidth: 220 }}><Fld label="token decimals"><span>6</span></Fld></div>
    </Frame>
  );
}

// ---------------------------------------------------------------- ABI
function SceneAbi(p: SceneProps) {
  const sig = useRef<HTMLSpanElement>(null);
  const vals = useRef<HTMLSpanElement>(null);
  const val = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const enc = useRef<HTMLDivElement>(null);
  const dec = useRef<HTMLDivElement>(null);
  const bEnc = useRef<HTMLButtonElement>(null);
  const bDec = useRef<HTMLButtonElement>(null);
  const valsText = `["${DEAD}", "1000"]`;
  const calldata = useMemo(() => encodeCall(SIG, valsText), [valsText]);
  const decoded = useMemo(() => decodeCall(SIG, calldata).args as string[], [calldata]);
  const seg = (e: boolean) => { q(bEnc).setAttribute("aria-pressed", String(e)); q(bDec).setAttribute("aria-pressed", String(!e)); };
  useScene(
    p,
    (tl) => {
      seg(true);
      q(sig).textContent = ""; q(vals).textContent = ""; q(val).textContent = "";
      gsap.set(q(enc), { display: "grid", opacity: 1 });
      gsap.set(q(dec), { display: "none", opacity: 0 });
      p.setUrl("/tools/abi");
      typeTo(tl, q(sig), SIG, 0.4, 1.0);
      typeTo(tl, q(vals), valsText, 1.6, 1.5);
      tl.call(() => { q(val).textContent = calldata; p.setUrl(`/tools/abi?sig=${SIG}`); }, [], 3.3);
      flash(tl, q(fl), 3.3);
      tl.call(() => seg(false), [], 5.2)
        .to(q(enc), { opacity: 0, duration: 0.25 }, 5.2)
        .set(q(enc), { display: "none" }, 5.45)
        .set(q(dec), { display: "grid" }, 5.45)
        .to(q(dec), { opacity: 1, duration: 0.5 }, 5.45);
      tl.call(() => p.setUrl("/tools/abi?m=decode"), [], 5.3);
    },
    () => { q(sig).textContent = SIG; q(vals).textContent = valsText; q(val).textContent = calldata; }
  );
  return (
    <Frame slug="abi" mode="encode">
      <div className="seg"><button type="button" ref={bEnc} aria-pressed="true" tabIndex={-1}>encode call</button><button type="button" ref={bDec} aria-pressed="false" tabIndex={-1}>decode calldata</button><button type="button" aria-pressed="false" tabIndex={-1}>constructor args</button></div>
      <Fld label="function signature"><span ref={sig} /></Fld>
      <div ref={enc} style={{ display: "grid", gap: 18 }}>
        <Fld label="values (JSON array)"><span ref={vals} /></Fld>
        <div className="res"><div className="lbl">calldata</div><div className="res-box hl"><span className="val" ref={val} style={{ fontSize: 13 }} /><span className="fl" ref={fl} /><span className="copy">copy</span></div></div>
      </div>
      <div ref={dec} style={{ display: "none", gap: 10 }}>
        <div className="lbl">decoded · transfer · selector {selectorOf(SIG)}</div>
        <table className="tbl"><thead><tr><th>#</th><th>value</th></tr></thead><tbody><tr><td>0</td><td>{decoded[0]}</td></tr><tr><td>1</td><td>{decoded[1]}</td></tr></tbody></table>
        <div className="note good" style={{ fontSize: 13 }}>✓ Decoded in your browser. Nothing was sent anywhere.</div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Address
function useAddrLive(address: string) {
  const [live, setLive] = useState<Record<NetKey, { s: "loading" | "ok" | "down"; size?: number; bal?: string }>>({ mainnet: { s: "loading" }, testnet: { s: "loading" } });
  useEffect(() => {
    let stop = false;
    (["mainnet", "testnet"] as NetKey[]).forEach(async (n) => {
      try {
        const pr = getProvider(n);
        const [code, bal] = await Promise.all([withRetry(() => pr.getCode(address)), withRetry(() => pr.getBalance(address))]);
        if (!stop) setLive((l) => ({ ...l, [n]: { s: "ok", size: (code.length - 2) / 2, bal: formatEther(bal) } }));
      } catch {
        if (!stop) setLive((l) => ({ ...l, [n]: { s: "down" } }));
      }
    });
    return () => { stop = true; };
  }, [address]);
  return live;
}

function SceneAddress(p: SceneProps) {
  const target = isDeployed ? statementsAddress : DEAD;
  const checksum = getAddress(target);
  const inp = useRef<HTMLSpanElement>(null);
  const val = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const low = useRef<HTMLSpanElement>(null);
  const rest = useRef<HTMLDivElement>(null);
  const live = useAddrLive(checksum);
  useScene(
    p,
    (tl) => {
      q(inp).textContent = ""; q(val).textContent = ""; q(low).textContent = "";
      gsap.set(q(rest), { opacity: 0, y: 8 });
      p.setUrl("/tools/address");
      typeTo(tl, q(inp), checksum.toLowerCase(), 0.4, 1.4);
      tl.call(() => { q(val).textContent = checksum; q(low).textContent = checksum.toLowerCase(); p.setUrl(`/tools/address?a=${short(checksum.toLowerCase(), 10, 4)}`); }, [], 2.1);
      flash(tl, q(fl), 2.1);
      tl.to(q(rest), { opacity: 1, y: 0, duration: 0.6 }, 2.8);
    },
    () => { q(inp).textContent = checksum.toLowerCase(); q(val).textContent = checksum; q(low).textContent = checksum.toLowerCase(); }
  );
  const row = (n: NetKey) => {
    const l = live[n]; const c = NETWORKS[n];
    return (
      <tr key={n}>
        <td>{c.label}</td>
        <td>{l.s === "loading" ? "checking…" : l.s === "down" ? "RPC not responding" : l.size ? `contract · ${groupDigits(l.size)} bytes` : "no code (wallet)"}</td>
        <td>{l.s === "ok" ? `${Number(l.bal).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c.symbol}` : "–"}</td>
      </tr>
    );
  };
  return (
    <Frame slug="address" mode="inspect">
      <Fld label="address"><span ref={inp} style={{ fontSize: 13 }} /><i className="bcaret" /></Fld>
      <div className="res"><div className="lbl">checksum address</div><div className="res-box hl"><span className="val" ref={val} style={{ fontSize: 13.5 }} /><span className="fl" ref={fl} /><span className="copy">copy</span></div></div>
      <div className="res"><div className="lbl">lowercase</div><div className="res-box"><span className="val" ref={low} style={{ fontSize: 13.5 }} /><span className="copy">copy</span></div></div>
      <div className="res" ref={rest}><div className="lbl">on chain</div><table className="tbl"><thead><tr><th>network</th><th>type</th><th>balance</th></tr></thead><tbody>{row("mainnet")}{row("testnet")}</tbody></table></div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Gas
function SceneGas(p: SceneProps) {
  const st = useChainStatus(APP_NET);
  const stRef = useRef(st);
  stRef.current = st;
  const gasEl = useRef<HTMLSpanElement>(null);
  const price = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const cost = useRef<HTMLSpanElement>(null);
  const fl2 = useRef<HTMLSpanElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const costText = (g: number) => (stRef.current.loaded ? `${trim0(formatEther(BigInt(g) * stRef.current.gasPrice))} ${NETWORKS[APP_NET].symbol}` : "RPC not responding");
  useScene(
    p,
    (tl) => {
      q(gasEl).textContent = ""; q(cost).textContent = "";
      gsap.set(q(chips), { opacity: 0 });
      p.setUrl("/tools/gas");
      tl.call(() => void (q(price).textContent = stRef.current.loaded ? `${gwei(stRef.current.gasPrice)} gwei` : "RPC not responding"), [], 0.4);
      flash(tl, q(fl), 0.4);
      typeTo(tl, q(gasEl), "21000", 1.2, 0.8);
      tl.to(q(chips), { opacity: 1, duration: 0.5 }, 1.8);
      tl.call(() => { q(cost).textContent = costText(21000); p.setUrl("/tools/gas?g=21000"); }, [], 2.2);
      flash(tl, q(fl2), 2.2);
      tl.call(() => { q(gasEl).textContent = "1000000"; q(cost).textContent = costText(1000000); p.setUrl("/tools/gas?g=1000000"); }, [], 4.2);
      flash(tl, q(fl2), 4.2);
    },
    () => { q(gasEl).textContent = "21000"; q(price).textContent = st.loaded ? `${gwei(st.gasPrice)} gwei` : "…"; q(cost).textContent = costText(21000); },
    []
  );
  return (
    <Frame slug="gas" mode="price">
      <div className="seg"><button type="button" aria-pressed="true" tabIndex={-1}>testnet</button><button type="button" aria-pressed="false" tabIndex={-1}>mainnet</button></div>
      <div className="res"><div className="lbl">gas price · refreshes every 3 s</div><div className="res-box hl"><span className="val" ref={price} /><span className="fl" ref={fl} /><span className="copy">copy</span></div></div>
      <Fld label="gas units"><span ref={gasEl} /><i className="bcaret" /></Fld>
      <div ref={chips}><div className="lbl" style={{ marginBottom: 8 }}>rough examples, real usage varies</div><div className="chips"><span className="chip">simple transfer · ~21,000</span><span className="chip">token transfer · ~50,000</span><span className="chip">contract deploy · ~1,000,000</span></div></div>
      <div className="res"><div className="lbl">cost in {NETWORKS[APP_NET].symbol}</div><div className="res-box hl"><span className="val" ref={cost} /><span className="fl" ref={fl2} /><span className="copy">copy</span></div></div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Sign
const MSG = "I approve release v1.2.0";
function SceneSign(p: SceneProps) {
  const [demo, setDemo] = useState<{ sig: string; signer: string } | null>(null);
  useEffect(() => {
    let stop = false;
    (async () => {
      // A throwaway key made in this tab only for the animation. Never stored or sent.
      const w = Wallet.createRandom();
      const sig = await w.signMessage(MSG);
      if (!stop) setDemo({ sig, signer: w.address });
    })();
    return () => { stop = true; };
  }, []);
  const msg = useRef<HTMLSpanElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLSpanElement>(null);
  const sigBox = useRef<HTMLDivElement>(null);
  const sigVal = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const after = useRef<HTMLDivElement>(null);
  useScene(
    p,
    (tl) => {
      if (!demo) return;
      q(msg).textContent = ""; q(sigVal).textContent = "";
      gsap.set([q(preview), q(sigBox)], { opacity: 0, y: 8 });
      gsap.set(q(after), { opacity: 0 });
      p.setUrl("/tools/sign");
      typeTo(tl, q(msg), MSG, 0.4, 1.2);
      tl.call(() => p.setUrl(`/tools/sign?msg=${encodeURIComponent(MSG)}`), [], 1.7);
      tl.to(q(preview), { opacity: 1, y: 0, duration: 0.5 }, 1.8);
      tl.to(q(btn), { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1 }, 3.0);
      tl.call(() => void (q(sigVal).textContent = demo.sig), [], 3.3);
      tl.to(q(sigBox), { opacity: 1, y: 0, duration: 0.5 }, 3.3);
      flash(tl, q(fl), 3.4);
      tl.to(q(after), { opacity: 1, duration: 0.6 }, 4.4);
    },
    () => { q(msg).textContent = MSG; if (demo) q(sigVal).textContent = demo.sig; },
    [demo]
  );
  return (
    <Frame slug="sign" mode="create">
      <div className="note warn" style={{ fontSize: 12.5, padding: "9px 12px" }}><b>Read before you sign.</b> Never sign messages you don't understand, and never paste your private key or seed phrase anywhere.</div>
      <Fld label="message"><span ref={msg} /><i className="bcaret" /></Fld>
      <div ref={preview} className="res"><div className="lbl">what your wallet will be asked to sign</div><div className="res-box" style={{ fontWeight: 400 }}>{MSG}</div></div>
      <div><span className="btn btn-accent" ref={btn}>sign with wallet</span></div>
      <div ref={sigBox} className="res">
        <div className="lbl">signature · demo key made in your browser</div>
        <div className="res-box hl" style={{ display: "block" }}>
          <span className="val" ref={sigVal} style={{ fontSize: 11.5, display: "block" }} /><span className="fl" ref={fl} />
          <div ref={after} style={{ marginTop: 8, fontSize: 13, fontWeight: 500, position: "relative", zIndex: 1 }}><span style={{ color: "var(--ok)" }}>✓ recovered signer</span> {demo ? short(demo.signer, 10, 8) : "…"}</div>
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Verify (real data)
function SceneVerify(p: SceneProps) {
  const [s, setS] = useState<StatementView | null | "down">(null);
  useEffect(() => {
    let stop = false;
    if (!isDeployed) { setS("down"); return; }
    getStatement(0).then((v) => !stop && setS(v)).catch(() => !stop && setS("down"));
    return () => { stop = true; };
  }, []);
  const parts = useRef<HTMLDivElement>(null);
  const ready = s !== null;
  useScene(
    p,
    (tl) => {
      if (!ready) return;
      const kids = [...q(parts).children];
      gsap.set(kids, { opacity: 0, y: 10 });
      p.setUrl("/verify/0");
      tl.to(kids, { opacity: 1, y: 0, duration: 0.55, stagger: 0.55 }, 0.4);
    },
    () => void 0,
    [ready]
  );
  const date = typeof s === "object" && s ? new Date(s.at * 1000).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" }) : "";
  if (s === "down" || s === null) {
    return <Enter><div className="main-in"><div className="tool-title"><h1>Verify</h1></div><div className="note warn">{s === null ? "Reading statement #0 from the chain…" : "RPC not responding. The recorded statement could not be read just now."}</div></div></Enter>;
  }
  if (!s) return <Enter><div className="main-in"><div className="note">Statement not found.</div></div></Enter>;
  return (
    <Enter><div className="main-in">
      <div ref={parts} style={{ display: "grid", gap: 16 }}>
        <div><div className="lbl">statement #{s.id} · {NETWORKS[APP_NET].label}</div><h1 style={{ font: "400 28px/1.15 var(--serif)", color: "var(--ok)", letterSpacing: "-0.02em", marginTop: 6 }}>✓ Signed by {short(s.signer, 6, 4)} on {date}</h1></div>
        <blockquote className="quote" style={{ fontSize: 17 }}>{s.text || "Hash only, the text is private."}</blockquote>
        <dl className="kv" style={{ fontSize: 12.5 }}><dt>signer</dt><dd>{s.signer}</dd><dt>message hash</dt><dd>{short(s.messageHash, 18, 10)}</dd><dt>contract</dt><dd>{short(statementsAddress, 10, 6)}</dd></dl>
        <div className="note good" style={{ fontSize: 13 }}><b>✓ Signature verified by the contract.</b> The contract recovered the signer itself when this was recorded.</div>
        <div className="note good" style={{ fontSize: 13 }}><b>✓ Checked again in your browser</b> with ethers.js verifyMessage.</div>
      </div>
    </div></Enter>
  );
}

// ---------------------------------------------------------------- Tour
export default function HeroTour({ startDelay = 0 }: { startDelay?: number }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const st = useChainStatus(APP_NET);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const [scene, setScene] = useState(0);
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(reduced);
  const [palTarget, setPalTarget] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const url = useRef<HTMLSpanElement>(null);
  const flt = useRef<HTMLDivElement>(null);
  const palTyped = useRef<HTMLSpanElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const cur = useRef<gsap.core.Timeline | null>(null);
  const trans = useRef<gsap.core.Timeline | null>(null);
  const visible = useRef(true);
  const alive = useRef(true);
  const sceneRef = useRef(0);
  sceneRef.current = scene;

  const setUrl = useCallback((u: string) => { if (url.current) url.current.textContent = u; }, []);
  const onProgress = useCallback((pr: number) => { const b = bars.current[sceneRef.current]; if (b) b.style.transform = `scaleX(${pr})`; }, []);
  const register = useCallback((tl: gsap.core.Timeline) => { cur.current = tl; if (!visible.current) tl.pause(); }, []);

  const go = useCallback((i: number, first = false) => {
    cur.current?.kill(); cur.current = null;
    trans.current?.kill();
    bars.current.forEach((b, k) => { if (b) b.style.transform = `scaleX(${k < i ? 1 : 0})`; });
    if (reduced) { setScene(i); setRun((r) => r + 1); return; }
    setPalTarget(i);
    requestAnimationFrame(() => {
      if (!alive.current || !flt.current || !palTyped.current) return;
      const tl = gsap.timeline({ defaults: { ease: "ref" } });
      trans.current = tl;
      palTyped.current.textContent = "";
      gsap.set(flt.current, { opacity: 0, y: 14 });
      const main = root.current?.querySelector(".appwin .main");
      tl.to(flt.current, { opacity: 1, y: 0, duration: first ? 0.5 : 0.35 });
      if (main && !first) tl.to(main, { opacity: 0, y: -10, duration: 0.4, ease: "power2.in" }, 0.85);
      typeTo(tl, palTyped.current, SCENES[i].palette, first ? 0.5 : 0.35, 0.5);
      tl.to(flt.current, { opacity: 0, y: -8, duration: 0.28 }, "+=0.4").call(() => { setScene(i); setRun((r) => r + 1); setStarted(true); });
      if (!visible.current) tl.pause();
    });
  }, [reduced]);

  const onDone = useCallback(() => go((sceneRef.current + 1) % SCENES.length), [go]);

  useEffect(() => {
    alive.current = true;
    if (reduced) { setScene(0); return; }
    const t = gsap.delayedCall(startDelay, () => go(0, true));
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      [cur.current, trans.current].forEach((tl) => tl && (e.isIntersecting ? tl.play() : tl.pause()));
    }, { threshold: 0.15 });
    if (root.current) io.observe(root.current);
    return () => { alive.current = false; t.kill(); io.disconnect(); cur.current?.kill(); trans.current?.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const def = SCENES[scene];
  const sp: SceneProps = { reduced, setUrl, onProgress, onDone, register };
  const palRows = useMemo(() => {
    const t = SCENES[palTarget];
    const others = SCENES.filter((s, k) => k !== palTarget && s.id !== "verify").slice(0, 3);
    return [t, ...others];
  }, [palTarget]);

  return (
    <div ref={root}>
      <div className="appwin" aria-hidden="true">
        <div className="wbar">
          <span className="wdots"><i /><i /><i /></span>
          <span className="wurl" ref={url}>{def.url}</span>
        </div>
        <div className="app">
          <Sidebar demo active={def.id === "verify" ? "verify" : def.nav} />
          <header className="top">
            <span className="cmdbar"><Icon name="search" size={16} /><span>Find a tool…</span><span className="kbd">{isMac ? "⌘ K" : "ctrl k"}</span></span>
            <span style={{ flex: 1 }} />
            <span className="pill"><i className={`sq ${st.ok ? "ok" : "err"}`} />{NETWORKS[APP_NET].label}</span>
            <span className="pill mono">{st.loaded ? <Odometer value={st.blockNumber} /> : "…"}</span>
            <span className="btn btn-line btn-sm">connect wallet</span>
          </header>
          <main className="main" key={`${scene}-${run}`}>
            <div className="bgfield" aria-hidden="true" />
            {started && scene === 0 && <SceneHash {...sp} />}
            {started && scene === 1 && <SceneUnits {...sp} />}
            {started && scene === 2 && <SceneAbi {...sp} />}
            {started && scene === 3 && <SceneAddress {...sp} />}
            {started && scene === 4 && <SceneGas {...sp} />}
            {started && scene === 5 && <SceneSign {...sp} />}
            {started && scene === 6 && <SceneVerify {...sp} />}
          </main>
        </div>
        <div className="wstrip">
          <span><b>8</b> tools</span>
          <span><b>0</b> servers</span>
          <span><i className="sq ok" /> block <b>{st.loaded ? <Odometer value={st.blockNumber} /> : "…"}</b> live</span>
          <span>gas <b>{st.loaded ? `${gwei(st.gasPrice)} gwei` : "…"}</b></span>
        </div>
      </div>

      <div className="float" ref={flt} aria-hidden="true" style={{ opacity: 0 }}>
        <div className="pal">
          <div className="pal-in"><Icon name="search" size={16} /><span className="mono"><span ref={palTyped} /><i className="bcaret" /></span></div>
          <ul>
            {palRows.map((r, k) => (
              <li key={r.id}><span aria-selected={k === 0 ? "true" : undefined}><Icon name={PAL_ICON[r.id] === "check" ? "check" : (PAL_ICON[r.id] as ToolSlug)} />{r.palLabel}<small>{r.id === "verify" ? "/verify" : `alt ${TOOLS.findIndex((t) => t.slug === r.id) + 1}`}</small></span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="tour" role="tablist" aria-label="Tour of the toolbox">
        {SCENES.map((s, i) => (
          <button key={s.id} role="tab" aria-selected={i === scene} className="tour-tab" onClick={() => go(i)}>
            <span>{s.label}</span>
            <i className="tbar"><b ref={(el) => { bars.current[i] = el; }} /></i>
          </button>
        ))}
      </div>
    </div>
  );
}
