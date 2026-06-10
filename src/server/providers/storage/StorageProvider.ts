export interface StorageProvider {
  /** Store a file at the given key. */
  put(key: string, body: Buffer, mime: string): Promise<void>;
  /** Retrieve file contents. */
  get(key: string): Promise<Buffer>;
  /** Delete a stored file. */
  delete(key: string): Promise<void>;
}
