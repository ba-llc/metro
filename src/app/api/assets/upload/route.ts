import { ApiError, handle } from "@/server/api/respond";
import { requireWriter } from "@/server/auth/context";
import { createAsset } from "@/server/services/asset.service";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireWriter();
    const form = await req.formData();
    const file = form.get("file");
    const folder = form.get("folder");

    if (!(file instanceof File)) {
      throw new ApiError("VALIDATION", "A file is required");
    }
    if (typeof folder !== "string" || !/^[a-zA-Z0-9/_-]+$/.test(folder)) {
      throw new ApiError("VALIDATION", "A valid folder is required");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError("VALIDATION", "File exceeds the 50MB limit");
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      throw new ApiError("VALIDATION", `Unsupported file type: ${file.type}`);
    }

    const width = form.get("width");
    const height = form.get("height");

    return createAsset(ctx, {
      body: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      mime: file.type,
      folder,
      width: typeof width === "string" ? Number(width) || undefined : undefined,
      height:
        typeof height === "string" ? Number(height) || undefined : undefined,
    });
  });
}
