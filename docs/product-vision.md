# Product Vision

## What Metro Marketing Studio Is

Metro Marketing Studio is a **Commercial Real Estate Marketing Operating System**.

It is not a PDF generation tool, a flyer generator, or a document editor. It is the
system of record and production engine for all marketing activity around a commercial
property.

## The Core Invariant

> **The Property Record is the source of truth. Every output is a projection of it.**

All data about a property — its address, site plans, available spaces, tenants, broker
contacts, photos, maps, traffic counts, and demographics — lives in one centralized,
structured Property Record. Every marketing asset is generated from that record:

- Leasing Flyers
- Property Brochures
- Offering Memorandums
- Email Campaigns
- Property Websites (microsites)
- LoopNet Listings
- Crexi Listings
- Social Graphics
- Presentation Decks
- AI-Generated Marketing Content

When a suite's square footage changes, it changes once — in the Property Record — and
every flyer, site plan label, listing export, and website reflects it.

## The Problem

The current brokerage workflow is highly manual:

1. Receive engineering site plan
2. Export aerial imagery
3. Trace available spaces
4. Add square footage labels
5. Add tenant logos
6. Create demographic maps
7. Build leasing package
8. Revise repeatedly
9. Export PDF
10. Rebuild assets for LoopNet, Crexi, websites, and emails

Every revision restarts the cycle. Every channel requires rebuilding the same assets.
The data lives in InDesign files, Illustrator layers, and email threads — nowhere
queryable, nowhere reusable.

## The Solution

A broker or marketing coordinator should be able to:

1. **Upload a site plan** — the original PDF is stored immutably.
2. **Annotate available spaces** — in a CRE-specific canvas editor (Site Plan Studio),
   where drawing a space creates structured data, not just pixels.
3. **Generate all marketing assets** — flyers, brochures, OMs, emails, maps, and
   websites — from the single source of truth.

## Product Principles

1. **Property Record first.** Every new feature must derive from, or feed into, the
   Property Record. If a feature creates data that lives outside the record, the design
   is wrong.
2. **Outputs are derived and regenerable.** A radius map or flyer is a cached artifact
   with provenance. Change the data, regenerate the artifact.
3. **Engines, not features.** Site Plan Studio, Maps, Demographics, and Marketing are
   independent engines reading from and writing to the Property Record. New output
   channels register as renderers — no application redesign.
4. **Annotations are data.** Drawing on a site plan produces editable vector data bound
   to Property Record entities, never flattened pixels.
5. **Multi-tenant from day one.** Metro Commercial is tenant #1, not a hardcoded
   assumption. Every brokerage gets its own organization, branding, and templates.

## Who It Serves

- **Brokers** — need current, professional marketing collateral without waiting on a
  design team.
- **Marketing coordinators** — need to produce and revise packages across many
  properties and channels without rebuilding assets.
- **Brokerages** (the tenant) — need brand consistency, white-label theming, and a
  durable system of record for their listings.

## Long-Term Vision

The commercial real estate equivalent of **Canva + Figma + HubSpot + LoopNet**
combined: design tooling, marketing automation, and listing distribution — all driven
by one structured property dataset.
