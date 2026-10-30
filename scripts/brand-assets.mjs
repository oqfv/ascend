// Builds every logo and icon file from one definition of the mark.
//   node scripts/brand-assets.mjs
// The mark: three stones balanced in a cairn, leaning gently; the top stone ("today's stone") is
// partly filled. Below 64 px the solid version is used, because the partial fill would turn to mush.
// The wordmark is Manrope Bold traced to outlines (scripts/brand/wordmark.json), so no font is needed.
// Writes the app's favicon, icons and wordmark data, and the brand kit in ../brand.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const kit = path.resolve(root, "..", "brand");
const word = JSON.parse(await readFile(path.join(root, "scripts", "brand", "wordmark.json"), "utf8"));
const tagline = JSON.parse(await readFile(path.join(root, "scripts", "brand", "tagline.json"), "utf8"));

// Moss palette.
const C = {
  moss: "#46683f", // the mark on light grounds
  mossLight: "#9cc58d", // the mark on dark grounds
  ink: "#1f201d",
  paper: "#f2f2f0",
  stone: "#f1f1ec", // light ground
  night: "#121411", // dark ground
};

// ---- The mark, on a 64-unit grid ----
const STONES = `<rect x="10" y="44" width="42" height="16" rx="14" ry="8" transform="rotate(-4 31 52)"/><rect x="19.5" y="27.5" width="31" height="14" rx="11" ry="7" transform="rotate(6 35 34.5)"/>`;
const TOP_SOLID = `<rect x="17" y="15.5" width="23" height="13" rx="8.5" ry="6.5" transform="translate(0 -4) rotate(-8 28.5 22)"/>`;
const topPartial = (id) =>
  `<g transform="translate(0 -4) rotate(-8 28.5 22)"><rect x="18.2" y="16.7" width="20.6" height="10.6" rx="7.3" ry="5.3" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="17" y="15.5" width="23" height="13" rx="8.5" ry="6.5" clip-path="url(#${id})"/></g>`;
const clip = (id) => `<clipPath id="${id}"><rect x="0" y="21" width="64" height="20"/></clipPath>`;

/** The mark's group in 64-unit space, coloured by `color`. */
function markGroup(color, { partial = true, id = "today" } = {}) {
  return `<g fill="${color}" color="${color}" transform="translate(1 -3)">${STONES}${partial ? topPartial(id) : TOP_SOLID}</g>`;
}
const markDefs = (id = "today") => `<defs>${clip(id)}</defs>`;

