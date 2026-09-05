/**
 * The inner pages: calendar, traits, holder, assets, embed. Same copy rules
 * as site.ts: plain words, active voice, no adverbs, no em dashes.
 */
import { blitFor, renderDay, N, PAIRS, type Blit } from "./blit.ts";
import { ORIGINALS, SIBLINGS } from "./originals.ts";
import { dayByNumber, dateOf, type Day } from "./chain.ts";
import type { ChainState } from "./contract.ts";
import { SITE, REPO, PARENT, BLITMAP, layout, topBar, label, shortAddr, isAuthor, explorer, opensea, openseaCollection, chainName, num, plural, stripSize, esc, siblingLink, afterMidnight, traitList, whoBlock, sizePicker, downloadBar, connectScript, downloadScript, type Names, NO_NAMES } from "./site.ts";
import type { Address } from "viem";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Days after today that the calendar previews with the current renderer. */
export const PREVIEW_DAYS = 7;

function utcDate(epoch: bigint): Date {
  return new Date(Number(epoch) * 86400 * 1000);
}

/** One month as a 7-column grid. Days before day 1 and after the preview window are blank. */
function monthGrid(year: number, month: number, today: Day, chain: ChainState | null, dayOne: Day): string {
  const first = new Date(Date.UTC(year, month, 1));
  const daysIn = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: string[] = DOW.map((d) => `<div class="dow">${d}</div>`);
  for (let i = 0; i < lead; i++) cells.push(`<div class="blank"></div>`);
  for (let dom = 1; dom <= daysIn; dom++) {
    const epoch = BigInt(Date.UTC(year, month, dom) / 1000 / 86400);
    const n = Number(epoch - dayOne.epoch) + 1;
    if (n < 1 || n > today.n + PREVIEW_DAYS) {
      cells.push(`<div class="blank"></div>`);
      continue;
    }
    if (n > today.n) {
      cells.push(`<div class="later"><span>${dom}</span></div>`);
      continue;
    }
    const gap = chain && n < today.n && !chain.owners.has(n);
    const title = gap ? `Day ${n}, nobody came` : `Day ${n}`;
    cells.push(gap
      ? `<a class="hole" href="/day/${n}" title="${title}"><span>${dom}</span></a>`
      : `<a href="/day/${n}" title="${title}"><img src="/day/${n}.svg" alt="" loading="lazy"><span>${dom}</span></a>`);
  }
  while ((cells.length - 7) % 7 !== 0) cells.push(`<div class="blank"></div>`);
  return `<section><h3 class="syne">${MONTHS[month]} ${year}</h3><div class="cal">${cells.join("")}</div></section>`;
}

