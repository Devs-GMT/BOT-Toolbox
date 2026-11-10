import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Wallet, getAddress } from "ethers";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Footer, SiteNav } from "../components/Site";
import { Icon } from "../components/icons";
import { openPalette } from "../components/CommandPalette";
import { Odometer } from "../components/ui";
import { APP_NET, NETWORKS, TOOLS } from "../lib/config";
import { getProvider, useChainStatus, withRetry } from "../lib/rpc";
import { getStatement, isDeployed, statementsAddress, type StatementView } from "../lib/statements";
import { allUnits, decodeCall, encodeCall, groupDigits, keccakText, selectorOf, short, toBase, topicOf, type UnitField } from "../lib/tools";
import { GUIDES } from "./Guides";

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("ref", "0.22,1,0.36,1"); // the reference site's signature ease

const q = <T extends HTMLElement>(r: RefObject<T>) => r.current as T;
const trim0 = (s: string) => s.replace(/\.0$/, "");

/** Run a timeline once when the root scrolls into view. Reduced motion shows the final state with no timeline. */
function useDemo(root: RefObject<HTMLElement>, build: (tl: gsap.core.Timeline) => void, final: () => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      final();
    });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ paused: true });
      build(tl);
      const st = ScrollTrigger.create({ trigger: root.current, start: "top 80%", once: true, onEnter: () => tl.play() });
      return () => {
        st.kill();
        tl.kill();
      };
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function typeTo(tl: gsap.core.Timeline, el: HTMLElement, text: string, at: number | string, dur: number, done?: () => void) {
  const o = { n: 0 };
  tl.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => void (el.textContent = text.slice(0, Math.round(o.n))), onComplete: done }, at);
}

function flash(tl: gsap.core.Timeline, el: HTMLElement, at: number | string) {
  // immediateRender: false, otherwise the "from" state (a visible flash) is painted before the timeline reaches this point.
  tl.fromTo(el, { opacity: 0.4 }, { opacity: 0, duration: 0.45, ease: "ref", immediateRender: false }, at);
}

function useReveal(root: RefObject<HTMLElement>, selector = ".rv") {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const els = root.current?.querySelectorAll(selector);
      if (!els?.length) return;
      const tween = gsap.from(els, { opacity: 0, y: 16, duration: 0.8, ease: "ref", stagger: 0.08, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => mm.revert();
  }, [root, selector]);
}

// ======================================================================
// 1. Hero + app mockup
// ======================================================================

const HERO_CMD = "selector transfer(address,uint256)";
const HERO_SIG = "transfer(address,uint256)";

