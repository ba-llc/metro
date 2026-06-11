# Metro Site Plan Studio — Full Product & UX Audit Prompt

Use this prompt to run a comprehensive audit of Metro Marketing Studio’s Site Plan Studio (and its relationship to geo maps/overlays).

**Instruction:** Do not implement changes. Produce a structured audit document with findings, severity ratings, and a prioritized roadmap.

---

## Product North Star

The end goal is a **premium, state-of-the-art, simple-to-use AI commercial real estate tool** for:

1. **Editing site plans** — vector overlays on rasterized PDF pages (availability, labels, tenant logos, callouts)
2. **Editing geo maps** — trade area, radius rings, retail POI, property markers, live preview
3. **Unified overlay workflow** — overlays bind to the **Property Record** (spaces, tenants, contacts), not duplicated marketing data

Think: **Figma + Canva + Commercial Real Estate**, but radically simpler for brokers.

---

## Audit Scope

### 1. Information Architecture & Layout

Audit the current studio shell, panels, modes, and navigation:

- Route: `src/app/(app)/properties/[propertyId]/studio/[sitePlanId]/page.tsx`
- Layout: `src/app/(app)/properties/[propertyId]/studio/layout.tsx`
- Shell: `src/features/site-plan-studio/components/studio-shell.tsx`
- Panels: `tool-rail.tsx`, `pages-panel.tsx`, `resizable-panels.tsx`, `inspector-panel.tsx`, `layers-panel.tsx`, `ai-review-panel.tsx`
- Canvas: `studio-canvas.tsx`, `annotation-node.tsx`
- State: `store.ts`, `hooks.ts`, `tools.ts`

**Evaluate:**

- Is the default layout **canvas-first** or **chrome-first**?
- Are there duplicate controls (e.g. multiple AI Analyze entry points, mode toggles, redundant panels)?
- Is panel resizing intuitive? Are gutters/drag handles discoverable?
- Does the header/footer compete with the canvas for attention?
- Mobile/tablet behavior — acceptable or broken?
- Cognitive load: how many decisions does a new user face before annotating?

### 2. Feature Inventory — What Exists Today

Catalog every user-facing capability and rate each:

| Feature | Works well? | Broken? | Overbuilt? | Missing polish? | Notes |
|---------|-------------|---------|------------|-----------------|-------|
| PDF upload & page rasterization | | | | | |
| Drawing tools (select, pan, shapes, etc.) | | | | | |
| Layers (visibility, lock, order) | | | | | |
| Inspector / property data binding | | | | | |
| AI Analyze | | | | | |
| AI Review / Accept / Discard flow | | | | | |
| Autosave | | | | | |
| Version snapshots & restore | | | | | |
| Export (PNG/asset registration) | | | | | |
| Keyboard shortcuts | | | | | |
| Edit / Review / Preview modes | | | | | |
| Geo maps (separate feature) | | | | | |

Also audit **Maps** as a sibling capability:

- `src/features/maps/components/map-generate-form.tsx`
- `src/app/(app)/properties/[propertyId]/maps/page.tsx`
- Map render pipeline: `src/server/services/map-render.ts`

**Question:** Should maps and site plans feel like one “Studio” product, or stay separate? What would premium unification look like?

### 3. AI Analyze — Deep Reliability Audit

Trace end-to-end and document every failure mode:

**Client:** `studio.tsx` → `hooks.ts` (`useAnalyzeSitePlanPage`)  
**API:** `src/app/api/site-plan-pages/[pageId]/analyze/route.ts`  
**Service:** `src/server/services/sitePlan.service.ts`  
**Provider:** `src/server/providers/site-plan-vision/SitePlanVisionProvider.ts`

**Investigate:**

- Does the button do nothing, spin forever, error silently, or return fallback/mock data?
- Image payload size (full PNG base64 vs normalized/downsampled)
- Missing `OPENAI_API_KEY` → silent fallback behavior
- Error messages surfaced to user vs generic “Something went wrong”
- Autosave persisting AI suggestions **before** user clicks Accept
- Coordinate normalization (0–1) after AI import
- Space/tenant binding accuracy from Property Record context
- Org scoping and tenancy boundaries on analyze + save

**Deliver:** A sequence diagram of the happy path and every known broken path.

### 4. Commercial Real Estate Domain Fit

Read `.cursor/rules/commercial-real-estate.mdc` and product vision docs.

**Evaluate broker workflows:**