export function explorePage(today: Day, chain: ChainState | null = null): string {
  const k = blitFor(today.epoch);
  const dayOne = dayByNumber(1)!;
  const start = utcDate(dayOne.epoch), end = utcDate(today.epoch + BigInt(PREVIEW_DAYS));
  const months: string[] = [];
  for (let y = end.getUTCFullYear(), m = end.getUTCMonth(); y > start.getUTCFullYear() || (y === start.getUTCFullYear() && m >= start.getUTCMonth()); m--) {
    if (m < 0) { m = 11; y--; }
    months.push(monthGrid(y, m, today, chain, dayOne));
  }
  const taken = chain ? chain.owners.size : 0;
  const gaps = chain ? Math.max(0, today.n - 1 - [...chain.owners.keys()].filter((n) => n < today.n).length) : 0;
  const preview: string[] = [];
  for (let n = today.n + 1; n <= today.n + PREVIEW_DAYS; n++) {
    const d = dayByNumber(n)!;
    const kk = renderDay(n, d.epoch);
    preview.push(`<a href="/preview/${n}.svg"><img src="/preview/${n}.svg" alt="" loading="lazy"><div class="cap">day ${n}, ${esc(kk.traits.composition)} in ${esc(kk.traits.palette)}</div></a>`);
  }
  const body = `<main class="wide">
${topBar()}
<div><h2 class="syne">Every day so far</h2><p class="lead" style="margin-top:8px">${today.n} ${plural(today.n, "day", "days")} remixed${chain ? `, ${taken} taken, ${gaps} ${plural(gaps, "gap", "gaps")}` : ""}. Hatched days are gaps: nobody came, and the number stays empty forever. Dimmed days have not happened yet.</p></div>
${months.join("\n")}
<section><h3 class="syne">The next ${PREVIEW_DAYS} days</h3><p class="small" style="margin:6px 0 14px">The pair exists before anyone sees it. One caveat: the drawing rules can still change for days nobody has claimed yet, so a preview is a promise only once its day arrives.</p><div class="strip">${preview.join("")}</div></section>
</main>`;
  return layout(`Explore | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/explore");
}

// ---- traits ----

type Seen = { days: number[]; taken: number };

function seenTable(rows: { id: string; label: string; artist: string; seen: Seen | undefined; odds: number }[], chain: ChainState | null, kind: string): string {
  const tr = rows.map((r) => {
    const days = r.seen?.days ?? [];
    const links = days.slice(0, 4).map((n) => `<a href="/day/${n}">${n}</a>`).join(", ") + (days.length > 4 ? `, ${days.length - 4} more` : "");
    return `<tr id="${r.id}"><td>${esc(r.label)} <span class="small">${esc(r.artist)}</span></td><td class="n">${Math.round(r.odds * 1000) / 10}%</td><td class="n">${days.length}</td>${chain ? `<td class="n">${r.seen?.taken ?? 0}</td>` : ""}<td class="small">${links}</td></tr>`;
  });
  return `<table class="tr"><thead><tr><th>${kind}</th><th style="text-align:right">odds</th><th style="text-align:right">so far</th>${chain ? `<th style="text-align:right">taken</th>` : ""}<th>days</th></tr></thead><tbody>${tr.join("")}</tbody></table>`;
}

export function traitsPage(today: Day, chain: ChainState | null = null): string {
  const k = blitFor(today.epoch);
  const comp = new Map<number, Seen>(), pal = new Map<number, Seen>(), aff = new Map<string, Seen>();
  let withSibling = 0, withSiblingTaken = 0;
  const note = (m: Map<any, Seen>, key: any, n: number, taken: boolean) => {
    const s = m.get(key) ?? { days: [], taken: 0 };
    s.days.push(n);
    if (taken) s.taken++;
    m.set(key, s);
  };
  for (let n = 1; n <= today.n; n++) {
    const kk = renderDay(n, dayByNumber(n)!.epoch);
    const taken = !chain || chain.owners.has(n);
    note(comp, kk.a, n, taken);
    note(pal, kk.b, n, taken);
    note(aff, kk.traits.affinity, n, taken);
    if (kk.traits.sibling !== "none") {
      withSibling++;
      if (taken) withSiblingTaken++;
    }
  }
  const originals = (m: Map<number, Seen>, prefix: string) => ORIGINALS.map((o, i) => ({ id: `${prefix}${i}`, label: o.name, artist: `by ${o.creator}`, seen: m.get(i), odds: 1 / N }));
  const affRows = [...aff].sort((x, y) => y[1].days.length - x[1].days.length).map(([name, s]) => ({ id: `a-${name.replace(/[^a-z]/gi, "")}`, label: name, artist: "", seen: s, odds: s.days.length / today.n }));
  const body = `<main class="wide">
${topBar()}
<div><h2 class="syne">Traits</h2><p class="lead" style="margin-top:8px">Every day pairs one composition with one palette out of the same 100 originals, so each original comes up as a composition once in 100 days and as a palette once in 100 days, in the long run. So far counts the ${today.n} ${plural(today.n, "day", "days")} remixed to date${chain ? ", taken counts only claimed days" : ""}. The originals themselves are on Ethereum, contract <a href="https://etherscan.io/address/${BLITMAP}">${shortAddr(BLITMAP)}</a>.</p></div>
<section id="composition"><h3 class="syne">Composition</h3><p class="small" style="margin:6px 0 12px">The 1,024 pixels come from this original. Name and artist as recorded in the Ethereum contract.</p>${seenTable(originals(comp, "c"), chain, "original")}</section>
<section id="palette"><h3 class="syne">Palette</h3><p class="small" style="margin:6px 0 12px">The four colors come from this original.</p>${seenTable(originals(pal, "p"), chain, "original")}</section>
<section id="affinity"><h3 class="syne">Affinity</h3><p class="small" style="margin:6px 0 12px">Blitmap's own reading of a palette: red, green and blue summed over the first three colors. The largest channel leads as Fire, Earth or Water; a channel above 256 joins. One element reads III, two read II and I, three read I, I, I. Odds here are the share so far, not the long run.</p>${affRows.length ? seenTable(affRows, chain, "affinity") : `<p class="small">Nothing yet.</p>`}</section>
<section id="sibling"><h3 class="syne">On Ethereum</h3><p class="small" style="margin:6px 0 12px">Blitmap holders made ${num(SIBLINGS.length)} siblings on Ethereum out of the ${num(PAIRS)} possible pairs, so ${Math.round((SIBLINGS.length / PAIRS) * 1000) / 10}% of days here repeat a pair that already exists there, and the token says which one. So far: ${withSibling} of ${today.n}${chain ? `, ${withSiblingTaken} taken` : ""}.</p></section>
<p class="small">Tables from <a href="/spec.json">spec.json</a>. <a href="/how">How the machine works</a>.</p>
</main>`;
  return layout(`Traits | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/traits");
}

// ---- holder ----

/** The way in: connect a wallet or type an address, then land on that wallet's page. */
export function yoursPage(today: Day, chain: ChainState | null = null): string {
  const k = blitFor(today.epoch);
  const body = `<main class="wide">
${topBar()}
<div><h2 class="syne">Your days</h2><p class="lead" style="margin-top:8px">Connect a wallet or type an address, and this page lists every blit it holds, each one ready to save as SVG, PNG or JPEG.</p></div>
${whoBlock(chain)}
<p class="small">Nothing is sent anywhere. The wallet only tells this page which address to look up. The same list is on <a href="https://${PARENT}/wallet">${PARENT}</a> for every collection at once.</p>
</main>
${connectScript("/")}`;
  return layout(`Your days | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/yours");
}

export function holderPage(who: Address, handle: string, today: Day, chain: ChainState, names: Names = NO_NAMES): string {
  const k = blitFor(today.epoch);
  const mine = [...chain.owners].filter(([, o]) => o.toLowerCase() === who.toLowerCase()).map(([n]) => n).sort((a, b) => b - a);
  const name = label(who, names);
  const author = isAuthor(chain, who);
  const rows = mine.map((n) => {
    const d = dayByNumber(n)!;
    const kk = blitFor(d.epoch);
    const c = chain.claims.get(n);
    const since = c ? `${dateOf(d.epoch)}, ${afterMidnight(c.at, d.startsAt)}` : dateOf(d.epoch);
    const links = [c ? `<a href="${explorer(chain.chainId)}/tx/${c.tx}">Transaction</a>` : "", `<a href="${opensea(chain, n)}">OpenSea</a>`, `<a href="/day/${n}">Day page</a>`].filter(Boolean).join(", ");
    return `<div class="tok" id="day-${n}">
<a href="/day/${n}"><img src="/day/${n}.svg" width="256" height="256" alt="Day ${n}" loading="lazy"></a>
<div class="meta">
<div class="num syne">Day ${n}<span class="since">${since}</span></div>
${traitList(kk)}
<p class="small" style="margin:0">${links}.</p>
${downloadBar(n, kk.palette.bg)}
</div>
</div>`;
  });
  const body = `<main class="wide">
${topBar()}
<div><h2 class="syne">${esc(name)}</h2><p class="lead" style="margin-top:8px">${author ? "The author. Every tenth day up to day 1000 lands here." : `${mine.length} ${plural(mine.length, "day", "days")} of ${today.n}.`}${handle.toLowerCase() !== who.toLowerCase() ? ` <span class="small">${shortAddr(who)}</span>` : ""}</p></div>
${whoBlock(chain)}
${rows.length ? `${sizePicker()}\n<div>${rows.join("\n")}</div>` : `<p>No days here yet. <a href="/">Today's blit</a> may still be free.</p>`}
<nav class="nav small" style="padding-top:20px;border-top:1px solid var(--line)"><a href="${explorer(chain.chainId)}/address/${who}">Basescan</a><a href="${chain.chainId === 8453 ? `https://opensea.io/${who}` : `https://testnets.opensea.io/${who}`}">OpenSea</a><a href="/api/holder/${who}">JSON</a><a href="https://${PARENT}/wallet/${who}">All your days on ${PARENT}</a></nav>
</main>
${connectScript("/")}
${rows.length ? downloadScript() : ""}`;
  return layout(`${name} | ${SITE}`, k.palette, body, `/day/${today.n}.png`, `/${handle}`);
}

// ---- assets ----

export function assetsPage(today: Day, chain: ChainState | null = null): string {
  const k = blitFor(today.epoch);
  const iframe = esc(`<iframe src="https://${SITE}/embed" width="320" height="380" style="border:0" title="Today's blit from blit.onenft.click" loading="lazy"></iframe>`);
  const img = esc(`<img src="https://${SITE}/today.svg" width="256" height="256" alt="Today's blit from blit.onenft.click" style="image-rendering:pixelated">`);
  const body = `<main class="prose">
${topBar()}
<h2 class="syne">Take it. It is yours.</h2>
<p>Everything here is <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>: every remix, the contracts, the wordmark, this site. The originals were released CC0 by the Blitmap artists in 2021, and this project only exists because they did. Sup Inc. holds the Blitmap name as a trademark; this site is not Blitmap and is not affiliated with it. No credit needed, no permission to ask. Print it, remix it again, mint it elsewhere. Owning a day gives you the token; the image belongs to everyone.</p>
<h2 class="syne">Images</h2>
<p>Any day as SVG at <code>/day/N.svg</code> and as a 1200 by 630 card at <code>/day/N.png</code>. Today: <a href="/today.svg" download="blit-today.svg">SVG</a>, <a href="/today.png">card</a>. The SVG is the same file the contract holds. Render it with <code>image-rendering: pixelated</code> so the pixels stay square.</p>
<h2 class="syne">Wordmark</h2>
<p>The domain is the wordmark, set in Syne 800. <a href="/wordmark.svg" download="blit-wordmark.svg">wordmark.svg</a> in today's colors.</p>
<h2 class="syne">Put today's blit on your page</h2>
<p>An image that changes every midnight UTC:</p>
<pre class="snip">${img}</pre>
<p>Or a small frame with the day number and a link:</p>
<pre class="snip">${iframe}</pre>
<h2 class="syne">Data</h2>
<p><a href="/api/today">/api/today</a> and <code>/api/day/N</code> return one day: number, date, the pair, the 268 bytes, traits, owner, claim transaction, image links. <a href="/api/days">/api/days</a> lists every day so far. <code>/api/holder/ADDRESS</code> lists one wallet's days. All JSON, open to any origin.</p>
<p><a href="/spec.json">/spec.json</a> holds the shuffle, the 100 originals with names and artists, and the 1,600 Ethereum siblings, so you can port the generator. <a href="/feed.xml">RSS</a> carries one item a day. <a href="/calendar.ics">calendar.ics</a> is a daily event at midnight UTC you can subscribe to, so you never miss a day.</p>
<h2 class="syne">Code and contract</h2>
<p>The generator in TypeScript and Solidity, the site and the contracts: <a href="${REPO}">${REPO.replace("https://", "")}</a>.${chain ? ` Token contract <a href="${explorer(chain.chainId)}/address/${chain.address}">${chain.address}</a> on ${chainName(chain.chainId)}. <a href="${openseaCollection(chain)}">Collection on OpenSea</a>.` : ""} The originals: Blitmap contract <a href="https://etherscan.io/address/${BLITMAP}">${BLITMAP}</a> on Ethereum. Every daily collection, including the knot: <a href="https://${PARENT}">${PARENT}</a>.</p>
<p class="small"><a href="/">Back to today</a></p>
</main>`;
  return layout(`Assets | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/assets");
}

/** A small page for iframes: today's blit, the day number, a link back. */
export function embedPage(today: Day, chain: ChainState | null = null, names: Names = NO_NAMES): string {
  const k = blitFor(today.epoch);
  const o = chain?.owners.get(today.n);
  const state = !chain ? "" : o ? (isAuthor(chain, o) ? "the author's" : `taken by ${label(o, names)}`) : "still nobody's";
  const body = `<main style="padding:12px;display:flex;flex-direction:column;gap:8px;max-width:320px">
<a href="https://${SITE}/day/${today.n}" target="_top" style="display:block;aspect-ratio:1;box-shadow:0 0 0 1px var(--line)" class="knot">${stripSize(k.svg)}</a>
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span class="syne" style="font-weight:800;font-size:22px">Day ${today.n}</span><span class="small">${state}</span></div>
<a class="small" href="https://${SITE}/" target="_top">${SITE}, one blit a day</a>
</main>`;
  return layout(`Day ${today.n} | ${SITE}`, k.palette, body, `/day/${today.n}.png`, "/embed");
}

/** The domain as an SVG wordmark in a palette's colors. */
export function wordmarkSvg(k: Blit): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="160" viewBox="0 0 720 160"><rect width="720" height="160" fill="${k.palette.bg}"/><text x="40" y="104" font-family="Syne, system-ui, sans-serif" font-weight="800" font-size="64" letter-spacing="-2" fill="${k.palette.cord}">${SITE}</text></svg>`;
}

export { siblingLink };
