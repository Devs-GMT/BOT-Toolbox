const { expect } = require("chai");
const { ethers } = require("hardhat");

const N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

describe("Statements", () => {
  let c, alice, bob, carol;

  beforeEach(async () => {
    [alice, bob, carol] = await ethers.getSigners();
    c = await (await ethers.getContractFactory("Statements")).deploy();
  });

  // ---- public text mode: the wallet signs the readable text ----

  it("records a public statement signed by wallet 1 and reads it back", async () => {
    const text = "I approve release v1.2.0";
    const hash = ethers.id(text);
    const sig = await alice.signMessage(text);
    await expect(c.record(hash, sig, text)).to.emit(c, "Recorded").withArgs(0, alice.address, hash);
    const s = await c.getStatement(0);
    expect(s.signer).to.equal(alice.address);
    expect(s.messageHash).to.equal(hash);
    expect(s.signature).to.equal(sig);
    expect(s.text).to.equal(text);
    // ethers v6 Result has an Array.prototype.at method, so read the struct field by index.
    expect(s[4]).to.be.gt(0);
    expect(ethers.verifyMessage(text, sig)).to.equal(s.signer);
  });

  it("records a public statement signed by a second wallet", async () => {
    const text = "Second wallet, second statement";
    const sig = await bob.signMessage(text);
    await c.record(ethers.id(text), sig, text);
    const s = await c.getStatement(0);
    expect(s.signer).to.equal(bob.address);
    expect(ethers.verifyMessage(text, sig)).to.equal(bob.address);
  });

  // ---- hash-only mode: the wallet signs the 32 raw bytes of the hash ----

  it("records a hash-only statement (private text)", async () => {
    const hash = ethers.id("a private note");
    const sig = await bob.signMessage(ethers.getBytes(hash));
    await c.record(hash, sig, "");
    const s = await c.getStatement(0);
    expect(s.signer).to.equal(bob.address);
    expect(s.text).to.equal("");
    expect(ethers.verifyMessage(ethers.getBytes(hash), sig)).to.equal(bob.address);
  });

  it("hash-only mode: signing the text string instead of the 32 raw bytes does not attribute to the signer", async () => {
    const note = "a private note";
    const hash = ethers.id(note);
    const wrongSig = await alice.signMessage(note); // text signature, not hash bytes
    await c.record(hash, wrongSig, "");
    const s = await c.getStatement(0);
    expect(s.signer).to.not.equal(alice.address);
  });

  // ---- forged and malformed signatures ----

  it("cannot attribute a statement to a victim: a signature over other text recovers a different address", async () => {
    const real = "Alice really signed this";
    const forged = "Alice never signed this";
    const sig = await alice.signMessage(real);
    await c.record(ethers.id(forged), sig, forged);
    const s = await c.getStatement(0);
    expect(s.signer).to.not.equal(alice.address);
  });

  it("anyone may submit a valid signature, but the stored signer is the real signer", async () => {
    const text = "Alice signed, Carol submits";
    const sig = await alice.signMessage(text);
    await c.connect(carol).record(ethers.id(text), sig, text);
    expect((await c.getStatement(0)).signer).to.equal(alice.address);
  });

  it("reverts on garbage and malformed signatures", async () => {
    const text = "hello";
    const hash = ethers.id(text);
    await expect(c.record(hash, "0x", text)).to.be.revertedWithCustomError(c, "ECDSAInvalidSignatureLength");
    await expect(c.record(hash, ethers.hexlify(ethers.randomBytes(64)), text)).to.be.revertedWithCustomError(
      c,
      "ECDSAInvalidSignatureLength"
    );
    const zero = "0x" + "00".repeat(65);
    await expect(c.record(hash, zero, text)).to.be.reverted;
  });

  it("reverts on a malleable high-s signature", async () => {
    const text = "malleability";
    const sig = ethers.Signature.from(await alice.signMessage(text));
    const highS = ethers.toBeHex(N - BigInt(sig.s), 32);
    const flipped = ethers.concat([sig.r, highS, ethers.toBeHex(sig.v === 27 ? 28 : 27, 1)]);
    await expect(c.record(ethers.id(text), flipped, text)).to.be.revertedWithCustomError(c, "ECDSAInvalidSignatureS");
  });

  // ---- text rules ----

  it("reverts when the text does not match the message hash", async () => {
    const text = "the real text";
    const sig = await alice.signMessage(text);
    await expect(c.record(ethers.id("something else"), sig, text)).to.be.revertedWithCustomError(
      c,
      "TextHashMismatch"
    );
  });

  it("accepts text of exactly 280 bytes and rejects 281", async () => {
    const ok = "a".repeat(280);
    await c.record(ethers.id(ok), await alice.signMessage(ok), ok);
    const tooLong = "a".repeat(281);
    await expect(c.record(ethers.id(tooLong), await alice.signMessage(tooLong), tooLong))
      .to.be.revertedWithCustomError(c, "TextTooLong")
      .withArgs(281);
  });

  it("counts bytes, not characters, for the 280 cap", async () => {
    const multi = "é".repeat(141); // 282 bytes
    await expect(c.record(ethers.id(multi), await alice.signMessage(multi), multi)).to.be.revertedWithCustomError(
      c,
      "TextTooLong"
    );
  });

  // ---- views ----

  it("indexes statements by hash and by signer and counts them", async () => {
    const t1 = "first";
    const t2 = "second";
    await c.record(ethers.id(t1), await alice.signMessage(t1), t1);
    await c.record(ethers.id(t2), await bob.signMessage(t2), t2);
    await c.record(ethers.id(t1), await alice.signMessage(t1), t1); // same message twice
    expect(await c.total()).to.equal(3);
    expect((await c.statementsFor(ethers.id(t1))).map(Number)).to.deep.equal([0, 2]);
    expect((await c.statementsBy(alice.address)).map(Number)).to.deep.equal([0, 2]);
    expect((await c.statementsBy(bob.address)).map(Number)).to.deep.equal([1]);
    expect(await c.statementsBy(carol.address)).to.deep.equal([]);
    expect((await c.statements(1)).signer).to.equal(bob.address);
  });

  it("reverts getStatement for an unknown id", async () => {
    await expect(c.getStatement(0)).to.be.revertedWithCustomError(c, "StatementNotFound").withArgs(0);
  });

  it("holds no ether and has no payable entry point", async () => {
    await expect(alice.sendTransaction({ to: await c.getAddress(), value: 1 })).to.be.reverted;
  });
});
