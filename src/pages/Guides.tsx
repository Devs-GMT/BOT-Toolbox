import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import NotFound from "./NotFound";

export interface GuideData {
  slug: string;
  title: string;
  lede: string;
  minutes: number;
  tool: { to: string; label: string };
  body: { h?: string; p: string }[];
}

export const GUIDES: GuideData[] = [
  {
    slug: "function-selector",
    title: "What's a function selector?",
    lede: "The four bytes at the start of every contract call.",
    minutes: 2,
    tool: { to: "/tools/hash?sig=transfer(address,uint256)", label: "Try it in the Hash tool" },
    body: [
      { p: "When a wallet calls a contract function, the transaction data starts with four bytes that say which function is meant. That is the function selector. The contract reads it first and jumps to the matching code." },
      { h: "How it is made", p: "Take the function signature, written as the name plus the parameter types, with no spaces and no parameter names. For transfer(address,uint256) that is exactly those characters. Hash them with keccak256 and keep the first four bytes. The result for this signature is 0xa9059cbb." },
      { h: "Why you meet it", p: "Block explorers show a raw selector when they do not know the function. If you have the signature you can check a guess in seconds. Calldata decoding starts from it, and so does reading what a transaction really does." },
      { h: "One caveat", p: "Four bytes is a small space, so two different signatures can share a selector. It is rare, but it is why you should trust the full signature from the verified source, not a selector alone." },
    ],
  },
  {
    slug: "wei-gwei-bot",
    title: "wei, gwei and BOT",
    lede: "Three names for the same number, at different sizes.",
    minutes: 2,
    tool: { to: "/tools/units", label: "Open the Units tool" },
    body: [
      { p: "Blockchains store money as whole numbers, so there are no decimals on chain. The smallest unit is the wei. One BOT is 1,000,000,000,000,000,000 wei, which is 10^18." },
      { h: "Where gwei fits", p: "Gas prices are tiny per unit, so they are quoted in gwei, which is 10^9 wei. A gas price of 20 gwei means each unit of gas costs 20,000,000,000 wei." },
      { h: "A worked example", p: "A plain transfer uses about 21,000 gas. At 20 gwei that is 21,000 x 20 x 10^9 = 420,000,000,000,000 wei, or 0.00042 BOT. The Gas tool shows the live price and does this sum for you. Real usage varies by call, so treat the 21,000 as a rough example." },
      { h: "Tokens have their own decimals", p: "A token chooses how many decimals it shows. Many stablecoins use 6, so 1.5 tokens is stored as 1,500,000. If you mix up 6 and 18 decimals the amount is off by a factor of a trillion, so check the token's decimals before converting." },
    ],
  },
  {
    slug: "message-signing",
    title: "How message signing works",
    lede: "Proving you wrote something, without sending a transaction.",
    minutes: 3,
    tool: { to: "/tools/sign", label: "Open the Sign tool" },
    body: [
      { p: "Your wallet holds a private key. Signing a message uses that key to produce a signature that anyone can check against your public address. Nothing is sent to the chain and it costs no gas." },
      { h: "The prefix", p: "Wallets do not sign your raw text. Under EIP-191 they sign the text with a fixed prefix, the line \"\\x19Ethereum Signed Message:\\n\" plus the length. That prefix makes sure a signed message can never double as a valid transaction." },
      { h: "Checking a signature", p: "Given the message and the signature, anyone can recover the address that signed it. If the recovered address is the one you expected, the message came from that wallet and was not changed. If one character is different, the recovered address is a different one." },
      { h: "Recording it on BOT Chain", p: "BOT Toolbox can also record a signed statement in a small contract. The contract recovers the signer itself, so nobody can record a signature in someone else's name. You can sign public text, which your wallet shows as readable words, or hash only, where just the hash goes on chain and the text stays with you." },
      { h: "What a signature does not prove", p: "It proves a key signed these exact words. It does not prove the signer is who they say they are, or that the words are true. And never sign something you do not understand: a signature can authorise things in other apps. Your seed phrase and private key never belong in any website." },
    ],
  },
];

export function Guide() {
  const { slug } = useParams();
  const g = GUIDES.find((x) => x.slug === slug);
  useEffect(() => {
    document.title = g ? `${g.title} · BOT Toolbox` : "BOT Toolbox";
  }, [g]);
  if (!g) return <NotFound />;
  return (
    <article className="page" style={{ maxWidth: 720 }}>
      <Link to="/#guides" className="mono muted" style={{ fontSize: 13 }}>← guides</Link>
      <h1 className="mono vt" style={{ marginTop: 16 }}>{g.title}</h1>
      <p className="muted" style={{ fontSize: 19, margin: "10px 0 28px" }}>{g.lede} <span className="mono" style={{ fontSize: 13 }}>· {g.minutes} min</span></p>
      <div style={{ display: "grid", gap: 20 }}>
        {g.body.map((b, i) => (
          <section key={i}>
            {b.h && <h2 className="mono" style={{ fontSize: 17, letterSpacing: "-0.02em", marginBottom: 6 }}>{b.h}</h2>}
            <p style={{ lineHeight: 1.65 }}>{b.p}</p>
          </section>
        ))}
      </div>
      <div style={{ marginTop: 32 }}>
        <Link className="btn btn-accent" to={g.tool.to}>{g.tool.label} →</Link>
      </div>
    </article>
  );
}
