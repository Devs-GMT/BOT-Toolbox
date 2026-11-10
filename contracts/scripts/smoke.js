const { ethers, network } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

// End-to-end check against a deployed contract: sign, record, read back, verify.
async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", `deployment.${network.name}.json`), "utf8"));
  const [signer] = await ethers.getSigners();
  const c = await ethers.getContractAt("Statements", dep.address, signer);

  const text = process.argv[2] || "BOT Toolbox smoke test: signed on testnet";
  const hash = ethers.id(text);
  const sig = await signer.signMessage(text);
  const tx = await c.record(hash, sig, text);
  const rc = await tx.wait();
  const total = await c.total();
  const id = total - 1n;
  const s = await c.getStatement(id);
  console.log("recorded id", id.toString(), "tx", tx.hash, "block", rc.blockNumber);
  console.log("signer on chain:", s.signer, "| deployer:", signer.address);
  console.log("verifyMessage:", ethers.verifyMessage(text, sig));
  console.log("match:", s.signer === signer.address && ethers.verifyMessage(text, sig) === s.signer);
  console.log("code size:", ((await ethers.provider.getCode(dep.address)).length - 2) / 2, "bytes");
}
main().catch((e) => { console.error(e); process.exit(1); });
