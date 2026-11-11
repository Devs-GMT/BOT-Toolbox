import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Wallet, formatUnits, getAddress } from "ethers";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Footer, SiteNav, useStatementsTotal } from "../components/Site";
import { Icon } from "../components/icons";
import { openPalette } from "../components/CommandPalette";
import { Odometer } from "../components/ui";
import { APP_NET, NETWORKS, TOOLS, type ToolSlug } from "../lib/config";
import { getProvider, useChainStatus, withRetry } from "../lib/rpc";
import { getStatement, isDeployed, statementsAddress, type StatementView } from "../lib/statements";
import { allUnits, decodeCall, encodeCall, groupDigits, selectorOf, short, toBase, type UnitField } from "../lib/tools";
import { GUIDES } from "./Guides";
import HeroTour from "./HeroTour";
import { flash, q, typeTo } from "../lib/motion";

const trim0 = (s: string) => s.replace(/\.0$/, "");
const gwei = (wei: bigint) => (Number(wei) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Run a timeline once when the root scrolls into view. Reduced motion shows the final state. */
function useDemo(root: RefObject<HTMLElement>, build: (tl: gsap.core.Timeline) => void, final: () => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => final());
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ paused: true });
      build(tl);
      const st = ScrollTrigger.create({ trigger: root.current, start: "top 78%", once: true, onEnter: () => tl.play() });
      return () => {
        st.kill();
        tl.kill();
      };
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Feeds --mx / --my to the [data-field] under the pointer so its dot field can light up around the cursor. */
function useFieldPointer() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-field]") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}

/** Reference scroll reveal: opacity + 1rem rise, 0.8 s, 80 ms stagger. */
function useReveal(root: RefObject<HTMLElement>, selector = ".rv") {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const els = root.current?.querySelectorAll(selector);
      if (!els?.length) return;
      const tween = gsap.from(els, { opacity: 0, y: 16, duration: 0.8, ease: "ref", stagger: 0.08, scrollTrigger: { trigger: root.current, start: "top 82%", once: true } });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => mm.revert();
  }, [root, selector]);
}

// ======================================================================
// 0. Intro veil: a brown mass rises off the screen, then the hero appears
// ======================================================================

let introDone = false;

function IntroVeil() {
  const veil = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [show] = useState(!introDone);
  useLayoutEffect(() => {
    if (introDone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      introDone = true;
      q(veil).style.display = "none";
      return;
    }
    const html = document.documentElement;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    const h = window.innerHeight;
    const tween = gsap.fromTo(
      q(inner),
      { y: 0 },
      {
        y: -h * 2.35,
        duration: 2.1,
        ease: "power3.inOut",
        delay: 0.25,
        onComplete: () => {
          introDone = true;
          q(veil).style.display = "none";
          html.style.overflow = "";
        },
      }
    );
    return () => {
      tween.kill();
      html.style.overflow = "";
    };
  }, []);
  if (!show) return null;
  return (
    <div className="veil" ref={veil} aria-hidden="true">
      <div className="veil-in" ref={inner} />
    </div>
  );
}

// ======================================================================
// 1. Hero: centred serif headline, glow that follows the mouse, and a
//    looping tour of the real toolbox UI inside the window
// ======================================================================

const HERO_SIG = "transfer(address,uint256)";

