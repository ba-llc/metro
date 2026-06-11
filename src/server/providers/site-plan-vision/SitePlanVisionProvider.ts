import { randomUUID } from "crypto";
import sharp from "sharp";
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

export type SitePlanVisionErrorCode =
  | "MISSING_CONFIG"
  | "PROVIDER_REJECTION"
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  | "IMAGE_NORMALIZATION_FAILED";

export class SitePlanVisionError extends Error {
  constructor(
    readonly code: SitePlanVisionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

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
  retailSpaces: z
    .array(
      z.object({
        spaceId: z.string(),
        rect: normalizedRectSchema,
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .optional(),
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

const MAX_IMAGE_DIMENSION = Number(process.env.SITE_PLAN_AI_MAX_IMAGE_DIMENSION ?? 2048);
const MAX_IMAGE_BYTES = Number(process.env.SITE_PLAN_AI_MAX_IMAGE_BYTES ?? 4_000_000);
const MIN_JPEG_QUALITY = 55;
const INITIAL_JPEG_QUALITY = 82;

type NormalizedImage = {
  body: Buffer;
  mime: "image/jpeg";
  width: number;
  height: number;
  bytes: number;
};

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

function buildVisionPrompt(input: {
  req: SitePlanVisionRequest;
  image: NormalizedImage;
  spaceContext: Array<{
    id: string;
    suiteNumber: string;
    squareFootage: number | null;
    status: string;
    spaceType: string;
  }>;
  tenantContext: Array<{
    id: string;
    name: string;
    suiteNumber: string | null;
    hasLogo: boolean;
  }>;
}) {
  const visibleSpaceHints = input.req.spaces
    .map((space) => {
      const sf = space.squareFootage
        ? `${space.squareFootage.toLocaleString("en-US")} SF`
        : "unknown SF";
      return `${space.id}: suite/name "${space.suiteNumber}", ${sf}, status ${space.status}, type ${space.spaceType}`;
    })
    .join("\n");

  return (
    `Property: ${input.req.property.name}\n` +
    `Image size: ${input.image.width}x${input.image.height}\n` +
    `Original page size: ${input.req.page.width}x${input.req.page.height}\n` +
    `Spaces JSON: ${JSON.stringify(input.spaceContext)}\n` +
    `Tenants JSON: ${JSON.stringify(input.tenantContext)}\n\n` +
    "Space matching hints:\n" +
    `${visibleSpaceHints}\n\n` +
    "Task: detect visible retail tenant spaces on the site plan and return overlay rectangles for the actual store/suite footprints.\n" +
    "Look for printed suite labels such as RETAIL A, RETAIL B, RETAIL C, RETAIL D, RETAIL E, RETAIL F, EDGE FITNESS, ASHLEY'S TENANT SPACE, LANDLORD ROOM, and labels with GLA/SF values. " +
    "Use the printed suite name and/or GLA/SF to match to one of the supplied spaceId values. " +
    "The rect must cover the large bounded tenant suite area, including the full bay outlined by demising walls; do not return only the inner text-label rectangle. " +
    "If a suite boundary is irregular, return the tightest axis-aligned rectangle that covers the visible footprint. " +
    "Prefer high precision over coverage count: skip spaces you cannot confidently match to a supplied spaceId. " +
    "Return available/pending visible spaces in availableSpaces. Return any other clearly matched visible retail spaces in retailSpaces. " +
    "tenantLogos: [{tenantId, rect:{x,y,w,h}, confidence}] only when a tenant area is clearly visible and the tenant hasLogo=true; place the logo rect centered inside the detected tenant footprint. " +
    "callouts: [{text, point:{x,y}}] only for sparse review notes, not for facts already represented as overlays. " +
    "Return JSON with keys availableSpaces, retailSpaces, tenantLogos, callouts, notes."
  );
}

function buildVisionContexts(req: SitePlanVisionRequest) {
  return {
    spaceContext: req.spaces.map((space) => ({
      id: space.id,
      suiteNumber: space.suiteNumber,
      squareFootage: space.squareFootage,
      status: space.status,
      spaceType: space.spaceType,
    })),
    tenantContext: req.tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      suiteNumber: tenant.suiteNumber,
      hasLogo: Boolean(tenant.logoAssetId),
    })),
  };
}

function providerSystemInstruction() {
  return (
    "You are a precise commercial real estate site-plan overlay detector. Return only valid JSON. " +
    "Use normalized 0-1 coordinates relative to the provided image. " +
    "Only reference spaceId and tenantId values supplied by the user. " +
    "Do not invent tenants, square footage, suite names, or facts. " +
    "When detecting a suite, return the whole retail/tenant footprint, not the small printed label box."
  );
}

function parseAnalysisJson(content: string, providerName: string) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  let rawAnalysis: unknown;
  try {
    rawAnalysis = JSON.parse(cleaned);
  } catch {
    throw new SitePlanVisionError(
      "INVALID_JSON",
      `${providerName} returned a response that was not valid JSON.`,
    );
  }

  const parsedAnalysis = analysisSchema.safeParse(rawAnalysis);
  if (!parsedAnalysis.success) {
    throw new SitePlanVisionError(
      "VALIDATION_FAILED",
      `${providerName} returned JSON that did not match the expected site plan analysis shape.`,
    );
  }

  return parsedAnalysis.data;
}

async function normalizeVisionImage(req: SitePlanVisionRequest): Promise<NormalizedImage> {
  try {
    const base = sharp(req.image, { limitInputPixels: false })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });

