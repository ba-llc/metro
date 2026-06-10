import { chromium } from "playwright-core";
import type { PdfPageSize, PdfRenderer } from "./PdfRenderer";

/**
 * Renders HTML to PDF with headless Chromium via the locally installed Chrome
 * channel (no browser download required in dev). Swap for a hosted render
 * service by implementing PdfRenderer.
 */
export class ChromiumPdfRenderer implements PdfRenderer {
  async render(
    html: string,
    options: { pageSize: PdfPageSize },
  ): Promise<Buffer> {
    const browser = await chromium.launch({ channel: "chrome" });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdf = await page.pdf({
        format: "Letter",
        landscape: options.pageSize === "letter-landscape",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

let instance: PdfRenderer | null = null;

export function getPdfRenderer(): PdfRenderer {
  if (!instance) instance = new ChromiumPdfRenderer();
  return instance;
}
