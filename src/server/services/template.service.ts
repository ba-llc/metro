import type { Prisma, TemplateChannel } from "@prisma/client";
import { db } from "@/server/db";
import type { OrgContext } from "@/server/auth/context";
import {
  metroCommercialTheme,
  type TemplateCreateInput,
} from "@/features/marketing/schemas";

export const systemTemplates: {
  name: string;
  channel: TemplateChannel;
  theme: Record<string, unknown>;
  pages: { block: string; title?: string }[];
}[] = [
  {
    name: "Metro Commercial Premium Leasing Package",
    channel: "BROCHURE",
    theme: metroCommercialTheme,
    pages: [
      { block: "premium-cover" },
      { block: "premium-overview" },
      { block: "premium-aerial" },
      { block: "premium-site-plan" },
      { block: "premium-market" },
      { block: "premium-demographics" },
      { block: "premium-tenants" },
      { block: "premium-contacts" },
    ],
  },
  {
    name: "Metro Commercial Leasing Flyer",
    channel: "FLYER",
    theme: metroCommercialTheme,
    pages: [
      { block: "cover" },
      { block: "aerial", title: "Aerial Overview" },
      { block: "trade-area", title: "Trade Area" },
      { block: "site-plan", title: "Site Plan" },
      { block: "availability-table", title: "Availability" },
      { block: "demographics", title: "Demographics" },
      { block: "tenant-roster", title: "Tenant Roster" },
      { block: "contacts", title: "Leasing Contacts" },
    ],
  },
  {
    name: "Metro Commercial Property Website",
    channel: "WEBSITE",
    theme: metroCommercialTheme,
    pages: [
      { block: "cover" },
      { block: "aerial", title: "Location" },
      { block: "site-plan", title: "Availability" },
      { block: "demographics", title: "Demographics" },
      { block: "tenant-roster", title: "Tenants" },
      { block: "contacts", title: "Contact" },
    ],
  },
];

const retiredSystemTemplateNames = [
  "Metro Commercial Property Brochure",
  "Metro Commercial Email Flyer",
];

async function retireRemovedSystemTemplates(): Promise<void> {
  for (const name of retiredSystemTemplateNames) {
    const templates = await db.template.findMany({
      where: { isSystem: true, name },
      select: { id: true },
    });

    for (const template of templates) {
      await db.template.update({
        where: { id: template.id },
        data: { isSystem: false },
      });
    }
  }
}

/** Idempotently ensures the system templates exist (also run by seed). */
export async function ensureSystemTemplates(): Promise<void> {
  await retireRemovedSystemTemplates();

  for (const t of systemTemplates) {
    const existing = await db.template.findFirst({
      where: { isSystem: true, name: t.name },
    });
    if (!existing) {
      await db.template.create({
        data: {
          name: t.name,
          channel: t.channel,
          theme: t.theme as Prisma.InputJsonValue,
          pages: t.pages as Prisma.InputJsonValue,
          isSystem: true,
        },
      });
    } else {
      await db.template.update({
        where: { id: existing.id },
        data: { theme: t.theme as Prisma.InputJsonValue },
      });
    }
  }
}

export async function listTemplates(
  ctx: OrgContext,
  channel?: TemplateChannel,
) {
  await ensureSystemTemplates();
  return db.template.findMany({
    where: {
      OR: [{ isSystem: true }, { organizationId: ctx.organizationId }],
      ...(channel ? { channel } : {}),
      channel: channel ?? { not: "EMAIL" },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function createTemplate(
  ctx: OrgContext,
  input: TemplateCreateInput,
) {
  return db.template.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      channel: input.channel,
      theme: input.theme,
      pages: input.pages,
    },
  });
}
