/**
 * JSON for other people's code, the spec, and the calendar feed.
 * Everything here is derived; nothing is stored.
 */
import { blitFor, N, PAIRS } from "./blit.ts";
import { ORIGINALS, SIBLINGS } from "./originals.ts";
import { dayByNumber, dateOf, type Day } from "./chain.ts";
import type { ChainState, ChainStatus } from "./contract.ts";
import { SITE, isAuthor, opensea, explorer, dayState, type Names, NO_NAMES } from "./site.ts";
import type { Address } from "viem";
import { holderFacts } from "./facts.ts";

/**
 * How old the ownership data in an answer is. `known` false means no chain
 * read ever succeeded, so every state below reads "unknown", never "gap".
 */
export function chainBlock(status: ChainStatus | null) {
  if (!status?.configured) return { configured: false, known: false, stale: false, readAt: null, ageSeconds: null, error: null };
  return { configured: true, known: status.known, stale: status.stale, readAt: status.readAt === null ? null : new Date(status.readAt).toISOString(), ageSeconds: status.ageSeconds, error: status.error };
}

export function dayJson(d: Day, today: Day, chain: ChainState | null, names: Names = NO_NAMES, status: ChainStatus | null = null) {
  const k = blitFor(d.epoch);
  const owner = chain?.owners.get(d.n);
  const claim = chain?.claims.get(d.n);
  return {
    day: d.n,
    epoch: Number(d.epoch),
    date: new Date(Number(d.startsAt) * 1000).toISOString().slice(0, 10),
    startsAt: Number(d.startsAt),
    isToday: d.n === today.n,
    authorDay: d.n % 10 === 0 && d.n <= 1000,
    renderer: k.version,
    pair: { composition: k.a, palette: k.b, index: k.index, cycle: k.cycle },
    colors: k.palette.colors,
    traits: k.traits,
    data: "0x" + Array.from(k.data, (x) => x.toString(16).padStart(2, "0")).join(""),
    state: stateWord(d.n, today.n, chain, status),
    owner: owner ?? null,
    ownerName: owner ? names.get(owner.toLowerCase()) ?? null : null,
    claim: claim ? { tx: claim.tx, block: Number(claim.block), at: claim.at, secondsAfterMidnight: claim.at - Number(d.startsAt), explorer: `${explorer(chain!.chainId)}/tx/${claim.tx}` } : null,
    image: `https://${SITE}/day/${d.n}.svg`,
    card: `https://${SITE}/day/${d.n}.png`,
    url: `https://${SITE}/day/${d.n}`,
    opensea: chain && owner ? opensea(chain, d.n) : null,
    bytes: k.svg.length,
    chain: chainBlock(status),
  };
}

/** The API's word for a day's state. "taken" and "free" stay for readers of the first version; "unknown" is new and means the chain did not answer. */
export function stateWord(n: number, today: number, chain: ChainState | null, status: ChainStatus | null): "author" | "taken" | "gap" | "free" | "unknown" | null {
  if (!chain && !status?.configured) return null;
  const s = dayState(n, today, chain, status);
  return s === "claimed" ? "taken" : s === "available" ? "free" : s;
}

export function daysJson(today: Day, chain: ChainState | null, names: Names = NO_NAMES, status: ChainStatus | null = null) {
  const days = [];
  for (let n = 1; n <= today.n; n++) {
    const j = dayJson(dayByNumber(n)!, today, chain, names, status);
    days.push({ day: j.day, date: j.date, renderer: j.renderer, traits: j.traits, state: j.state, owner: j.owner, ownerName: j.ownerName, tx: j.claim?.tx ?? null, image: j.image });
  }
  return { site: SITE, today: today.n, contract: chain ? { address: chain.address, chainId: chain.chainId, renderer: chain.renderer } : null, chain: chainBlock(status), days };
}

