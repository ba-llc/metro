import type { Prisma, TemplateChannel } from "@prisma/client";
import { db } from "@/server/db";
import type { OrgContext } from "@/server/auth/context";
import type { TemplateCreateInput } from "@/features/marketing/schemas";

export const systemTemplates: {
  name: string;
  channel: TemplateChannel;
  theme: Record<string, unknown>;
  pages: { block: string; title?: string }[];
}[] = [
  {
    name: "Metro Commercial Leasing Flyer",
    channel: "FLYER",
    theme: {},
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
    name: "Metro Commercial Property Brochure",
    channel: "BROCHURE",
    theme: {},
    pages: [
      { block: "cover" },
      { block: "aerial", title: "Property Overview" },
      { block: "site-plan", title: "Site Plan" },
      { block: "tenant-roster", title: "Co-Tenancy" },
      { block: "contacts", title: "Contacts" },
    ],
  },
  {
    name: "Metro Commercial Email Flyer",
    channel: "EMAIL",
    theme: {},
    pages: [{ block: "cover" }],
  },
];

/** Idempotently ensures the system templates exist (also run by seed). */
export async function ensureSystemTemplates(): Promise<void> {
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
