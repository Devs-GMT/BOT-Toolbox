import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APP_NET, LINKS, MAX_TEXT_BYTES, NETWORKS, STATEMENTS_ADDRESS, TOOLS } from "../lib/config";
import { ExtLink } from "../components/ui";
import { GUIDES } from "./Guides";

const SECTIONS = [
  ["overview", "Overview"],
  ["tools", "The eight tools"],
  ["links", "Shareable links"],
  ["keys", "Keyboard shortcuts"],
  ["signing", "Sign, record, verify"],
  ["networks", "Networks and contract"],
  ["wallet", "Wallet and safety"],
  ["limits", "Limits"],
] as const;

const TOOL_DOCS: Record<string, { does: string; example: string; mode: string }> = {
  units: { does: "Convert between wei, gwei, BOT and a token with any number of decimals. Type in any field, the others follow.", example: "/tools/units?f=bot&v=1.5", mode: "offline" },
  hash: { does: "keccak256 of text or hex, the function selector of a signature, the topic of an event, and a normaliser that removes spaces and parameter names.", example: "/tools/hash?sig=transfer(address,uint256)", mode: "offline" },
  abi: { does: "Encode a call into calldata, decode calldata back into values, or encode constructor arguments for explorer verification.", example: "/tools/abi?m=decode", mode: "offline" },
  address: { does: "Validate an address, fix its checksum, see whether it is a contract (code size), read its balance, and open it on the explorer, on both networks.", example: "/tools/address?a=0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", mode: "offline + live RPC" },
  time: { does: "Unix seconds or milliseconds to a date in your timezone and UTC, a date back to unix, relative time, and block to approximate time using the average block time measured from the RPC.", example: "/tools/time?ts=1700000000", mode: "offline + live RPC" },
  gas: { does: "The live gas price, refreshed every 3 seconds, and the cost of any amount of gas in BOT. The presets are rough examples, real usage varies.", example: "/tools/gas?g=50000", mode: "live RPC" },
  network: { does: "Both BOT Chain networks from one config: chain id, RPC, explorer, faucet, live block height, and an add to MetaMask button.", example: "/tools/network", mode: "live RPC" },
  sign: { does: "Sign a message with your wallet (EIP-191), verify any message and signature, and record a signed statement on BOT Chain.", example: "/tools/sign", mode: "needs a wallet to sign" },
};

const PARAMS: [string, string, string][] = [
  ["hash", "m (selector, topic, normalise, text, hex), sig, text, hex", "/tools/hash?sig=transfer(address,uint256)"],
  ["units", "f (wei, gwei, bot, token), v, d (token decimals)", "/tools/units?f=gwei&v=20"],
  ["abi", "m (encode, decode, args), sig, vals, data, types, cvals", "/tools/abi?m=decode"],
  ["address", "a", "/tools/address?a=0x…"],
  ["time", "ts, u (s or ms), d, n (net), b (block)", "/tools/time?ts=1700000000"],
  ["gas", "g (gas units), n (testnet or mainnet)", "/tools/gas?g=21000&n=mainnet"],
  ["sign", "msg, m (text or hash), vmsg, vsig, vm, vexp", "/tools/sign?m=hash"],
];

const net = NETWORKS[APP_NET];
const stAddr = STATEMENTS_ADDRESS[APP_NET];