function Hero() {
  const root = useRef<HTMLElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const tourDelay = introDone ? 1.6 : 2.8;

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const base = introDone ? 0 : 1.2;
      const words = q(h1).querySelectorAll(".w");
      const tl = gsap.timeline({ defaults: { ease: "ref" }, delay: base });
      tl.from(words, { opacity: 0, y: 10, duration: 0.45, stagger: 0.06 }, 0.1)
        .from([q(sub), q(cta)], { opacity: 0, y: 6, duration: 0.45, stagger: 0.1 }, 0.5)
        .from(q(stage), { opacity: 0, y: 28, duration: 0.8 }, 0.6);

      // glow: three blobs ease toward the pointer at different strengths
      const blobs = [...q(glow).children] as HTMLElement[];
      const quick = blobs.map((b, i) => ({
        x: gsap.quickTo(b, "x", { duration: 1.4 + i * 0.35, ease: "power3.out" }),
        y: gsap.quickTo(b, "y", { duration: 1.4 + i * 0.35, ease: "power3.out" }),
        k: [0.34, 0.22, 0.14][i],
      }));
      const move = (e: MouseEvent) => {
        const r = q(root).getBoundingClientRect();
        const dx = e.clientX - r.left - r.width / 2;
        const dy = e.clientY - r.top - Math.min(r.height * 0.55, 560);
        quick.forEach((qk) => {
          qk.x(dx * qk.k);
          qk.y(Math.max(-90, Math.min(90, dy * qk.k * 0.6)));
        });
      };
      const drift = gsap.to(blobs, { scale: 1.08, duration: 5, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 1.2, from: "start" } });
      window.addEventListener("mousemove", move, { passive: true });
      return () => {
        window.removeEventListener("mousemove", move);
        drift.kill();
        tl.kill();
        gsap.set(blobs, { clearProps: "all" });
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="hero" ref={root} onMouseMove={onMove} aria-label="Introduction">
      <span className="dots" aria-hidden="true" />
      <span className="spot" aria-hidden="true" />
      <div className="glow" ref={glow} aria-hidden="true"><i className="g1" /><i className="g2" /><i className="g3" /></div>
      <div className="hero-copy">
        <h1 ref={h1}>
          <span className="w">Dev </span><span className="w">chores </span><span className="w">that </span><span className="w">do </span><span className="w">themselves.</span>
        </h1>
        <p className="sub" ref={sub}>Every converter, hash, encoder and signer you keep googling — one fast page for BOT Chain. No servers, no sign-up.</p>
        <div className="cta" ref={cta}>
          <Link to="/tools" className="btn btn-ink">Open the toolbox</Link>
          <span className="hint-k">or press <button className="kbd" onClick={openPalette} style={{ cursor: "pointer" }}>ctrl k</button></span>
        </div>
      </div>

      <div className="stage" ref={stage} role="group" aria-label="A tour of the real BOT Toolbox app: hash, units, ABI, address, gas, sign and a verified statement">
        <HeroTour startDelay={tourDelay} />
      </div>
    </section>
  );
}

// ======================================================================
// 2. Trust bar — only what the site really uses
// ======================================================================

function Trust() {
  return (
    <section className="trust" aria-label="Built on">
      <p>Built on the tools BOT Chain developers already use</p>
      <div className="marks">
        <span className="m">ethers.js</span>
        <span>OpenZeppelin</span>
        <span className="s">BOT Chain RPC</span>
        <span>MetaMask</span>
      </div>
    </section>
  );
}

function Statement() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <section className="intro" ref={root} data-dark>
      <h2 className="rv">BOT Toolbox does the small chores of building on BOT Chain, <em>so you can keep shipping.</em></h2>
    </section>
  );
}

// ======================================================================
// 3-6. Numbered steps on the dark grain band
// ======================================================================

