# Development Roadmap

## Phase 0 — Foundation (docs + rules)

- `/docs` architecture documentation (this set)
- `.cursor/rules` project rules (product vision, architecture, design system, site
  plan studio, CRE domain, engineering standards)
- No application code

## Phase 1 — Core Platform

- Next.js App Router, TypeScript strict, Tailwind
- PostgreSQL + Prisma schema (full data model), migrations, seed
- NextAuth credentials auth; Organization / Membership multi-tenancy; role guards
- Design system primitives: buttons, cards, forms, tables, modals, badges
- Property dashboard + CRUD (with address, type, status, GLA)
- Spaces, tenants/occupancies, contacts, photos management
- Asset upload pipeline (local-disk dev provider; S3 in production)
- Activity logging; `Job` table + in-process runner

## Phase 2 — Site Plan Studio

- PDF upload → immutable original storage
- Client-side pdf.js page rasterization → `SitePlanPage` records
- Konva canvas editor: locked background, ordered layers panel
- Tool registry: rectangle, polygon, parcel boundary, pad site, dashed outline,
  arrow, dimension, suite/sqft/parking labels, callout, tenant logo, directional
  indicator
- Property inspector (style + data editing)
- Space binding (draw → create/link `Space`), merge/split
- Debounced batch annotation save; `AnnotationSnapshot` versioning + restore
- Flattened PNG export → marketing asset

## Phase 3 — Maps Engine

- `MapProvider` interface + `GoogleMapsProvider` (geocode, static maps, places)
- Property geocoding
- Satellite aerial, trade area, 1/3/5-mile radius ring maps (server-composited)
- Retail POI maps (grocery, fitness, restaurants, retailers, competitors)
- Per-property map library UI with regenerate

## Phase 4 — Marketing Engine

- Template system (theme tokens + page/block definitions); Metro Commercial default
  system templates
- Data resolver with snapshot capture
- Page blocks: cover, aerial, trade area, site plan, availability table,
  demographics, tenant roster, contacts
- Headless-Chromium multi-page PDF pipeline behind `PdfRenderer` interface
- Email flyer HTML output
- Generated document library with status polling + download

## Post-MVP

- Demographics provider integrations (ESRI, Placer.ai, Buxton, AlphaMap, CoStar)
- AI content layer (`AIProvider`): descriptions, marketing copy, broker emails, OM
  summaries, social captions, market overviews
- LoopNet / Crexi listing syndication renderers
- Property microsites (public single-property websites)
- Drive-time polygons, retail clustering, traffic overlays
- White-label theming UI; template visual editor
- Real queue for jobs (SQS / Inngest / pg-boss); dedicated render workers
- Event-sourced annotation history; realtime multi-user editing
