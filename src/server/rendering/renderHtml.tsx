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
  .premium-page {
    width: ${PAGE_W}px; height: ${PAGE_H}px; page-break-after: always; overflow: hidden;
    position: relative; background: #fbfcfd; color: #062b37; padding: 56px 64px 96px;
  }
  .premium-page:last-child { page-break-after: auto; }
  .premium-mark {
    position: absolute; right: -120px; top: -180px; width: 360px; height: 360px;
    border-radius: 999px; border: 70px solid rgba(226,88,34,0.08);
  }
  .premium-eyebrow, .premium-kicker {
    font-size: 13px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase;
    color: #1e93b2;
  }
  .premium-eyebrow { position: absolute; left: 64px; top: 28px; }
  .premium-section-title h2 {
    margin-top: 8px; max-width: 680px; font-size: 42px; line-height: 0.98;
    letter-spacing: -0.02em; color: #073746; font-weight: 900;
  }
  .premium-section-title p {
    margin-top: 16px; max-width: 610px; color: #516873; font-size: 16px; line-height: 1.55;
  }
  .premium-footer {
    position: absolute; left: 0; right: 0; bottom: 0; height: 72px; padding: 0 64px;
    background: #0f3057; color: #fff; display: flex; align-items: center; justify-content: space-between;
  }
  .premium-footer strong { display: block; font-size: 16px; line-height: 1.1; }
  .premium-footer span { display: block; margin-top: 4px; color: rgba(255,255,255,0.72); font-size: 11px; }
  .premium-footer-brand { font-size: 18px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .premium-image { width: 100%; height: 100%; display: block; }
  .premium-image-cover { object-fit: cover; }
  .premium-image-contain { object-fit: contain; }
  .premium-image-missing {
    width: 100%; height: 100%; min-height: 220px; border: 1px dashed #b8c7d0; background: #eef4f7;
    display: flex; align-items: center; justify-content: center; color: #6b7f8a; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.08em;
  }
  .premium-cover { padding: 0; background: #062b37; color: #fff; }
  .premium-cover-media { position: absolute; inset: 0; }
  .premium-cover-shade {
    position: absolute; inset: 0; background:
      linear-gradient(90deg, rgba(6,43,55,0.92) 0%, rgba(6,43,55,0.68) 38%, rgba(6,43,55,0.1) 76%),
      linear-gradient(0deg, rgba(6,43,55,0.58), rgba(6,43,55,0));
  }
  .premium-cover-panel {
    position: absolute; left: 56px; top: 70px; width: 610px; padding-left: 28px; border-left: 6px solid #1e93b2;
  }
  .premium-cover-panel h1 { margin-top: 14px; font-size: 72px; line-height: 0.9; letter-spacing: -0.045em; font-weight: 950; }
  .premium-cover-address { margin-top: 18px; font-size: 20px; color: rgba(255,255,255,0.82); }
  .premium-cover-rule { width: 360px; height: 2px; margin: 24px 0; background: rgba(255,255,255,0.5); }
  .premium-cover-offer { max-width: 500px; font-size: 24px; line-height: 1.16; font-weight: 800; color: #fff; }
  .premium-cover-sidebar {
    position: absolute; right: 42px; top: 42px; width: 260px; padding: 22px; background: rgba(6,43,55,0.76);
    border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(12px);
  }
  .premium-sidebar-title { color: #fff; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 14px; }
  .premium-cover-brand { position: absolute; left: 56px; bottom: 36px; font-size: 22px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
  .premium-stat { border: 1px solid #d8e3e8; background: #fff; padding: 16px; }
  .premium-stat-dark { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); color: #fff; margin-top: 10px; }
  .premium-stat-value { font-size: 26px; font-weight: 950; line-height: 1; letter-spacing: -0.02em; color: #073746; }
  .premium-stat-dark .premium-stat-value { color: #fff; }
  .premium-stat-label { margin-top: 7px; font-size: 10px; color: #6b7f8a; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 900; }
  .premium-stat-dark .premium-stat-label { color: rgba(255,255,255,0.62); }
  .premium-anchor-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 16px; }
  .premium-anchor-logo { min-height: 54px; background: #fff; display: flex; align-items: center; justify-content: center; padding: 8px; }
  .premium-anchor-logo img { max-width: 100%; max-height: 38px; object-fit: contain; }
  .premium-anchor-logo span { color: #073746; font-weight: 900; font-size: 11px; text-align: center; }
  .premium-overview-grid { display: grid; grid-template-columns: 1.12fr 0.88fr; gap: 34px; height: 100%; align-items: stretch; }
  .premium-photo-card { min-height: 520px; border: 1px solid #d8e3e8; padding: 10px; background: #fff; box-shadow: 0 24px 80px rgba(5,31,44,0.12); }
  .premium-fact-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 28px; }
  .premium-fact-grid-single { grid-template-columns: 1fr; }
  .premium-availability-cards { display: grid; gap: 10px; margin-top: 22px; }
  .premium-suite-card {
    display: grid; grid-template-columns: 0.75fr 1fr 1.15fr; gap: 12px; padding: 13px 15px;
    border-left: 4px solid #1e93b2; background: #fff; border-top: 1px solid #d8e3e8; border-right: 1px solid #d8e3e8; border-bottom: 1px solid #d8e3e8;
  }
  .premium-suite-card span { display: block; font-size: 9px; color: #6b7f8a; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 900; }
  .premium-suite-card strong { display: block; margin-top: 3px; color: #073746; font-size: 17px; }
  .premium-full-map { position: absolute; inset: 0 0 72px; }
  .premium-map-label {
    position: absolute; left: 64px; top: 58px; background: #0f3057; color: #fff; padding: 18px 24px;
    font-size: 24px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.02em;
  }
  .premium-traffic-badge {
    position: absolute; right: 64px; bottom: 40px; background: #1e93b2; color: #fff; padding: 18px 24px;
    font-size: 28px; font-weight: 950; box-shadow: 0 18px 50px rgba(6,43,55,0.25);
  }
  .premium-traffic-badge span { display: block; margin-top: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; }
  .premium-plan-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 26px; height: 100%; }
  .premium-plan-frame { background: #fff; border: 1px solid #d8e3e8; padding: 12px; box-shadow: 0 20px 70px rgba(5,31,44,0.1); min-height: 560px; }
  .premium-plan-sidebar { padding: 20px; background: #062b37; color: #fff; }
  .premium-plan-sidebar .premium-section-title h2 { color: #fff; font-size: 28px; }
  .premium-mini-suite-list { display: grid; gap: 10px; margin-top: 18px; }
  .premium-mini-suite { display: grid; grid-template-columns: 1fr; gap: 4px; padding: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); }
  .premium-mini-suite strong { font-size: 18px; color: #fff; }
  .premium-mini-suite span { color: rgba(255,255,255,0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  .premium-market-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 34px; height: 100%; align-items: center; }
  .premium-market-map, .premium-demo-map { height: 560px; border: 1px solid #d8e3e8; background: #fff; padding: 10px; box-shadow: 0 24px 70px rgba(5,31,44,0.12); }
  .premium-demo-layout { display: grid; grid-template-columns: 0.82fr 1.18fr; gap: 28px; align-items: start; padding-top: 28px; }
  .premium-data-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d8e3e8; font-size: 15px; }
  .premium-data-table th { text-align: left; padding: 14px 16px; background: #062b37; color: #fff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.12em; }
  .premium-data-table td { padding: 14px 16px; border-bottom: 1px solid #d8e3e8; color: #073746; }
  .premium-data-table tr:nth-child(even) td { background: #f4f8fa; }
  .premium-tenant-wall { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-top: 30px; }
  .premium-tenant-tile {
    position: relative; height: 122px; background: #fff; border: 1px solid #d8e3e8;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 12px;
  }
  .premium-tenant-tile img { max-width: 86%; max-height: 58px; object-fit: contain; }
  .premium-tenant-tile strong { text-align: center; color: #073746; font-size: 15px; }
  .premium-tenant-tile span:not(.premium-anchor-pill) { color: #6b7f8a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
  .premium-anchor-pill { position: absolute; top: 8px; right: 8px; background: #1e93b2; color: #fff; padding: 3px 7px; font-size: 8px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .premium-contact-layout { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 42px; height: 100%; align-items: center; }
  .premium-contact-stack { display: grid; gap: 14px; }
  .premium-contact-card { background: #fff; border: 1px solid #d8e3e8; padding: 22px; border-left: 5px solid #1e93b2; }
  .premium-contact-card h3 { font-size: 26px; color: #073746; line-height: 1; margin-bottom: 8px; }
  .premium-contact-card p, .premium-contact-card span, .premium-contact-card small { display: block; color: #516873; margin-top: 5px; }
  .premium-contact-card strong { display: block; color: #073746; font-size: 18px; margin-top: 10px; }
  .premium-disclaimer { margin-top: 34px; color: #6b7f8a; font-size: 11px; line-height: 1.55; max-width: 560px; }
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
