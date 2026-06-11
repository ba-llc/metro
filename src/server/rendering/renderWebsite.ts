import {
  templateThemeSchema,
  type TemplatePage,
  type TemplateTheme,
} from "@/features/marketing/schemas";
import { formatRate, formatSF, formatTraffic, formatCurrency, labelize } from "@/lib/utils";
import type { RenderContext, RenderImages } from "./types";

function img(images: RenderImages, assetId: string | null): string | null {
  return assetId ? (images[assetId] ?? null) : null;
}

function addressLine(context: RenderContext): string {
  if (!context.address) return "";
  const { street, city, state, zip } = context.address;
  return `${street}, ${city}, ${state} ${zip}`;
}

function deckCss(theme: TemplateTheme): string {
  const primary = theme.primaryColor;
  const accent = theme.accentColor;
  return `
    :root {
      --primary-900: ${primary};
      --primary-700: ${primary};
      --primary-600: ${accent};
      --primary-400: ${accent};
      --primary-100: #e2e8f0;
      --cream: #f8fafc;
      --text: ${theme.textColor};
      --text-muted: #64748b;
      --body-font: ${theme.fontFamily};
      --display-font: ${theme.fontFamily};
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: var(--body-font); color: var(--text); background: var(--cream); -webkit-font-smoothing: antialiased; }
    html.deck-page { overflow-x: hidden; scrollbar-width: none; }
    html.deck-page::-webkit-scrollbar { display: none; }

    .deck-toggle-bar { position: fixed; top: 20px; right: 20px; z-index: 200; }
    .deck-toggle { display: inline-flex; gap: 4px; background: rgba(0,0,0,0.55); backdrop-filter: blur(16px); padding: 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); }
    .deck-toggle__btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font: 500 12px var(--body-font); color: rgba(255,255,255,0.6); background: transparent; border: 0; border-radius: 6px; cursor: pointer; }
    .deck-toggle__btn--active { background: rgba(255,255,255,0.12); color: #fff; }

    .deck-sidenav { position: fixed; top: 50%; left: 20px; transform: translateY(-50%); z-index: 150; }
    .deck-sidenav__pill { width: 36px; height: 36px; border-radius: 10px; background: rgba(0,0,0,0.55); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); cursor: pointer; }
    .deck-sidenav:hover .deck-sidenav__pill { color: #fff; }
    .deck-sidenav__menu { position: absolute; left: 46px; top: 50%; transform: translateY(-50%) translateX(-8px); opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s; }
    .deck-sidenav:hover .deck-sidenav__menu { opacity: 1; transform: translateY(-50%) translateX(0); pointer-events: auto; }
    .deck-sidenav__menu-inner { background: rgba(0,0,0,0.75); backdrop-filter: blur(16px); padding: 8px 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); min-width: 200px; }
    .deck-sidenav__item { display: block; padding: 8px 16px; font: 500 13px var(--body-font); color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 6px; }
    .deck-sidenav__item:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .deck-slide-mode .deck-sidenav { display: none; }

    .deck-slide-nav { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 150; display: none; align-items: center; gap: 8px; padding: 6px; border-radius: 12px; background: rgba(0,0,0,0.55); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); }
    .deck-slide-mode .deck-slide-nav { display: inline-flex; }
    .deck-slide-nav__btn { width: 32px; height: 32px; border-radius: 8px; background: transparent; border: 0; cursor: pointer; color: rgba(255,255,255,0.7); }
    .deck-slide-nav__counter { font: 500 12px var(--body-font); color: rgba(255,255,255,0.7); padding: 0 8px; min-width: 52px; text-align: center; }

    .deck-section { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; position: relative; padding: 4rem 2rem; }
    .deck-section--dark { background: var(--primary-900); color: #fff; }
    .deck-section--light { background: var(--cream); color: var(--text); }
    .deck-section--white { background: #fff; color: var(--text); }
    .deck-frame { width: min(1100px, 100%); margin: 0 auto; position: relative; z-index: 2; }
    .deck-section__glow { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in srgb, var(--primary-600) 35%, transparent), transparent); pointer-events: none; }

    .landing-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
    .landing-reveal.is-visible { opacity: 1; transform: none; }
    .deck-reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1); }
    .deck-reveal.is-visible { opacity: 1; transform: none; }

    .deck-eyebrow { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--primary-600); margin-bottom: 1rem; display: flex; align-items: center; gap: 10px; }
    .deck-eyebrow::before { content: ''; width: 24px; height: 1px; background: currentColor; }
    .deck-section--dark .deck-eyebrow { color: var(--primary-400); }
    .deck-headline { font-size: clamp(36px, 5vw, 64px); line-height: 1.05; font-weight: 800; margin: 0 0 1rem; }
    .deck-headline em { font-style: normal; color: var(--primary-600); }
    .deck-section--dark .deck-headline em { color: var(--primary-400); }
    .deck-subhead { font-size: clamp(16px, 2vw, 20px); line-height: 1.6; color: var(--text-muted); max-width: 52ch; }
    .deck-section--dark .deck-subhead { color: rgba(255,255,255,0.75); }

    .deck-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-top: 2rem; }
    .deck-stat { padding: 1.25rem; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; background: #fff; }
    .deck-section--dark .deck-stat { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
    .deck-stat-value { font-size: 28px; font-weight: 800; }
    .deck-stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-top: 4px; }
    .deck-section--dark .deck-stat-label { color: rgba(255,255,255,0.6); }

    .deck-split { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; }
    @media (max-width: 768px) { .deck-split { grid-template-columns: 1fr; } }
    .deck-image { width: 100%; border-radius: 12px; object-fit: cover; max-height: 420px; background: #e2e8f0; }
    .deck-image-placeholder { width: 100%; min-height: 280px; border-radius: 12px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8; }

    .deck-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 1.5rem; }
    .deck-table th { text-align: left; padding: 10px 12px; background: var(--primary-900); color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .deck-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .deck-table tr:nth-child(even) td { background: #f8fafc; }

    .deck-tenant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .deck-tenant { border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; text-align: center; min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    .deck-tenant img { max-width: 80%; max-height: 48px; object-fit: contain; }
    .deck-tenant-name { font-size: 13px; font-weight: 700; }

    .deck-contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .deck-contact { border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
    .deck-contact-name { font-size: 18px; font-weight: 700; }
    .deck-contact-meta { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

    .deck-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 2rem; padding: 14px 28px; border-radius: 999px; background: var(--primary-600); color: #fff; font-weight: 600; text-decoration: none; font-size: 15px; }

    .deck-slide-mode [data-deck-slide] { display: none; min-height: 100vh; min-height: 100dvh; }
    .deck-slide-mode [data-deck-slide].deck-slide-active { display: flex; }
  `;
}