    let quality = INITIAL_JPEG_QUALITY;
    let output = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();

    while (output.byteLength > MAX_IMAGE_BYTES && quality > MIN_JPEG_QUALITY) {
      quality -= 8;
      output = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    }

    if (output.byteLength > MAX_IMAGE_BYTES) {
      const scale = Math.sqrt(MAX_IMAGE_BYTES / output.byteLength);
      const reducedDimension = Math.max(900, Math.floor(MAX_IMAGE_DIMENSION * scale));
      output = await sharp(req.image, { limitInputPixels: false })
        .rotate()
        .resize({
          width: reducedDimension,
          height: reducedDimension,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: MIN_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    }

    if (output.byteLength > MAX_IMAGE_BYTES) {
      throw new SitePlanVisionError(
        "IMAGE_NORMALIZATION_FAILED",
        "Site plan page image is too large for AI Analyze after compression.",
      );
    }

    const metadata = await sharp(output).metadata();
    return {
      body: output,
      mime: "image/jpeg",
      width: metadata.width ?? req.page.width,
      height: metadata.height ?? req.page.height,
      bytes: output.byteLength,
    };
  } catch (error) {
    if (error instanceof SitePlanVisionError) throw error;
    throw new SitePlanVisionError(
      "IMAGE_NORMALIZATION_FAILED",
      "Could not prepare this site plan page image for AI Analyze.",
    );
  }
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
  const detectedSpaces = [
    ...input.analysis.availableSpaces,
    ...(input.analysis.retailSpaces ?? []),
  ];

  for (const candidate of detectedSpaces) {
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
    const image = await normalizeVisionImage(req);
    const { spaceContext, tenantContext } = buildVisionContexts(req);
    const prompt = buildVisionPrompt({ req, image, spaceContext, tenantContext });

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
            content: providerSystemInstruction(),
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${image.mime};base64,${image.body.toString("base64")}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 429) {
        throw new SitePlanVisionError(
          "PROVIDER_REJECTION",
          "AI Analyze could not run because the configured OpenAI key is over its quota or rate limit. Update billing/quota for OPENAI_API_KEY, switch to a valid key, or temporarily disable OpenAI vision.",
        );
      }
      throw new SitePlanVisionError(
        "PROVIDER_REJECTION",
        `OpenAI rejected the site plan analysis request (${response.status}). ${detail.slice(0, 180)}`,
      );
    }