- Can a broker upload a site plan PDF and mark up availability in under 5 minutes?
- Do overlays correctly bind to `Space.squareFootage`, tenant names, rates?
- Are labels regenerable from Property Record bindings (not copied values)?
- Does export produce marketing-ready assets for flyers/OMs?
- What CRE-specific features are missing? (e.g. suite numbering, GLA totals, vacancy coloring, tenant logo placement, legend generation, scale bars, north arrows)

### 5. Global Design System Alignment

The Studio must feel like part of Metro — not a separate app embedded inside it. Audit styling against the **global design schema** used across the rest of the product.

**Reference documents & baselines:**

- Design rules: `.cursor/rules/design-system.mdc`
- Shared primitives: `src/components/ui/` (`button.tsx`, `badge.tsx`, `card.tsx`, `field.tsx`, `input.tsx`, `modal.tsx`, `page-header.tsx`, `table.tsx`, `empty-state.tsx`, `custom-select.tsx`)
- Gold-standard pages to compare against (how non-studio surfaces look and behave):
  - Property workspace: `src/app/(app)/properties/[propertyId]/page.tsx`
  - Property panels: `src/features/properties/components/*-panel.tsx`
  - Maps modal: `src/features/maps/components/map-generate-form.tsx`
  - App shell: `src/app/(app)/layout.tsx`, `src/components/app-sidebar.tsx`

**Audit every Studio surface** (`studio-shell.tsx`, panels, tool rail, modals, empty states, status bar, resizers, AI review UI) for compliance:

| Design token / pattern | Global standard | Studio current state | Gap? | Fix recommendation |
|------------------------|-----------------|----------------------|------|--------------------|
| Buttons | `Button` variants: `primary \| secondary \| ghost \| danger`; sizes `sm \| md` | | | |
| Badges / status pills | `Badge`, `StatusBadge` tones | | | |
| Panel surfaces | `Card`, `CardHeader`, `CardContent` | | | |
| Form controls | `Input`, `Select`, `Textarea`, `Field`, `CustomSelect` | | | |
| Overlays | Shared `Modal` — no hand-rolled fixed overlays | | | |
| Typography | Tailwind text scale only — no ad-hoc font sizes | | | |
| Spacing | Tailwind spacing scale only — no arbitrary pixel values | | | |
| Color palette | `brand-*`, `slate-*` semantic usage consistent with app | | | |
| Borders & radius | Match card/modal patterns (`rounded-lg`, `border-slate-200`, etc.) | | | |
| Shadows & elevation | Consistent with property panels and modals | | | |
| Empty / loading states | `EmptyState`, `Spinner` from shared UI | | | |
| Icons | Lucide icons, consistent sizing (`size-4`, etc.) | | | |
| Focus / hover / disabled | Match shared button and interactive patterns | | | |

**Flag as P1 violations:**

- Custom one-off button styles instead of `Button` variants
- Hand-built panel chrome instead of `Card` primitives
- Raw `<button>` or `<select>` where shared components exist
- Arbitrary Tailwind values (`text-[11px]`, `w-[577px]`, `h-[calc(...)]` except where layout truly requires it)
- Studio-only color tokens or gradients not used elsewhere in the app
- Inconsistent header/footer treatment vs `PageHeader` and property nav patterns
- Maps generate form vs Studio using different control density, label styles, or section headers

**Evaluate:**

- Does the Studio inherit the same visual language as the property workspace (typography, density, border treatment, white/slate surfaces)?
- Would a broker recognize this as the same product, or does it feel like a third-party editor skin?
- Which Studio components should be **refactored to shared primitives** vs which need **new shared primitives** added to `src/components/ui` for reuse by Maps/Studio?
- Does `cn()` usage follow project conventions (conditional classes, no conflicting utilities)?

### 6. Design System & Visual Quality

Build on Section 5 — rate overall premium feel after alignment gaps are identified.

**Rate the studio on:**

- Visual hierarchy (canvas vs chrome)
- Typography, spacing, density — **relative to global schema, not in isolation**
- Button/control consistency with rest of app
- Empty states, loading states, error states
- Accessibility (keyboard, ARIA, focus, contrast)
- “Premium” feel vs “internal tool” feel vs “foreign widget” feel

Reference premium CRE/marketing tools (CoStar marketing, Buildout, Canva, Figma) for inspiration — but **all recommendations must map back to Metro’s existing design system**, not introduce a parallel visual language.

### 7. Architecture & Extensibility

Per `.cursor/rules/architecture.mdc` and `site-plan-studio.mdc`:

- Are tools properly registry-based (`tools.ts`) or leaking into canvas core?
- Is business logic in services, not routes/components?
- Can a new overlay type or map layer be added without redesigning the data model?
- Property Record invariants preserved? (no duplicated data in outputs)

### 8. Performance & Technical Debt