export default function Docs() {
  const [active, setActive] = useState<string>(SECTIONS[0][0]);
  useEffect(() => {
    document.title = "Docs · BOT Toolbox";
  }, []);
  // highlight the section that is currently under the top of the viewport
  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let cur = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = els[els.length - 1]?.id;
      if (cur) setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="page docs">
      <aside className="docs-toc" aria-label="On this page">
        <div className="lbl">Docs</div>
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "true" : undefined}>{label}</a>)}
        <div className="lbl" style={{ marginTop: 22 }}>Guides</div>
        {GUIDES.map((g) => <Link key={g.slug} to={`/guides/${g.slug}`}>{g.title}</Link>)}
      </aside>

      <article className="docs-body">
        <header>
          <div className="lbl">documentation</div>
          <h1 className="vt">BOT Toolbox docs</h1>
          <p className="docs-lede">Everything the toolbox does, how to share a result, and how a signed statement is checked. It is a static site: no server, no account, nothing to install.</p>
        </header>

        <section id="overview">
          <h2>Overview</h2>
          <p>BOT Toolbox is a set of small developer tools for BOT Chain that run in your browser, plus a contract called <b>Statements</b> where people record messages they signed with their wallet. Every calculation uses <code>ethers.js</code> v6 locally. Only the live tools (gas, blocks, balances, statements) call the public RPC. When the RPC is down, the offline tools keep working.</p>
          <p>Open the <Link to="/tools">toolbox</Link> and press <kbd>ctrl</kbd> <kbd>K</kbd> to find a tool.</p>
        </section>

        <section id="tools">
          <h2>The eight tools</h2>
          <div className="docs-tools">
            {TOOLS.map((t, i) => (
              <div key={t.slug} className="docs-tool">
                <div className="dt-hd"><span>{String(i + 1).padStart(2, "0")}</span><b>{t.name}</b><i className="badge">{TOOL_DOCS[t.slug].mode}</i></div>
                <p>{TOOL_DOCS[t.slug].does}</p>
                <Link to={TOOL_DOCS[t.slug].example} className="dt-try">Open {t.name} →</Link>
              </div>
            ))}
          </div>
          <p>Every tool has a <b>copy as code</b> drawer under its card. It shows the ethers.js lines that do the same thing, filled in with what you typed.</p>
        </section>

        <section id="links">
          <h2>Shareable links</h2>
          <p>Every input lives in the URL, so a link carries the exact result you are looking at. Copy it with <b>copy link</b> at the top of each tool. Fields start empty; a parameter appears in the link only after you fill the field.</p>
          <table className="tbl">
            <thead><tr><th>Tool</th><th>Parameters</th><th>Example</th></tr></thead>
            <tbody>
              {PARAMS.map(([t, p, e]) => (
                <tr key={t}><td>{t}</td><td>{p}</td><td><Link to={e.replace("…", "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")}>{e}</Link></td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="keys">
          <h2>Keyboard shortcuts</h2>
          <table className="tbl">
            <thead><tr><th>Keys</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td><kbd>ctrl</kbd> <kbd>K</kbd> or <kbd>⌘</kbd> <kbd>K</kbd></td><td>Open the command bar and find any tool</td></tr>
              <tr><td><kbd>alt</kbd> <kbd>1</kbd> to <kbd>8</kbd></td><td>Jump straight to a tool: 1 Units, 2 Hash, 3 ABI, 4 Address, 5 Time, 6 Gas, 7 Network, 8 Sign</td></tr>
              <tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></td><td>Move through and open results in the command bar</td></tr>
              <tr><td><kbd>Esc</kbd></td><td>Close the command bar</td></tr>
            </tbody>
          </table>
        </section>

        <section id="signing">
          <h2>Sign, record, verify</h2>
          <ol className="docs-steps">
            <li><div><b>Sign.</b> Write a message in <Link to="/tools/sign">Sign</Link> and sign it with your wallet. Nothing is sent to the chain and it costs no gas.</div></li>
            <li><div><b>Record.</b> Press <i>record on BOT Chain</i>. One transaction stores the statement. The contract recovers the signer itself, so a record can never name a signer who did not sign.</div></li>
            <li><div><b>Verify.</b> Open <code>/verify/&lt;id&gt;</code>. It shows the text, the signer, the date and "Signature verified by the contract", and re-checks the signature in your browser with <code>verifyMessage</code>.</div></li>
          </ol>
          <h3>Two signing modes</h3>
          <table className="tbl">
            <thead><tr><th>Mode</th><th>What the wallet signs</th><th>What goes on chain</th></tr></thead>
            <tbody>
              <tr><td>Public text</td><td>The readable text, so your wallet shows it exactly as written</td><td>Hash, signature and the text itself (up to {MAX_TEXT_BYTES} bytes)</td></tr>
              <tr><td>Hash only</td><td>The 32 raw bytes of the hash of your text</td><td>Hash and signature only. The text stays with you</td></tr>
            </tbody>
          </table>
          <p>Both are EIP-191 <code>personal_sign</code> signatures and verify with <code>ethers.verifyMessage</code>. In hash-only mode keep the text: nobody can recover it from the hash. To check a message against the chain, paste it on the <Link to="/verify">verify page</Link>.</p>
        </section>

        <section id="networks">
          <h2>Networks and contract</h2>
          <table className="tbl">
            <thead><tr><th></th><th>BOT Chain</th><th>BOT Chain Testnet</th></tr></thead>
            <tbody>
              <tr><td>Chain id</td><td>{NETWORKS.mainnet.chainId}</td><td>{NETWORKS.testnet.chainId}</td></tr>
              <tr><td>RPC</td><td>{NETWORKS.mainnet.rpc}</td><td>{NETWORKS.testnet.rpc}</td></tr>
              <tr><td>Explorer</td><td><ExtLink href={NETWORKS.mainnet.explorer}>{NETWORKS.mainnet.explorer.replace("https://", "")}</ExtLink></td><td><ExtLink href={NETWORKS.testnet.explorer}>{NETWORKS.testnet.explorer.replace("https://", "")}</ExtLink></td></tr>
              <tr><td>Currency</td><td>{NETWORKS.mainnet.symbol}</td><td>{NETWORKS.testnet.symbol}</td></tr>
              <tr><td>Faucet</td><td>none</td><td><ExtLink href={NETWORKS.testnet.faucet ?? LINKS.docs}>faucet.botchain.ai</ExtLink></td></tr>
              <tr><td>Statements contract</td><td>{STATEMENTS_ADDRESS.mainnet ? <ExtLink href={`${NETWORKS.mainnet.explorer}/address/${STATEMENTS_ADDRESS.mainnet}`}>{STATEMENTS_ADDRESS.mainnet}</ExtLink> : "not deployed yet"}</td><td>{STATEMENTS_ADDRESS.testnet ? <ExtLink href={`${NETWORKS.testnet.explorer}/address/${STATEMENTS_ADDRESS.testnet}`}>{STATEMENTS_ADDRESS.testnet}</ExtLink> : "not deployed yet"}</td></tr>
            </tbody>
          </table>
          <p>The site currently records and verifies statements on <b>{net.label}</b>{stAddr ? "" : " (contract not deployed yet)"}. The contract has no owner, no admin and no payments, and it cannot be upgraded. The <Link to="/tools/network">Network tool</Link> adds either chain to MetaMask in one click. More about BOT Chain is in its <ExtLink href={LINKS.docs}>own docs</ExtLink>.</p>
        </section>

        <section id="wallet">
          <h2>Wallet and safety</h2>
          <ul className="docs-list">
            <li>Every tool except signing and recording works <b>without a wallet</b>. Connect, disconnect, change account and a one-click switch to the right network are in the wallet menu at the top.</li>
            <li>The site <b>never asks for a private key or seed phrase</b>, and there is no private-key tool on purpose. Never paste either anywhere.</li>
            <li>Only sign messages you understand. The signing screen shows exactly what your wallet will be asked to sign.</li>
            <li>The site has no backend, accounts or analytics. See <Link to="/privacy">Privacy</Link> and <Link to="/terms">Terms</Link>.</li>
          </ul>
        </section>

        <section id="limits">
          <h2>Limits</h2>
          <ul className="docs-list">
            <li>Recorded statements are <b>permanent</b>. There is no delete. Use hash-only mode when the text should stay private.</li>
            <li>Public text is limited to {MAX_TEXT_BYTES} <b>bytes</b>, not characters, so accented letters and emoji use more than one.</li>
            <li>Anyone can submit a valid signature. The recorded signer is always the real signer, but the account that paid for the transaction may be someone else. A record proves a key signed these exact words, not that the words are true.</li>
            <li>The gas presets (about 21,000, 50,000 and 1,000,000) are rough examples.</li>
            <li>Public RPCs sometimes reset connections. Reads retry up to three times before a problem is shown.</li>
            <li>Out of scope: private-key tools, typed-data (EIP-712) signing, sending arbitrary transactions.</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
