import type { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./localStorageProvider";
import { S3StorageProvider } from "./s3StorageProvider";
import { SupabaseStorageProvider } from "./supabaseStorageProvider";

let instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!instance) {
    switch (process.env.STORAGE_PROVIDER) {
      case "supabase":
        instance = new SupabaseStorageProvider();
        break;
      case "s3":
        instance = new S3StorageProvider();
        break;
      default:
        instance = new LocalStorageProvider();
    }
  }
  return instance;
}

export type { StorageProvider };
