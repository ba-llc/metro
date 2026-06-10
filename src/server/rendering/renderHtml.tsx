import React from "react";
import {
  templateThemeSchema,
  type TemplatePage,
  type TemplateTheme,
} from "@/features/marketing/schemas";
import { blockComponents, type BlockProps } from "./blocks";
import type { RenderContext, RenderImages } from "./types";

// US Letter landscape at CSS 96dpi.
const PAGE_W = 1056;
const PAGE_H = 816;

const printCss = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: letter landscape; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    width: ${PAGE_W}px; height: ${PAGE_H}px; page-break-after: always;
    display: flex; flex-direction: column; overflow: hidden; position: relative;
    background: #ffffff;
  }
  .page:last-child { page-break-after: auto; }
  .page-title {
    color: #fff; font-size: 26px; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; padding: 22px 48px;
  }
  .page-body { flex: 1; padding: 32px 48px; display: flex; flex-direction: column; gap: 24px; min-height: 0; }
  .page-footer {
    color: #fff; display: flex; justify-content: space-between; padding: 12px 48px;
    font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .full-image { flex: 1; width: 100%; object-fit: contain; min-height: 0; }
  .image-placeholder {
    flex: 1; display: flex; align-items: center; justify-content: center;
    background: #f1f5f9; color: #94a3b8; font-size: 18px; border: 2px dashed #cbd5e1;
  }
  .stat-row, .traffic-row { display: flex; gap: 16px; }
  .stat { flex: 1; text-align: center; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 15px; }
  .data-table th { color: #fff; text-align: left; padding: 12px 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
  .data-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
  .data-table tr:nth-child(even) td { background: #f8fafc; }
  .row-label { font-weight: 600; }
  .tenant-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .tenant-cell {
    height: 110px; border: 1px solid #e2e8f0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 8px; padding: 12px; position: relative;
  }
  .tenant-logo { max-width: 80%; max-height: 60px; object-fit: contain; }
  .tenant-name { font-size: 16px; font-weight: 700; text-align: center; }
  .anchor-badge {
    position: absolute; top: 8px; right: 8px; color: #fff; font-size: 10px;
    padding: 2px 8px; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .contact-card { border: 1px solid #e2e8f0; padding: 24px; }
  .contact-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .contact-meta { font-size: 14px; color: #475569; margin-top: 2px; }
  .disclaimer { margin-top: auto; font-size: 10px; color: #94a3b8; line-height: 1.5; }
  .cover { color: #fff; }
  .cover-hero { width: 100%; height: 55%; object-fit: cover; }
  .cover-hero.placeholder { background: linear-gradient(135deg, #1e293b, #334155); }
  .cover-panel { flex: 1; padding: 48px; display: flex; flex-direction: column; }
  .cover-kicker { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 14px; }
  .cover h1 { font-size: 52px; line-height: 1.05; font-weight: 800; }
  .cover-address { font-size: 20px; margin-top: 12px; opacity: 0.85; }
  .cover-brand { margin-top: auto; font-size: 16px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
`;

export async function renderDocumentHtml(input: {
  theme: Partial<TemplateTheme>;
  pages: TemplatePage[];
  context: RenderContext;
  images: RenderImages;
}): Promise<string> {
  // Dynamic import — Next.js forbids static react-dom/server imports in the
  // App Router module graph; this module only runs inside the job runner.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const theme = templateThemeSchema.parse(input.theme ?? {});

  const pages = input.pages.map((page, i) => {
    const Block = blockComponents[page.block];
    if (!Block) throw new Error(`Unknown block type: ${page.block}`);
    const props: BlockProps = {
      theme,
      context: input.context,
      images: input.images,
      title: page.title,
    };
    return <Block key={i} {...props} />;
  });

  const body = renderToStaticMarkup(<>{pages}</>);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${printCss}\nbody { font-family: ${theme.fontFamily}; color: ${theme.textColor}; }</style>
</head>
<body>${body}</body>
</html>`;
}

/** Email flyer: same context rendered as a single email-safe HTML document. */
export function renderEmailHtml(input: {
  theme: Partial<TemplateTheme>;
  context: RenderContext;
  images: RenderImages;
}): string {
  const theme = templateThemeSchema.parse(input.theme ?? {});
  const { context, images } = input;
  const hero = context.imageAssets.hero ? images[context.imageAssets.hero] : null;
  const address = context.address
    ? `${context.address.street}, ${context.address.city}, ${context.address.state} ${context.address.zip}`
    : "";

  const spaceRows = context.spaces
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${s.suiteNumber}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${
          s.squareFootage ? `${s.squareFootage.toLocaleString("en-US")} SF` : "—"
        }</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${
          s.askingRate ? `$${Number(s.askingRate).toFixed(2)}/SF ${s.rateType ?? ""}` : "—"
        }</td>
      </tr>`,
    )
    .join("");

  const contactRows = context.contacts
    .map(
      (c) =>
        `<p style="margin:4px 0;font-size:14px;">${c.name}${c.title ? ` — ${c.title}` : ""}${
          c.phone ? ` · ${c.phone}` : ""
        }${c.email ? ` · ${c.email}` : ""}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#f1f5f9;font-family:${theme.fontFamily};color:${theme.textColor};">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr><td style="background:${theme.primaryColor};color:#ffffff;padding:24px 32px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${theme.accentColor};">For Lease</p>
        <h1 style="margin:8px 0 4px;font-size:28px;">${context.property.name}</h1>
        <p style="margin:0;font-size:14px;opacity:0.85;">${address}</p>
      </td></tr>
      ${hero ? `<tr><td><img src="${hero}" width="600" style="display:block;width:100%;" alt="Property" /></td></tr>` : ""}
      <tr><td style="padding:24px 32px;">
        <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.06em;color:${theme.primaryColor};margin:0 0 12px;">Availability</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
          <tr style="background:${theme.primaryColor};color:#ffffff;">
            <th style="padding:8px 12px;text-align:left;">Suite</th>
            <th style="padding:8px 12px;text-align:left;">Size</th>
            <th style="padding:8px 12px;text-align:left;">Rate</th>
          </tr>
          ${spaceRows}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 24px;">
        <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.06em;color:${theme.primaryColor};margin:0 0 8px;">Leasing Contacts</h2>
        ${contactRows}
      </td></tr>
      <tr><td style="background:${theme.primaryColor};color:#ffffff;padding:16px 32px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">
        ${theme.brandName}
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}
