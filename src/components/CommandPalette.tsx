import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LINKS, TOOLS } from "../lib/config";
import { Icon } from "./icons";

interface Item {
  id: string;
  label: string;
  hint: string;
  keys: string;
  run: () => void;
  icon?: (typeof TOOLS)[number]["slug"];
}

export const openPalette = () => window.dispatchEvent(new Event("bt:palette"));

export default function CommandPalette() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items: Item[] = useMemo(
    () => [
      ...TOOLS.map((t, i) => ({ id: t.slug, label: t.name, hint: `alt ${i + 1}`, keys: `${t.slug} ${t.blurb}`, icon: t.slug, run: () => nav(`/tools/${t.slug}`) })),
      { id: "verify", label: "Verify a statement", hint: "/verify", keys: "statements verify record signed", run: () => nav("/verify") },
      { id: "home", label: "Home", hint: "/", keys: "home website", run: () => nav("/") },
      { id: "docs", label: "BOT Chain docs", hint: "opens a new tab", keys: "docs documentation botchain", run: () => window.open(LINKS.docs, "_blank", "noopener") },
    ],
    [nav]
  );
  const list = items.filter((i) => (i.label + " " + i.keys).toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.altKey && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        nav(`/tools/${TOOLS[Number(e.key) - 1].slug}`);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bt:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bt:palette", onOpen);
    };
  }, [nav]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);

  if (!open) return null;
  const go = (i: Item | undefined) => {
    if (!i) return;
    setOpen(false);
    i.run();
  };
  return (
    <div className="pal-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a tool…"
          aria-label="Find a tool"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === "Enter") go(list[sel]);
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {list.length === 0 ? (
          <div className="empty">No tool matches “{q}”.</div>
        ) : (
          <ul role="listbox">
            {list.map((i, n) => (
              <li key={i.id}>
                <button role="option" aria-selected={n === sel} onMouseEnter={() => setSel(n)} onClick={() => go(i)}>
                  {i.icon ? <Icon name={i.icon} /> : <span style={{ width: 18 }} />}
                  {i.label}
                  <small>{i.hint}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
