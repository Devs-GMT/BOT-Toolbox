import { useEffect } from "react";

const DOCS = {
  privacy: {
    title: "Privacy",
    updated: "November 2026",
    body: [
      ["What we collect", "Nothing. BOT Toolbox has no accounts, no backend, no analytics and no cookies. The site is static files that run in your browser."],
      ["What stays in your browser", "Everything you type into a tool stays on your device. Some tool inputs are written into the page URL so you can share a link; that URL is only shared if you share it. The site stores one small flag in your browser (whether you pressed disconnect) so your wallet is not re-connected against your wishes."],
      ["Who sees your requests", "Live tools (gas, blocks, balances, statements) call the public BOT Chain RPC endpoints directly from your browser. Those operators can see your IP address and the addresses you query, as with any public RPC. The site's host can see ordinary web-server logs such as your IP address when you load a page."],
      ["Your wallet", "The site asks your wallet to connect, sign messages and send one kind of transaction: recording a statement. It never sees your private key or seed phrase and never asks for them."],
      ["What goes on chain is public", "A recorded statement, including its text if you chose public text, its hash, your address and your signature, is public and permanent. It cannot be edited or deleted. Use hash-only mode if the text should stay private."],
    ],
  },
  terms: {
    title: "Terms",
    updated: "November 2026",
    body: [
      ["As is", "BOT Toolbox is provided as is, without warranties of any kind. Outputs are computed with open-source libraries and checked by tests, but you are responsible for checking anything before you rely on it, especially anything involving funds."],
      ["Not advice", "Nothing here is financial, legal or investment advice. Gas figures and the preset examples are rough illustrations, real costs vary."],
      ["Signing", "Only sign messages you understand. A signature can authorise actions in other applications. You are responsible for what you sign and for what you record on chain."],
      ["The Statements contract", "The contract has no owner, no admin and no way to remove a record. Statements are permanent. A recorded statement proves that a key signed some words, not that the words are true or that the signer is who they claim to be."],
      ["Testnet", "While the app is pointed at BOT Chain Testnet, test tokens have no value and records on that network may be reset or lost."],
    ],
  },
} as const;

export function Legal({ kind }: { kind: keyof typeof DOCS }) {
  const d = DOCS[kind];
  useEffect(() => {
    document.title = `${d.title} · BOT Toolbox`;
  }, [d.title]);
  return (
    <article className="page" style={{ maxWidth: 720 }}>
      <h1 className="mono vt">{d.title}</h1>
      <p className="muted mono" style={{ fontSize: 13, margin: "6px 0 28px" }}>Last updated {d.updated}</p>
      <div style={{ display: "grid", gap: 22 }}>
        {d.body.map(([h, p]) => (
          <section key={h}>
            <h2 className="mono" style={{ fontSize: 17, letterSpacing: "-0.02em", marginBottom: 6 }}>{h}</h2>
            <p style={{ lineHeight: 1.65 }}>{p}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
