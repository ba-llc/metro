export type PdfPageSize = "letter-portrait" | "letter-landscape";

export interface PdfRenderer {
  /** Render a standalone HTML document to a multi-page PDF. */
  render(html: string, options: { pageSize: PdfPageSize }): Promise<Buffer>;
}
