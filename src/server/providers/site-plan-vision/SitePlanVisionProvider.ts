import { randomUUID } from "crypto";
import { z } from "zod";
import type { PageAnnotations } from "@/types/annotations";

type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

export type SitePlanVisionSpace = {
  id: string;
  suiteNumber: string;
  squareFootage: number | null;
  status: string;
  spaceType: string;
};

export type SitePlanVisionTenant = {
  id: string;
  name: string;
  suiteNumber: string | null;
  logoAssetId: string | null;
};

export type SitePlanVisionRequest = {
  image: Buffer;
  imageMime: string;
  page: { width: number; height: number };
  property: { name: string };
  spaces: SitePlanVisionSpace[];
  tenants: SitePlanVisionTenant[];
};

export type SitePlanVisionResult = {
  provider: string;
  notes: string[];
  annotations: PageAnnotations;
};

export interface SitePlanVisionProvider {
  readonly name: string;
  analyze(req: SitePlanVisionRequest): Promise<SitePlanVisionResult>;
}

const normalizedRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.005).max(1),
  h: z.number().min(0.005).max(1),
});

const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const analysisSchema = z.object({
  availableSpaces: z
    .array(
      z.object({
        spaceId: z.string(),
        rect: normalizedRectSchema,
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .default([]),
  tenantLogos: z
    .array(
      z.object({
        tenantId: z.string(),
        rect: normalizedRectSchema,
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .default([]),
  callouts: z
    .array(
      z.object({
        text: z.string().min(1).max(80),
        point: normalizedPointSchema,
      }),
    )
    .default([]),
  notes: z.array(z.string().max(160)).default([]),
});

function id(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function clampRect(rect: Rect): Rect {
  const x = Math.min(Math.max(rect.x, 0), 0.98);
  const y = Math.min(Math.max(rect.y, 0), 0.98);
  return {
    x,
    y,
    w: Math.min(Math.max(rect.w, 0.02), 1 - x),
    h: Math.min(Math.max(rect.h, 0.02), 1 - y),
  };
}

function annotationLayer(name = "AI Suggestions") {
  return {
    id: id("layer"),
    name,
    sortOrder: 999,
    visible: true,
    locked: false,
  };
}

function buildAnnotations(input: {
  layerId: string;
  layerName?: string;
  spaces: SitePlanVisionSpace[];
  tenants: SitePlanVisionTenant[];
  analysis: z.infer<typeof analysisSchema>;
}): PageAnnotations {
  const annotations: PageAnnotations["annotations"] = [];
  const spacesById = new Map(input.spaces.map((space) => [space.id, space]));
  const tenantsById = new Map(input.tenants.map((tenant) => [tenant.id, tenant]));
  let zIndex = 1;

  for (const candidate of input.analysis.availableSpaces) {
    const space = spacesById.get(candidate.spaceId);
    if (!space) continue;
    const rect = clampRect(candidate.rect);
    annotations.push({
      id: id("ann"),
      layerId: input.layerId,
      type: space.spaceType === "PAD" || space.spaceType === "OUTPARCEL" ? "pad-site" : "rectangle",
      geometry: { rect },
      style: {
        fill: "#f97316",
        fillOpacity: 0.22,
        stroke: "#ea580c",
        strokeWidth: 2,
      },
      label: null,
      spaceId: space.id,
      zIndex: zIndex++,
    });
    annotations.push({
      id: id("ann"),
      layerId: input.layerId,
      type: "sqft-label",
      geometry: {
        points: [{ x: rect.x + rect.w * 0.22, y: rect.y + rect.h * 0.45 }],
      },
      style: { fontSize: 16, color: "#0f3057" },
      label: {
        binding: { entity: "space", field: "squareFootage", format: "±{value} SF" },
      },
      spaceId: space.id,
      zIndex: zIndex++,
    });
  }

  for (const candidate of input.analysis.tenantLogos) {
    const tenant = tenantsById.get(candidate.tenantId);
    if (!tenant?.logoAssetId) continue;
    annotations.push({
      id: id("ann"),
      layerId: input.layerId,
      type: "tenant-logo",
      geometry: { rect: clampRect(candidate.rect) },
      style: {},
      label: null,
      assetId: tenant.logoAssetId,
      zIndex: zIndex++,
    });
  }

  for (const callout of input.analysis.callouts) {
    annotations.push({
      id: id("ann"),
      layerId: input.layerId,
      type: "callout",
      geometry: { points: [callout.point] },
      style: {
        fontSize: 14,
        color: "#ffffff",
        fill: "#0f3057",
        fillOpacity: 1,
      },
      label: { text: callout.text },
      zIndex: zIndex++,
    });
  }

  return {
    layers: [
      {
        id: input.layerId,
        name: input.layerName ?? "AI Suggestions",
        sortOrder: 999,
        visible: true,
        locked: false,
      },
    ],
    annotations,
  };
}

function fallbackAnalysis(req: SitePlanVisionRequest): SitePlanVisionResult {
  const available = req.spaces
    .filter((space) => space.status === "AVAILABLE" || space.status === "PENDING")
    .slice(0, 8);

  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(available.length || 1))));
  const rows = Math.max(1, Math.ceil((available.length || 1) / columns));
  const originX = 0.24;
  const originY = 0.2;
  const spanW = 0.52;
  const spanH = 0.45;
  const cellW = spanW / columns;
  const cellH = spanH / rows;

  const analysis = analysisSchema.parse({
    availableSpaces: available.map((space, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        spaceId: space.id,
        rect: {
          x: originX + col * cellW + cellW * 0.08,
          y: originY + row * cellH + cellH * 0.08,
          w: cellW * 0.84,
          h: cellH * 0.72,
        },
        confidence: 0.35,
      };
    }),
    tenantLogos: req.tenants
      .filter((tenant) => tenant.logoAssetId)
      .slice(0, 5)
      .map((tenant, index) => ({
        tenantId: tenant.id,
        rect: { x: 0.76, y: 0.22 + index * 0.08, w: 0.11, h: 0.045 },
        confidence: 0.25,
      })),
    callouts:
      available.length >= 2
        ? [
            {
              text: "Review adjacent spaces for combine callouts",
              point: { x: 0.36, y: 0.14 },
            },
          ]
        : [],
    notes: [
      "Fallback layout used because no site-plan vision model is configured.",
      "Move suggested shapes onto the actual suites, then bind or adjust as needed.",
    ],
  });
  const layer = annotationLayer();
  return {
    provider: "fallback-layout",
    notes: analysis.notes,
    annotations: buildAnnotations({
      layerId: layer.id,
      spaces: req.spaces,
      tenants: req.tenants,
      analysis,
    }),
  };
}

class OpenAiSitePlanVisionProvider implements SitePlanVisionProvider {
  readonly name = "openai-vision";

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.SITE_PLAN_AI_MODEL ?? "gpt-4o-mini",
  ) {}

  async analyze(req: SitePlanVisionRequest): Promise<SitePlanVisionResult> {
    const spaceContext = req.spaces.map((space) => ({
      id: space.id,
      suiteNumber: space.suiteNumber,
      squareFootage: space.squareFootage,
      status: space.status,
      spaceType: space.spaceType,
    }));
    const tenantContext = req.tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      suiteNumber: tenant.suiteNumber,
      hasLogo: Boolean(tenant.logoAssetId),
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You analyze commercial real estate site plan images and return only valid JSON. " +
              "Use normalized 0-1 coordinates relative to the image. Do not invent square footage or tenant data. " +
              "Only reference spaceId and tenantId values supplied by the user.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Property: ${req.property.name}\n` +
                  `Image size: ${req.page.width}x${req.page.height}\n` +
                  `Spaces JSON: ${JSON.stringify(spaceContext)}\n` +
                  `Tenants JSON: ${JSON.stringify(tenantContext)}\n\n` +
                  "Return JSON with keys availableSpaces, tenantLogos, callouts, notes. " +
                  "availableSpaces: [{spaceId, rect:{x,y,w,h}, confidence}] for available/pending suites visible on the plan. " +
                  "tenantLogos: [{tenantId, rect:{x,y,w,h}, confidence}] for visible occupied/anchor tenant areas when a logo exists. " +
                  "callouts: [{text, point:{x,y}}] for useful non-factual review prompts only. Keep callouts sparse.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.imageMime};base64,${req.image.toString("base64")}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Site plan AI analysis failed (${response.status}): ${detail.slice(0, 240)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Site plan AI analysis returned no content");
    }

    const analysis = analysisSchema.parse(JSON.parse(content));
    const layer = annotationLayer();
    return {
      provider: this.name,
      notes: analysis.notes,
      annotations: buildAnnotations({
        layerId: layer.id,
        spaces: req.spaces,
        tenants: req.tenants,
        analysis,
      }),
    };
  }
}

export function getSitePlanVisionProvider(): SitePlanVisionProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      name: "fallback-layout",
      analyze: async (req) => fallbackAnalysis(req),
    };
  }
  return new OpenAiSitePlanVisionProvider(apiKey);
}
