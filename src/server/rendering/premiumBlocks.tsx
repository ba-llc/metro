import React, { type ReactElement } from "react";
import { formatCurrency, formatRate, formatSF, formatTraffic, labelize } from "@/lib/utils";
import type { BlockProps } from "./blocks";
import type { RenderContext, RenderImages } from "./types";

function img(images: RenderImages, assetId: string | null): string | null {
  return assetId ? (images[assetId] ?? null) : null;
}

function addressLine(context: RenderContext) {
  const address = context.address;
  return address
    ? `${address.street}, ${address.city}, ${address.state} ${address.zip}`
    : "";
}

function availableSpaces(context: RenderContext) {
  return context.spaces.filter((space) =>
    ["AVAILABLE", "PENDING"].includes(space.status),
  );
}

function topTraffic(context: RenderContext) {
  return context.trafficCounts[0] ?? null;
}

function availabilitySummary(spaces: ReturnType<typeof availableSpaces>) {
  const knownSf = spaces.reduce((sum, space) => sum + (space.squareFootage ?? 0), 0);
  if (!spaces.length) return "Availability details available on request";
  const suiteText = `${spaces.length} available suite${spaces.length === 1 ? "" : "s"}`;
  return knownSf > 0 ? `${formatSF(knownSf)} available across ${suiteText}` : suiteText;
}

function Page({
  children,
  context,
  eyebrow,
}: {
  children: React.ReactNode;
  context: RenderContext;
  eyebrow?: string;
}) {
  return (
    <div className="premium-page">
      <div className="premium-mark" />
      {eyebrow ? <div className="premium-eyebrow">{eyebrow}</div> : null}
      {children}
      <Footer context={context} />
    </div>
  );
}

function Footer({ context }: { context: RenderContext }) {
  return (
    <div className="premium-footer">
      <div>
        <strong>{context.property.name}</strong>
        <span>{addressLine(context)}</span>
      </div>
      <div className="premium-footer-brand">Metro Commercial</div>
    </div>
  );
}

function ImageFrame({
  src,
  label,
  mode = "cover",
}: {
  src: string | null;
  label: string;
  mode?: "cover" | "contain";
}) {
  if (!src) return <div className="premium-image-missing">{label} pending</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`premium-image premium-image-${mode}`} src={src} alt={label} />;
}

function Stat({
  label,
  value,
  tone = "light",
}: {
  label: string;
  value: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className={`premium-stat premium-stat-${tone}`}>
      <div className="premium-stat-value">{value}</div>
      <div className="premium-stat-label">{label}</div>
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  copy,
}: {
  kicker: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="premium-section-title">
      <div className="premium-kicker">{kicker}</div>
      <h2>{title}</h2>
      {copy ? <p>{copy}</p> : null}
    </div>
  );
}