function Step({ n, label, title, children, link, flip, tone, demo }: { n: string; label: string; title: string; children: React.ReactNode; link: { to: string; text: string }; flip?: boolean; tone: string; demo: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div className={`srow${flip ? " flip" : ""}`} ref={root}>
      <div className="scopy">
        <div className="slabel rv"><span>{n}</span><span>{label}</span></div>
        <h3 className="rv">{title}</h3>
        <p className="rv">{children}</p>
        <Link to={link.to} className="rv">{link.text} →</Link>
      </div>
      <div className={`gwin ${tone} rv`} data-field><i className="fd" aria-hidden="true" />{demo}</div>
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
    <div className="dpanel" ref={root}>
      <div className="dp-hd"><span className="nm"><i className="sq" />01 units.convert</span><span>live</span></div>
      <div className="dp-bd">
        {(["wei", "gwei", "bot"] as const).map((f) => (
          <div className="dp-row" key={f}><span>{f === "bot" ? "BOT" : f}</span><div className="dp-val" ref={box[f]}><span ref={refs[f]} /></div></div>
        ))}
        <div className="dp-note">Type in any field, the others follow.</div>
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
  const dec = decodeCall(HERO_SIG, encodeCall(HERO_SIG, `["${DEAD}", "1000"]`));
  const args = dec.args as string[];
  const rows: [string, string, string][] = [["selector", "bytes4", dec.selector], ["to", "address", short(args[0], 8, 6)], ["amount", "uint256", args[1]]];
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
    <div className="dpanel" ref={root}>
      <div className="dp-hd"><span className="nm"><i className="sq" />02 hash + 03 abi</span><span>offline</span></div>
      <div className="dp-bd">
        <div className="dp-row"><span>sig</span><div className="dp-val"><span ref={sig} /></div></div>
        <div className="dp-row"><span>selector</span><div className="dp-val hl"><span ref={sel} style={{ position: "relative", zIndex: 1, fontWeight: 600 }} /><span className="fl" ref={fl} /></div></div>
        <table className="dp-tbl">
          <thead><tr><th>calldata</th><th>type</th><th>value</th></tr></thead>
          <tbody ref={body}>{rows.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody>
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
    <div className="dpanel" ref={root}>
      <div className="dp-hd"><span className="nm"><i className="sq" />04 address + 06 gas</span><span>live</span></div>
      <div className="dp-bd">
        <div className="dp-row"><span>address</span><div className="dp-val hl" style={{ fontSize: 12.5 }}><span ref={addr} style={{ position: "relative", zIndex: 1 }} /><span className="fl" ref={fl} /></div></div>
        <div ref={rows} style={{ display: "grid", gap: 12 }}>
          <div className="dp-row"><span>checksum</span><div className="dp-val"><span className="ok">✓ valid</span> mixed case matches</div></div>
          <div className="dp-row"><span>type</span><div className="dp-val">{code === "loading" ? "checking…" : code === "down" ? "RPC not responding" : code > 0 ? <><span className="ok">✓ contract</span> · {groupDigits(code)} bytes</> : "no code (wallet)"}</div></div>
          <div className="dp-row"><span>network</span><div className="dp-val">{st.loaded ? <>block <Odometer value={st.blockNumber} /> · {gwei(st.gasPrice)} gwei</> : st.ok ? "loading…" : "RPC not responding"}</div></div>
        </div>
        <div className="dp-note">{NETWORKS[APP_NET].label}, read live from the public RPC.</div>
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
      // A throwaway key made in this tab only for the animation. Never stored or sent.
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
    <div className="dpanel" ref={root}>
      <div className="dp-hd"><span className="nm"><i className="sq" />08 sign.verify</span><span>EIP-191</span></div>
      <div className="dp-bd">
        <div className="dp-row"><span>message</span><div className="dp-val"><span ref={msg} /></div></div>
        <div className="dp-row"><span>signature</span><div className="dp-val hl" style={{ fontSize: 12.5 }}><span ref={sigEl} style={{ position: "relative", zIndex: 1 }} /><span className="fl" ref={fl} /></div></div>
        <div ref={rows} style={{ display: "grid", gap: 12 }}>
          <div className="dp-row"><span>recovered</span><div className="dp-val"><span className="ok">✓</span> {demo ? short(demo.signer, 6, 4) : "…"}</div></div>
          <div className="dp-row"><span>on chain</span><div className="dp-val">{rec ? <><span className="ok">✓ recorded</span> · <Link to={`/verify/${rec.id}`}>statement #{rec.id}</Link> · {NETWORKS[APP_NET].label}</> : "recorded statements appear on the verify page"}</div></div>
        </div>
        <div className="dp-note">The demo key is made in your browser for this animation, nothing is stored or sent. Statement #{rec ? rec.id : 0} is a real record from the project’s test wallet.</div>
      </div>
    </div>
  );
}

function Steps() {
  return (
    <section className="band" data-dark aria-label="What it does">
      <div className="wrap steps">
        <Step n="01" label="Units" title="Converts every unit" tone="a" link={{ to: "/tools/units", text: "Open Units" }} demo={<UnitsDemo />}>
          Type in <b>wei, gwei or BOT</b> and the others follow, with custom decimals for tokens such as 6-decimal stablecoins.
        </Step>
        <Step n="02" label="Hash and encode" title="Hashes and encodes" tone="b" link={{ to: "/tools/abi", text: "Open ABI" }} flip demo={<HashDemo />}>
          Get the <b>selector</b> from a signature, the topic of an event, and calldata for any call. Paste calldata back in to read the values.
        </Step>
        <Step n="03" label="Chain checks" title="Checks the chain" tone="c" link={{ to: "/tools/address", text: "Open Address" }} demo={<ChainDemo />}>
          Fix a <b>checksum</b>, see if an address is a contract, read a balance, and watch live gas and block height from the public RPC.
        </Step>
        <Step n="04" label="Sign and verify" title="Signs and verifies" tone="d" link={{ to: "/tools/sign", text: "Open Sign" }} flip demo={<SignDemo />}>
          Sign a message with your wallet, check any signature, and <b>record it on BOT Chain</b>. The contract recovers the signer itself, so a record cannot be faked.
        </Step>
      </div>
    </section>
  );
}

// ======================================================================
// 7. The 8 tools — list + detail, like the reference's agent library
// ======================================================================

interface Detail { cat: string; desc: string; mLabel: string; mValue: string; tag: string; qy: string; ans: string; scope: string }

function useDetails(): Record<ToolSlug, Detail> {
  const st = useChainStatus(APP_NET);
  const total = useStatementsTotal();
  const transfer = st.loaded ? `${trim0(formatUnits(21000n * st.gasPrice, 18))} ${NETWORKS[APP_NET].symbol}` : "…";
  return {
    units: { cat: "Convert", desc: "Move between wei, gwei and BOT without counting zeros.", mLabel: "Precision", mValue: "up to 77 decimals", tag: "result", qy: "1.5 BOT", ans: `${groupDigits(trim0(allUnits(toBase("bot", "1.5", 18), 18).gwei))} gwei`, scope: "Offline" },
    hash: { cat: "Keccak", desc: "keccak256, function selectors and event topics from a signature.", mLabel: "Modes", mValue: "5", tag: "selector", qy: HERO_SIG, ans: selectorOf(HERO_SIG), scope: "Offline" },
    abi: { cat: "Encode", desc: "Build calldata, read it back, and encode constructor arguments.", mLabel: "Modes", mValue: "encode · decode · args", tag: "calldata", qy: `transfer(0x…dEaD, 1000)`, ans: short(encodeCall(HERO_SIG, `["${DEAD}", "1000"]`), 14, 8), scope: "Offline" },
    address: { cat: "Inspect", desc: "Fix a checksum, tell a contract from a wallet, read a balance.", mLabel: "Checks", mValue: "4 per address", tag: "checksum", qy: "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed", ans: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", scope: "Offline + live RPC" },
    time: { cat: "Convert", desc: "Unix time, dates in your timezone and UTC, and blocks to time.", mLabel: "Block time", mValue: `${NETWORKS[APP_NET].blockTimeSeconds} s documented`, tag: "UTC", qy: "1700000000", ans: new Date(1700000000 * 1000).toISOString(), scope: "Offline + live RPC" },
    gas: { cat: "Live", desc: "Live gas price every 3 seconds and the cost of any amount of gas.", mLabel: "Gas price", mValue: st.loaded ? `${gwei(st.gasPrice)} gwei` : st.ok ? "loading…" : "RPC not responding", tag: "cost", qy: "21,000 gas (a plain transfer, rough example)", ans: transfer, scope: "Live RPC" },
    network: { cat: "Live", desc: "Both BOT Chain networks from one config, one click into MetaMask.", mLabel: "Chains", mValue: "677 · 968", tag: "head", qy: `latest block on ${NETWORKS[APP_NET].label}`, ans: st.loaded ? `#${groupDigits(st.blockNumber)}` : "…", scope: "Live RPC" },
    sign: { cat: "Statements", desc: "Sign, verify, and record statements the contract checks itself.", mLabel: "Recorded", mValue: typeof total === "number" ? `${total} statement${total === 1 ? "" : "s"}` : "…", tag: "verify", qy: "signature over “Hello BOT Chain”", ans: "✓ signer recovered by the contract", scope: NETWORKS[APP_NET].label },
  };
}

function ToolsLib() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  const details = useDetails();
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const [run, setRun] = useState(0);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!auto || reduced) return;
    const t = setTimeout(() => { setIdx((i) => (i + 1) % TOOLS.length); setRun((r) => r + 1); }, 5000);
    return () => clearTimeout(t);
  }, [idx, auto, reduced, run]);
  const tool = TOOLS[idx];
  const d = details[tool.slug];
  const detail = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced || !detail.current) return;
    const tw = gsap.fromTo(detail.current.children, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: "ref", stagger: 0.05 });
    return () => void tw.kill();
  }, [idx, reduced]);

  return (
    <section className="sec" ref={root} id="tools" aria-label="The eight tools">
      <div className="wrap">
        <div className="shead">
          <h2 className="rv">Eight tools.<br />One fast page.</h2>
          <div className="r rv">
            <p>Each tool does one chore well, keeps its inputs in a shareable link, and shows the ethers.js line that does the same thing.</p>
            <Link to="/tools" className="tlink">Put the toolbox to work →</Link>
          </div>
        </div>
        <div className="lib rv">
          <div className="lib-list" role="listbox" aria-label="Tools">
            {TOOLS.map((t, i) => (
              <button
                key={t.slug}
                role="option"
                aria-selected={i === idx}
                className="lib-item"
                onClick={() => { setIdx(i); setAuto(false); }}
                onMouseEnter={() => { setIdx(i); setAuto(false); }}
              >
                <span className="lib-ico"><Icon name={t.slug} size={16} /></span>
                <b>{t.name}</b><small>{details[t.slug].cat}</small>
                <span className="bar"><i key={`${i}-${run}-${idx}`} className={auto && !reduced && i === idx ? "run" : ""} /></span>
              </button>
            ))}
          </div>
          <div className="lib-stage" data-field><i className="fd" aria-hidden="true" />
            <div className="lib-detail" ref={detail} aria-live="polite">
              <div className="ld-hd"><span className="lib-ico" style={{ background: "var(--ink)", color: "var(--paper)" }}><Icon name={tool.slug} size={16} /></span><b>{tool.name}</b><small>{d.cat}</small><span className="cnt">{tool.metric}</span></div>
              <div className="ld-bd">
                <p>{d.desc}</p>
                <div className="ld-metric"><span>{d.mLabel}</span><b>{d.mValue}</b></div>
                <div className="ld-res">
                  <div className="k"><span className="tag">{d.tag}</span>{String(idx + 1).padStart(2, "0")} {tool.slug}</div>
                  <div className="q">{d.qy}</div>
                  <div className="a">{d.ans}</div>
                </div>
              </div>
              <div className="ld-ft"><span>Scope · {d.scope}</span><Link to={`/tools/${tool.slug}`}>Open {tool.name} →</Link></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================================================================
// 8. From anywhere — three art cards with captions
// ======================================================================

function Anywhere() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <section className="sec" ref={root} style={{ paddingTop: 0 }} aria-label="Your toolbox, from anywhere">
      <div className="wrap">
        <div className="shead"><h2 className="rv">Your toolbox,<br />from anywhere.</h2><div /></div>
        <div className="trio">
          <div className="rv">
            <div className="art a1" data-field><i className="fd" aria-hidden="true" />
              <div className="mini">
                <div className="row sel">/tools/hash?sig=transfer(address,uint256)<span className="r">copy</span></div>
                <div className="row">/tools/units?f=bot&amp;v=1.5<span className="r">open</span></div>
                <div className="row">/tools/gas?g=50000<span className="r">open</span></div>
                <span className="pill"><i className="sq ok" style={{ borderRadius: "50%" }} />link copied</span>
              </div>
            </div>
            <h3>Links that keep the answer.</h3>
            <p>Every input lives in the URL. Send a colleague the exact result you are looking at.</p>
          </div>
          <div className="rv">
            <div className="art a2" data-field><i className="fd" aria-hidden="true" />
              <div className="mini">
                <div className="row"><Icon name="search" size={14} />hash<span className="r">ctrl k</span></div>
                <div className="row sel"><Icon name="hash" size={14} />Hash<span className="r">alt 2</span></div>
                <div className="row"><Icon name="abi" size={14} />ABI<span className="r">alt 3</span></div>
                <div className="row"><Icon name="sign" size={14} />Sign<span className="r">alt 8</span></div>
              </div>
            </div>
            <h3>One key to every tool.</h3>
            <p>Press ctrl K anywhere, type two letters, and you are there. Alt 1 to 8 jump straight in.</p>
          </div>
          <div className="rv">
            <div className="art a3" data-field><i className="fd" aria-hidden="true" />
              <div className="mini">
                <div className="code"><span className="c">// copy as code</span>{"\n"}<span className="k">import</span> {"{ id }"} <span className="k">from</span> <span className="s">"ethers"</span>;{"\n\n"}id(<span className="s">"transfer(address,uint256)"</span>){"\n"}  .slice(0, 10);{"\n"}<span className="c">// "0xa9059cbb"</span></div>
              </div>
            </div>
            <h3>The code, not just the answer.</h3>
            <p>Each tool shows the ethers.js v6 line that does the same thing, ready to paste into your project.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================================================================
// 9. Dark tail: closing CTA, guides, footer
// ======================================================================

const COVERS = [
  "linear-gradient(135deg, #c96a3f, #f0b58c 55%, #6b3b2a)",
  "linear-gradient(160deg, #3b4a3c, #9db08f 55%, #2b3329)",
  "linear-gradient(140deg, #4a3150, #c08fb4 55%, #2e2234)",
];
const COVER_TEXT = ["0xa9059cbb", "10^18", "0x19…"];

function Tail() {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div className="tail" data-dark data-dark-at="0.92" ref={root}>
      <section className="closing" aria-label="Get started">
        <h2 className="rv">Put BOT Toolbox to work.</h2>
        <p className="rv">Open it, press ctrl K, and the chore is done. No sign-up, nothing to install, nothing leaves your browser.</p>
        <Link to="/tools" className="btn rv">Open the toolbox</Link>
      </section>
      <section className="guides" id="guides" aria-label="Guides">
        <div className="guides-hd"><h2>From the guides</h2><Link to="/guides/function-selector" className="tlink">All guides →</Link></div>
        <div className="guides-row">
          {GUIDES.map((g, i) => (
            <Link key={g.slug} to={`/guides/${g.slug}`} className="gcard rv">
              <div className="cover" style={{ ["--cv" as string]: COVERS[i] }}><span>{COVER_TEXT[i]}</span></div>
              <div className="meta"><span>Guide</span><span>{g.minutes} min read</span></div>
              <h3>{g.title}</h3>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default function Home() {
  useFieldPointer();
  useEffect(() => {
    document.title = "BOT Toolbox: dev tools for BOT Chain";
    const t = setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <IntroVeil />
      <SiteNav />
      <main>
        <Hero />
        <Trust />
        <Statement />
        <Steps />
        <ToolsLib />
        <Anywhere />
      </main>
      <Tail />
    </>
  );
}
