import { chromium, type Browser } from "playwright-core";
import type { PdfPageSize, PdfRenderer } from "./PdfRenderer";

async function launchBrowser(): Promise<Browser> {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    return chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      headless: true,
    });
  }

  // Vercel serverless: bundled Chromium via @sparticuz/chromium.
  if (process.env.VERCEL === "1") {
    const chromiumPack = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: chromiumPack.args,
      executablePath: await chromiumPack.executablePath(),
      headless: true,
    });
  }

  // Local dev: use the system Chrome install (no browser download).
  return chromium.launch({ channel: "chrome" });
}

/**
 * Renders HTML to PDF with headless Chromium. Swap for a hosted render
 * service by implementing PdfRenderer.
 */
export class ChromiumPdfRenderer implements PdfRenderer {
  async render(
    html: string,
    options: { pageSize: PdfPageSize },
  ): Promise<Buffer> {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
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
