import type { DefaultSession } from "next-auth";
import type { MemberRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: MemberRole;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    organizationId?: string;
    role?: MemberRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    role?: MemberRole;
  }
}
