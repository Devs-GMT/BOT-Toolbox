# Deploy Statements to BOT Chain mainnet (Remix)

You deploy with your own wallet. Nothing here needs a private key in this repo.

## 1. Add BOT Chain mainnet to MetaMask

Use the Network tool in the app (`/tools/network`, mainnet card, "add to MetaMask"), or enter it by hand:

| Field | Value |
| --- | --- |
| Network name | BOT Chain |
| RPC URL | `https://rpc.botchain.ai` |
| Chain ID | `677` |
| Currency symbol | `BOT` |
| Block explorer | `https://scan.botchain.ai` |

Make sure the wallet you use holds a little BOT for gas. Deploying costs far less than 1 BOT at the current 20 gwei gas price, the Gas tool shows the live figure.

## 2. Open the contract in Remix

1. Go to https://remix.ethereum.org and create a file `Statements.sol`.
2. Paste the whole content of [`contracts/remix/Statements.remix.sol`](../contracts/remix/Statements.remix.sol). It is the same contract as `contracts/contracts/Statements.sol`, with the two OpenZeppelin imports pinned to version 5.0.2 so Remix fetches exactly the version the tests ran against.

## 3. Compile with the same settings

In the **Solidity compiler** tab:

- Compiler: `0.8.24`
- Open **Advanced configurations**
- Tick **Enable optimization**, runs `200`
- EVM version: `paris`

Press **Compile Statements.sol**. It should finish with no errors.

## 4. Deploy

In the **Deploy and run transactions** tab:

1. Environment: **Injected Provider - MetaMask**. MetaMask must show BOT Chain (chain ID 677). Remix shows `Custom (677) network` under the environment.
2. Account: the wallet you want to deploy from.
3. Contract: `Statements`. There are no constructor arguments.
4. Press **Deploy**, confirm in MetaMask.
5. When it confirms, copy the address from **Deployed Contracts** (the copy icon).

Open `https://scan.botchain.ai/address/<ADDRESS>` and check that the contract page loads.

## 5. Send me the address

I will then:

1. Run `ADDRESS=0x… npx hardhat run scripts/verify-deployment.js --network botMainnet` in `contracts/`. It compares the deployed runtime bytecode (compiler metadata stripped) and every function selector with my build, and calls `total()` and `MAX_TEXT_LENGTH()`.
2. Only if that says `RESULT: OK`, put the address in `STATEMENTS_ADDRESS.mainnet` in `src/lib/config.ts` and switch `APP_NET` to `"mainnet"`.
3. Record a first statement from the live app and check the verify page and the footer link.

If Remix produced different bytecode, the script says so and nothing is wired up.
