import { NextResponse } from "next/server";
import { ApiError } from "@/server/api/respond";
import {
  getLatestReadyDocument,
  getPublicDocumentContent,
  resolvePublicProperty,
} from "@/server/services/publicShare.service";

type Params = { params: Promise<{ orgSlug: string; propertySlug: string }> };

/** Live property website — always serves the latest WEBSITE render. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgSlug, propertySlug } = await params;
    const ref = await resolvePublicProperty(orgSlug, propertySlug);
    const doc = await getLatestReadyDocument(ref.propertyId, "WEBSITE");
    if (!doc) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message:
              "This property website has not been published yet. Generate a Property Website from Marketing in Metro.",
          },
        },
        { status: 404 },
      );
    }

    const { body, mime } = await getPublicDocumentContent(doc.id);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": mime,
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
    console.error("[public site]", e);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Something went wrong" } },
      { status: 500 },
    );
  }
}
