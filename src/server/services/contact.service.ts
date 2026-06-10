import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import type { ContactCreateInput } from "@/features/properties/schemas";

export async function listContacts(ctx: OrgContext) {
  return db.contact.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createContact(ctx: OrgContext, input: ContactCreateInput) {
  return db.contact.create({
    data: {
      name: input.name,
      title: input.title,
      email: input.email || null,
      phone: input.phone,
      license: input.license,
      organizationId: ctx.organizationId,
    },
  });
}

export async function assignContact(
  ctx: OrgContext,
  propertyId: string,
  contactId: string,
) {
  await requireProperty(ctx, propertyId);
  const contact = await db.contact.findFirst({
    where: { id: contactId, organizationId: ctx.organizationId },
  });
  if (!contact) throw new ApiError("NOT_FOUND", "Contact not found");

  const count = await db.propertyContact.count({ where: { propertyId } });
  return db.propertyContact.upsert({
    where: { propertyId_contactId: { propertyId, contactId } },
    create: { propertyId, contactId, sortOrder: count },
    update: {},
    include: { contact: true },
  });
}

export async function unassignContact(
  ctx: OrgContext,
  propertyId: string,
  contactId: string,
) {
  await requireProperty(ctx, propertyId);
  await db.propertyContact.deleteMany({ where: { propertyId, contactId } });
}
