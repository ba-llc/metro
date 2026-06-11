"use client";

import { use, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MarketingDocumentsSkeleton,
  TemplateGridSkeleton,
} from "@/components/ui/skeleton";
import { cn, formatDate, labelize } from "@/lib/utils";
import {
  PropertyTabSection,
  PropertyWorkspaceShell,
} from "@/features/properties/components/property-workspace-shell";
import {
  useDeleteDocument,
  useDocuments,
  useGenerateDocument,
  usePublishWebsite,
  useRetryDocument,
  useTemplates,
  useUnpublishWebsite,
  type ChannelShareGroup,
  type DocumentShareMeta,
  type DocumentLibraryResponse,
  type TemplateRecord,
} from "@/features/marketing/hooks";

type ChannelTone = "green" | "amber" | "red" | "slate" | "blue";

type TemplateVisual = {
  description: string;
  details: string[];
  accentClass: string;
  preview: "flyer" | "brochure" | "email" | "om" | "social" | "website";
};

const channelVisuals: Record<string, TemplateVisual> = {
  FLYER: {
    description:
      "A full leasing package with property story, maps, site plan, availability, demographics, tenants, and contacts.",
    details: ["Landscape PDF", "8-section package"],
    accentClass: "bg-brand-900",
    preview: "flyer",
  },
  BROCHURE: {
    description:
      "A concise property brochure for tours and broker follow-up, focused on overview, site plan, co-tenancy, and contacts.",
    details: ["Landscape PDF", "Broker-ready"],
    accentClass: "bg-blue-700",
    preview: "brochure",
  },
  EMAIL: {
    description:
      "A lightweight HTML email flyer for fast outreach with a branded hero and core property details.",
    details: ["HTML email", "Single page"],
    accentClass: "bg-orange-600",
    preview: "email",
  },
  OM: {
    description:
      "An offering memorandum-style format for deeper investment storytelling and supporting exhibits.",
    details: ["PDF document", "Long-form"],
    accentClass: "bg-emerald-700",
    preview: "om",
  },
  SOCIAL: {
    description:
      "A compact format for social graphics and quick promotional snapshots.",
    details: ["Graphic format", "Short-form"],
    accentClass: "bg-fuchsia-700",
    preview: "social",
  },
  WEBSITE: {
    description:
      "A live property microsite with scroll and slide modes — regenerating updates the public URL automatically.",
    details: ["Live URL", "Web + Slides"],
    accentClass: "bg-slate-800",
    preview: "website",
  },
};

const channelTones: Record<string, ChannelTone> = {
  FLYER: "blue",
  BROCHURE: "green",
  EMAIL: "amber",
  OM: "slate",
  SOCIAL: "red",
  WEBSITE: "blue",
};

const fallbackTemplateVisual: TemplateVisual = {
  description: "A branded marketing output generated from the current property record.",
  details: ["Property data", "Regenerable"],
  accentClass: "bg-slate-700",
  preview: "flyer",
};

function getTemplateVisual(template: TemplateRecord): TemplateVisual {
  return channelVisuals[template.channel] ?? fallbackTemplateVisual;
}

