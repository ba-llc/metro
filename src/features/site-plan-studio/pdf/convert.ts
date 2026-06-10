/**
 * Client-side PDF -> PNG page rasterization using pdf.js. The original PDF is
 * stored immutably server-side; these rasters become locked canvas
 * backgrounds in the Studio.
 */

export type RasterizedPage = {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
};

const RENDER_SCALE = 2; // ~144dpi working resolution

export async function rasterizePdf(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<RasterizedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() })
    .promise;
  const pages: RasterizedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
        "image/png",
      );
    });

    pages.push({
      pageNumber,
      blob,
      width: canvas.width,
      height: canvas.height,
    });
    onProgress?.(pageNumber, doc.numPages);
  }

  await doc.destroy();
  return pages;
}
