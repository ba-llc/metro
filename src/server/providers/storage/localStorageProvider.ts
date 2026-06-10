import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider } from "./StorageProvider";

const ROOT = path.join(process.cwd(), ".uploads");

/** Dev storage provider — writes to .uploads/ on local disk. */
export class LocalStorageProvider implements StorageProvider {
  private resolve(key: string): string {
    const full = path.resolve(ROOT, key);
    if (!full.startsWith(path.resolve(ROOT))) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }
}
