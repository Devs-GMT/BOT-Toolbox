const { ethers, network, run } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer. Set DEPLOYER_PRIVATE_KEY in contracts/.env");
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`network ${network.name}, deployer ${deployer.address}, balance ${ethers.formatEther(bal)}`);

  const factory = await ethers.getContractFactory("Statements");
  const c = await factory.deploy();
  const tx = c.deploymentTransaction();
  await c.waitForDeployment();
  const address = await c.getAddress();
  const receipt = await tx.wait();
  console.log("Statements deployed:", address);
  console.log("tx:", tx.hash, "block:", receipt.blockNumber);

  const code = await ethers.provider.getCode(address);
  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    address,
    deployTx: tx.hash,
    block: receipt.blockNumber,
    runtimeCodeHash: ethers.keccak256(code),
  };
  const file = path.join(__dirname, "..", `deployment.${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log("saved", path.basename(file));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
