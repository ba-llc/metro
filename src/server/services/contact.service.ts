import { db } from "@/server/db";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";
import { requireProperty } from "@/server/services/property.service";
import type {
  ContactCreateInput,
  ContactUpdateInput,
} from "@/features/properties/schemas";

export async function listContacts(ctx: OrgContext) {
  return db.contact.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { properties: true } } },
  });
}

export async function requireContact(ctx: OrgContext, contactId: string) {
  const contact = await db.contact.findFirst({
    where: { id: contactId, organizationId: ctx.organizationId },
  });
  if (!contact) throw new ApiError("NOT_FOUND", "Contact not found");
  return contact;
}

export async function createContact(ctx: OrgContext, input: ContactCreateInput) {
  return db.contact.create({
    data: {
      name: input.name,
      title: input.title || null,
      email: input.email || null,
      phone: input.phone || null,
      license: input.license || null,
      organizationId: ctx.organizationId,
    },
    include: { _count: { select: { properties: true } } },
  });
}

export async function updateContact(
  ctx: OrgContext,
  contactId: string,
  input: ContactUpdateInput,
) {
  await requireContact(ctx, contactId);
  return db.contact.update({
    where: { id: contactId },
    data: {
      name: input.name,
      title: input.title === undefined ? undefined : input.title || null,
      email: input.email === undefined ? undefined : input.email || null,
      phone: input.phone === undefined ? undefined : input.phone || null,
      license: input.license === undefined ? undefined : input.license || null,
    },
    include: { _count: { select: { properties: true } } },
  });
}

export async function deleteContact(ctx: OrgContext, contactId: string) {
  await requireContact(ctx, contactId);
  await db.contact.delete({ where: { id: contactId } });
}

export async function assignContact(
  ctx: OrgContext,
  propertyId: string,
  contactId: string,
) {
  await requireProperty(ctx, propertyId);
  await requireContact(ctx, contactId);

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
