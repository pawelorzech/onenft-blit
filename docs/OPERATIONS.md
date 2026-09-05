# Operations

Last verified: 2026-09-05

## Deploy contracts

`contracts/deploy.sh sepolia|mainnet` reads the deployer secret from Keychain and the author address from `~/.config/onenft/author.json`, generates fixtures if missing, deploys the four data stores, `BlitRenderer` and `OneNFT`, verifies on Sourcify and writes `~/.config/onenft-blit/deploy-<net>.json`. `START_EPOCH` defaults to today; the constructor rejects a start in the past or more than 7 days ahead. Then `contracts/wire.sh <net>` writes `CONTRACT_ADDRESS`, `CHAIN_ID`, `START_EPOCH`, `BASE_RPC_URL` into the Coolify app (uuids from `~/.config/onenft-blit/coolify.json`) and redeploys.

If Sourcify's verification of the renderer fails inside the script (it did once, "no_match", while the token verified), rerun it alone:

```sh
forge verify-contract <renderer> src/BlitRenderer.sol:BlitRenderer --verifier sourcify --chain <id> \
  --constructor-args $(cast abi-encode "c(uint256,address,address,address,address)" <startEpoch> <originalsA> <originalsB> <meta> <siblings>)
```

## Change the drawing

Edit `src/blit.ts`, run `bun test`, `bun run contracts/fixtures.ts`, port the change to `BlitRenderer.sol`, run `forge test`. Deploy a new renderer with a variant of the deploy script (data stores can be reused: pass the existing addresses) and switch with `setRenderer` from the author wallet. Claimed days keep their renderer.

## Analytics

Umami, same instance as onenft.click, when `UMAMI_URL` and `UMAMI_WEBSITE_ID` are set. The test site has neither.

## Health

`/health` returns the day and, with a contract, the address and the number of scanned claims. Container logs should show `autoclaim armed` when `DEPLOYER_KEY` is set. `scripts/status.sh mainnet|sepolia` prints one screen of chain and site state.
