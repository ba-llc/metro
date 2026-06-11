"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { cn, formatDate, labelize } from "@/lib/utils";
import { PropertyNav } from "@/features/properties/components/property-nav";
import {
  useDeleteDocument,
  useDocuments,
  useGenerateDocument,
  useTemplates,
  type ChannelShareGroup,
  type DocumentShareMeta,
  type TemplateRecord,
} from "@/features/marketing/hooks";
import { propertySitePath } from "@/features/marketing/publicUrls";

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

function ChannelSharePanel({
  group,
  orgSlug,
  propertySlug,
  onDelete,
}: {
  group: ChannelShareGroup;
  orgSlug: string;
  propertySlug: string;
  onDelete: (id: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const latest = group.versions[0];
  const showHistory = !group.isLive && group.versions.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {group.label}
            </h3>
            <Badge tone={channelTones[group.channel] ?? "slate"}>
              {labelize(group.channel)}
            </Badge>
            {group.isLive ? (
              <Badge tone="green">Live — always current</Badge>
            ) : (
              <Badge tone="slate">PDF with version history</Badge>
            )}
          </div>
          {latest ? (
            <p className="mt-1 text-sm text-slate-600">
              Latest: v{latest.versionNumber} · {formatDate(latest.createdAt)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Not generated yet</p>
          )}
        </div>
        {latest?.status ? (
          <StatusBadge status={latest.status} />
        ) : null}
      </div>

      {group.canonicalShareUrl ? (
        <div className="mt-4 space-y-3">
          <ShareLinkRow
            label={group.isLive ? "Live public URL" : "Latest share link"}
            url={group.canonicalShareUrl}
            hint={
              group.isLive
                ? "Regenerating the website updates this URL automatically. No version history on the public site."
                : "Opens the latest PDF. Previous versions remain available in history below."
            }
          />
        </div>
      ) : null}

      {showHistory ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-sm font-medium text-brand-800 hover:underline"
          >
            {historyOpen ? "Hide" : "Show"} PDF version history (
            {group.versions.length})
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
                      onDelete={onDelete}
                    />
                  ))}
                </TBody>
              </Table>
            </div>
          ) : null}
        </div>
      ) : null}

      {!group.isLive && !group.canonicalShareUrl && group.versions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Generate a {group.label.toLowerCase()} to get a shareable link and PDF
          downloads.
        </p>
      ) : null}
    </div>
  );
}

function VersionRow({
  doc,
  isLatest,
  onDelete,
}: {
  doc: DocumentShareMeta;
  isLatest: boolean;
  onDelete: (id: string) => void;
}) {
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
        {doc.shareUrl ? (
          <a href={doc.shareUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              View
            </Button>
          </a>
        ) : null}
        {doc.downloadUrl ? (
          <a href={doc.downloadUrl} className="ml-2">
            <Button size="sm" variant="secondary">
              Download
            </Button>
          </a>
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

  const sitePath =
    library?.organization.slug && library?.property.slug
      ? propertySitePath(library.organization.slug, library.property.slug)
      : null;

  const channelGroups =
    library?.channels ??
    ([] as ChannelShareGroup[]);

  const inProgress =
    library?.documents.some(
      (d) => d.status === "QUEUED" || d.status === "RENDERING",
    ) ?? false;

  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle="Shareable links and downloadable PDFs are generated from the property record. Live websites update in place; PDFs keep version history."
        actions={
          <Button onClick={() => setGenerateOpen(true)}>Generate Document</Button>
        }
      />
      <PropertyNav propertyId={propertyId} />

      {sitePath ? (
        <ShareLinkRow
          label="Property website (live)"
          url={sitePath}
          hint="Example: /p/metro-commercial/lawrence-park-shopping-center — always serves the latest website render."
        />
      ) : null}

      {inProgress ? (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Rendering in progress… share links will appear when documents are ready.
        </div>
      ) : null}

      {isLoading ? (
        <Spinner label="Loading documents..." />
      ) : !library || library.documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Generate a leasing flyer, property website, or brochure from the property record."
          action={
            <Button onClick={() => setGenerateOpen(true)}>
              Generate Document
            </Button>
          }
        />
      ) : (
        <div className="mt-6 space-y-4">
          {channelGroups.length > 0 ? (
            channelGroups.map((group) => (
              <ChannelSharePanel
                key={group.channel}
                group={group}
                orgSlug={library.organization.slug}
                propertySlug={library.property.slug}
                onDelete={(id) => deleteDocument.mutate(id)}
              />
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Documents are rendering. Refresh shortly for share links.
            </div>
          )}
        </div>
      )}

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate Document"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
              Choose a template format
            </p>
            {!templates ? (
              <Spinner label="Loading templates..." />
            ) : templates.length === 0 ? (
              <p className="text-sm text-slate-600">No templates available.</p>
            ) : (
              <div
                role="radiogroup"
                aria-label="Document template format"
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {templates.map((template) => (
                  <TemplateOptionCard
                    key={template.id}
                    template={template}
                    selected={template.id === templateId}
                    onSelect={setTemplateId}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500">
            PDF channels (flyer, brochure) create a new version each time you
            generate. The property website replaces the live public URL.
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
    </div>
  );
}
