import type { MemberRole } from "@prisma/client";
import { auth } from "@/server/auth";
import { ApiError } from "@/server/api/respond";

/** Org-scoped context passed to every service call. */
export type OrgContext = {
  organizationId: string;
  userId: string;
  role: MemberRole;
};

const writeRoles: MemberRole[] = ["OWNER", "ADMIN", "BROKER", "COORDINATOR"];
const adminRoles: MemberRole[] = ["OWNER", "ADMIN"];

export async function requireOrg(): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    throw new ApiError("UNAUTHORIZED", "Sign in required");
  }
  return {
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
  };
}

export async function requireWriter(): Promise<OrgContext> {
  const ctx = await requireOrg();
  if (!writeRoles.includes(ctx.role)) {
    throw new ApiError("FORBIDDEN", "You do not have permission to make changes");
  }
  return ctx;
}

export async function requireAdmin(): Promise<OrgContext> {
  const ctx = await requireOrg();
  if (!adminRoles.includes(ctx.role)) {
    throw new ApiError("FORBIDDEN", "Admin access required");
  }
  return ctx;
}
