/**
 * What the chain says about one wallet's days, as tiles: a figure and a line
 * under it. Every fact is a count or a day number read from ownership and
 * claim logs; none of them is worth anything, and there is nothing to unlock.
 * A wallet with no days has no facts.
 */
import { blitFor } from "./blit.ts";
import { ORIGINALS } from "./originals.ts";
import { dayByNumber, type Day } from "./chain.ts";
import type { ChainState } from "./contract.ts";
import { isAuthorDay } from "./autoclaim.ts";
import type { Address } from "viem";

export type Fact = {
  kind: string;
  /** The big figure of the tile, e.g. "2 of 16". */
  figure: string;
  /** The line under the figure. */
  label: string;
  /** The same fact as one plain sentence, for JSON and screen readers. */
  text: string;
  /** The days the fact points at, ascending. */
  days: number[];
};

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function afterMidnightShort(s: number): string {
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

/** The facts every daily collection shares: they come from ownership and claims alone. */
function chainFacts(who: Address, chain: ChainState, mine: number[], firstLabel: string): Fact[] {
  const me = who.toLowerCase();
  const facts: Fact[] = [];
  const author = chain.author.toLowerCase() === me;

  if (mine.includes(1)) facts.push({ kind: "first", figure: "Day 1", label: firstLabel, text: `Holds day 1, ${firstLabel}.`, days: [1] });

  let best: [number, number] = [mine[0], mine[0]], cur: [number, number] = [mine[0], mine[0]];
  for (const n of mine.slice(1)) {
    cur = n === cur[1] + 1 ? [cur[0], n] : [n, n];
    if (cur[1] - cur[0] > best[1] - best[0]) best = cur;
  }
  const len = best[1] - best[0] + 1;
  if (len >= 2) facts.push({ kind: "run", figure: String(len), label: `days in a row, the longest run, day ${best[0]} to ${best[1]}`, text: `Longest run: ${len} days in a row, day ${best[0]} to ${best[1]}.`, days: Array.from({ length: len }, (_, i) => best[0] + i) });

  // Only days the log scan has reached count.
  const known = mine.filter((n) => chain.claims.has(n));
  const claimed = known.filter((n) => chain.claims.get(n)!.to.toLowerCase() === me);
  const later = known.filter((n) => chain.claims.get(n)!.to.toLowerCase() !== me);
  if (claimed.length) facts.push({ kind: "claimed", figure: String(claimed.length), label: "claimed at the source", text: `Claimed ${claimed.length} ${plural(claimed.length, "day", "days")} at the source.`, days: claimed });
  if (later.length) facts.push({ kind: "later", figure: String(later.length), label: "from earlier holders", text: `Took ${later.length} ${plural(later.length, "day", "days")} from earlier holders.`, days: later });

  if (claimed.length) {
    let fast = claimed[0], fastS = Infinity;
    for (const n of claimed) {
      const s = chain.claims.get(n)!.at - Number(dayByNumber(n)!.startsAt);
      if (s < fastS) { fastS = s; fast = n; }
    }
    facts.push({ kind: "fastest", figure: afterMidnightShort(fastS), label: `after midnight UTC, the fastest claim, day ${fast}`, text: `Fastest claim: ${afterMidnightShort(fastS)} after midnight UTC, day ${fast}.`, days: [fast] });
  }

  if (!author) {
    const ad = mine.filter(isAuthorDay);
    if (ad.length) facts.push({ kind: "author-days", figure: String(ad.length), label: `author ${plural(ad.length, "day", "days")}, passed on by the author`, text: `Holds ${ad.length === 1 ? `author day ${ad[0]}` : `${ad.length} author days`}, passed on by the author.`, days: ad });
  }
  return facts;
}

export function holderFacts(who: Address, today: Day, chain: ChainState): Fact[] {
  const me = who.toLowerCase();
  const mine = [...chain.owners].filter(([, o]) => o.toLowerCase() === me).map(([n]) => n).sort((a, b) => a - b);
  if (!mine.length) return [];
  const facts = chainFacts(who, chain, mine, "the first blit");
  const blits = mine.map((n) => [n, blitFor(dayByNumber(n)!.epoch)] as const);

  // Originals and artists covered, as composition or palette.
  if (mine.length >= 2) {
    const originals = new Set(blits.flatMap(([, b]) => [b.a, b.b]));
    facts.push({ kind: "originals", figure: `${originals.size} of ${ORIGINALS.length}`, label: "originals, as composition or palette", text: `${originals.size} of ${ORIGINALS.length} originals, as composition or palette.`, days: mine });
    const artists = new Set(blits.flatMap(([, b]) => [b.traits.compositionArtist, b.traits.paletteArtist]));
    facts.push({ kind: "artists", figure: String(artists.size), label: plural(artists.size, "artist", "artists"), text: `${artists.size} ${plural(artists.size, "artist", "artists")}.`, days: mine });
  }

  // Days whose pair also exists on Ethereum.
  const sib = blits.filter(([, b]) => b.traits.sibling !== "none").map(([n]) => n);
  if (sib.length) facts.push({ kind: "siblings", figure: String(sib.length), label: `with an Ethereum sibling, day ${sib.slice(0, 3).join(", ")}${sib.length > 3 ? " and more" : ""}`, text: `${sib.length} ${plural(sib.length, "day", "days")} with an Ethereum sibling: day ${sib.join(", ")}.`, days: sib });

  return facts;
}
