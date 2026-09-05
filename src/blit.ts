/**
 * One remix a day of the Blitmap originals. Source of truth for
 * contracts/src/BlitRenderer.sol.
 *
 * A Blitmap is 268 bytes: four RGB colors, then 1024 pixels at two bits each.
 * The Ethereum project let holders pair the composition of one original with
 * the palette of another; 1600 such siblings exist there. Here the clock does
 * the pairing. Day n takes pair number perm(n - 1) out of the 9900 possible
 * pairs (100 compositions times 99 other palettes), where perm is a fixed
 * permutation, so every pair shows up exactly once in 9900 days, then the
 * cycle starts again with a different order.
 *
 * All arithmetic is integer and fits in uint64 so the same run ports to
 * Solidity byte for byte. A test enforces it.
 */
import { ORIGINALS, SIBLINGS } from "./originals.ts";
import { START_EPOCH, EPOCH_SECONDS, epochOf } from "./chain.ts";
export { EPOCH_SECONDS, epochOf };

const U64 = (1n << 64n) - 1n;

/** The splitmix64 finalizer, the same mixer onenft.click uses. */
export function mix64(x: bigint): bigint {
  let z = (x + 0x9e3779b97f4a7c15n) & U64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & U64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & U64;
  return (z ^ (z >> 31n)) & U64;
}

export const N = ORIGINALS.length; // 100
export const PAIRS = N * (N - 1); // 9900
const DOMAIN_BITS = 14; // 16384 >= 9900
const HALF = 7;
const MASK = (1 << HALF) - 1;

/** Four Feistel rounds over 14 bits. A permutation of 0..16383 for any cycle. */
export function feistel(x: number, cycle: number): number {
  let l = x >> HALF, r = x & MASK;
  for (let round = 0; round < 4; round++) {
    const f = Number(mix64(BigInt(r) | (BigInt(round) << 8n) | (BigInt(cycle) << 16n)) & BigInt(MASK));
    [l, r] = [r, l ^ f];
  }
  return (l << HALF) | r;
}

/** A permutation of 0..PAIRS-1: walk the 14-bit Feistel cycle until the value lands inside the range. */
export function perm(i: number, cycle: number): number {
  let x = feistel(i, cycle);
  while (x >= PAIRS) x = feistel(x, cycle);
  return x;
}

/** Pair number -> composition index a and palette index b, with a != b. */
export function pairOf(index: number): { a: number; b: number } {
  const a = Math.floor(index / (N - 1));
  let b = index % (N - 1);
  if (b >= a) b += 1;
  return { a, b };
}

/** Day 1 is pair perm(0, 0); day 9901 starts cycle 1. */
export function pairForDay(day: number): { a: number; b: number; index: number; cycle: number } {
  const n = day - 1;
  const cycle = Math.floor(n / PAIRS);
  const index = perm(n % PAIRS, cycle);
  return { ...pairOf(index), index, cycle };
}

