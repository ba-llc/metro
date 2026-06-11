import { NextResponse } from "next/server";

type Params = {
  params: Promise<{ orgSlug: string; propertySlug: string }>;
};

/** Legacy URL — redirects to /properties/{slug}/brochure */
export async function GET(request: Request, { params }: Params) {
  const { propertySlug } = await params;
  return NextResponse.redirect(
    new URL(`/properties/${propertySlug}/brochure`, request.url),
    308,
  );
}
