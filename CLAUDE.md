# blit.onenft.click

One Blitmap remix a day, computed on chain from the clock of the Base chain. One of the daily collections listed at onenft.click (hub repo `~/Programowanie/onenft-hub`); the knot lives at knot.onenft.click (`~/Programowanie/onenft`), built from its code on 2026-09-05. Operational identifiers that should not be public live in `CLAUDE.local.md` (gitignored).

## What this is

- Every UTC day the contract can mint exactly one ERC-721 token, `tokenId = day number`. A day nobody claims stays empty forever.
- Day n shows pair `perm(n - 1)` of the 9,900 (composition, palette) pairs of the 100 Blitmap originals. `perm` is a Feistel permutation with cycle walking; every pair once per 9,900 days, a new key each cycle. An original is never paired with itself.
- The image is built on chain by `BlitRenderer.sol` from four `DataStore` contracts holding the originals, names, artists and the 1,600 Ethereum sibling pairs. `src/blit.ts` produces the same SVG byte for byte; `contracts/test/BlitRenderer.t.sol` enforces it against fixtures from `bun run contracts/fixtures.ts`. **TypeScript is the source of truth.**
- Six traits in the metadata: Composition, Composition artist, Palette, Palette artist, Affinity (Blitmap's Fire/Earth/Water rule), Ethereum sibling.
- The site has no palette of its own; `--bg/--fg` come from today's four colors (`paletteOf` in `src/blit.ts`, site only). No light/dark toggle.
- Every tenth day up to 1000 goes to the author; the site's autoclaim loop claims those from the deployer wallet.
- Free, no price, no royalties. Not an investment.

## Legal position, stated once

The Blitmap art is CC0 (the artists waived copyright); the Blitmap contract code is MIT. Both are copied lawfully. "Blitmap" and "Blitnaut" are trademarks filed by Sup Inc. in 2023, so the name is used only to describe where the art comes from, never as this project's brand. The site says so on `/assets`.

## Stack and commands

- Bun + TypeScript for the site (`src/`), Foundry for contracts (`contracts/`), OpenZeppelin 5.x via submodule. Never npm/npx, never Python for project code.
- `bun test` · `bun run contracts/fixtures.ts` (regenerates data blobs and day fixtures; run after any change to `src/blit.ts` or `src/originals.ts`) · `cd contracts && forge test` (needs `via_ir`).
- `PORT=3000 bun run src/server.ts`. With `CONTRACT_ADDRESS` + `CHAIN_ID` it reads chain state and shows the claim button.
- `contracts/deploy.sh sepolia|mainnet` deploys data stores + renderer + token, writes `~/.config/onenft-blit/deploy-<net>.json`. `contracts/wire.sh` writes the addresses into the hosting env and redeploys. `scripts/status.sh` prints state.
- Deploy of the site = `git push origin master` then trigger the hosting redeploy (see `CLAUDE.local.md`).

## Rules that bite

- **Do not change `src/blit.ts` output casually.** Past days are minted with the on-chain renderer. A change means a new renderer and `setRenderer` from the author wallet; it affects future days only.
- **Never edit `src/originals.ts` by hand.** It is a byte copy of the Ethereum contract. If it must be regenerated, read it from chain again and diff.
- **All copy in English**, plain words, active voice, no adverbs, no em dashes. Same copy rules as onenft.click.
- **No AI-default design tells.** Same as onenft.click.
- Public repo: never commit keys or hosting tokens.
- The token contract is immutable; the renderer is the only swappable piece.

## Frontend Theme

Inherited from onenft.click, one change: the page colors are today's four Blitmap colors, so `--bg` is the ground color of the remix and `--fg` the color farthest from it in luma (with a fallback to near-black or near-white when the four colors are too close). Pixel art renders with `image-rendering: pixelated`. Typography, shapes, density and motion unchanged.

## Where things are

| Thing | Path |
|---|---|
| Generator (source of truth) | `src/blit.ts` |
| The 100 originals and 1,600 siblings as data | `src/originals.ts` |
| Clock, day math | `src/chain.ts` |
| Page HTML, CSS, copy | `src/site.ts` |
| Inner pages | `src/pages.ts` |
| JSON API, spec, calendar | `src/api.ts` |
| Server, routes | `src/server.ts` |
| Chain reads | `src/contract.ts` |
| Autoclaim | `src/autoclaim.ts` |
| PNG cards | `src/image.ts` |
| Contracts, tests, deploy | `contracts/` |
| Docs | `docs/` |
