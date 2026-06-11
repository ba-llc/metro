import { NextResponse } from "next/server";
import { ApiError, err } from "@/server/api/respond";
import { getPublicDocumentContent } from "@/server/services/publicShare.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "1";

    const { body, mime, filename } = await getPublicDocumentContent(id);

    const headers: Record<string, string> = {
      "Content-Type": mime,
      "Cache-Control": download
        ? "private, max-age=3600"
        : "public, max-age=300, stale-while-revalidate=600",
    };

    if (download) {
      headers["Content-Disposition"] =
        `attachment; filename="${filename.replace(/"/g, "")}"`;
    } else if (mime === "application/pdf") {
      headers["Content-Disposition"] =
        `inline; filename="${filename.replace(/"/g, "")}"`;
    }

    return new NextResponse(new Uint8Array(body), { headers });
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message);
    console.error("[public document]", e);
    return err("INTERNAL", "Something went wrong");
  }
}
