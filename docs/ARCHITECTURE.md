# Architecture

Last verified: 2026-09-05

The same shape as onenft.click, with the knot generator replaced by a remix of fixed data.

## Data path

1. `src/originals.ts` holds the 100 Blitmap originals (268 bytes each as hex) and the 1,600 Ethereum sibling pairs, read once from the Ethereum contract `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63` on 2026-09-05 (`tokenDataOf`, `tokenNameOf`, `tokenCreatorNameOf`, `tokenParentsOf`).
2. `contracts/fixtures.ts` packs them into four blobs (`originalsA` 0..49, `originalsB` 50..99, `meta` = names and artists, `siblings` = 4 bytes per pair) and writes `contracts/test/fixtures/blit_data.json`, plus `blit_days.json` with sample days rendered in TypeScript.
3. The deploy script writes each blob into a `DataStore` contract (SSTORE2: the data is the contract's code behind a STOP byte) and passes the four addresses to `BlitRenderer`, which keeps them as immutables.
4. `OneNFT` (unchanged from onenft.click apart from the interface name) stores the renderer address per token at claim time and delegates `tokenURI` to it.

## Day to pair

`n = day - 1; cycle = n / 9900; index = perm(n mod 9900, cycle)`. `perm` cycle-walks a 4-round Feistel network on 14 bits (7-bit halves, round function `mix64(r | round << 8 | cycle << 16) & 127`, where `mix64` is the splitmix64 finalizer) until the value is below 9,900. `a = index / 99`, `b = index mod 99`, `b += 1` when `b >= a`. Implemented identically in `src/blit.ts` and `BlitRenderer.sol`.

## Rendering

`remixData(a, b)` = bytes 0..11 of original b, bytes 12..267 of original a. `svgOf` emits a 32 by 32 `viewBox`, one full rect in the most used color (lowest index on a tie), then one rect per horizontal run of any other color. Pixel i is `(data[12 + i / 4] >> (6 - 2 * (i mod 4))) & 3`.

## Site

`src/server.ts` routes are those of onenft.click. `blitFor(epoch)` is the only entry point pages use. Page colors: `paletteOf` picks the ground color as `--bg` and the color farthest from it in luma as `--fg`, with a fallback when all four are close. This part is site only and not on chain.
