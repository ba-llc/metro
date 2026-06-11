import { NextResponse } from "next/server";
import { ApiError } from "@/server/api/respond";
import {
  renderPublishedWebsiteHtml,
  resolvePublicPropertyBySlug,
} from "@/server/services/publicShare.service";

type Params = { params: Promise<{ propertyId: string }> };

/** Live property microsite — always serves the latest WEBSITE render. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { propertyId: propertySlug } = await params;
    const ref = await resolvePublicPropertyBySlug(propertySlug);
    const html = await renderPublishedWebsiteHtml(ref.propertyId);
    if (!html) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "This property website is not currently published.",
          },
        },
        { status: 404 },
      );
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.code === "NOT_FOUND" ? 404 : 500 },
      );
    }
    console.error("[public property website]", e);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Something went wrong" } },
      { status: 500 },
    );
  }
}
