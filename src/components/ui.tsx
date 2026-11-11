import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { TOOLS, type ToolSlug } from "../lib/config";
import { InputError } from "../lib/tools";
import { Icon } from "./icons";

// ---------- shareable state: every input lives in the URL ----------

export function useQueryState<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const [params, setParams] = useSearchParams();
  const defaultsRef = useRef(defaults);
  const value = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(defaultsRef.current)) out[k] = params.get(k) ?? defaultsRef.current[k];
    return out as T;
  }, [params]);
  const set = useCallback(
    (patch: Partial<T>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === "" || v === defaultsRef.current[k]) next.delete(k);
            else next.set(k, v as string);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  return [value, set];
}

/** Run a pure function that may throw InputError and turn it into { value, error }. */
export function attempt<V>(fn: () => V): { value: V | null; error: string | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    if (e instanceof InputError) return { value: null, error: e.message };
    return { value: null, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

// ---------- copy ----------

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1300);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button type="button" className="copy" onClick={async () => setDone(await copyText(text))} aria-label={`${label} to clipboard`}>
      {done ? "copied" : label}
    </button>
  );
}

// ---------- form pieces ----------

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  hint?: ReactNode;
  id: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  const { label, value, onChange, error, placeholder, multiline, rows, hint, id, inputMode } = props;
  const common = {
    id,
    value,
    placeholder,
    spellCheck: false,
    autoComplete: "off",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-err` : undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  } as const;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea className="textarea" rows={rows ?? 3} {...common} /> : <input className="input" inputMode={inputMode} {...common} />}
      {error ? (
        <div className="err-msg" id={`${id}-err`} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}

export function Result({ label, value, highlight, empty = "…" }: { label: string; value: string | null | undefined; highlight?: boolean; empty?: string }) {
  const has = value !== null && value !== undefined && value !== "";
  return (
    <div className="res">
      <div className="lbl">{label}</div>
      <div className={`res-box${highlight ? " hl" : ""}`}>
        <span className="val" key={has ? value : "empty"} style={has ? undefined : { color: "var(--faint)" }}>
          {has ? value : empty}
        </span>
        {has && <span key={`f-${value}`} className="flash" style={{ position: "absolute", inset: 0 }} aria-hidden="true" />}
        {has && <CopyButton text={value as string} />}
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- tool frame ----------

export function ToolFrame(props: { slug: ToolSlug; mode?: string; status?: "ok" | "err" | "idle" | "live"; code?: string; children: ReactNode }) {
  const { slug, mode, status = "ok", code, children } = props;
  const idx = TOOLS.findIndex((t) => t.slug === slug) + 1;
  const [open, setOpen] = useState(false);
  return (
    <section className="tcard" aria-label={`${slug} tool`}>
      <div className="tcard-hd">
        <span className="name">
          <span className="ic"><Icon name={slug} size={14} /></span>
          {String(idx).padStart(2, "0")} {slug}
          {mode ? `.${mode}` : ""}
        </span>
        <span className="st"><i className={`sq ${status === "live" ? "" : status}`} />{status === "err" ? "check input" : status === "idle" ? "waiting" : status === "live" ? "live" : "ready"}</span>
      </div>
      <div className="tcard-bd">{children}</div>
      {code && (
        <div className="drawer">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span>copy as code · ethers.js</span>
            <span>{open ? "hide" : "show"}</span>
          </button>
          {open && (
            <pre>
              <span style={{ position: "absolute", right: 12, top: 10 }}>
                <CopyButton text={code} />
              </span>
              <Highlight code={code} />
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

function Highlight({ code }: { code: string }) {
  const parts = code.split(/(\/\/.*$|"[^"]*"|\b(?:import|from|const|await|new)\b)/gm);
  return (
    <code>
      {parts.map((p, i) =>
        p.startsWith("//") ? (
          <span key={i} className="tk-c">{p}</span>
        ) : p.startsWith('"') ? (
          <span key={i} className="tk-s">{p}</span>
        ) : /^(import|from|const|await|new)$/.test(p) ? (
          <span key={i} className="tk-k">{p}</span>
        ) : (
          p
        )
      )}
    </code>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "bad" | "good"; children: ReactNode }) {
  return <div className={`note${kind === "info" ? "" : " " + kind}`} role={kind === "bad" ? "alert" : undefined}>{children}</div>;
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 4, alignItems: "center", color: "var(--accent-ink)" }}>
      {children}
      <Icon name="ext" size={13} />
    </a>
  );
}

/** Block number with a digit roll. Each digit is a column of 0-9 that slides with transform. */
export function Odometer({ value }: { value: number }) {
  const s = value.toLocaleString("en-US");
  return (
    <span className="odo" aria-label={s} role="text">
      {s.split("").map((ch, i, arr) =>
        /\d/.test(ch) ? (
          <span className="col" key={arr.length - i} aria-hidden="true">
            <span style={{ transform: `translateY(${-Number(ch) * 1.2}em)` }}>
              {Array.from({ length: 10 }, (_, d) => (
                <i key={d}>{d}</i>
              ))}
            </span>
          </span>
        ) : (
          <span className="sep" key={arr.length - i} aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </span>
  );
}