    let payload: { choices?: Array<{ message?: { content?: string | null } }> };
    try {
      payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
    } catch {
      throw new SitePlanVisionError(
        "PROVIDER_REJECTION",
        "OpenAI returned an unreadable response for this site plan analysis.",
      );
    }
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new SitePlanVisionError(
        "PROVIDER_REJECTION",
        "OpenAI returned no analysis content for this site plan page.",
      );
    }

    const analysis = parseAnalysisJson(content, "OpenAI");
    const layer = annotationLayer();
    return {
      provider: this.name,
      notes: [
        ...analysis.notes,
        `Analyzed normalized ${image.width}x${image.height} JPEG (${Math.round(image.bytes / 1024)} KB).`,
      ],
      annotations: buildAnnotations({
        layerId: layer.id,
        spaces: req.spaces,
        tenants: req.tenants,
        analysis,
      }),
    };
  }
}

class GeminiSitePlanVisionProvider implements SitePlanVisionProvider {
  readonly name = "gemini-vision";

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  ) {}

  async analyze(req: SitePlanVisionRequest): Promise<SitePlanVisionResult> {
    const image = await normalizeVisionImage(req);
    const { spaceContext, tenantContext } = buildVisionContexts(req);
    const prompt = `${providerSystemInstruction()}\n\n${buildVisionPrompt({
      req,
      image,
      spaceContext,
      tenantContext,
    })}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: image.mime,
                    data: image.body.toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 429) {
        throw new SitePlanVisionError(
          "PROVIDER_REJECTION",
          "AI Analyze could not run because the configured Gemini key is over its quota or rate limit. Update Gemini billing/quota or switch providers.",
        );
      }
      throw new SitePlanVisionError(
        "PROVIDER_REJECTION",
        `Gemini rejected the site plan analysis request (${response.status}). ${detail.slice(0, 180)}`,
      );
    }

    let payload: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new SitePlanVisionError(
        "PROVIDER_REJECTION",
        "Gemini returned an unreadable response for this site plan analysis.",
      );
    }

    const content = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!content) {
      throw new SitePlanVisionError(
        "PROVIDER_REJECTION",
        "Gemini returned no analysis content for this site plan page.",
      );
    }

    const analysis = parseAnalysisJson(content, "Gemini");
    const layer = annotationLayer();
    return {
      provider: this.name,
      notes: [
        ...analysis.notes,
        `Analyzed with Gemini ${this.model} using normalized ${image.width}x${image.height} JPEG (${Math.round(image.bytes / 1024)} KB).`,
      ],
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
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const preferredProvider = process.env.SITE_PLAN_AI_PROVIDER?.toLowerCase();

  if (preferredProvider === "gemini") {
    if (!geminiApiKey) {
      return {
        name: "unconfigured",
        analyze: async () => {
          throw new SitePlanVisionError(
            "MISSING_CONFIG",
            "AI Analyze is configured for Gemini, but GEMINI_API_KEY is missing.",
          );
        },
      };
    }
    return new GeminiSitePlanVisionProvider(geminiApiKey);
  }

  if (preferredProvider === "openai") {
    if (!apiKey) {
      return {
        name: "unconfigured",
        analyze: async () => {
          throw new SitePlanVisionError(
            "MISSING_CONFIG",
            "AI Analyze is configured for OpenAI, but OPENAI_API_KEY is missing.",
          );
        },
      };
    }
    return new OpenAiSitePlanVisionProvider(apiKey);
  }

  if (geminiApiKey) {
    return new GeminiSitePlanVisionProvider(geminiApiKey);
  }

  if (!apiKey && process.env.SITE_PLAN_AI_DEMO_MODE === "true") {
    return {
      name: "fallback-layout",
      analyze: async (req) => fallbackAnalysis(req),
    };
  }
  if (!apiKey) {
    return {
      name: "unconfigured",
      analyze: async () => {
        throw new SitePlanVisionError(
          "MISSING_CONFIG",
          "AI Analyze is not configured. Set OPENAI_API_KEY to enable OpenAI vision, or set SITE_PLAN_AI_DEMO_MODE=true to use demo suggestions.",
        );
      },
    };
  }
  return new OpenAiSitePlanVisionProvider(apiKey);
}