function ShareLinkRow({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate font-mono text-sm text-slate-800">{url}</p>
          {hint ? (
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="sm">Open</Button>
          </a>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button size="sm" variant="secondary" onClick={() => void copy()}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function PublicSitePanel({
  group,
  publication,
  onGenerate,
  onPublishWebsite,
  onUnpublishWebsite,
  publishPending,
  unpublishPending,
}: {
  group: ChannelShareGroup | null;
  publication: DocumentLibraryResponse["publication"];
  onGenerate: (channel: string) => void;
  onPublishWebsite: (id: string) => void;
  onUnpublishWebsite: () => void;
  publishPending: boolean;
  unpublishPending: boolean;
}) {
  const latestReady = group?.versions.find(
    (doc) => doc.status === "READY" && doc.outputAssetId,
  ) ?? null;
  const latestAttempt = group?.versions[0] ?? null;
  const publishedId = publication.publishedWebsiteDocumentId;
  const isPublished = publication.status === "PUBLISHED" && Boolean(publishedId);
  const newerDraftReady =
    isPublished && latestReady ? latestReady.id !== publishedId : false;
  const latestSitePlanExportId = publication.sitePlanExportAssetId;
  const latestDraftUsesCurrentSitePlan =
    !latestSitePlanExportId ||
    Boolean(latestReady && latestReady.sitePlanAssetId === latestSitePlanExportId);
  const sitePlanExportChanged = Boolean(latestReady && !latestDraftUsesCurrentSitePlan);

  let statusLabel = "Not generated";
  let statusTone: ChannelTone = "slate";
  if (latestAttempt?.status === "QUEUED" || latestAttempt?.status === "RENDERING") {
    statusLabel = "Rendering draft";
    statusTone = "blue";
  } else if (latestAttempt?.status === "FAILED") {
    statusLabel = "Draft failed";
    statusTone = "red";
  } else if (sitePlanExportChanged) {
    statusLabel = "Site plan changed";
    statusTone = "amber";
  } else if (newerDraftReady) {
    statusLabel = "New draft available";
    statusTone = "amber";
  } else if (isPublished) {
    statusLabel = "Published";
    statusTone = "green";
  } else if (latestReady) {
    statusLabel = "Draft ready";
    statusTone = "blue";
  } else if (publication.status === "UNPUBLISHED") {
    statusLabel = "Unpublished";
    statusTone = "slate";
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">
              Public Property Site
            </h2>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Generate a website draft, preview it, then publish when it is client-ready.
          </p>
          {sitePlanExportChanged ? (
            <p className="mt-3 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              The Studio site plan export changed after this website draft was
              generated. Regenerate the site draft before publishing.
            </p>
          ) : null}
          <p className="mt-4 truncate font-mono text-sm text-slate-800">
            {publication.publicUrl}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onGenerate("WEBSITE")}>
            {latestReady ? "Regenerate Site" : "Generate Site"}
          </Button>
          {latestReady ? (
            <a href={latestReady.shareUrl ?? "#"} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                Preview Draft
              </Button>
            </a>
          ) : null}
          {latestReady ? (
            <Button
              size="sm"
              loading={publishPending}
              disabled={sitePlanExportChanged}
              onClick={() => onPublishWebsite(latestReady.id)}
            >
              {isPublished && publishedId === latestReady.id ? "Republish" : "Publish"}
            </Button>
          ) : null}
          {isPublished ? (
            <>
              <CopyButton url={publication.publicUrl} />
              <a href={publication.publicUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary">
                  Open Public
                </Button>
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest draft
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {latestReady
              ? `v${latestReady.versionNumber} · ${formatDate(latestReady.createdAt)}`
              : latestAttempt
                ? labelize(latestAttempt.status)
                : "None yet"}
          </p>
          {latestAttempt?.status === "FAILED" && latestAttempt.error ? (
            <p className="mt-1 text-xs text-red-600">{latestAttempt.error}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Studio site plan
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {publication.sitePlanExportedAt
              ? `Exported ${formatDate(publication.sitePlanExportedAt)}`
              : "No public export"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Published version
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {isPublished && publication.publishedAt
              ? formatDate(publication.publishedAt)
              : "Not published"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Public access
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">
              {isPublished ? "Live" : "Unavailable"}
            </p>
            {isPublished ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                loading={unpublishPending}
                onClick={onUnpublishWebsite}
              >
                Unpublish
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketingMaterialCard({
  group,
  onDelete,
  onRetry,
  onGenerate,
  deletePending,
  retryPending,
}: {
  group: ChannelShareGroup;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onGenerate: (channel: string) => void;
  deletePending: boolean;
  retryPending: boolean;
}) {
  const readyVersions = group.versions.filter(
    (doc) => doc.status === "READY" && doc.outputAssetId,
  );
  const latestReady = readyVersions[0] ?? null;
  const latestAttempt = group.versions[0] ?? null;
  const [historyOpen, setHistoryOpen] = useState(readyVersions.length > 1);
  const showHistory = readyVersions.length > 0;

  function confirmDelete(documentId: string) {
    if (confirm("Delete this document attempt? You can generate a new one afterward.")) {
      onDelete(documentId);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{group.label}</h3>
            <Badge tone={channelTones[group.channel] ?? "slate"}>
              {labelize(group.channel)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {latestReady
              ? `Ready · v${latestReady.versionNumber} · ${formatDate(latestReady.createdAt)}`
              : latestAttempt
                ? labelize(latestAttempt.status)
                : "Not generated yet"}
          </p>
          {latestAttempt?.status === "FAILED" && latestAttempt.error ? (
            <p className="mt-1 text-sm text-red-600">{latestAttempt.error}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {latestReady?.shareUrl ? <CopyButton url={latestReady.shareUrl} /> : null}
          {latestReady?.shareUrl ? (
            <a href={latestReady.shareUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                Open
              </Button>
            </a>
          ) : null}
          {latestReady?.downloadUrl ? (
            <a href={latestReady.downloadUrl}>
              <Button size="sm" variant="secondary">
                Download
              </Button>
            </a>
          ) : null}
          {latestAttempt?.status === "FAILED" ? (
            <Button
              size="sm"
              variant="secondary"
              loading={retryPending}
              onClick={() => onRetry(latestAttempt.id)}
            >
              Retry
            </Button>
          ) : null}
          <Button size="sm" onClick={() => onGenerate(group.channel)}>
            Generate
          </Button>
        </div>
      </div>

      {showHistory ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((value) => !value)}
            className="text-sm font-medium text-brand-800 hover:underline"
          >
            {historyOpen ? "Hide" : "Show"} version history ({group.versions.length})
          </button>
          {historyOpen ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <TR>
                    <TH>Version</TH>
                    <TH>Generated</TH>
                    <TH>Status</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {group.versions.map((doc) => (
                    <VersionRow
                      key={doc.id}
                      doc={doc}
                      isLatest={doc.id === group.latestDocumentId}
                      onDelete={confirmDelete}
                      onRetry={onRetry}
                      retryPending={retryPending}
                    />
                  ))}
                </TBody>
              </Table>
            </div>
          ) : null}
        </div>
      ) : null}

      {!latestAttempt ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-sm text-slate-500">
            Generate this format to create a shareable PDF.
          </p>
          <Button size="sm" onClick={() => onGenerate(group.channel)}>
            Generate
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function VersionRow({
  doc,
  isLatest,
  onDelete,
  onRetry,
  retryPending,
}: {
  doc: DocumentShareMeta;
  isLatest: boolean;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  retryPending: boolean;
}) {
  const ready = doc.status === "READY" && doc.outputAssetId;

  return (
    <TR>
      <TD className="font-medium text-slate-900">
        v{doc.versionNumber}
        {isLatest ? (
          <Badge tone="green" className="ml-2">
            Latest
          </Badge>
        ) : null}
      </TD>
      <TD>{formatDate(doc.createdAt)}</TD>
      <TD>
        <StatusBadge status={doc.status} />
        {doc.status === "FAILED" && doc.error ? (
          <p className="mt-0.5 text-xs text-red-600">{doc.error}</p>
        ) : null}
      </TD>
      <TD className="text-right">
        {ready && doc.shareUrl ? (
          <a href={doc.shareUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              View
            </Button>
          </a>
        ) : null}
        {ready && doc.downloadUrl ? (
          <a href={doc.downloadUrl} className="ml-2">
            <Button size="sm" variant="secondary">
              Download
            </Button>
          </a>
        ) : null}
        {doc.status === "FAILED" ? (
          <Button
            size="sm"
            variant="secondary"
            className="ml-2"
            loading={retryPending}
            onClick={() => onRetry(doc.id)}
          >
            Retry
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-2 text-red-600"
          onClick={() => onDelete(doc.id)}
        >
          Delete
        </Button>
      </TD>
    </TR>
  );
}

function TemplateThumbnail({
  visual,
  selected,
}: {
  visual: TemplateVisual;
  selected: boolean;
}) {
  if (visual.preview === "website") {
    return (
      <div className="flex h-36 items-center justify-center rounded-md bg-slate-100 p-3">
        <div className="h-full w-full max-w-[11rem] overflow-hidden rounded-sm border border-slate-200 bg-slate-900 shadow-sm">
          <div className="flex h-6 items-center justify-end gap-1 px-2">
            <div className="h-2 w-8 rounded bg-white/20" />
            <div className="h-2 w-8 rounded bg-white/40" />
          </div>
          <div className="px-3 pt-4">
            <div className="h-2 w-16 rounded bg-white/30" />
            <div className="mt-3 h-5 w-24 rounded bg-white/80" />
            <div className="mt-4 grid grid-cols-2 gap-1">
              <div className="h-8 rounded bg-white/10" />
              <div className="h-8 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visual.preview === "email") {
    return (
      <div className="flex h-36 items-center justify-center rounded-md bg-slate-100 p-3">
        <div className="h-full w-28 rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className={cn("h-4 rounded-t-sm", visual.accentClass)} />
          <div className="space-y-2 p-2">
            <div className="h-10 rounded bg-slate-200" />
            <div className="h-1.5 w-20 rounded bg-slate-300" />
            <div className="h-1.5 w-16 rounded bg-slate-200" />
            <div className={cn("mt-3 h-4 w-14 rounded-full", visual.accentClass)} />
          </div>
        </div>
      </div>
    );
  }

  if (visual.preview === "brochure") {
    return (
      <div className="flex h-36 items-center justify-center rounded-md bg-slate-100 p-3">
        <div className="grid h-full w-44 grid-cols-2 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className={cn("p-2 text-white", visual.accentClass)}>
            <div className="h-2 w-14 rounded bg-white/80" />
            <div className="mt-8 h-8 w-16 rounded bg-white/25" />
            <div className="mt-2 h-1.5 w-12 rounded bg-white/60" />
          </div>
          <div className="space-y-2 p-2">
            <div className="h-8 rounded bg-slate-200" />
            <div className="grid grid-cols-2 gap-1">
              <div className="h-8 rounded bg-slate-100" />
              <div className="h-8 rounded bg-slate-100" />
            </div>
            <div className="h-1.5 w-16 rounded bg-slate-300" />
            <div className="h-1.5 w-12 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-36 items-center justify-center rounded-md bg-slate-100 p-3">
      <div className="h-full w-48 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className={cn("flex h-12 items-end p-2", visual.accentClass)}>
          <div className="h-2 w-24 rounded bg-white/80" />
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2 p-2">
          <div className="space-y-2">
            <div className="h-14 rounded bg-slate-200" />
            <div className="grid grid-cols-2 gap-1">
              <div className="h-5 rounded bg-slate-100" />
              <div className="h-5 rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 rounded bg-slate-300" />
            <div className="h-1.5 rounded bg-slate-200" />
            <div className="h-1.5 rounded bg-slate-200" />
            <div className="mt-2 h-8 rounded bg-slate-100" />
          </div>
        </div>
        {selected ? <div className={cn("h-1", visual.accentClass)} /> : null}
      </div>
    </div>
  );
}

function TemplateOptionCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateRecord;
  selected: boolean;
  onSelect: (templateId: string) => void;
}) {
  const visual = getTemplateVisual(template);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(template.id)}
      className={cn(
        "group flex h-full flex-col rounded-lg border bg-white p-3 text-left shadow-sm transition",
        "hover:border-brand-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2",
        selected
          ? "border-brand-800 ring-2 ring-brand-800 ring-offset-2"
          : "border-slate-200",
      )}
    >
      <TemplateThumbnail visual={visual} selected={selected} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {visual.description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={channelTones[template.channel] ?? "slate"}>
          {labelize(template.channel)}
        </Badge>
        {visual.details.map((detail) => (
          <Badge key={detail} tone="slate">
            {detail}
          </Badge>
        ))}
      </div>
    </button>
  );
}

function TemplateSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export default function MarketingPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const { data: templates } = useTemplates();
  const { data: library, isLoading } = useDocuments(propertyId);
  const generateDocument = useGenerateDocument(propertyId);
  const deleteDocument = useDeleteDocument(propertyId);
  const retryDocument = useRetryDocument(propertyId);
  const publishWebsite = usePublishWebsite(propertyId);
  const unpublishWebsite = useUnpublishWebsite(propertyId);

  function openGenerateForChannel(channel: string) {
    const template = templates?.find((item) => item.channel === channel);
    if (template) setTemplateId(template.id);
    setGenerateOpen(true);
  }

  const channelGroups =
    library?.channels ??
    ([] as ChannelShareGroup[]);
  const websiteGroup = channelGroups.find((group) => group.channel === "WEBSITE") ?? null;
  const materialGroups = channelGroups.filter((group) => group.channel !== "WEBSITE");
  const availableTemplates = templates?.filter(
    (template) => template.channel !== "EMAIL",
  );
  const siteTemplates = availableTemplates?.filter(
    (template) => template.channel === "WEBSITE",
  );
  const marketingTemplates = availableTemplates?.filter(
    (template) => template.channel !== "WEBSITE",
  );

  const inProgress =
    library?.documents.some(
      (d) => d.status === "QUEUED" || d.status === "RENDERING",
    ) ?? false;

  return (
    <PropertyWorkspaceShell propertyId={propertyId}>
      <PropertyTabSection
        title="Marketing"
        subtitle="Generate website drafts and marketing PDFs from the property record. Publish controls when the public property site goes live."
        actions={
          <Button onClick={() => setGenerateOpen(true)}>Generate</Button>
        }
      />

      {inProgress ? (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Rendering in progress… share links will appear when documents are ready.
        </div>
      ) : null}

      {isLoading ? (
        <MarketingDocumentsSkeleton />
      ) : !library ? (
        <EmptyState title="No marketing workspace" description="Property data is unavailable." />
      ) : (
        <div className="space-y-8">
          <PublicSitePanel
            group={websiteGroup}
            publication={library.publication}
            onGenerate={openGenerateForChannel}
            onPublishWebsite={(id) => publishWebsite.mutate(id)}
            onUnpublishWebsite={() => {
              if (confirm("Unpublish this public property website?")) {
                unpublishWebsite.mutate();
              }
            }}
            publishPending={publishWebsite.isPending}
            unpublishPending={unpublishWebsite.isPending}
          />

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Marketing Materials
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Versioned PDFs for broker follow-up, tours, and outbound sharing.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setGenerateOpen(true)}>
                Generate Material
              </Button>
            </div>
            {materialGroups.length > 0 ? (
              <div className="space-y-3">
                {materialGroups.map((group) => (
                  <MarketingMaterialCard
                  key={group.channel}
                  group={group}
                  onDelete={(id) => deleteDocument.mutate(id)}
                  onRetry={(id) => retryDocument.mutate(id)}
                  onGenerate={openGenerateForChannel}
                  deletePending={deleteDocument.isPending}
                  retryPending={retryDocument.isPending}
                />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <h3 className="text-sm font-semibold text-slate-900">
                  No marketing PDFs yet
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Generate a premium package or flyer when you need a shareable PDF.
                </p>
                <Button className="mt-4" size="sm" onClick={() => setGenerateOpen(true)}>
                  Generate
                </Button>
              </div>
            )}
          </section>
            </div>
      )}

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
              Choose what to generate
            </p>
            {!templates ? (
              <TemplateGridSkeleton count={3} />
            ) : !availableTemplates || availableTemplates.length === 0 ? (
              <p className="text-sm text-slate-600">No templates available.</p>
            ) : (
              <div role="radiogroup" aria-label="Template format" className="space-y-6">
                {siteTemplates && siteTemplates.length > 0 ? (
                  <TemplateSection title="Site">
                    {siteTemplates.map((template) => (
                      <TemplateOptionCard
                        key={template.id}
                        template={template}
                        selected={template.id === templateId}
                        onSelect={setTemplateId}
                      />
                    ))}
                  </TemplateSection>
                ) : null}
                {marketingTemplates && marketingTemplates.length > 0 ? (
                  <TemplateSection title="Marketing formats">
                    {marketingTemplates.map((template) => (
                      <TemplateOptionCard
                        key={template.id}
                        template={template}
                        selected={template.id === templateId}
                        onSelect={setTemplateId}
                      />
                    ))}
                  </TemplateSection>
                ) : null}
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500">
            PDF channels (flyer, brochure) create a new version each time you
            generate. Website generations create drafts until you publish one.
          </p>
          {generateDocument.error ? (
            <p className="text-sm text-red-600">{generateDocument.error.message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              loading={generateDocument.isPending}
              disabled={!templateId}
              onClick={() =>
                generateDocument.mutate(templateId, {
                  onSuccess: () => setGenerateOpen(false),
                })
              }
            >
              Generate
            </Button>
          </div>
        </div>
      </Modal>
    </PropertyWorkspaceShell>
  );
}
