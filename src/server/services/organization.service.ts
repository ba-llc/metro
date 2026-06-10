import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { ApiError } from "@/server/api/respond";
import type { OrgContext } from "@/server/auth/context";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getOrganization(ctx: OrgContext) {
  const organization = await db.organization.findFirst({
    where: { id: ctx.organizationId },
    select: { id: true, name: true, slug: true },
  });
  if (!organization) {
    throw new ApiError("NOT_FOUND", "Organization not found");
  }
  return organization;
}

/** Bootstrap signup: creates a user, their organization, and OWNER membership. */
export async function registerUserWithOrganization(input: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}) {
  const email = input.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError("CONFLICT", "An account with this email already exists");
  }

  const baseSlug = slugify(input.organizationName) || "brokerage";
  let slug = baseSlug;
  for (let i = 2; await db.organization.findUnique({ where: { slug } }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  const passwordHash = await hashPassword(input.password);

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.organizationName, slug },
    });
    const user = await tx.user.create({
      data: { name: input.name, email, passwordHash },
    });
    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      },
    });
    return { userId: user.id, organizationId: organization.id };
  });
}