const deckScript = `
(function () {
  var sections = Array.from(document.querySelectorAll('[data-deck-slide]'));
  var idx = 0;
  var body = document.body;
  var counter = document.getElementById('deck-slide-counter');
  var prev = document.getElementById('deck-slide-prev');
  var next = document.getElementById('deck-slide-next');
  var webBtn = document.getElementById('deck-mode-web');
  var slideBtn = document.getElementById('deck-mode-slide');

  function showSlide(i) {
    idx = Math.max(0, Math.min(sections.length - 1, i));
    sections.forEach(function (s, n) {
      s.classList.toggle('deck-slide-active', n === idx);
    });
    if (counter) counter.textContent = (idx + 1) + ' / ' + sections.length;
    if (prev) prev.style.opacity = idx === 0 ? '0.35' : '1';
    if (next) next.style.opacity = idx === sections.length - 1 ? '0.35' : '1';
  }

  function enterSlideMode() {
    body.classList.add('deck-slide-mode');
    if (webBtn) webBtn.classList.remove('deck-toggle__btn--active');
    if (slideBtn) slideBtn.classList.add('deck-toggle__btn--active');
    var centered = 0;
    sections.forEach(function (s, n) {
      var r = s.getBoundingClientRect();
      if (r.top <= window.innerHeight / 2 && r.bottom >= window.innerHeight / 2) centered = n;
    });
    showSlide(centered);
  }

  function enterWebMode() {
    body.classList.remove('deck-slide-mode');
    if (webBtn) webBtn.classList.add('deck-toggle__btn--active');
    if (slideBtn) slideBtn.classList.remove('deck-toggle__btn--active');
    sections[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (webBtn) webBtn.addEventListener('click', enterWebMode);
  if (slideBtn) slideBtn.addEventListener('click', enterSlideMode);
  if (prev) prev.addEventListener('click', function () { showSlide(idx - 1); });
  if (next) next.addEventListener('click', function () { showSlide(idx + 1); });
  document.querySelectorAll('[data-deck-go]').forEach(function (el) {
    el.addEventListener('click', function () {
      enterSlideMode();
      showSlide(Number(el.getAttribute('data-deck-go')));
    });
  });
  document.querySelectorAll('[data-deck-nav]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (body.classList.contains('deck-slide-mode')) {
        e.preventDefault();
        showSlide(Number(el.getAttribute('data-deck-nav')));
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!body.classList.contains('deck-slide-mode')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); showSlide(idx + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); showSlide(idx - 1); }
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          entry.target.querySelectorAll('.deck-reveal').forEach(function (el, i) {
            el.style.transitionDelay = (i * 0.08) + 's';
            el.classList.add('is-visible');
          });
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.landing-reveal').forEach(function (el) { obs.observe(el); });
  } else {
    document.querySelectorAll('.landing-reveal, .deck-reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  if (webBtn) webBtn.classList.add('deck-toggle__btn--active');
})();
`;

