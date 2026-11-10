import { Link } from "react-router-dom";
import { TOOLS } from "../lib/config";

export default function NotFound({ inApp = false }: { inApp?: boolean }) {
  return (
    <div style={{ padding: inApp ? 0 : "96px var(--pad)", display: "grid", gap: 16, maxWidth: 640 }}>
      <h1 className="mono" style={{ fontSize: 32, letterSpacing: "-0.04em" }}>404 · nothing here</h1>
      <p className="muted">That page or tool does not exist. Pick a tool or go back home.</p>
      <div className="chips">
        {TOOLS.map((t) => (
          <Link key={t.slug} className="chip" to={`/tools/${t.slug}`}>
            {t.name}
          </Link>
        ))}
      </div>
      <div>
        <Link className="btn btn-ink" to="/">home</Link>
      </div>
    </div>
  );
}
