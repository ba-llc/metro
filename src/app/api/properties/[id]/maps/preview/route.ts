import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, err } from "@/server/api/respond";
import { requireOrg } from "@/server/auth/context";
import { previewMapPng } from "@/server/services/map.service";
import { mapCreateSchema } from "@/features/maps/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requireOrg();
    const { id } = await params;
    const input = mapCreateSchema.parse(await req.json());
    const png = await previewMapPng(ctx, id, input);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message);
    if (e instanceof ZodError) {
      const first = e.errors[0];
      const path = first?.path.join(".");
      return err(
        "VALIDATION",
        first ? `${path ? `${path}: ` : ""}${first.message}` : "Invalid input",
      );
    }
    console.error("[api] map preview error", e);
    return err("INTERNAL", "Preview failed");
  }
}
