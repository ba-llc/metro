import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePublicChannelDocument } from "@/server/services/publicShare.service";
import {
  channelFromSlug,
  channelSharePath,
  publicDocumentContentPath,
  publicDocumentDownloadPath,
} from "@/features/marketing/publicUrls";
import { labelize } from "@/lib/utils";

type Params = {
  params: Promise<{
    propertyId: string;
    channel: string;
    documentId: string;
  }>;
};

/** Immutable share link for a specific PDF version. */
export default async function PublicPropertyDocumentVersionPage({
  params,
}: Params) {
  const {
    propertyId: propertySlug,
    channel: channelSlug,
    documentId,
  } = await params;

  const channel = channelFromSlug(channelSlug);
  if (!channel || channel === "WEBSITE") notFound();

  let ref;
  let doc;
  try {
    ({ ref, doc } = await resolvePublicChannelDocument({
      propertySlug,
      channelSlug,
      documentId,
    }));
  } catch {
    notFound();
  }

  if (!doc.outputAsset) notFound();

  const isPdf = doc.outputAsset.mime === "application/pdf";
  const viewUrl = publicDocumentContentPath(doc.id);
  const downloadUrl = publicDocumentDownloadPath(doc.id);
  const latestUrl = channelSharePath(propertySlug, channel);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Archived version · {ref.orgName}
            </p>
            <h1 className="text-lg font-semibold">{ref.propertyName}</h1>
            <p className="text-sm text-slate-400">
              {labelize(channel)} · Version {doc.versionNumber} ·{" "}
              {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={latestUrl}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              View latest
            </Link>
            <a
              href={downloadUrl}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Download {isPdf ? "PDF" : "file"}
            </a>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {isPdf ? (
          <iframe
            title={`${ref.propertyName} ${labelize(channel)} v${doc.versionNumber}`}
            src={viewUrl}
            className="h-[calc(100vh-73px)] w-full flex-1 border-0 bg-slate-800"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-300">
            <a href={downloadUrl} className="underline">
              Download file
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
