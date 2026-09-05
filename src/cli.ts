import { renderDay, toDataUri } from "./blit.ts";

const from = Number(process.argv[2] ?? "1");
const count = Number(process.argv[3] ?? 1);

for (let i = 0; i < count; i++) {
  const b = renderDay(from + i, 0n);
  const file = `out/day-${from + i}.svg`;
  await Bun.write(file, b.svg);
  console.log(`${file}  ${b.traits.composition} / ${b.traits.palette}  ${b.svg.length} B  dataURI ${toDataUri(b.svg).length} B`);
}