export function bytesOf(hexString: string): Uint8Array {
  const out = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Composition of a with the palette of b: 12 bytes from b, 256 bytes from a. */
export function remixData(a: number, b: number): Uint8Array {
  const data = bytesOf(ORIGINALS[a].data);
  const pal = bytesOf(ORIGINALS[b].data);
  for (let i = 0; i < 12; i++) data[i] = pal[i];
  return data;
}

const hex2 = (n: number) => n.toString(16).padStart(2, "0");
export function colorsOf(data: Uint8Array): string[] {
  return [0, 1, 2, 3].map((i) => `#${hex2(data[i * 3])}${hex2(data[i * 3 + 1])}${hex2(data[i * 3 + 2])}`);
}
/** Pixel i (row-major, 0..1023) as a color index 0..3. Two bits per pixel, high bits first. */
export function pixel(data: Uint8Array, i: number): number {
  return (data[12 + (i >> 2)] >> (6 - 2 * (i & 3))) & 3;
}

/** The most used color index, lowest index on a tie. Painted once as the ground. */
export function groundOf(data: Uint8Array): number {
  const count = [0, 0, 0, 0];
  for (let i = 0; i < 1024; i++) count[pixel(data, i)]++;
  let best = 0;
  for (let c = 1; c < 4; c++) if (count[c] > count[best]) best = c;
  return best;
}

/**
 * Blitmap's affinity, ported from BlitmapAnalysis.sol: the three first colors
 * summed per channel decide Fire (red), Earth (green) and Water (blue).
 */
export function affinityOf(data: Uint8Array): string {
  const r = data[0] + data[3] + data[6], g = data[1] + data[4] + data[7], b = data[2] + data[5] + data[8];
  const out: string[] = [];
  if (r >= g && r >= b) {
    out.push("Fire");
    if (g > 256) out.push("Earth");
    if (b > 256) out.push("Water");
  } else if (g >= r && g >= b) {
    out.push("Earth");
    if (r > 256) out.push("Fire");
    if (b > 256) out.push("Water");
  } else {
    out.push("Water");
    if (r > 256) out.push("Fire");
    if (g > 256) out.push("Earth");
  }
  if (out.length === 1) return `${out[0]} III`;
  if (out.length === 2) return `${out[0]} II, ${out[1]} I`;
  return `${out[0]} I, ${out[1]} I, ${out[2]} I`;
}

const siblingIndex = new Map<number, number>(SIBLINGS.map(([a, b, id]) => [a * N + b, id]));
/** The Ethereum Blitmap token id that already holds this pair, or null. */
export function siblingOf(a: number, b: number): number | null {
  return siblingIndex.get(a * N + b) ?? null;
}

/**
 * The image: a 32 by 32 grid, one rect for the ground color, then one rect per
 * horizontal run of any other color. Same bytes from Solidity.
 */
export function svgOf(data: Uint8Array): string {
  const colors = colorsOf(data);
  const ground = groundOf(data);
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" shape-rendering="crispEdges"><rect width="32" height="32" fill="${colors[ground]}"/>`;
  for (let y = 0; y < 32; y++) {
    let x = 0;
    while (x < 32) {
      const c = pixel(data, y * 32 + x);
      let w = 1;
      while (x + w < 32 && pixel(data, y * 32 + x + w) === c) w++;
      if (c !== ground) out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${colors[c]}"/>`;
      x += w;
    }
  }
  return out + "</svg>";
}

export type Palette = {
  /** The palette original's name. */
  name: string;
  bg: string;
  cord: string;
  shade: string;
  colors: string[];
};

export type Traits = {
  composition: string;
  compositionArtist: string;
  palette: string;
  paletteArtist: string;
  affinity: string;
  /** "Blitmap #N" when the pair exists on Ethereum, else "none". */
  sibling: string;
};

export type Blit = {
  svg: string;
  palette: Palette;
  epoch: bigint;
  day: number;
  a: number;
  b: number;
  index: number;
  cycle: number;
  data: Uint8Array;
  traits: Traits;
  version: 1;
};

function luma(c: string): number {
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  return (2126 * r + 7152 * g + 722 * b) / 10000;
}
function mixHex(a: string, b: string, t: number): string {
  const ch = (i: number) => Math.round(parseInt(a.slice(i, i + 2), 16) + (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) * t).toString(16).padStart(2, "0");
  return `#${ch(1)}${ch(3)}${ch(5)}`;
}

/** Page colors for a day: the ground as background, the color farthest from it in luma as foreground. Site only, not on chain. */
export function paletteOf(data: Uint8Array, name: string): Palette {
  const colors = colorsOf(data);
  const bg = colors[groundOf(data)];
  let cord = colors[0];
  for (const c of colors) if (Math.abs(luma(c) - luma(bg)) > Math.abs(luma(cord) - luma(bg))) cord = c;
  if (Math.abs(luma(cord) - luma(bg)) < 60) cord = luma(bg) > 128 ? "#111111" : "#f2f2f2";
  return { name, bg, cord, shade: mixHex(cord, bg, 0.5), colors };
}

export function renderDay(day: number, epoch: bigint): Blit {
  const { a, b, index, cycle } = pairForDay(day);
  const data = remixData(a, b);
  const A = ORIGINALS[a], B = ORIGINALS[b];
  const sib = siblingOf(a, b);
  return {
    svg: svgOf(data),
    palette: paletteOf(data, B.name),
    epoch,
    day,
    a,
    b,
    index,
    cycle,
    data,
    traits: { composition: A.name, compositionArtist: A.creator, palette: B.name, paletteArtist: B.creator, affinity: affinityOf(data), sibling: sib === null ? "none" : `Blitmap #${sib}` },
    version: 1,
  };
}

/** The renderer for an epoch (unix day). Every page and image goes through here. */
export function blitFor(epoch: bigint): Blit {
  const day = Number(epoch - START_EPOCH) + 1;
  return renderDay(day < 1 ? 1 : day, epoch);
}

/** The form in which the image leaves the contract. */
export function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
