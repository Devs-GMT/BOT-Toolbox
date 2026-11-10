import { getBytes, id as hashId } from "ethers";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { APP_NET, NETWORKS } from "../lib/config";
import { getStatement, getTotal, idsForHash, isDeployed, recover, statementsAddress, type StatementView } from "../lib/statements";
import { short } from "../lib/tools";
import { CopyButton, ExtLink, Field, Notice, Seg, copyText } from "../components/ui";

const net = NETWORKS[APP_NET];
const fmtDate = (s: number) => new Date(s * 1000).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " UTC";

export default function Verify() {
  const { id } = useParams();
  useEffect(() => {
    document.title = id !== undefined ? `Statement #${id} · BOT Toolbox` : "Verify a statement · BOT Toolbox";
  }, [id]);
  return (
    <div className="page">
      {id !== undefined ? <StatementPage idText={id} /> : <Lookup />}
    </div>
  );
}

function StatementPage({ idText }: { idText: string }) {
  const [state, setState] = useState<"loading" | "ok" | "missing" | "down">("loading");
  const [s, setS] = useState<StatementView | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!/^\d+$/.test(idText)) return setState("missing");
    setState("loading");
    try {
      const v = await getStatement(Number(idText));
      setS(v);
      setState(v ? "ok" : "missing");
    } catch {
      setState("down");
    }
  }, [idText]);
  useEffect(() => {
    if (isDeployed) void load();
  }, [load]);

  if (!isDeployed) return <Notice>The Statements contract is not deployed on {net.label} yet.</Notice>;
  if (state === "loading") return <p className="muted mono">Reading statement #{idText} from {net.label}…</p>;
  if (state === "down")
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Notice kind="warn"><b>RPC not responding.</b> We could not reach {net.label} just now. Nothing is wrong with the statement.</Notice>
        <div><button className="btn btn-ink btn-sm" onClick={load}>retry</button></div>
      </div>
    );
  if (state === "missing" || !s)
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <h1 className="mono vt">Statement not found</h1>
        <p className="muted">There is no statement #{idText.slice(0, 20)} on {net.label}.</p>
        <div><Link className="btn btn-ink btn-sm" to="/verify">look up another</Link></div>
      </div>
    );

  const hashOnly = s.text === "";
  let local: string | null = null;
  try {
    local = recover(hashOnly ? getBytes(s.messageHash) : s.text, s.signature);
  } catch {
    local = null;
  }
  const localOk = local !== null && local.toLowerCase() === s.signer.toLowerCase();

  return (
    <article style={{ display: "grid", gap: 20 }}>
      <div>
        <div className="lbl">statement #{s.id} · {net.label}</div>
        <h1 className="mono vt" style={{ color: "var(--ok)" }}>
          ✓ Signed by {short(s.signer, 6, 4)} on {fmtDate(s.at).replace(/ at .*/, "")}
        </h1>
      </div>

      <div className="tcard">
        <div className="tcard-hd">
          <span className="name"><i className="sq ok" />statement.{hashOnly ? "hash" : "text"}</span>
          <span className="muted">{hashOnly ? "text is private" : "text is public"}</span>
        </div>
        <div className="tcard-bd">
          {hashOnly ? (
            <Notice>The signer chose not to publish the text. Only its hash is on chain. If you have the original text, paste it on the <Link to="/verify" style={{ color: "var(--accent-ink)" }}>lookup page</Link> to check it matches.</Notice>
          ) : (
            <blockquote className="quote">{s.text}</blockquote>
          )}
          <dl className="kv">
            <dt>signer</dt>
            <dd>{s.signer} <CopyButton text={s.signer} /> · <ExtLink href={`${net.explorer}/address/${s.signer}`}>explorer</ExtLink></dd>
            <dt>recorded</dt>
            <dd>{fmtDate(s.at)}</dd>
            <dt>message hash</dt>
            <dd>{s.messageHash} <CopyButton text={s.messageHash} /></dd>
            <dt>signature</dt>
            <dd>{s.signature} <CopyButton text={s.signature} /></dd>
            <dt>contract</dt>
            <dd><ExtLink href={`${net.explorer}/address/${statementsAddress}`}>{short(statementsAddress, 8, 6)}</ExtLink></dd>
          </dl>
          <Notice kind="good"><b>✓ Signature verified by the contract.</b> The contract recovered the signer itself when this was recorded, so it cannot be a fake.</Notice>
          <Notice kind={localOk ? "good" : "bad"}>
            {localOk ? <><b>✓ Checked again in your browser.</b> The signature recovers to the same signer, using ethers.js verifyMessage.</> : <><b>✗ Browser check failed.</b> Recovered {local ?? "nothing"}. Do not trust this record until you know why.</>}
          </Notice>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-line btn-sm" onClick={async () => { setCopied(await copyText(window.location.href)); setTimeout(() => setCopied(false), 1300); }}>
          {copied ? "link copied" : "copy link"}
        </button>
        <Link className="btn btn-line btn-sm" to="/tools/sign">sign your own</Link>
      </div>
    </article>
  );
}

