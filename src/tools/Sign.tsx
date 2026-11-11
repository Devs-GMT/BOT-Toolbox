import { getBytes, id, isHexString } from "ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APP_NET, NETWORKS } from "../lib/config";
import {
  describeContractError,
  digestOf,
  draftProblem,
  idsForHash,
  getStatement,
  isDeployed,
  makeDraft,
  recordStatement,
  recover,
  type SignMode,
} from "../lib/statements";
import { short, utf8Length } from "../lib/tools";
import { connect, getSigner, switchTo, useWallet, walletErrorMessage } from "../lib/wallet";
import { ExtLink, Field, Notice, Result, Seg, ToolFrame, attempt, useQueryState } from "../components/ui";

const SAFETY = "Never sign messages you don't understand, and never paste your private key or seed phrase anywhere.";

export default function Sign() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Notice kind="warn">
        <b>Read before you sign.</b> {SAFETY} This page never asks for a private key. Your wallet signs, the page only sees the signature.
      </Notice>
      <SignCard />
      <VerifyCard />
    </div>
  );
}

function SignCard() {
  const [q, set] = useQueryState({ msg: "", m: "text" });
  const mode = (q.m === "hash" ? "hash" : "text") as SignMode;
  const w = useWallet();
  const onNet = w.chainId === NETWORKS[APP_NET].chainId;

  const [sig, setSig] = useState<string | null>(null);
  const [signer, setSigner] = useState<string | null>(null);
  const [busy, setBusy] = useState<"sign" | "record" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<{ txHash: string; id: number | null } | null>(null);

  useEffect(() => {
    setSig(null);
    setSigner(null);
    setRec(null);
    setError(null);
  }, [q.msg, mode]);

  const problem = q.msg ? draftProblem(q.msg, mode) : null;
  const draft = makeDraft(q.msg, mode);
  const ready = q.msg !== "" && !problem;

  async function doSign() {
    setError(null);
    setBusy("sign");
    try {
      const s = await getSigner();
      const signature = await s.signMessage(draft.toSign);
      setSig(signature);
      setSigner(recover(draft.toSign, signature));
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function doRecord() {
    if (!sig) return;
    setError(null);
    setBusy("record");
    try {
      const s = await getSigner();
      setRec(await recordStatement(s, draft, sig));
    } catch (e) {
      setError(describeContractError(e));
    } finally {
      setBusy(null);
    }
  }

  const code =
    mode === "text"
      ? `import { BrowserProvider } from "ethers";\n\nconst signer = await new BrowserProvider(window.ethereum).getSigner();\nconst signature = await signer.signMessage(${JSON.stringify(q.msg)});`
      : `import { BrowserProvider, getBytes, id } from "ethers";\n\nconst signer = await new BrowserProvider(window.ethereum).getSigner();\n// hash-only: sign the 32 raw bytes of the hash, the text stays private\nconst signature = await signer.signMessage(getBytes(id(${JSON.stringify(q.msg)})));`;

  return (
    <ToolFrame slug="sign" mode="create" status={problem ? "err" : sig ? "ok" : "idle"} code={code}>
      <Seg
        label="signing mode"
        value={mode}
        options={[
          { id: "text", label: "public text" },
          { id: "hash", label: "hash only" },
        ]}
        onChange={(m) => set({ m })}
      />
      <div className="hint">
        {mode === "text"
          ? "Your wallet shows the text exactly as written. The text is stored on chain and anyone can read it."
          : "Your wallet shows a 32-byte hash. Only the hash goes on chain, the text stays with you. Keep the text: nobody can recover it from the hash."}
      </div>
      <Field
        id="s-msg"
        label="message"
        multiline
        rows={4}
        value={q.msg}
        placeholder="e.g. I approve release v1.2.0"
        error={problem}
        hint={mode === "text" ? `${utf8Length(q.msg)} / 280 bytes` : undefined}
        onChange={(msg) => set({ msg })}
      />

      {ready && (
        <div className="res">
          <div className="lbl">what your wallet will be asked to sign</div>
          {mode === "text" ? (
            <div className="res-box" style={{ display: "block", fontWeight: 400, whiteSpace: "pre-wrap" }}>
              {q.msg}
            </div>
          ) : (
            <div className="res-box" style={{ fontWeight: 400 }}>
              <span className="val">{draft.messageHash} <span className="muted">(32 bytes, keccak256 of your text)</span></span>
            </div>
          )}
          <div className="hint">
            EIP-191 digest <span className="mono">{short(digestOf(draft.toSign), 10, 6)}</span>
          </div>
        </div>
      )}

      {!w.hasProvider ? (
        <Notice>
          No wallet found. Every other tool works without one. To sign, install <ExtLink href="https://metamask.io/download">MetaMask</ExtLink> and reload.
        </Notice>
      ) : !w.account ? (
        <div>
          <button className="btn btn-ink" onClick={() => connect().catch((e) => setError(walletErrorMessage(e)))}>
            connect wallet to sign
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-accent" disabled={!ready || busy !== null} onClick={doSign}>
            {busy === "sign" ? "check your wallet…" : "sign with wallet"}
          </button>
        </div>
      )}

      {error && <Notice kind="bad">{error}</Notice>}

      {sig && (
        <>
          <Result label="signature" value={sig} highlight />
          <Result label="recovered signer" value={signer} />
          {signer && w.account && signer.toLowerCase() !== w.account.toLowerCase() && (
            <Notice kind="bad">The recovered signer does not match the connected account. Do not record this.</Notice>
          )}

          <div className="lbl">record on chain</div>
          {!isDeployed ? (
            <Notice>The Statements contract is not deployed on {NETWORKS[APP_NET].label} yet.</Notice>
          ) : !onNet ? (
            <div>
              <button className="btn btn-ink" onClick={() => switchTo(APP_NET).catch((e) => setError(walletErrorMessage(e)))}>
                switch to {NETWORKS[APP_NET].label}
              </button>
              <div className="hint" style={{ marginTop: 8 }}>
                Recording sends a transaction on {NETWORKS[APP_NET].label}. Signing alone does not.
              </div>
            </div>
          ) : rec ? (
            <Notice kind="good">
              <b>✓ Recorded.</b>{" "}
              {rec.id !== null && (
                <>
                  Statement #{rec.id}.{" "}
                  <Link to={`/verify/${rec.id}`} style={{ color: "var(--accent-ink)" }}>
                    Open the verify page
                  </Link>{" "}
                  ·{" "}
                </>
              )}
              <ExtLink href={`${NETWORKS[APP_NET].explorer}/tx/${rec.txHash}`}>view transaction</ExtLink>
            </Notice>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn-accent" disabled={busy !== null} onClick={doRecord}>
                {busy === "record" ? "waiting for confirmation…" : "record on BOT Chain"}
              </button>
              <span className="hint">{mode === "text" ? "The text becomes public." : "Only the hash becomes public."} A small gas fee applies.</span>
            </div>
          )}
          {error && rec === null && busy === null && isDeployed && onNet && (
            <div className="hint">You can press record again to retry. Nothing was lost.</div>
          )}
        </>
      )}
    </ToolFrame>
  );
}

function VerifyCard() {
  const [q, set] = useQueryState({ vmsg: "", vsig: "", vm: "text", vexp: "" });
  const kind = (q.vm === "hash" ? "hash" : "text") as "text" | "hash";

  const result = attempt(() => {
    if (!q.vmsg || !q.vsig.trim()) return null;
    let message: string | Uint8Array = q.vmsg;
    if (kind === "hash") {
      const h = q.vmsg.trim();
      if (!isHexString(h, 32)) throw new Error("Hash mode expects a 32-byte hex value: 0x followed by 64 hex digits.");
      message = getBytes(h);
    }
    if (!isHexString(q.vsig.trim(), 65)) throw new Error("A signature is 65 bytes of hex: 0x followed by 130 hex digits.");
    return recover(message, q.vsig.trim());
  });
  const recovered = result.value;
  const expected = q.vexp.trim();
  const expectedBad = expected !== "" && !/^0x[0-9a-fA-F]{40}$/.test(expected);
  const match = recovered && expected && !expectedBad ? recovered.toLowerCase() === expected.toLowerCase() : null;

  // is it recorded on chain?
  const [found, setFound] = useState<{ ids: number[]; signerMatch: number[] } | "down" | null>(null);
  useEffect(() => {
    setFound(null);
    if (!recovered || !isDeployed) return;
    const hash = kind === "text" ? id(q.vmsg) : q.vmsg.trim().toLowerCase();
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const ids = await idsForHash(hash);
        const matches: number[] = [];
        for (const i of ids.slice(0, 10)) {
          const s = await getStatement(i);
          if (s && s.signer.toLowerCase() === recovered.toLowerCase()) matches.push(i);
        }
        if (!cancelled) setFound({ ids, signerMatch: matches });
      } catch {
        if (!cancelled) setFound("down");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [recovered, kind, q.vmsg]);

  const code = `import { verifyMessage${kind === "hash" ? ", getBytes" : ""} } from "ethers";\n\nverifyMessage(${kind === "hash" ? `getBytes("${q.vmsg}")` : JSON.stringify(q.vmsg)}, "${q.vsig}"); // "${recovered ?? ""}"`;

  return (
    <ToolFrame slug="sign" mode="verify" status={result.error ? "err" : recovered ? (match === false ? "err" : "ok") : "idle"} code={code}>
      <Seg label="message kind" value={kind} options={[{ id: "text", label: "text message" }, { id: "hash", label: "32-byte hash" }]} onChange={(vm) => set({ vm })} />
      <Field id="v-msg" label={kind === "text" ? "message" : "message hash"} multiline rows={3} value={q.vmsg} placeholder={kind === "text" ? "e.g. I approve release v1.2.0" : "e.g. 0x9f2c…"} onChange={(vmsg) => set({ vmsg })} />
      <Field id="v-sig" label="signature" value={q.vsig} placeholder="0x…" error={result.error} onChange={(vsig) => set({ vsig })} />
      <Field
        id="v-exp"
        label="expected signer (optional)"
        value={q.vexp}
        placeholder="0x…"
        error={expectedBad ? "An address is 0x followed by 40 hex digits." : null}
        onChange={(vexp) => set({ vexp })}
      />

      {recovered && (
        <>
          {match === null && <Notice kind="good"><b>✓ Valid signature.</b> It was made by the address below. Add an expected signer to check it is the one you meant.</Notice>}
          {match === true && <Notice kind="good"><b>✓ Signature matches.</b> The message was signed by the expected address.</Notice>}
          {match === false && (
            <Notice kind="bad">
              <b>✗ Not signed by that address.</b> This signature recovers to a different address, shown below. Either the message was changed or someone else signed it.
            </Notice>
          )}
          <Result label="recovered signer" value={recovered} highlight />
          {isDeployed && found === null && <div className="hint">Checking BOT Chain…</div>}
          {found === "down" && <div className="hint">RPC not responding, could not check the chain. The result above is offline and still correct.</div>}
          {found && found !== "down" && (
            <div className={`note ${found.signerMatch.length ? "good" : ""}`}>
              {found.signerMatch.length ? (
                <>
                  <b>Recorded on BOT Chain:</b>{" "}
                  {found.signerMatch.map((i, k) => (
                    <span key={i}>
                      {k > 0 && ", "}
                      <Link to={`/verify/${i}`} style={{ color: "var(--accent-ink)" }}>
                        #{i}
                      </Link>
                    </span>
                  ))}
                </>
              ) : (
                <>Not recorded on {NETWORKS[APP_NET].label} by this signer.</>
              )}
            </div>
          )}
        </>
      )}
    </ToolFrame>
  );
}
