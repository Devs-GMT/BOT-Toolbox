import { useState } from "react";
import { TOOLS, type ToolSlug } from "../lib/config";
import { copyText } from "./ui";

const META: Record<ToolSlug, { desc: string; badge: string; kind: "off" | "live" | "wallet" }> = {
  units: { desc: "Move between wei, gwei, BOT and any token decimals. Type in one field and the others follow.", badge: "Offline", kind: "off" },
  hash: { desc: "keccak256 of text or hex, function selectors, event topics, and a normaliser for messy signatures.", badge: "Offline", kind: "off" },
  abi: { desc: "Encode a call into calldata, decode calldata back into values, or encode constructor arguments for the explorer.", badge: "Offline", kind: "off" },
  address: { desc: "Validate an address, fix its checksum, tell a contract from a wallet and read its balance on both networks.", badge: "Offline + live RPC", kind: "live" },
  time: { desc: "Unix time to dates in your timezone and UTC, relative time, and blocks to approximate time.", badge: "Offline + live RPC", kind: "live" },
  gas: { desc: "The live gas price, refreshed every few seconds, and what any amount of gas costs.", badge: "Live RPC", kind: "live" },
  network: { desc: "Both BOT Chain networks from one config: RPCs, explorers, the faucet and one-click add to MetaMask.", badge: "Live RPC", kind: "live" },
  sign: { desc: "Sign a message, verify any signature, and record it on BOT Chain so anyone can check it.", badge: "Needs a wallet to sign", kind: "wallet" },
};

/** Page header for every tool: kicker, serif title, one-line description, and the share action. */
export default function PageHead({ slug, demo = false }: { slug: ToolSlug; demo?: boolean }) {
  const t = TOOLS.find((x) => x.slug === slug)!;
  const idx = TOOLS.findIndex((x) => x.slug === slug) + 1;
  const m = META[slug];
  const [copied, setCopied] = useState(false);
  return (
    <header className="ph">
      <div className="ph-kicker">
        <span>{String(idx).padStart(2, "0")}</span>
        <span>{t.name}</span>
        <i className={`badge ${m.kind}`}>{m.badge}</i>
      </div>
      <h1>{t.name}</h1>
      <p>{m.desc}</p>
      {(
        <div className="ph-actions">
          <button
            type="button"
            className="btn btn-line btn-sm"
            tabIndex={demo ? -1 : undefined}
            onClick={async () => {
              if (demo) return;
              setCopied(await copyText(window.location.href));
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? "link copied" : "copy link"}
          </button>
          <span className="hint-k">Every input lives in the link. Press <span className="kbd">ctrl k</span> to jump to a tool.</span>
        </div>
      )}
    </header>
  );
}
