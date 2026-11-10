// Check that the code deployed at an address is the Statements contract from this repo.
// Usage: npx hardhat run scripts/verify-deployment.js --network botMainnet
//        ADDRESS=0x... is read from the env, or from deployment.<network>.json when present.
const { ethers, network, artifacts } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

/** Remove the trailing CBOR metadata (compiler version and source hash), which differs between Remix and Hardhat builds. */
function stripMetadata(hex) {
  const b = ethers.getBytes(hex);
  const len = (b[b.length - 2] << 8) | b[b.length - 1];
  return ethers.hexlify(b.slice(0, b.length - len - 2));
}

async function main() {
  let address = process.env.ADDRESS;
  const depFile = path.join(__dirname, "..", `deployment.${network.name}.json`);
  if (!address && fs.existsSync(depFile)) address = JSON.parse(fs.readFileSync(depFile, "utf8")).address;
  if (!address) throw new Error("Set ADDRESS=0x... or create deployment.<network>.json");
  address = ethers.getAddress(address);

  const art = await artifacts.readArtifact("Statements");
  const onchain = await ethers.provider.getCode(address);
  if (onchain === "0x") throw new Error(`No code at ${address} on ${network.name}`);

  const a = stripMetadata(onchain);
  const b = stripMetadata(art.deployedBytecode);
  const sameCode = a === b;
  console.log(`network ${network.name}, address ${address}`);
  console.log(`runtime size: deployed ${(onchain.length - 2) / 2} bytes, local build ${(art.deployedBytecode.length - 2) / 2} bytes`);
  console.log(`bytecode (metadata stripped) identical: ${sameCode}`);

  // Function selectors from our ABI must all appear in the deployed code.
  const iface = new ethers.Interface(art.abi);
  const missing = [];
  for (const f of iface.fragments.filter((x) => x.type === "function")) {
    const sel = f.selector.slice(2);
    if (!onchain.toLowerCase().includes(sel)) missing.push(`${f.format("sighash")} ${f.selector}`);
  }
  console.log(`selectors present: ${missing.length === 0 ? "all" : "MISSING " + missing.join(", ")}`);

  // Behavioural check with a read-only call.
  const c = await ethers.getContractAt("Statements", address);
  console.log(`total() = ${await c.total()}, MAX_TEXT_LENGTH() = ${await c.MAX_TEXT_LENGTH()}`);

  if (!sameCode || missing.length) {
    console.log("RESULT: DIFFERENT. Do not point the app at this address until you know why.");
    process.exit(1);
  }
  console.log("RESULT: OK, matches this repo's Statements.sol build.");
}
main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
