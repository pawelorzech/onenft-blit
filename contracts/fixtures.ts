/**
 * Generates fixtures for the TS ↔ Solidity byte-equality tests and the data
 * blobs the deploy script writes into DataStore contracts. TypeScript is the
 * source of truth.
 */
import { renderDay, N } from "../src/blit.ts";
import { ORIGINALS, SIBLINGS } from "../src/originals.ts";

const hex = (b: Uint8Array) => "0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

// Data blobs.
const originalsA = ORIGINALS.slice(0, 50).map((o) => o.data).join("");
const originalsB = ORIGINALS.slice(50, 100).map((o) => o.data).join("");
const meta: number[] = [];
for (const o of ORIGINALS) {
  const n = Buffer.from(o.name, "utf8"), c = Buffer.from(o.creator, "utf8");
  if (n.length > 255 || c.length > 255) throw new Error("name too long");
  meta.push(n.length, ...n, c.length, ...c);
}
const sib: number[] = [];
for (const [a, b, id] of SIBLINGS) {
  if (a >= N || b >= N || id > 65535 || id === 0) throw new Error("bad sibling");
  sib.push(a, b, id >> 8, id & 255);
}
const data = { originalsA: "0x" + originalsA, originalsB: "0x" + originalsB, meta: hex(Uint8Array.from(meta)), siblings: hex(Uint8Array.from(sib)) };
await Bun.write(new URL("./test/fixtures/blit_data.json", import.meta.url).pathname, JSON.stringify(data));

// Sample days: the first two weeks, a few far days, the end and start of a cycle.
const START = 20701n;
const days = [...Array.from({ length: 14 }, (_, i) => i + 1), 100, 365, 1000, 4243, 9899, 9900, 9901, 19800, 19801, 50000];
const fixtures = days.map((d) => {
  const b = renderDay(d, START + BigInt(d - 1));
  return { day: d, epoch: (START + BigInt(d - 1)).toString(), a: b.a, b: b.b, palette: b.palette.name, svg: b.svg, traits: b.traits };
});
await Bun.write(new URL("./test/fixtures/blit_days.json", import.meta.url).pathname, JSON.stringify(fixtures, null, 1));
console.log(`${fixtures.length} day fixtures; blobs ${originalsA.length / 2} + ${originalsB.length / 2} + ${meta.length} + ${sib.length} bytes`);
