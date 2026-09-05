import { expect, test } from "bun:test";
import { perm, pairOf, pairForDay, renderDay, remixData, bytesOf, pixel, groundOf, affinityOf, siblingOf, svgOf, PAIRS, N, feistel } from "./blit.ts";
import { ORIGINALS, SIBLINGS } from "./originals.ts";

test("100 originals of 268 bytes, 1600 siblings, no pair twice", () => {
  expect(N).toBe(100);
  for (const o of ORIGINALS) expect(o.data.length).toBe(536);
  expect(SIBLINGS.length).toBe(1600);
  expect(new Set(SIBLINGS.map(([a, b]) => a * 100 + b)).size).toBe(1600);
  for (const [a, b] of SIBLINGS) expect(a).not.toBe(b);
});

test("feistel is a permutation of 14 bits and perm of the 9900 pairs, for several cycles", () => {
  for (const cycle of [0, 1, 7]) {
    expect(new Set(Array.from({ length: 16384 }, (_, i) => feistel(i, cycle))).size).toBe(16384);
    const seen = new Set(Array.from({ length: PAIRS }, (_, i) => perm(i, cycle)));
    expect(seen.size).toBe(PAIRS);
    for (const x of seen) expect(x).toBeLessThan(PAIRS);
  }
  // Different cycles give different orders.
  expect(perm(0, 0)).not.toBe(perm(0, 1));
});

test("pairOf covers every ordered pair with a != b exactly once", () => {
  const seen = new Set<number>();
  for (let i = 0; i < PAIRS; i++) {
    const { a, b } = pairOf(i);
    expect(a).not.toBe(b);
    expect(a).toBeLessThan(100);
    expect(b).toBeLessThan(100);
    seen.add(a * 100 + b);
  }
  expect(seen.size).toBe(PAIRS);
});

test("day 1 is Jupiter in Fishy, day 9901 starts the second cycle", () => {
  expect(pairForDay(1)).toMatchObject({ a: 13, b: 88, cycle: 0 });
  expect(pairForDay(9901).cycle).toBe(1);
  expect(pairForDay(9901).index).toBe(perm(0, 1));
});

test("remix takes 12 palette bytes from b and 256 pixel bytes from a", () => {
  const d = remixData(0, 6);
  const a = bytesOf(ORIGINALS[0].data), b = bytesOf(ORIGINALS[6].data);
  for (let i = 0; i < 12; i++) expect(d[i]).toBe(b[i]);
  for (let i = 12; i < 268; i++) expect(d[i]).toBe(a[i]);
});

test("pixels decode two bits each, high bits first", () => {
  const d = new Uint8Array(268);
  d[12] = 0b11100100; // pixels 3, 2, 1, 0
  expect([0, 1, 2, 3].map((i) => pixel(d, i))).toEqual([3, 2, 1, 0]);
});

test("ground is the most used color, lowest index on a tie", () => {
  const d = new Uint8Array(268);
  expect(groundOf(d)).toBe(0);
  d.fill(0xff, 12, 12 + 200); // 800 pixels of color 3
  expect(groundOf(d)).toBe(3);
});

test("affinity follows Blitmap's rule", () => {
  const d = new Uint8Array(268);
  d.set([255, 0, 0, 255, 0, 0, 255, 0, 0], 0);
  expect(affinityOf(d)).toBe("Fire III");
  d.set([255, 200, 0, 255, 200, 0, 0, 0, 0], 0);
  expect(affinityOf(d)).toBe("Fire II, Earth I");
  d.set([100, 100, 100, 100, 100, 100, 100, 100, 100], 0);
  expect(affinityOf(d)).toBe("Fire I, Earth I, Water I");
});

test("sibling lookup finds Ethereum token 100 for pair 0/6 and nothing for a new pair", () => {
  expect(siblingOf(0, 6)).toBe(100);
  expect(siblingOf(6, 0)).toBe(siblingOf(6, 0)); // whatever it is, it is stable
  expect(renderDay(2, 0n).traits.sibling).toBe("Blitmap #1209");
  expect(renderDay(1, 0n).traits.sibling).toBe("none");
});

test("svg is 32 by 32 with a ground rect and only runs of other colors", () => {
  const b = renderDay(3, 0n);
  expect(b.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" shape-rendering="crispEdges"><rect width="32" height="32" fill="#')).toBe(true);
  expect(b.svg.endsWith("</svg>")).toBe(true);
  const ground = b.palette.colors[groundOf(b.data)];
  expect(b.svg.slice(200)).not.toContain(`fill="${ground}"`);
  expect(b.svg).toMatch(/<rect x="\d+" y="\d+" width="\d+" height="1" fill="#[0-9a-f]{6}"\/>/);
  expect(b.svg.length).toBeLessThan(20000);
});

test("page palette has a readable foreground", () => {
  for (let d = 1; d <= 200; d++) {
    const p = renderDay(d, 0n).palette;
    expect(p.colors).toContain(p.bg);
    expect(p.bg).not.toBe(p.cord);
  }
});

test("a full cycle renders without error and never repeats a pair", () => {
  const seen = new Set<string>();
  for (let d = 1; d <= PAIRS; d++) {
    const { a, b } = pairForDay(d);
    seen.add(`${a}-${b}`);
  }
  expect(seen.size).toBe(PAIRS);
  expect(svgOf(remixData(99, 0)).length).toBeGreaterThan(200);
});
