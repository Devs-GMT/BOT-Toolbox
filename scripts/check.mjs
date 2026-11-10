import { JsonRpcProvider, formatEther } from "ethers";
for (const [n,u] of [["testnet","https://rpc.bohr.life"],["mainnet","https://rpc.botchain.ai"]]) {
  try {
    const p = new JsonRpcProvider(u, undefined, {staticNetwork:false});
    const [net, bn, fee, bal] = await Promise.all([p.getNetwork(), p.getBlockNumber(), p.getFeeData(), p.getBalance("0x12205Fe8F1590640D9ea44Ff7737d65a124e5592")]);
    const b1 = await p.getBlock(bn), b0 = await p.getBlock(bn-100);
    console.log(n, "chain", net.chainId.toString(), "block", bn, "gasPrice", fee.gasPrice?.toString(), "bal", formatEther(bal), "avgBlockTime", ((b1.timestamp-b0.timestamp)/100).toFixed(2));
    p.destroy();
  } catch(e){ console.log(n, "ERR", e.message.slice(0,120)); }
}
