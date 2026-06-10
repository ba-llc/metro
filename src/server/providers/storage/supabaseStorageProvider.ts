import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageProvider } from "./StorageProvider";

/**
 * Supabase Storage implementation. Uses the secret (service-role) key, so all
 * access is server-side only — the bucket stays private and RLS is bypassed.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SECRET_KEY must be set to use Supabase storage",
      );
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "assets";
  }

  async put(key: string, body: Buffer, mime: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, body, { contentType: mime, upsert: true });
    if (error) {
      throw new Error(`Supabase storage upload failed for ${key}: ${error.message}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(key);
    if (error || !data) {
      throw new Error(
        `Supabase storage download failed for ${key}: ${error?.message ?? "no data"}`,
      );
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase storage delete failed for ${key}: ${error.message}`);
    }
  }
}
