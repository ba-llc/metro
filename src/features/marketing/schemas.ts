import { z } from "zod";

export const templateChannels = [
  "FLYER",
  "BROCHURE",
  "OM",
  "EMAIL",
  "SOCIAL",
  "WEBSITE",
] as const;

export const blockTypes = [
  "cover",
  "aerial",
  "trade-area",
  "site-plan",
  "availability-table",
  "demographics",
  "tenant-roster",
  "contacts",
] as const;

export type BlockType = (typeof blockTypes)[number];

export const templateThemeSchema = z.object({
  primaryColor: z.string().default("#0f3057"),
  accentColor: z.string().default("#e25822"),
  textColor: z.string().default("#1a1a2e"),
  fontFamily: z
    .string()
    .default("'Helvetica Neue', Helvetica, Arial, sans-serif"),
  brandName: z.string().default("Metro Commercial"),
});

export const templatePageSchema = z.object({
  block: z.enum(blockTypes),
  title: z.string().optional(),
});

export const templateCreateSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(templateChannels),
  theme: templateThemeSchema.partial().default({}),
  pages: z.array(templatePageSchema).min(1),
});

export const documentCreateSchema = z.object({
  templateId: z.string().min(1),
});

export type TemplateTheme = z.infer<typeof templateThemeSchema>;
export type TemplatePage = z.infer<typeof templatePageSchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
