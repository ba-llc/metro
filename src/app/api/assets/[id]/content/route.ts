import { NextResponse } from "next/server";
import { ApiError, err } from "@/server/api/respond";
import { requireOrg } from "@/server/auth/context";
import { getAssetContent } from "@/server/services/asset.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requireOrg();
    const { id } = await params;
    const { asset, body } = await getAssetContent(ctx, id);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": asset.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(asset.filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message);
    console.error("[assets] content error", e);
    return err("INTERNAL", "Failed to load asset");
  }
}
