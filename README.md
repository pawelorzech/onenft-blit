# blit.onenft.click

One Blitmap remix a day, computed on chain from the clock of the Base chain. Every day at midnight UTC the contract takes the composition of one Blitmap original and the palette of another. Nobody chooses the pair and nobody can delay it. A day nobody claims stays empty forever.

Live: **https://blit.onenft.click** · A sister of [onenft.click](https://onenft.click)

## How it works

- **The originals** are the 100 Blitmaps that 17 artists drew on Ethereum in 2021 and released as CC0: 32 by 32 pixels, four colors, 268 bytes each. They sit byte for byte in four data contracts on Base (`DataStore.sol`, the SSTORE2 pattern), read straight from the Ethereum contract `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`.
- **A day** is `block.timestamp / 86400`, rounded down: one calendar day in UTC.
- **The pair** for day n is number `perm(n - 1)` out of the 9,900 possible pairs (100 compositions times 99 other palettes). `perm` is a 4-round Feistel network over 14 bits with cycle walking, so every pair appears exactly once in 9,900 days, then the key changes and a new order begins. An original is never paired with itself.
- **The remix** follows Blitmap's own sibling rule: 12 bytes of palette from one original, 256 bytes of pixels from the other. When the pair already exists on Ethereum as a Blitmap sibling (1,600 of the 9,900 do), the token says which one.
- **The image** is one SVG built on chain: a rect in the most used color, then one rect per horizontal run of any other color. Returned by the contract as a `data:` URI. No server in the loop.
- **The site has no palette of its own.** It takes today's four colors, so it looks different every day.
- **Every tenth day up to 1000** goes to the author. Everything else is free to claim, gas only.
- **Everything is CC0**: remixes, contracts, site. Blitmap is a trademark of Sup Inc.; this project is not affiliated with it.

The TypeScript generator (`src/blit.ts`) and the Solidity renderer (`contracts/src/BlitRenderer.sol`) produce the same bytes; a Foundry test enforces it against fixtures generated from TypeScript. The shuffle is written out on [`/how`](https://blit.onenft.click/how); the originals, names and sibling list are in [`/spec.json`](https://blit.onenft.click/spec.json).

## Repository

| Path | What |
|---|---|
| `src/` | The site (Bun + TypeScript): generator (`blit.ts`), the originals as data (`originals.ts`), clock, pages, API, server, chain reads, autoclaim, PNG cards, ENS. |
| `contracts/` | Foundry project: `OneNFT.sol` (the same token contract as onenft.click), `BlitRenderer.sol`, `DataStore.sol`, tests, deploy script. |
| `assets/fonts/` | Static TTFs for PNG cards (Syne ExtraBold, Newsreader; OFL). |
| `docs/` | [Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Deployments](docs/DEPLOYMENTS.md) · [Operations](docs/OPERATIONS.md) |
| `CLAUDE.md` | Working notes for an AI session continuing this project. |

## Run

```sh
bun install
bun test                          # site and generator tests
bun run contracts/fixtures.ts     # data blobs and day fixtures from TypeScript
cd contracts && forge test        # contract tests, includes TS↔Solidity byte equality
PORT=3000 bun run src/server.ts
```

Environment: `PORT`; `CONTRACT_ADDRESS` and `CHAIN_ID` (8453 mainnet, 84532 Sepolia) to read chain state and enable claiming; `BASE_RPC_URL`; `START_EPOCH` (overridden by the contract); `DEPLOYER_KEY` for the author-day autoclaim; `ETH_RPC_URL` for ENS; `UMAMI_URL` and `UMAMI_WEBSITE_ID` for analytics. Without a contract the site is a plain renderer.

## Deploy

`contracts/deploy.sh sepolia|mainnet` deploys the four data stores, the renderer and the token, then `contracts/wire.sh sepolia|mainnet` points the site at them. Details in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## License

Code: MIT. Fonts: SIL Open Font License. The original art is CC0 by the Blitmap artists; the remixes are CC0 too.
