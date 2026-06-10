import React, { type ReactElement } from "react";
import { formatRate, formatSF, formatTraffic, formatCurrency, labelize } from "@/lib/utils";
import type { TemplateTheme } from "@/features/marketing/schemas";
import type { RenderContext, RenderImages } from "./types";

export type BlockProps = {
  theme: TemplateTheme;
  context: RenderContext;
  images: RenderImages; // asset id -> data URI
  title?: string;
};

function img(images: RenderImages, assetId: string | null): string | null {
  return assetId ? (images[assetId] ?? null) : null;
}

function PageShell({
  theme,
  title,
  children,
  footerText,
}: {
  theme: TemplateTheme;
  title?: string;
  children: React.ReactNode;
  footerText: string;
}) {
  return (
    <div className="page">
      {title ? (
        <div className="page-title" style={{ background: theme.primaryColor }}>
          {title}
        </div>
      ) : null}
      <div className="page-body">{children}</div>
      <div className="page-footer" style={{ background: theme.primaryColor }}>
        <span>{theme.brandName}</span>
        <span>{footerText}</span>
      </div>
    </div>
  );
}

function FullBleedImage({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return <div className="image-placeholder">{alt} not yet generated</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="full-image" />;
}

export function CoverBlock({ theme, context, images }: BlockProps): ReactElement {
  const hero = img(images, context.imageAssets.hero);
  const address = context.address;
  return (
    <div className="page cover" style={{ background: theme.primaryColor }}>
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="Property" className="cover-hero" />
      ) : (
        <div className="cover-hero placeholder" />
      )}
      <div className="cover-panel">
        <div className="cover-kicker" style={{ color: theme.accentColor }}>
          {labelize(context.property.propertyType)} • For Lease
        </div>
        <h1>{context.property.name}</h1>
        {address ? (
          <p className="cover-address">
            {address.street}, {address.city}, {address.state} {address.zip}
          </p>
        ) : null}
        <div className="cover-brand">{theme.brandName}</div>
      </div>
    </div>
  );
}

