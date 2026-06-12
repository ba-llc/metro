import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseFont, type Font } from "opentype.js";

const FONT_PATH = path.join(
  process.cwd(),
  "src/server/rendering/fonts/Inter-SemiBold.otf",
);

let fontPromise: Promise<Font> | null = null;

/** Parsed label font, loaded once per process. */
export function getLabelFont(): Promise<Font> {
  fontPromise ??= readFile(FONT_PATH).then((buf) =>
    parseFont(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
  );
  return fontPromise;
}

// Paths are built per glyph (charToGlyph) rather than font.getPath() because
// opentype.js cannot process Inter's GSUB ccmp lookups and throws. Labels need
// no ligatures or shaping, so per-glyph layout renders identically.

export function svgTextWidth(
  font: Font,
  text: string,
  fontSize: number,
): number {
  const scale = fontSize / font.unitsPerEm;
  let width = 0;
  for (const char of text) {
    width += (font.charToGlyph(char).advanceWidth ?? 0) * scale;
  }
  return width;
}

/** Glyph-outline `<path>` markup for `text` with its baseline at `baselineY`. */
export function svgTextPath(
  font: Font,
  text: string,
  x: number,
  baselineY: number,
  fontSize: number,
  fill: string,
): string {
  const scale = fontSize / font.unitsPerEm;
  let cursor = x;
  let d = "";
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    d += glyph.getPath(cursor, baselineY, fontSize).toPathData(2);
    cursor += (glyph.advanceWidth ?? 0) * scale;
  }
  return `<path d="${d}" fill="${fill}" />`;
}

/** Baseline that vertically centers the cap height inside a box. */
export function svgTextBaseline(
  font: Font,
  fontSize: number,
  boxY: number,
  boxHeight: number,
): number {
  const os2 = font.tables.os2 as { sCapHeight?: number } | undefined;
  const capHeight =
    ((os2?.sCapHeight ?? font.unitsPerEm * 0.72) / font.unitsPerEm) * fontSize;
  return boxY + (boxHeight + capHeight) / 2;
}
