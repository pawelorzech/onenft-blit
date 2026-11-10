# blit.onenft.click

Last verified: eacd3a2 | 2026-10-26

This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.

One Blitmap remix a day, computed on chain from the clock of the Base chain. Hub: `~/Programowanie/onenft/hub`; built from knot's code on 2026-09-05. Shared rules (stack, deploy, copy, design, secrets, TS = source of truth): `../CLAUDE.md`. Operational identifiers: `CLAUDE.local.md` (gitignored).

## What this is

- Every UTC day the contract can mint exactly one ERC-721 token, `tokenId = day number`. A day nobody claims stays empty forever.
- Day n shows pair `perm(n - 1)` of the 9,900 (composition, palette) pairs of the 100 Blitmap originals. `perm` is a Feistel permutation with cycle walking; every pair once per 9,900 days, a new key each cycle. An original is never paired with itself.
- Image built on chain by `BlitRenderer.sol` from four `DataStore` contracts (originals, names, artists, 1,600 Ethereum sibling pairs). `src/blit.ts` produces the same SVG byte for byte; `contracts/test/BlitRenderer.t.sol` enforces it.
- Six traits: Composition, Composition artist, Palette, Palette artist, Affinity (Blitmap's Fire/Earth/Water rule), Ethereum sibling.
- Site `--bg/--fg` come from today's four colors (`paletteOf` in `src/blit.ts`, site only).
- Every tenth day up to 1000 goes to the author; the site's autoclaim loop claims those from the deployer wallet.
- Free, no price, no royalties. Not an investment.

## Legal position, stated once

The Blitmap art is CC0; the Blitmap contract code is MIT. Both are copied lawfully. "Blitmap" and "Blitnaut" are trademarks filed by Sup Inc. in 2023, so the name only describes where the art comes from, never this project's brand. The site says so on `/assets`.

## Commands

- `bun run contracts/fixtures.ts` regenerates data blobs and day fixtures; run after any change to `src/blit.ts` or `src/originals.ts`. `src/originals.ts` is a byte copy of the Ethereum contract.
- Foundry tests need `via_ir`.

## Frontend Theme

Inherited from onenft.click, one change: the page colors are today's four Blitmap colors, so `--bg` is the ground color of the remix and `--fg` the color farthest from it in luma (with a fallback to near-black or near-white when the four colors are too close). Pixel art renders with `image-rendering: pixelated`. Typography, shapes, density and motion unchanged.