const svg = (w, h, body, viewBox = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${body}</svg>`;

/** The mark alone. */
const markSVG = (color, opts) => svg(64, 64, `${markDefs()}${markGroup(color, opts)}`, "4 4 56 56");

/** Horizontal lockup: mark then name, the name's cap height centred on the mark's stones. */
function horizontal(markColor, textColor) {
  const s = 1.9; // mark scale: stones stand about 1.3x the cap height
  const wordX = 132;
  const wordY = 64 * s / 2 - 36 - 2; // centre the 72-unit cap on the mark, nudged to its optical middle
  const body = `${markDefs()}<g transform="scale(${s})">${markGroup(markColor)}</g><path d="${word.d}" fill="${textColor}" transform="translate(${wordX} ${wordY})"/>`;
  const vb = [22, 14, wordX + word.width - 22 + 4, 96];
  return svg(vb[2], vb[3], body, vb.join(" "));
}

/** Stacked lockup: mark above the name, centred. */
function stacked(markColor, textColor) {
  const s = 2.6;
  const markW = 64 * s;
  const W = Math.max(markW, word.width) + 40;
  const mx = (W - markW) / 2 - 1 * s;
  const wy = 64 * s + 8;
  const body = `${markDefs()}<g transform="translate(${mx} 0) scale(${s})">${markGroup(markColor)}</g><path d="${word.d}" fill="${textColor}" transform="translate(${(W - word.width) / 2} ${wy})"/>`;
  return svg(W, wy + 80, body, `0 12 ${W} ${wy + 68}`);
}

/** App icon: moss tile, stones in white. Large sizes keep today's stone; small ones go solid. */
function appIcon(size, { bleed = false, partial = size >= 64 } = {}) {
  const markScale = (size * (bleed ? 0.5 : 0.62)) / 56;
  const offset = (size - 56 * markScale) / 2 - 4 * markScale;
  const radius = bleed ? 0 : size * 0.225;
  return svg(size, size,
    `${markDefs()}<rect width="${size}" height="${size}" rx="${radius}" fill="${C.moss}"/><g transform="translate(${offset} ${offset}) scale(${markScale})">${markGroup("#ffffff", { partial })}</g>`);
}

/** Square social image: stacked lockup and the line, on stone. */
function socialSquare() {
  const S = 1200;
  const s = 6; // stones span y 8.5-57 of the 64 grid, centred on x 32
  const wordScale = 2;
  const tagScale = 0.55;
  const stonesTop = 290;
  const wordTop = stonesTop + 48.5 * s + 50;
  const tagTop = wordTop + word.capHeight * wordScale + 48;
  const body =
    `${markDefs()}<rect width="${S}" height="${S}" fill="${C.stone}"/>` +
    `<g transform="translate(${S / 2 - 32 * s} ${stonesTop - 8.5 * s}) scale(${s})">${markGroup(C.moss)}</g>` +
    `<path d="${word.d}" fill="${C.ink}" transform="translate(${(S - word.width * wordScale) / 2} ${wordTop}) scale(${wordScale})"/>` +
    `<path d="${tagline.d}" fill="#5e5f5b" transform="translate(${(S - tagline.width * tagScale) / 2} ${tagTop}) scale(${tagScale})"/>`;
  return svg(S, S, body);
}

/** Link preview (1200 x 630): the logo top left, the line set large. */
function linkPreview() {
  const W = 1200, H = 630, s = 1.6, ws = 0.62, ts = 1.05;
  const markX = 64, markY = 52;
  const midY = markY + ((8.5 + 57) / 2) * s;
  const body =
    `${markDefs()}<rect width="${W}" height="${H}" fill="${C.stone}"/>` +
    `<g transform="translate(${markX} ${markY}) scale(${s})">${markGroup(C.moss)}</g>` +
    `<path d="${word.d}" fill="${C.ink}" transform="translate(${markX + 56 * s + 26} ${midY - (word.capHeight * ws) / 2}) scale(${ws})"/>` +
    `<path d="${tagline.d}" fill="${C.ink}" transform="translate(80 ${H - 110 - tagline.capHeight * ts}) scale(${ts})"/>`;
  return svg(W, H, body);
}

const png = (markup, width, file) => sharp(Buffer.from(markup), { density: 300 }).resize({ width }).png().toFile(file);

// ---- Brand kit ----
for (const old of ["ascend-logo.png", "ascend-logo-dark-background.png", "ascend-linkedin-square.png", "ascend-app-icon.svg", "ascend-app-icon-1024.png", "ascend-mark.svg", "ascend-mark-dark-background.svg", "ascend-mark-1024.png"]) {
  await rm(path.join(kit, old), { force: true });
}
const out = path.join(kit, "logo");
await mkdir(path.join(out, "svg"), { recursive: true });
await mkdir(path.join(out, "png"), { recursive: true });

const files = {
  "ascend-logo": horizontal(C.moss, C.ink),
  "ascend-logo-on-dark": horizontal(C.mossLight, C.paper),
  "ascend-logo-black": horizontal(C.ink, C.ink),
  "ascend-logo-white": horizontal("#ffffff", "#ffffff"),
  "ascend-logo-stacked": stacked(C.moss, C.ink),
  "ascend-logo-stacked-on-dark": stacked(C.mossLight, C.paper),
  "ascend-mark": markSVG(C.moss),
  "ascend-mark-on-dark": markSVG(C.mossLight),
  "ascend-mark-black": markSVG(C.ink),
  "ascend-mark-white": markSVG("#ffffff"),
  "ascend-mark-small": markSVG(C.moss, { partial: false }),
  "ascend-app-icon": appIcon(1024),
};
for (const [name, markup] of Object.entries(files)) {
  await writeFile(path.join(out, "svg", `${name}.svg`), markup);
  await png(markup, name.includes("app-icon") ? 1024 : name.includes("mark") ? 1024 : 2400, path.join(out, "png", `${name}.png`));
}
await png(socialSquare(), 1200, path.join(out, "png", "ascend-linkedin-square.png"));

// ---- In the app ----
await mkdir(path.join(root, "public", "icons"), { recursive: true });
await writeFile(path.join(root, "src", "app", "icon.svg"), appIcon(64, { partial: false }));
await png(appIcon(180), 180, path.join(root, "src", "app", "apple-icon.png"));
await png(linkPreview(), 1200, path.join(root, "src", "app", "opengraph-image.png"));
await writeFile(path.join(root, "src", "app", "opengraph-image.alt.txt"), "Ascend: every minute counts.");
await png(appIcon(192), 192, path.join(root, "public", "icons", "icon-192.png"));
await png(appIcon(512), 512, path.join(root, "public", "icons", "icon-512.png"));
await png(appIcon(512, { bleed: true }), 512, path.join(root, "public", "icons", "icon-maskable-512.png"));
await writeFile(
  path.join(root, "src", "components", "brand-wordmark.ts"),
  `// Generated by scripts/brand-assets.mjs from Manrope Bold. Do not edit by hand.\n` +
    `export const WORDMARK = ${JSON.stringify({ d: word.d, width: word.width, capHeight: word.capHeight })} as const;\n`,
);

console.log(`Brand kit written to ${out}`);