- Canvas rendering (Konva) — lag with many annotations?
- Large PDF page rasters — memory, load time
- Debounced autosave — race conditions with AI review?
- Bundle size for studio route (dynamic import already used?)

---

## Deliverables Required

### A. Executive Summary (1 page)

- Current state in one paragraph
- Top 5 blockers to “premium + simple”
- Top 5 quick wins (< 1 day each)
- Recommended north-star UX in one sentence

### B. Detailed Findings

For each issue:

- **Severity:** P0 (broken) / P1 (major UX) / P2 (polish) / P3 (nice-to-have)
- **Area:** Layout / AI / Tools / Maps / Data / Performance / **DesignSystem**
- **Evidence:** file paths, screenshots descriptions, repro steps
- **Recommendation:** specific fix, not vague “improve UX”

### C. Target Experience — “Premium Studio v2”

Describe the ideal simplified workflow:

```
Upload → Canvas (default) → Draw/Bind → AI Review (modal?) → Accept → Export
```

Include:

- Default layout wireframe (ASCII or mermaid)
- What to **remove** from current UI
- What to **keep**
- What to **add**
- How maps and site plans relate in one product story
- **Design system alignment plan** — which shared primitives replace current one-offs

### D. Prioritized Roadmap

Phases:

1. **Fix what’s broken** (AI analyze, autosave, errors)
2. **Simplify layout** (remove duplicate controls, canvas-first)
3. **Polish premium feel** (visual design, empty states, onboarding) — **must pass design system compliance (Deliverable F)**
4. **Unify maps + site plans** (if recommended)
5. **Advanced CRE features** (legends, vacancy coloring, batch AI, etc.)

Each phase: effort estimate (S/M/L), dependencies, acceptance criteria.

### E. Competitive Benchmark

Brief comparison table vs 3–4 reference products on: simplicity, AI usefulness, CRE domain fit, export quality.

### F. Design System Compliance Report

Dedicated deliverable — not folded into general findings:

- **Compliance score** (% of Studio UI surfaces using shared primitives correctly)
- **Full violation inventory** — every instance of one-off styling, with file + line references
- **Side-by-side comparison** — Studio header/panel/button treatment vs property workspace and Maps modal
- **Refactor map** — which Studio components migrate to existing primitives vs which need new shared components
- **Token audit** — list any colors, font sizes, spacing, or radius values used in Studio but not elsewhere in the app
- **Target styling spec** — concise rules for Studio v2 so future work stays aligned with global schema

Acceptance criterion for Studio v2: a broker moving from Property Overview → Site Plans → Studio → Maps should experience **one coherent design system**, not four different UI dialects.

---

## Constraints (Non-Negotiable)

From product vision:

1. **Property Record is source of truth** — overlays reference record fields, never duplicate
2. **Original PDF is immutable** — annotations are separate vector data
3. **Normalized 0–1 coordinates** — never pixel coords in storage
4. **Exports are regenerable outputs**, not the product
5. **Layer architecture** must be preserved
6. **Multi-tenancy** — every query org-scoped

From design system:

7. **Reuse before reinvent** — search `src/components/ui` before creating Studio-specific variants; one-off primitives are bugs
8. **Shared tokens only** — Tailwind spacing/text scale, `brand-*` / `slate-*` palette; no Studio-only visual language
9. **Shared components** — `Button`, `Badge`, `Card`, `Modal`, `Field`, `Input`, `EmptyState` for all chrome; canvas internals excepted
10. **Maps + Studio parity** — geo map overlays and site plan overlays should share control patterns, section headers, and panel styling where applicable

---

## Known Issues to Validate (from prior discovery)

Confirm or refute each with code evidence:

- UI is overdeveloped — too many always-visible controls
- Duplicate AI Analyze buttons (header, tool rail, pages panel)
- Edit / Review / Preview mode toggle adds complexity without clear value
- AI sends oversized PNG payloads to provider
- Missing API key → silent fallback that looks like broken AI
- Generic server errors hide root cause
- Autosave persists AI suggestions before Accept
- Left panel mixes page nav with AI marketing copy
- Studio uses custom panel/button/badge styling instead of `src/components/ui` primitives
- Studio header/footer chrome diverges from `PageHeader` and property workspace patterns
- Maps modal and Studio use inconsistent form labels, section headers, and control density
- Arbitrary Tailwind values or Studio-only colors break global token consistency

---

## Output Format

Markdown document, ~2000–4000 words, with:

- Mermaid diagrams for flows
- Tables for feature inventory and roadmap
- Code citations where relevant
- No implementation code — audit and recommendations only

**Start by reading all files listed above, then produce the audit.**
