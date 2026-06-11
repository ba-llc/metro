/** Client fetch helper for the standard API envelope. */
export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new Error("Could not reach the Metro API. Check that the dev server is still running and reload the Studio.");
  }

  const payload = (await res.json().catch(() => null)) as
    | { data: T }
    | { error: { code: string; message: string } }
    | null;

  if (!res.ok || !payload || "error" in payload) {
    const message =
      payload && "error" in payload
        ? payload.error.message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return payload.data;
}

/** Multipart upload to /api/assets/upload. */
export async function uploadAsset(input: {
  file: Blob;
  filename: string;
  folder: string;
  width?: number;
  height?: number;
}): Promise<{ id: string; filename: string; mime: string }> {
  const form = new FormData();
  form.set("file", input.file, input.filename);
  form.set("folder", input.folder);
  if (input.width) form.set("width", String(input.width));
  if (input.height) form.set("height", String(input.height));
  return apiFetch("/api/assets/upload", { method: "POST", body: form });
}

export function assetUrl(assetId: string): string {
  return `/api/assets/${assetId}/content`;
}
