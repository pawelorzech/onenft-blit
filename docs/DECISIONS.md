# Decisions

Last verified: 2026-09-05

- **2026-09-05 One remix a day, not a port.** A 1:1 copy of the 1,700 Blitmaps on Base would add nothing and collide with the Ethereum holders. Pairing by the clock makes new work out of CC0 material and keeps the onenft.click rule: one token a day, gaps stay.
- **2026-09-05 Every pair once per 9,900 days.** A hash of the day would repeat pairs. A Feistel permutation with cycle walking is cheap on chain, portable to TypeScript, and gives each of the 9,900 pairs exactly one day per cycle. A new key per cycle so day 9,901 does not repeat day 1.
- **2026-09-05 No original paired with itself.** That would be a copy of the original, which lives on Ethereum. 100 by 99, not 100 by 100.
- **2026-09-05 Existing Ethereum siblings are allowed and named.** 1,600 of the 9,900 pairs already exist as Blitmap siblings. Excluding them would break the clean permutation; naming them (trait "Ethereum sibling", link on the day page) is more honest and more interesting.
- **2026-09-05 Data in SSTORE2 contracts, not in storage.** 26.8 kB of originals do not fit one contract's code size limit; two data contracts of 50 originals each, plus one for names and one for siblings, are immutable by construction and cheap to read with EXTCODECOPY.
- **2026-09-05 Run-length SVG instead of one rect per pixel.** Blitmap's contract emits 1,024 rects. Merging horizontal runs cuts the SVG to a few kB and keeps it byte-identical between TypeScript and Solidity.
- **2026-09-05 The name says "blit", never "Blitmap", as a brand.** Sup Inc. filed BLITMAP and BLITNAUT trademarks in 2023. The art is CC0; the name is not. The site names Blitmap only to say where the art comes from.
- **2026-09-05 Separate repository.** Paweł chose separate repos over a shared server so each site can move on its own. The token contract and most of the site are copied from onenft.click.
- **2026-09-05 Same wallets, same author days.** Deployer and author as onenft.click; every tenth day up to 1000 to the author.

## 2026-09-05 — Yours page, downloads drawn in the browser, the way back to the hub
Every collection site gets `/yours`: a Connect wallet button (`eth_requestAccounts`, no wallet library) and a field for an address or ENS name that posts to `/go`, which redirects to the holder page. The holder page shows one row per day: the image, the day number, when it was claimed, the traits, and a download bar. SVG is the file the contract holds. PNG and JPEG are drawn in the browser on a canvas at 1024, 2048 or 4096 pixels from that SVG, so the server gains no dependency and `/day/N.png` stays the 1200 by 630 share card. The top bar of every page is a breadcrumb, `onenft.click / blit.onenft.click`, so the hub is one click away. The hub gets `/wallet/<who>`, which reads `/api/holder/<who>` from every collection; that JSON and `/day/N.svg` with an open CORS header are the contract each collection keeps. Rejected: a gallery with one big image and a rail (fine for three tokens, tiring for thirty), and keeping the thumbnail grid with a side panel (two steps to a download).