/** Counts over every day before today. Null when the chain never answered: an unknown count is not zero. */
export function tallyOf(today: Day, chain: ChainState | null): { taken: number; gaps: number; author: number } | null {
  if (!chain) return null;
  let taken = 0, gaps = 0, author = 0;
  for (let n = 1; n <= today.n; n++) {
    const o = chain.owners.get(n);
    if (o) { taken++; if (isAuthor(chain, o)) author++; }
    else if (n < today.n) gaps++;
  }
  return { taken, gaps, author };
}

/** The short form for the hub: today, the counts and the palette in one small answer, instead of every day. */
export function summaryJson(today: Day, chain: ChainState | null, status: ChainStatus | null = null) {
  const k = blitFor(today.epoch);
  return {
    site: SITE,
    kind: "daily",
    today: dayJson(today, today, chain, NO_NAMES, status),
    tally: tallyOf(today, chain),
    palette: k.palette,
    contract: chain ? { address: chain.address, chainId: chain.chainId, renderer: chain.renderer } : null,
    chain: chainBlock(status),
  };
}

export function holderJson(who: Address, today: Day, chain: ChainState, names: Names = NO_NAMES, status: ChainStatus | null = null) {
  const mine = [...chain.owners].filter(([, o]) => o.toLowerCase() === who.toLowerCase()).map(([n]) => n).sort((a, b) => a - b);
  return { address: who, name: names.get(who.toLowerCase()) ?? null, author: isAuthor(chain, who), chain: chainBlock(status), facts: holderFacts(who, today, chain), days: mine.map((n) => dayJson(dayByNumber(n)!, today, chain, names, status)) };
}

export function specJson() {
  return {
    site: SITE,
    version: 1,
    license: "CC0-1.0 (art and images), MIT (code)",
    source: "The 100 Blitmap originals from Ethereum contract 0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63, tokenDataOf(0..99), read 2026-09-05. Art released CC0 by the artists.",
    clock: "epoch = block.timestamp / 86400; day = epoch - startEpoch + 1; startEpoch = 20701 (2026-09-05 UTC)",
    pairs: PAIRS,
    permutation: "n = day - 1; cycle = n / 9900; index = perm(n % 9900, cycle). perm cycle-walks a 4-round Feistel network over 14 bits until the value is below 9900. Round function: mix64(r | round << 8 | cycle << 16) & 127, where mix64 is the splitmix64 finalizer. Half-blocks are 7 bits.",
    mix64: "x += 0x9e3779b97f4a7c15; x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9; x = (x ^ (x >> 27)) * 0x94d049bb133111eb; return x ^ (x >> 31)",
    pair: "a = index / 99 (composition); b = index % 99, plus one when b >= a (palette). a != b always.",
    remix: "268 bytes: the first 12 (four RGB colors) from original b, the other 256 (1024 pixels, 2 bits each, row by row, high bits first) from original a.",
    image: "32 by 32 SVG, shape-rendering crispEdges. One rect in the most used color (lowest index on a tie), then one rect per horizontal run of any other color.",
    affinity: "Blitmap's rule: sum red, green and blue over the first three colors; the largest channel leads (Fire, Earth, Water), the others join when above 256. One element: III. Two: II and I. Three: I, I, I.",
    sibling: "The Ethereum token id of the Blitmap sibling with the same pair, when one exists. 1600 of the 9900 pairs do.",
    originals: ORIGINALS.map((o, i) => ({ id: i, name: o.name, creator: o.creator })),
    siblings: SIBLINGS,
    count: N,
  };
}

/** One daily event at midnight UTC, forever. Subscribe once. */
export function calendarIcs(dayOne: Day): string {
  const stamp = new Date(Number(dayOne.startsAt) * 1000).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE}//one blit a day//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${SITE}`,
    "X-WR-CALDESC:One Blitmap remix a day. Claim it before midnight UTC.",
    "BEGIN:VEVENT",
    `UID:daily@${SITE}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    "DURATION:PT15M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:A new blit at blit.onenft.click",
    `DESCRIPTION:A new day, a new blit. Claim it before midnight UTC. 0 ETH mint fee, network gas only: https://${SITE}/`,
    `URL:https://${SITE}/`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

