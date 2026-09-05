# Deployments

Last verified: 2026-09-05

## Base Sepolia (84532), 2026-09-05, second deployment

| Contract | Address |
|---|---|
| OneNFT (`blit.onenft.click`, `BLITDAY`) | `0xA7b82D451F7534C4B2F4f74a14a92daDCfCC1C2f` |
| BlitRenderer | `0x6A6d54f9A692aCF4b3Ea5002D27FdcbdD0A1482B` |
| originalsA (0..49) | `0x14754A8C49485EA500ff82E42dC9F692E3bC424F` |
| originalsB (50..99) | `0xd97a91D296CCFCdf9863fa4B17B7092c9f0b6E6A` |
| meta (names, artists) | `0x0d1075dBa51e3f2d371d80390d9559950776cf8B` |
| siblings (1,600 pairs) | `0x745DB27114b4afB47526bFC4c119239ce00ab36c` |

startEpoch 20701 (2026-09-05). Site: https://blit-test.onenft.click. The first Sepolia set of the same day (token `0x537cbC21D052edca6eC26D7d8858d1f009eEb384`, renderer `0x043aD57a1DB88D0747Ace60809B84F5a4A59e26c`) ran the pre-optimization renderer and holds a test claim of day 1; nothing points at it now.

## Base mainnet (8453), 2026-09-05

| Contract | Address |
|---|---|
| OneNFT (`blit.onenft.click`, `BLITDAY`) | `0x27E85c52527D3955AF013664eb0AED799555588B` |
| BlitRenderer | `0x089b5C0A9fA5B670a294Eb11702C2103B4496992` |
| originalsA (0..49) | `0xF5B0c6f8C0937C5F4cF22921a9427B18e1340517` |
| originalsB (50..99) | `0xa6F70Eb88e54e902609Cedb361Ead7e33639f878` |
| meta (names, artists) | `0xFC29aa30A6b6ff750f7034E255Bd4644d08DaA0d` |
| siblings (1,600 pairs) | `0x8fFCA4930fA604F8F2746dA6912AEE560Ca3F88e` |

startEpoch 20701 (2026-09-05). Owner and author `0x6e36Dc3ec2F9D4f3D8e616725fB6Fa184CD9aE20`, deployer `0x7f28c8c9171b13F1E2fea21b6f2c8d4f91F892F3`. Every store's code was compared byte for byte with `contracts/test/fixtures/blit_data.json` after deployment, and `svg(20701)` on chain equals the TypeScript output.

## Source

The originals come from Ethereum mainnet, Blitmap `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`, read 2026-09-05 (`tokenDataOf(0..99)`, `tokenParentsOf(100..1699)`).