type SectionDef = { id: string; label: string; variant: "dark" | "light" | "white"; html: string };

function buildSections(input: {
  theme: TemplateTheme;
  pages: TemplatePage[];
  context: RenderContext;
  images: RenderImages;
}): SectionDef[] {
  const { theme, context, images } = input;
  const addr = addressLine(context);
  const hero = img(images, context.imageAssets.hero);
  const aerial = img(images, context.imageAssets.aerial);
  const sitePlan = img(images, context.imageAssets.sitePlan);
  const sections: SectionDef[] = [];

  sections.push({
    id: "hero",
    label: "Overview",
    variant: "dark",
    html: `
      <div class="deck-eyebrow deck-reveal">${labelize(context.property.propertyType)} · For Lease</div>
      <h1 class="deck-headline deck-reveal">${context.property.name}</h1>
      <p class="deck-subhead deck-reveal">${addr}${context.property.description ? `<br><br>${context.property.description}` : ""}</p>
      <div class="deck-stat-grid deck-reveal">
        ${context.property.totalGla ? `<div class="deck-stat"><div class="deck-stat-value">${formatSF(context.property.totalGla)}</div><div class="deck-stat-label">Total GLA</div></div>` : ""}
        ${context.property.yearBuilt ? `<div class="deck-stat"><div class="deck-stat-value">${context.property.yearBuilt}</div><div class="deck-stat-label">Year Built</div></div>` : ""}
        ${context.property.parkingRatio ? `<div class="deck-stat"><div class="deck-stat-value">${context.property.parkingRatio}</div><div class="deck-stat-label">Parking Ratio</div></div>` : ""}
        <div class="deck-stat"><div class="deck-stat-value">${context.spaces.filter((s) => s.status === "AVAILABLE").length}</div><div class="deck-stat-label">Available Suites</div></div>
      </div>
      ${hero ? `<img class="deck-image deck-reveal" style="margin-top:2rem" src="${hero}" alt="Property hero" />` : ""}
    `,
  });

  if (aerial || context.trafficCounts.length) {
    sections.push({
      id: "location",
      label: "Location",
      variant: "light",
      html: `
        <div class="deck-split">
          <div>
            <div class="deck-eyebrow deck-reveal">Trade Area</div>
            <h2 class="deck-headline deck-reveal">Prime <em>retail</em> location</h2>
            <p class="deck-subhead deck-reveal">${addr}</p>
            ${context.trafficCounts.length ? `<div class="deck-stat-grid deck-reveal">${context.trafficCounts.slice(0, 3).map((t) => `<div class="deck-stat"><div class="deck-stat-value">${formatTraffic(t.count)}</div><div class="deck-stat-label">${t.roadName}${t.year ? ` (${t.year})` : ""}</div></div>`).join("")}</div>` : ""}
          </div>
          <div class="deck-reveal">${aerial ? `<img class="deck-image" src="${aerial}" alt="Aerial" />` : `<div class="deck-image-placeholder">Aerial map not yet generated</div>`}</div>
        </div>
      `,
    });
  }

  if (sitePlan || context.spaces.length) {
    const rows = context.spaces
      .map(
        (s) => `<tr><td>${s.suiteNumber}</td><td>${s.squareFootage ? formatSF(s.squareFootage) : "—"}</td><td>${s.status === "AVAILABLE" ? formatRate(s.askingRate, s.rateType) : labelize(s.status)}</td></tr>`,
      )
      .join("");
    sections.push({
      id: "availability",
      label: "Availability",
      variant: "white",
      html: `
        <div class="deck-split">
          <div class="deck-reveal">${sitePlan ? `<img class="deck-image" src="${sitePlan}" alt="Site plan" />` : `<div class="deck-image-placeholder">Site plan export pending</div>`}</div>
          <div>
            <div class="deck-eyebrow deck-reveal">Site Plan</div>
            <h2 class="deck-headline deck-reveal">Current <em>availability</em></h2>
            <table class="deck-table deck-reveal"><thead><tr><th>Suite</th><th>Size</th><th>Rate / Status</th></tr></thead><tbody>${rows}</tbody></table>
          </div>
        </div>
      `,
    });
  }

  if (context.demographics.length) {
    const demo = context.demographics[0];
    const metrics = demo?.metrics ?? {};
    sections.push({
      id: "demographics",
      label: "Demographics",
      variant: "light",
      html: `
        <div class="deck-eyebrow deck-reveal">Market Data</div>
        <h2 class="deck-headline deck-reveal">${demo?.label ?? "Trade area"} <em>demographics</em></h2>
        <div class="deck-stat-grid deck-reveal">
          ${metrics.population != null ? `<div class="deck-stat"><div class="deck-stat-value">${metrics.population.toLocaleString()}</div><div class="deck-stat-label">Population</div></div>` : ""}
          ${metrics.households != null ? `<div class="deck-stat"><div class="deck-stat-value">${metrics.households.toLocaleString()}</div><div class="deck-stat-label">Households</div></div>` : ""}
          ${metrics.avgIncome != null ? `<div class="deck-stat"><div class="deck-stat-value">${formatCurrency(metrics.avgIncome)}</div><div class="deck-stat-label">Avg Income</div></div>` : ""}
          ${metrics.daytimePopulation != null ? `<div class="deck-stat"><div class="deck-stat-value">${metrics.daytimePopulation.toLocaleString()}</div><div class="deck-stat-label">Daytime Pop.</div></div>` : ""}
        </div>
      `,
    });
  }

  if (context.tenants.length) {
    sections.push({
      id: "tenants",
      label: "Tenants",
      variant: "white",
      html: `
        <div class="deck-eyebrow deck-reveal">Co-Tenancy</div>
        <h2 class="deck-headline deck-reveal">Strong <em>tenant roster</em></h2>
        <div class="deck-tenant-grid deck-reveal">
          ${context.tenants
            .map((t) => {
              const logo = t.logoAssetId ? img(images, t.logoAssetId) : null;
              return `<div class="deck-tenant">${logo ? `<img src="${logo}" alt="${t.name}" />` : `<span class="deck-tenant-name">${t.name}</span>`}${logo ? `<span class="deck-tenant-name">${t.name}</span>` : ""}</div>`;
            })
            .join("")}
        </div>
      `,
    });
  }

  sections.push({
    id: "contacts",
    label: "Contact",
    variant: "dark",
    html: `
      <div class="deck-section__glow"></div>
      <div class="deck-eyebrow deck-reveal">Leasing</div>
      <h2 class="deck-headline deck-reveal">Schedule a <em>tour</em></h2>
      <div class="deck-contact-grid deck-reveal">
        ${context.contacts
          .map(
            (c) => `<div class="deck-contact"><div class="deck-contact-name">${c.name}</div>${c.title ? `<div class="deck-contact-meta">${c.title}</div>` : ""}${c.phone ? `<div class="deck-contact-meta">${c.phone}</div>` : ""}${c.email ? `<div class="deck-contact-meta"><a href="mailto:${c.email}" style="color:inherit">${c.email}</a></div>` : ""}</div>`,
          )
          .join("")}
      </div>
      <p class="deck-subhead deck-reveal" style="margin-top:2rem">${theme.brandName} · ${addr}</p>
    `,
  });

  return sections;
}