function Lookup() {
  const nav = useNavigate();
  const [num, setNum] = useState("");
  const [kind, setKind] = useState<"text" | "hash">("text");
  const [msg, setMsg] = useState("");
  const [found, setFound] = useState<number[] | null | "down" | "bad">(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<StatementView[] | null | "down">(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!isDeployed) return;
    let stop = false;
    (async () => {
      try {
        const t = await getTotal();
        if (stop) return;
        setTotal(t);
        const ids = Array.from({ length: Math.min(5, t) }, (_, i) => t - 1 - i);
        const rows = (await Promise.all(ids.map((i) => getStatement(i)))).filter(Boolean) as StatementView[];
        if (!stop) setRecent(rows);
      } catch {
        if (!stop) setRecent("down");
      }
    })();
    return () => { stop = true; };
  }, []);

  const goNum = (e: FormEvent) => {
    e.preventDefault();
    if (/^\d+$/.test(num.trim())) nav(`/verify/${num.trim()}`);
  };
  const check = async (e: FormEvent) => {
    e.preventDefault();
    if (!msg) return;
    let hash: string;
    if (kind === "text") hash = hashId(msg);
    else if (/^0x[0-9a-fA-F]{64}$/.test(msg.trim())) hash = msg.trim();
    else return setFound("bad");
    setBusy(true);
    setFound(null);
    try {
      setFound(await idsForHash(hash));
    } catch {
      setFound("down");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 760 }}>
      <div>
        <div className="lbl">statements</div>
        <h1 className="mono vt">Verify a signed statement</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          A statement is a message someone signed with their wallet and recorded on {net.label}. The contract checks the signature itself, so a recorded statement cannot name a signer who did not sign it.
        </p>
      </div>
      {!isDeployed && <Notice>The Statements contract is not deployed on {net.label} yet.</Notice>}

      <form className="tcard" onSubmit={goNum}>
        <div className="tcard-hd"><span className="name"><i className="sq idle" />open by number</span></div>
        <div className="tcard-bd">
          <Field id="vn" label="statement number" value={num} inputMode="numeric" placeholder="0" onChange={setNum} />
          <div><button className="btn btn-ink" disabled={!/^\d+$/.test(num.trim())}>open statement →</button></div>
        </div>
      </form>

      <form className="tcard" onSubmit={check}>
        <div className="tcard-hd"><span className="name"><i className="sq idle" />was this message recorded?</span></div>
        <div className="tcard-bd">
          <Seg label="message kind" value={kind} options={[{ id: "text", label: "text" }, { id: "hash", label: "32-byte hash" }]} onChange={setKind} />
          <Field id="vm" label={kind === "text" ? "message" : "message hash"} multiline value={msg} placeholder={kind === "text" ? "Paste the exact message" : "0x…"} onChange={(v) => { setMsg(v); setFound(null); }} />
          <div><button className="btn btn-ink" disabled={!msg || busy || !isDeployed}>{busy ? "checking…" : "check the chain"}</button></div>
          {found === "bad" && <Notice kind="bad">A hash is 0x followed by 64 hex digits.</Notice>}
          {found === "down" && <Notice kind="warn">RPC not responding. Try again in a moment.</Notice>}
          {Array.isArray(found) && (found.length === 0 ? <Notice>Not recorded on {net.label}. Check for stray spaces or line breaks, the hash changes with every character.</Notice> : (
            <Notice kind="good"><b>Recorded.</b> {found.map((i, k) => <span key={i}>{k > 0 && ", "}<Link to={`/verify/${i}`} style={{ color: "var(--accent-ink)" }}>#{i}</Link></span>)}</Notice>
          ))}
        </div>
      </form>

      {isDeployed && (
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>latest statements{total !== null ? ` · ${total} total` : ""}</div>
          {recent === null && <p className="muted mono">loading…</p>}
          {recent === "down" && <p className="muted">RPC not responding.</p>}
          {Array.isArray(recent) && recent.length === 0 && <p className="muted">Nothing has been recorded yet. Be the first: <Link to="/tools/sign" style={{ color: "var(--accent-ink)" }}>sign a message</Link>.</p>}
          {Array.isArray(recent) && recent.length > 0 && (
            <table className="tbl">
              <thead><tr><th>#</th><th>signer</th><th>text</th><th>when (UTC)</th></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td><Link to={`/verify/${r.id}`} style={{ color: "var(--accent-ink)" }}>#{r.id}</Link></td>
                    <td>{short(r.signer, 6, 4)}</td>
                    <td>{r.text ? (r.text.length > 60 ? r.text.slice(0, 60) + "…" : r.text) : <span className="muted">hash only</span>}</td>
                    <td>{fmtDate(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