export function PremiumCoverBlock({ theme, context, images }: BlockProps): ReactElement {
  const hero = img(images, context.imageAssets.aerial) ?? img(images, context.imageAssets.hero);
  const availability = availableSpaces(context);
  const traffic = topTraffic(context);
  const anchors = context.tenants.filter((tenant) => tenant.isAnchor).slice(0, 4);

  return (
    <div className="premium-page premium-cover">
      <div className="premium-cover-media">
        <ImageFrame src={hero} label="Property aerial" />
        <div className="premium-cover-shade" />
      </div>
      <div className="premium-cover-panel" style={{ borderColor: theme.accentColor }}>
        <div className="premium-kicker">{labelize(context.property.propertyType)} / For Lease</div>
        <h1>{context.property.name}</h1>
        <p className="premium-cover-address">{addressLine(context)}</p>
        <div className="premium-cover-rule" />
        <p className="premium-cover-offer">
          {availabilitySummary(availability)}
        </p>
      </div>
      <div className="premium-cover-sidebar">
        <div className="premium-sidebar-title">Market Signals</div>
        <Stat label="Total GLA" value={formatSF(context.property.totalGla)} tone="dark" />
        <Stat label="Available" value={availability.length ? String(availability.length) : "0"} tone="dark" />
        <Stat
          label={traffic?.roadName ?? "Traffic"}
          value={traffic ? formatTraffic(traffic.count, traffic.year) : "Pending"}
          tone="dark"
        />
        {anchors.length ? (
          <div className="premium-anchor-strip">
            {anchors.map((tenant) => {
              const logo = img(images, tenant.logoAssetId);
              return (
                <div key={tenant.name} className="premium-anchor-logo">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={tenant.name} />
                  ) : (
                    <span>{tenant.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="premium-cover-brand">Metro Commercial</div>
    </div>
  );
}

export function PremiumOverviewBlock({ context, images }: BlockProps): ReactElement {
  const availability = availableSpaces(context);
  const hero = img(images, context.imageAssets.hero) ?? img(images, context.imageAssets.aerial);

  return (
    <Page context={context} eyebrow="Executive Summary">
      <div className="premium-overview-grid">
        <div>
          <SectionTitle
            kicker="Offering"
            title="A polished retail opportunity package built from the property record."
            copy={
              context.property.description ??
              "Availability, tenancy, maps, demographics, and site plan graphics are assembled into one client-facing presentation."
            }
          />
          <div className="premium-fact-grid">
            <Stat label="Total GLA" value={formatSF(context.property.totalGla)} />
            <Stat label="Year Built" value={context.property.yearBuilt?.toString() ?? "Pending"} />
            <Stat
              label="Parking Ratio"
              value={
                context.property.parkingRatio
                  ? `${context.property.parkingRatio}/1,000 SF`
                  : "Pending"
              }
            />
            <Stat label="Availability" value={`${availability.length} spaces`} />
          </div>
          <div className="premium-availability-cards">
            {availability.slice(0, 4).map((space) => (
              <div key={space.suiteNumber} className="premium-suite-card">
                <div>
                  <span>Suite</span>
                  <strong>{space.suiteNumber}</strong>
                </div>
                <div>
                  <span>Size</span>
                  <strong>{formatSF(space.squareFootage)}</strong>
                </div>
                <div>
                  <span>Rate</span>
                  <strong>{formatRate(space.askingRate, space.rateType)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="premium-photo-card">
          <ImageFrame src={hero} label="Property image" />
        </div>
      </div>
    </Page>
  );
}

export function PremiumAerialBlock({ context, images }: BlockProps): ReactElement {
  const aerial = img(images, context.imageAssets.aerial);
  const traffic = context.trafficCounts.slice(0, 3);
  return (
    <Page context={context} eyebrow="Aerial Positioning">
      <div className="premium-full-map">
        <ImageFrame src={aerial} label="Aerial map" />
        <div className="premium-map-label premium-map-label-top">Primary Retail Visibility</div>
        {traffic[0] ? (
          <div className="premium-traffic-badge">
            {formatTraffic(traffic[0].count, traffic[0].year)}
            <span>{traffic[0].roadName}</span>
          </div>
        ) : null}
      </div>
    </Page>
  );
}

export function PremiumSitePlanBlock({ context, images }: BlockProps): ReactElement {
  const sitePlan = img(images, context.imageAssets.sitePlan);
  const availability = availableSpaces(context);
  return (
    <Page context={context} eyebrow="Availability Plan">
      <div className="premium-plan-layout">
        <div className="premium-plan-frame">
          <ImageFrame src={sitePlan} label="Site plan" mode="contain" />
        </div>
        <div className="premium-plan-sidebar">
          <SectionTitle
            kicker="Available Now"
            title="Suite-level availability, ready for broker review."
          />
          <div className="premium-mini-suite-list">
            {availability.map((space) => (
              <div key={space.suiteNumber} className="premium-mini-suite">
                <strong>{space.suiteNumber}</strong>
                <span>{formatSF(space.squareFootage)}</span>
                <span>{labelize(space.spaceType)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}

export function PremiumMarketBlock({ context, images }: BlockProps): ReactElement {
  const map = img(images, context.imageAssets.radius) ?? img(images, context.imageAssets.tradeArea);
  const demo = context.demographics[0];
  return (
    <Page context={context} eyebrow="Market Context">
      <div className="premium-market-grid">
        <div className="premium-market-map">
          <ImageFrame src={map} label="Market map" />
        </div>
        <div>
          <SectionTitle
            kicker="Trade Area"
            title="Retail demand signals at a glance."
            copy="Radius maps, traffic counts, and demographic proof points are promoted into a single client-facing page."
          />
          <div className="premium-fact-grid premium-fact-grid-single">
            <Stat
              label={`${demo?.label ?? "Trade Area"} Population`}
              value={formatMetric(demo?.metrics.population)}
            />
            <Stat
              label="Avg HH Income"
              value={formatCurrencyMetric(demo?.metrics.avgHouseholdIncome)}
            />
            <Stat
              label="Daytime Population"
              value={formatMetric(demo?.metrics.daytimePopulation)}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}

export function PremiumDemographicsBlock({ context, images }: BlockProps): ReactElement {
  const map = img(images, context.imageAssets.tradeArea) ?? img(images, context.imageAssets.radius);
  const rows: Array<[string, keyof RenderContext["demographics"][number]["metrics"], (v?: number) => string]> = [
    ["Population", "population", formatMetric],
    ["Households", "households", formatMetric],
    ["Avg HH Income", "avgHouseholdIncome", formatCurrencyMetric],
    ["Daytime Population", "daytimePopulation", formatMetric],
    ["Median Home Value", "medianHousingValue", formatCurrencyMetric],
    ["Median Age", "medianAge", (v) => (typeof v === "number" ? v.toFixed(1) : "Pending")],
  ];

  return (
    <Page context={context} eyebrow="Demographics">
      <div className="premium-demo-layout">
        <div className="premium-demo-map">
          <ImageFrame src={map} label="Demographics map" />
        </div>
        <table className="premium-data-table">
          <thead>
            <tr>
              <th>Metric</th>
              {context.demographics.slice(0, 3).map((demo) => (
                <th key={demo.label}>{demo.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key, format]) => (
              <tr key={label}>
                <td>{label}</td>
                {context.demographics.slice(0, 3).map((demo) => (
                  <td key={demo.label}>{format(demo.metrics[key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

export function PremiumTenantsBlock({ context, images }: BlockProps): ReactElement {
  return (
    <Page context={context} eyebrow="Co-Tenancy">
      <SectionTitle
        kicker="Tenant Roster"
        title="Recognizable retail names, presented as a credibility system."
      />
      <div className="premium-tenant-wall">
        {context.tenants.map((tenant) => {
          const logo = img(images, tenant.logoAssetId);
          return (
            <div key={`${tenant.name}-${tenant.suiteNumber}`} className="premium-tenant-tile">
              {tenant.isAnchor ? <span className="premium-anchor-pill">Anchor</span> : null}
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={tenant.name} />
              ) : (
                <strong>{tenant.name}</strong>
              )}
              <span>{tenant.suiteNumber ? `Suite ${tenant.suiteNumber}` : "Tenant"}</span>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export function PremiumContactsBlock({ context }: BlockProps): ReactElement {
  return (
    <Page context={context} eyebrow="Next Steps">
      <div className="premium-contact-layout">
        <div>
          <SectionTitle
            kicker="Leasing Team"
            title="Schedule a tour or request the full diligence package."
            copy="All property data, availability, maps, and marketing assets are maintained from one Metro property record."
          />
          <div className="premium-disclaimer">
            The information contained herein has been obtained from sources deemed reliable; however, no representation or warranty is made as to its accuracy. Subject to errors, omissions, change of price, or withdrawal without notice.
          </div>
        </div>
        <div className="premium-contact-stack">
          {context.contacts.map((contact) => (
            <div key={contact.email ?? contact.name} className="premium-contact-card">
              <h3>{contact.name}</h3>
              {contact.title ? <p>{contact.title}</p> : null}
              {contact.phone ? <strong>{contact.phone}</strong> : null}
              {contact.email ? <span>{contact.email}</span> : null}
              {contact.license ? <small>Lic. {contact.license}</small> : null}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function formatMetric(value?: number) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "Pending";
}

function formatCurrencyMetric(value?: number) {
  return typeof value === "number" ? formatCurrency(value) : "Pending";
}