export function AerialBlock(props: BlockProps): ReactElement {
  const { theme, context, images, title } = props;
  const stats: [string, string][] = [
    ["Total GLA", formatSF(context.property.totalGla)],
    ["Year Built", context.property.yearBuilt?.toString() ?? "—"],
    [
      "Parking Ratio",
      context.property.parkingRatio
        ? `${context.property.parkingRatio}/1,000 SF`
        : "—",
    ],
    ["Available Spaces", String(context.spaces.filter((s) => s.status === "AVAILABLE").length)],
  ];
  return (
    <PageShell theme={theme} title={title ?? "Aerial Overview"} footerText={context.property.name}>
      <FullBleedImage src={img(images, context.imageAssets.aerial)} alt="Satellite aerial" />
      <div className="stat-row">
        {stats.map(([label, value]) => (
          <div key={label} className="stat">
            <div className="stat-value" style={{ color: theme.primaryColor }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function TradeAreaBlock(props: BlockProps): ReactElement {
  const { theme, context, images, title } = props;
  const mapSrc =
    img(images, context.imageAssets.radius) ??
    img(images, context.imageAssets.tradeArea);
  return (
    <PageShell theme={theme} title={title ?? "Trade Area"} footerText={context.property.name}>
      <FullBleedImage src={mapSrc} alt="Trade area map" />
      {context.trafficCounts.length > 0 ? (
        <div className="traffic-row">
          {context.trafficCounts.slice(0, 4).map((t) => (
            <div key={t.roadName} className="stat">
              <div className="stat-value" style={{ color: theme.primaryColor }}>
                {formatTraffic(t.count, t.year)}
              </div>
              <div className="stat-label">{t.roadName}</div>
            </div>
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}

export function SitePlanBlock(props: BlockProps): ReactElement {
  const { theme, context, images, title } = props;
  return (
    <PageShell theme={theme} title={title ?? "Site Plan"} footerText={context.property.name}>
      <FullBleedImage src={img(images, context.imageAssets.sitePlan)} alt="Site plan" />
    </PageShell>
  );
}

export function AvailabilityTableBlock(props: BlockProps): ReactElement {
  const { theme, context, title } = props;
  return (
    <PageShell theme={theme} title={title ?? "Availability"} footerText={context.property.name}>
      <table className="data-table">
        <thead>
          <tr style={{ background: theme.primaryColor }}>
            <th>Suite</th>
            <th>Size</th>
            <th>Type</th>
            <th>Rate</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {context.spaces.map((s) => (
            <tr key={s.suiteNumber}>
              <td>{s.suiteNumber}</td>
              <td>{formatSF(s.squareFootage)}</td>
              <td>{labelize(s.spaceType)}</td>
              <td>{formatRate(s.askingRate, s.rateType)}</td>
              <td>{labelize(s.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}

const demographicRows: [keyof RenderContext["demographics"][number]["metrics"] & string, string, (v: number) => string][] = [
  ["population", "Population", (v) => v.toLocaleString("en-US")],
  ["households", "Households", (v) => v.toLocaleString("en-US")],
  ["avgHouseholdIncome", "Avg HH Income", formatCurrency],
  ["daytimePopulation", "Daytime Population", (v) => v.toLocaleString("en-US")],
  ["medianHousingValue", "Median Housing Value", formatCurrency],
  ["medianAge", "Median Age", (v) => v.toFixed(1)],
];

export function DemographicsBlock(props: BlockProps): ReactElement {
  const { theme, context, title } = props;
  const sets = context.demographics;
  return (
    <PageShell theme={theme} title={title ?? "Demographics"} footerText={context.property.name}>
      {sets.length === 0 ? (
        <div className="image-placeholder">Demographic data not yet added</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr style={{ background: theme.primaryColor }}>
              <th />
              {sets.map((d) => (
                <th key={d.label}>{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {demographicRows.map(([key, label, fmt]) => (
              <tr key={key}>
                <td className="row-label">{label}</td>
                {sets.map((d) => {
                  const v = d.metrics[key];
                  return <td key={d.label}>{typeof v === "number" ? fmt(v) : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}

export function TenantRosterBlock(props: BlockProps): ReactElement {
  const { theme, context, images, title } = props;
  return (
    <PageShell theme={theme} title={title ?? "Tenant Roster"} footerText={context.property.name}>
      <div className="tenant-grid">
        {context.tenants.map((t) => {
          const logo = img(images, t.logoAssetId);
          return (
            <div key={`${t.name}-${t.suiteNumber}`} className="tenant-cell">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={t.name} className="tenant-logo" />
              ) : (
                <div className="tenant-name" style={{ color: theme.primaryColor }}>
                  {t.name}
                </div>
              )}
              {t.isAnchor ? (
                <div className="anchor-badge" style={{ background: theme.accentColor }}>
                  Anchor
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

export function ContactsBlock(props: BlockProps): ReactElement {
  const { theme, context, title } = props;
  return (
    <PageShell theme={theme} title={title ?? "Leasing Contacts"} footerText={context.property.name}>
      <div className="contact-grid">
        {context.contacts.map((c) => (
          <div key={c.name} className="contact-card">
            <div className="contact-name" style={{ color: theme.primaryColor }}>{c.name}</div>
            {c.title ? <div className="contact-meta">{c.title}</div> : null}
            {c.phone ? <div className="contact-meta">{c.phone}</div> : null}
            {c.email ? <div className="contact-meta">{c.email}</div> : null}
            {c.license ? <div className="contact-meta">Lic. {c.license}</div> : null}
          </div>
        ))}
      </div>
      <p className="disclaimer">
        The information contained herein has been obtained from sources deemed
        reliable; however, no representation or warranty is made as to its
        accuracy. Subject to errors, omissions, change of price, or withdrawal
        without notice.
      </p>
    </PageShell>
  );
}

export const blockComponents: Record<string, (props: BlockProps) => ReactElement> = {
  cover: CoverBlock,
  aerial: AerialBlock,
  "trade-area": TradeAreaBlock,
  "site-plan": SitePlanBlock,
  "availability-table": AvailabilityTableBlock,
  demographics: DemographicsBlock,
  "tenant-roster": TenantRosterBlock,
  contacts: ContactsBlock,
};