/** Property microsite: pitchdeck-style HTML (Web + Slides modes). */
export function renderWebsiteHtml(input: {
  theme: Partial<TemplateTheme>;
  pages: TemplatePage[];
  context: RenderContext;
  images: RenderImages;
}): string {
  const theme = templateThemeSchema.parse(input.theme ?? {});
  const sections = buildSections({ ...input, theme });
  const title = `${input.context.property.name} — ${theme.brandName}`;

  const navItems = sections
    .map(
      (s, i) =>
        `<a class="deck-sidenav__item" href="#${s.id}" data-deck-nav="${i}">${s.label}</a>`,
    )
    .join("");

  const pickerItems = sections
    .map(
      (s, i) =>
        `<button type="button" class="deck-slide-nav__btn" data-deck-go="${i}" title="${s.label}">${i + 1}</button>`,
    )
    .join("");

  const sectionHtml = sections
    .map(
      (s, i) => `
    <section id="${s.id}" class="deck-section deck-section--${s.variant} landing-reveal" data-deck-slide="${i}">
      <div class="deck-frame">${s.html}</div>
    </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en" class="deck-page">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${input.context.property.description ?? title}">
  <style>${deckCss(theme)}</style>
</head>
<body>
  <div class="deck-toggle-bar">
    <div class="deck-toggle">
      <button type="button" id="deck-mode-web" class="deck-toggle__btn">Web</button>
      <button type="button" id="deck-mode-slide" class="deck-toggle__btn">Slides</button>
    </div>
  </div>
  <nav class="deck-sidenav" aria-label="Sections">
    <div class="deck-sidenav__pill" aria-hidden="true">☰</div>
    <div class="deck-sidenav__menu"><div class="deck-sidenav__menu-inner">${navItems}</div></div>
  </nav>
  <div class="deck-slide-nav" aria-label="Slide navigation">
    <button type="button" id="deck-slide-prev" class="deck-slide-nav__btn" aria-label="Previous">←</button>
    <span id="deck-slide-counter" class="deck-slide-nav__counter">1 / ${sections.length}</span>
    <button type="button" id="deck-slide-next" class="deck-slide-nav__btn" aria-label="Next">→</button>
    <div class="deck-slide-nav__slide-only">${pickerItems}</div>
  </div>
  ${sectionHtml}
  <script>${deckScript}</script>
</body>
</html>`;
}