function Hero() {
  const root = useRef<HTMLElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const ph = useRef<HTMLSpanElement>(null);
  const sigEl = useRef<HTMLDivElement>(null);
  const resEl = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const side = useRef<HTMLDivElement>(null);
  const toolsN = useRef<HTMLElement>(null);
  const st = useChainStatus(APP_NET);

  const sel = selectorOf(HERO_SIG);
  const rows = [
    { k: "selector", a: HERO_SIG, b: sel },
    { k: "topic0", a: "Transfer(address,address,uint256)", b: short(topicOf("Transfer(address,address,uint256)"), 10, 6) },
    { k: "units", a: "1.5 BOT", b: `${groupDigits(trim0(allUnits(toBase("bot", "1.5", 6), 6).gwei))} gwei` },
    { k: "keccak", a: '"hello"', b: short(keccakText("hello"), 10, 6) },
  ];

  const showFinal = () => {
    q(typed).textContent = HERO_CMD;
    q(ph).style.display = "none";
    q(sigEl).textContent = HERO_SIG;
    q(resEl).textContent = sel;
    q(toolsN).textContent = "8";
    side.current?.children[1]?.classList.add("on");
  };

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", showFinal);
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const words = q(h1).querySelectorAll(".w");
      const items = q(list).children;
      q(ph).style.display = "";
      const tl = gsap.timeline({ defaults: { ease: "ref" } });
      tl.from(words, { opacity: 0, y: 12, duration: 0.45, stagger: 0.07 }, 0)
        .from([q(sub), q(cta)], { opacity: 0, y: 8, duration: 0.45, stagger: 0.1 }, 0.5)
        .from(q(wrap), { opacity: 0, y: 24, duration: 0.8 }, 0.6);
      gsap.set(items, { opacity: 0, y: 8 });
      q(sigEl).textContent = "";
      q(resEl).textContent = "";
      q(toolsN).textContent = "0";
      q(typed).textContent = "";
      side.current?.children[1]?.classList.remove("on");
      // typing sequence, then the result flash, then the list and stat strip
      tl.call(() => void (q(ph).style.display = "none"), [], 1.35);
      typeTo(tl, q(typed), HERO_CMD, 1.4, 1.7);
      tl.call(() => {
        side.current?.children[1]?.classList.add("on");
        q(sigEl).textContent = HERO_SIG;
      }, [], 3.15);
      tl.call(() => void (q(resEl).textContent = sel), [], 3.3);
      flash(tl, q(fl), 3.3);
      tl.to(items, { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "ref" }, 3.5);
      const n = { v: 0 };
      tl.to(n, { v: 8, duration: 0.9, ease: "power2.out", onUpdate: () => void (q(toolsN).textContent = String(Math.round(n.v))) }, 3.9);
      return () => {
        tl.kill();
      };
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" ref={root} aria-label="Introduction">
      <h1 ref={h1}>
        <span className="w">Dev </span><span className="w">chores </span><span className="w">that </span>
        <br />
        <span className="w">do </span><span className="w">themselves<span className="cursor" aria-hidden="true" /></span>
      </h1>
      <p className="sub" ref={sub}>Every converter, hash, encoder and signer you keep googling — one fast page for BOT Chain. No servers, no sign-up.</p>
      <div className="cta" ref={cta}>
        <Link to="/tools" className="btn btn-accent">open the toolbox →</Link>
        <span className="muted mono" style={{ fontSize: 13 }}>or press <button className="kbd" onClick={openPalette} style={{ cursor: "pointer" }}>ctrl k</button></span>
      </div>

      <div className="mockwrap" ref={wrap} role="img" aria-label="Preview of the BOT Toolbox app: a command bar typing a selector request and the result 0xa9059cbb">
        <div className="mock" aria-hidden="true">
          <div className="mock-bar">
            <div className="mock-cmd">
              <Icon name="search" size={15} />
              <span className="typed" ref={typed} />
              <span className="ph" ref={ph}>Find a tool…</span>
              <i className="caret" />
            </div>
            <div className="mock-meta">
              <span><i className="sq ok" /> {NETWORKS[APP_NET].label}</span>
              <span>{st.loaded ? <Odometer value={st.blockNumber} /> : "…"}</span>
            </div>
          </div>
          <div className="mock-body">
            <div className="mock-side" ref={side}>
              {TOOLS.map((t) => (
                <div key={t.slug}><Icon name={t.slug} size={16} /><span>{t.name}</span></div>
              ))}
            </div>
            <div className="mock-main">
              <div className="mock-card">
                <div className="tcard-hd"><span className="name"><i className="sq" />02 hash.selector</span><span className="muted">ready</span></div>
                <div className="tcard-bd">
                  <div><div className="lbl">signature</div><div className="mock-field" ref={sigEl} /></div>
                  <div>
                    <div className="lbl">selector</div>
                    <div className="mock-res"><span ref={resEl} style={{ position: "relative", zIndex: 1 }} /><span className="fl" ref={fl} /></div>
                  </div>
                </div>
              </div>
              <ul className="mock-list" ref={list}>
                {rows.map((r) => (
                  <li key={r.k}><span>{r.k}</span><b>{r.a}</b><b>{r.b}</b></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mock-strip">
            <span><b ref={toolsN}>8</b> tools</span>
            <span><b>0</b> servers</span>
            <span><i className="sq ok" /> block <b>{st.loaded ? <Odometer value={st.blockNumber} /> : "…"}</b> live</span>
            <span>gas <b>{st.loaded ? `${(Number(st.gasPrice) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} gwei` : "…"}</b></span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================================================================
// 2. Trust bar: only what the site really uses
// ======================================================================

function Trust() {
  return (
    <section className="trust" aria-label="Built on">
      <span className="lbl">built on</span>
      {["ethers.js", "OpenZeppelin", "BOT Chain RPC", "MetaMask"].map((n) => <span className="chip" key={n}>{n}</span>)}
    </section>
  );
}

// ======================================================================
// 3-6. Numbered steps with mini demos
// ======================================================================

function Step({ n, label, title, children, link, flip, demo }: { n: string; label: string; title: string; children: React.ReactNode; link: { to: string; text: string }; flip?: boolean; demo: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div className={`step${flip ? " flip" : ""}`} ref={root}>
      <div className="step-copy">
        <div className="step-label rv">{n} · {label}</div>
        <h3 className="rv">{title}</h3>
        <p className="rv">{children}</p>
        <Link to={link.to} className="rv">{link.text} →</Link>
      </div>
      <div className="frame rv">{demo}</div>
    </div>
  );
}

function UnitsDemo() {
  const root = useRef<HTMLDivElement>(null);
  const refs = { wei: useRef<HTMLSpanElement>(null), gwei: useRef<HTMLSpanElement>(null), bot: useRef<HTMLSpanElement>(null) };
  const box = { wei: useRef<HTMLDivElement>(null), gwei: useRef<HTMLDivElement>(null), bot: useRef<HTMLDivElement>(null) };
  const apply = (active: UnitField, value: string) => {
    const all = allUnits(toBase(active, value, 6), 6);
    (["wei", "gwei", "bot"] as const).forEach((f) => {
      q(refs[f]).textContent = f === active ? value : trim0(all[f]);
      box[f].current?.classList.toggle("hl", f === active);
    });
  };
  const steps: [UnitField, string][] = [["bot", "1"], ["bot", "1.5"], ["gwei", "20"]];
  useDemo(
    root,
    (tl) => {
      (["wei", "gwei", "bot"] as const).forEach((f) => void (q(refs[f]).textContent = ""));
      steps.forEach(([f, v], i) => tl.call(() => apply(f, v), [], 0.4 + i * 1.0));
    },
    () => apply("bot", "1.5")
  );
  return (
    <div className="demo" ref={root} aria-label="Units demo">
      <div className="tcard-hd"><span className="name"><i className="sq" />01 units.convert</span><span className="muted">live</span></div>
      <div className="demo-bd">
        {(["wei", "gwei", "bot"] as const).map((f) => (
          <div className="row" key={f}><span>{f === "bot" ? "BOT" : f}</span><div className="val" ref={box[f]}><span ref={refs[f]} /></div></div>
        ))}
        <div className="demo-note">Type in any field, the others follow.</div>
      </div>
    </div>
  );
}

const DEAD = "0x000000000000000000000000000000000000dEaD";

function HashDemo() {
  const root = useRef<HTMLDivElement>(null);
  const sig = useRef<HTMLSpanElement>(null);
  const sel = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLTableSectionElement>(null);
  const call = encodeCall(HERO_SIG, `["${DEAD}", "1000"]`);
  const dec = decodeCall(HERO_SIG, call);
  const args = dec.args as string[];
  const rowsData: [string, string, string][] = [["selector", "bytes4", dec.selector], ["to", "address", short(args[0], 8, 6)], ["amount", "uint256", args[1]]];
  useDemo(
    root,
    (tl) => {
      q(sig).textContent = "";
      q(sel).textContent = "";
      gsap.set(body.current!.children, { opacity: 0, y: 8 });
      typeTo(tl, q(sig), HERO_SIG, 0.4, 1.2);
      tl.call(() => void (q(sel).textContent = selectorOf(HERO_SIG)), [], 1.65);
      flash(tl, q(fl), 1.65);
      tl.to(body.current!.children, { opacity: 1, y: 0, duration: 0.45, stagger: 0.12, ease: "ref" }, 2.0);
    },
    () => {
      q(sig).textContent = HERO_SIG;
      q(sel).textContent = selectorOf(HERO_SIG);
    }
  );
  return (
    <div className="demo" ref={root} aria-label="Hash and ABI demo">
      <div className="tcard-hd"><span className="name"><i className="sq" />02 hash + 03 abi</span><span className="muted">offline</span></div>
      <div className="demo-bd">
        <div className="row"><span>sig</span><div className="val"><span ref={sig} /></div></div>
        <div className="row"><span>selector</span><div className="val hl"><span ref={sel} style={{ position: "relative", zIndex: 1, fontWeight: 600 }} /><span className="fl" ref={fl} /></div></div>
        <table className="tbl">
          <thead><tr><th>calldata</th><th>type</th><th>value</th></tr></thead>
          <tbody ref={body}>
            {rowsData.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChainDemo() {
  const root = useRef<HTMLDivElement>(null);
  const addr = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const rows = useRef<HTMLDivElement>(null);
  const st = useChainStatus(APP_NET);
  const [code, setCode] = useState<"loading" | number | "down">("loading");
  const target = isDeployed ? statementsAddress : DEAD;
  useEffect(() => {
    let stop = false;
    withRetry(() => getProvider(APP_NET).getCode(target))
      .then((c) => !stop && setCode((c.length - 2) / 2))
      .catch(() => !stop && setCode("down"));
    return () => { stop = true; };
  }, [target]);
  const checksum = getAddress(target);
  useDemo(
    root,
    (tl) => {
      q(addr).textContent = "";
      gsap.set(rows.current!.children, { opacity: 0, y: 8 });
      typeTo(tl, q(addr), checksum.toLowerCase(), 0.4, 1.0);
      tl.call(() => void (q(addr).textContent = checksum), [], 1.5);
      flash(tl, q(fl), 1.5);
      tl.to(rows.current!.children, { opacity: 1, y: 0, duration: 0.45, stagger: 0.14, ease: "ref" }, 1.75);
    },
    () => void (q(addr).textContent = checksum)
  );
  return (
    <div className="demo" ref={root} aria-label="Chain checks demo">
      <div className="tcard-hd"><span className="name"><i className="sq" />04 address + 06 gas</span><span className="muted">live</span></div>
      <div className="demo-bd">
        <div className="row"><span>address</span><div className="val hl" style={{ fontSize: 12.5 }}><span ref={addr} style={{ position: "relative", zIndex: 1 }} /><span className="fl" ref={fl} /></div></div>
        <div ref={rows} style={{ display: "grid", gap: 12 }}>
          <div className="row"><span>checksum</span><div className="val"><span className="ok">✓ valid</span> <span className="muted">mixed case matches</span></div></div>
          <div className="row"><span>type</span><div className="val">{code === "loading" ? "checking…" : code === "down" ? "RPC not responding" : code > 0 ? <><span className="ok">✓ contract</span> · {groupDigits(code)} bytes</> : "no code (wallet)"}</div></div>
          <div className="row"><span>network</span><div className="val">{st.loaded ? <>block <Odometer value={st.blockNumber} /> · {(Number(st.gasPrice) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} gwei</> : st.ok ? "loading…" : "RPC not responding"}</div></div>
        </div>
        <div className="demo-note">{NETWORKS[APP_NET].label}, read live from the public RPC.</div>
      </div>
    </div>
  );
}

const DEMO_MSG = "Hello BOT Chain";

function SignDemo() {
  const root = useRef<HTMLDivElement>(null);
  const msg = useRef<HTMLSpanElement>(null);
  const sigEl = useRef<HTMLSpanElement>(null);
  const fl = useRef<HTMLSpanElement>(null);
  const rows = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState<{ sig: string; signer: string } | null>(null);
  const [rec, setRec] = useState<StatementView | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      // A throwaway key made in this browser tab, only for the animation. It is never stored or sent.
      const w = Wallet.createRandom();
      const sig = await w.signMessage(DEMO_MSG);
      if (!stop) setDemo({ sig, signer: w.address });
    })();
    if (isDeployed) getStatement(0).then((s) => !stop && setRec(s)).catch(() => undefined);
    return () => { stop = true; };
  }, []);

  useDemo(
    root,
    (tl) => {
      if (!demo) return;
      q(msg).textContent = "";
      q(sigEl).textContent = "";
      gsap.set(rows.current!.children, { opacity: 0, y: 8 });
      typeTo(tl, q(msg), DEMO_MSG, 0.4, 0.9);
      tl.call(() => void (q(sigEl).textContent = short(demo.sig, 18, 10)), [], 1.6);
      flash(tl, q(fl), 1.6);
      tl.to(rows.current!.children, { opacity: 1, y: 0, duration: 0.45, stagger: 0.18, ease: "ref" }, 1.95);
    },
    () => {
      if (!demo) return;
      q(msg).textContent = DEMO_MSG;
      q(sigEl).textContent = short(demo.sig, 18, 10);
    },
    [demo]
  );
  return (
    <div className="demo" ref={root} aria-label="Sign and verify demo">
      <div className="tcard-hd"><span className="name"><i className="sq" />08 sign.verify</span><span className="muted">EIP-191</span></div>
      <div className="demo-bd">
        <div className="row"><span>message</span><div className="val"><span ref={msg} /></div></div>
        <div className="row"><span>signature</span><div className="val hl" style={{ fontSize: 12.5 }}><span ref={sigEl} style={{ position: "relative", zIndex: 1 }} /><span className="fl" ref={fl} /></div></div>
        <div ref={rows} style={{ display: "grid", gap: 12 }}>
          <div className="row"><span>recovered</span><div className="val"><span className="ok">✓</span> {demo ? short(demo.signer, 6, 4) : "…"}</div></div>
          {rec ? (
            <div className="row"><span>on chain</span><div className="val"><span className="ok">✓ recorded</span> · <Link to={`/verify/${rec.id}`} style={{ color: "var(--accent-ink)" }}>statement #{rec.id}</Link> · {NETWORKS[APP_NET].label}</div></div>
          ) : (
            <div className="row"><span>on chain</span><div className="val muted">recorded statements appear on the verify page</div></div>
          )}
        </div>
        <div className="demo-note">The demo key is made in your browser for this animation. Nothing is stored or sent. Statement #{rec ? rec.id : "0"} is a real record, signed by the project's test wallet.</div>
      </div>
    </div>
  );
}

function Steps() {
  return (
    <section className="band" aria-label="What it does">
      <div className="band-in">
        <Step n="01" label="Units" title="Converts every unit" link={{ to: "/tools/units", text: "Open Units" }} demo={<UnitsDemo />}>
          Type in <b>wei, gwei or BOT</b> and the others follow, with custom decimals for tokens such as 6-decimal stablecoins. Every result has a copy button.
        </Step>
        <Step n="02" label="Hash and encode" title="Hashes and encodes" link={{ to: "/tools/abi", text: "Open ABI" }} flip demo={<HashDemo />}>
          Get the <b>selector</b> from a signature, the topic of an event, and calldata for any call. Paste calldata back in to read the values. It all runs offline.
        </Step>
        <Step n="03" label="Chain checks" title="Checks the chain" link={{ to: "/tools/address", text: "Open Address" }} demo={<ChainDemo />}>
          Fix a <b>checksum</b>, see if an address is a contract, read a balance, and watch live gas and block height from the public RPC. If the RPC is down, the offline tools keep working.
        </Step>
        <Step n="04" label="Sign and verify" title="Signs and verifies" link={{ to: "/tools/sign", text: "Open Sign" }} flip demo={<SignDemo />}>
          Sign a message with your wallet, check any signature, and <b>record it on BOT Chain</b>. The contract recovers the signer itself, so a recorded statement cannot be faked.
        </Step>
      </div>
    </section>
  );
}

// ======================================================================
// 7. The 8 tools
// ======================================================================

const CATEGORY: Record<string, string> = { units: "Convert", hash: "Hash", abi: "Encode", address: "Inspect", time: "Convert", gas: "Live", network: "Live", sign: "Sign" };

function ToolsGrid() {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const st = useChainStatus(APP_NET);
  useReveal(root, ".rv");
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.from(q(grid).children, { opacity: 0, y: 18, rotationX: -14, transformOrigin: "50% 0%", duration: 0.8, ease: "ref", stagger: 0.08, scrollTrigger: { trigger: q(grid), start: "top 82%", once: true } });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => mm.revert();
  }, []);
  return (
    <section className="sec" ref={root} id="tools" aria-label="The eight tools">
      <div className="sec-hd">
        <h2 className="rv">Eight tools, one page.</h2>
        <p className="rv">Each one does a single chore well. Every tool has a shareable link and a copy-as-code button.</p>
      </div>
      <div className="grid8" ref={grid}>
        {TOOLS.map((t, i) => (
          <Link className="tc" key={t.slug} to={`/tools/${t.slug}`}>
            <div className="tc-top"><span>{String(i + 1).padStart(2, "0")} · {CATEGORY[t.slug]}</span><Icon name={t.slug} size={20} /></div>
            <div><h3>{t.name}</h3><p>{t.blurb}</p></div>
            <div className="metric">
              <i className={`sq ${t.slug === "gas" ? (st.ok ? "ok" : "warn") : "idle"}`} />
              {t.slug === "gas" ? (st.loaded ? `${(Number(st.gasPrice) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} gwei live` : "live") : t.metric}
            </div>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 36 }} className="rv"><Link to="/tools" className="btn btn-ink">put the toolbox to work →</Link></div>
    </section>
  );
}

// ======================================================================
// 8. From anywhere: shareable links, command palette, copy as code
// ======================================================================

function Anywhere() {
  const root = useRef<HTMLElement>(null);
  useReveal(root, ".rv");
  const links = [
    "/tools/hash?sig=transfer(address,uint256)",
    "/tools/units?f=bot&v=1.5",
    "/tools/gas?g=50000",
    "/tools/time?ts=1700000000",
  ];
  return (
    <section className="sec" ref={root} style={{ paddingTop: 24 }} aria-label="Your toolbox, from anywhere">
      <div className="sec-hd">
        <h2 className="rv">Your toolbox, from anywhere.</h2>
        <p className="rv">Every input lives in the link. Press ctrl K to jump to a tool. Copy the ethers.js line when you are ready to put it in code.</p>
      </div>
      <div className="any">
        <div className="panel rv">
          <h3>Shareable links</h3>
          <p>Send a colleague the exact result you are looking at.</p>
          <div className="links-list">
            {links.map((l) => <Link key={l} to={l}><span>{l}</span><span>open →</span></Link>)}
          </div>
        </div>
        <div className="panel rv">
          <h3>Command bar and code</h3>
          <div className="pal-mock" aria-hidden="true">
            <div className="in"><Icon name="search" size={15} />hash<i className="cursor" style={{ height: 14, width: 7, marginLeft: 0 }} /></div>
            <ul>
              <li className="on"><Icon name="hash" size={16} />Hash<small>alt 2</small></li>
              <li><Icon name="abi" size={16} />ABI<small>alt 3</small></li>
              <li><Icon name="sign" size={16} />Sign<small>alt 8</small></li>
            </ul>
          </div>
          <div className="codeblock"><span className="c">// copy as code, from the Hash tool</span>{"\n"}<span className="k">import</span> {"{ id } "}<span className="k">from</span> <span className="s">"ethers"</span>;{"\n\n"}id(<span className="s">"transfer(address,uint256)"</span>).slice(0, 10);{"\n"}<span className="c">// "0xa9059cbb"</span></div>
        </div>
      </div>
    </section>
  );
}

// ======================================================================
// 9. Closing CTA + guides
// ======================================================================

function Closing() {
  const root = useRef<HTMLElement>(null);
  useReveal(root, ".rv");
  return (
    <div className="closing">
      <section className="sec" ref={root} id="guides" aria-label="Get started">
        <h2 className="rv">Put BOT Toolbox to work.</h2>
        <p className="lead rv">Open it, press ctrl K, and the chore is done. No sign-up, nothing to install.</p>
        <div className="rv"><Link to="/tools" className="btn btn-accent" style={{ padding: "15px 22px", fontSize: 15 }}>open the toolbox →</Link></div>
        <div className="guides">
          {GUIDES.map((g) => (
            <Link key={g.slug} to={`/guides/${g.slug}`} className="gc rv">
              <div><h3>{g.title}</h3><p style={{ marginTop: 8 }}>{g.lede}</p></div>
              <span className="meta">read · {g.minutes} min →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    document.title = "BOT Toolbox: dev tools for BOT Chain";
    // refresh trigger positions once fonts and layout have settled
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Trust />
        <Steps />
        <ToolsGrid />
        <Anywhere />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
