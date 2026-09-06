import { expect, test } from "bun:test";
import { holderFacts } from "./facts.ts";
import { dayByNumber } from "./chain.ts";
import type { ChainState, Claim } from "./contract.ts";

const A = "0x2222222222222222222222222222222222222222" as const;
const B = "0x4444444444444444444444444444444444444444" as const;
const AUTHOR = "0xAAAA000000000000000000000000000000000001" as const;
function chain(day: number, owners: Record<number, string>, claims: Partial<Claim>[] = []): ChainState {
  return {
    address: "0x1111111111111111111111111111111111111111", chainId: 84532, day, startEpoch: 20701n, author: AUTHOR,
    renderer: "0x3333333333333333333333333333333333333333", rendererLocked: false, secondsLeft: 2000, readAt: Date.now(),
    owners: new Map(Object.entries(owners).map(([k, v]) => [Number(k), v as `0x${string}`])),
    claims: new Map(claims.map((c) => [c.day!, { tx: "0xabc", block: 1n, renderer: "0x3333333333333333333333333333333333333333", at: Number(dayByNumber(c.day!)!.startsAt) + 60, ...c } as Claim])),
  };
}

test("no days, no facts", () => {
  expect(holderFacts(A, dayByNumber(9)!, chain(9, { 2: B }))).toEqual([]);
});

test("chain facts, then originals and artists", () => {
  const f = holderFacts(A, dayByNumber(9)!, chain(9, { 1: A, 3: A, 4: A, 7: B }, [{ day: 1, to: A, at: Number(dayByNumber(1)!.startsAt) + 42 }, { day: 3, to: B }]));
  expect(f.map((x) => x.kind).slice(0, 5)).toEqual(["first", "run", "claimed", "later", "fastest"]);
  expect(f[0].label).toBe("the first blit");
  expect(f[1].text).toBe("Longest run: 2 days in a row, day 3 to 4.");
  expect(f[4].figure).toBe("42 s");
  expect(f.find((x) => x.kind === "originals")!.figure).toMatch(/^\d+ of 100$/);
  expect(f.find((x) => x.kind === "artists")!.figure).toMatch(/^\d+$/);
});

test("author days passed on, but not on the author's own page", () => {
  expect(holderFacts(A, dayByNumber(25)!, chain(25, { 10: A, 20: A })).find((x) => x.kind === "author-days")!.text).toBe("Holds 2 author days, passed on by the author.");
  expect(holderFacts(AUTHOR, dayByNumber(25)!, chain(25, { 10: AUTHOR })).find((x) => x.kind === "author-days")).toBeUndefined();
});
