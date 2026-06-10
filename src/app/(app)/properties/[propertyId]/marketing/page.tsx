"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/empty-state";
import { assetUrl } from "@/lib/api";
import { formatDate, labelize } from "@/lib/utils";
import { PropertyNav } from "@/features/properties/components/property-nav";
import {
  useDeleteDocument,
  useDocuments,
  useGenerateDocument,
  useTemplates,
} from "@/features/marketing/hooks";

export default function MarketingPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const { data: templates } = useTemplates();
  const { data: documents, isLoading } = useDocuments(propertyId);
  const generateDocument = useGenerateDocument(propertyId);
  const deleteDocument = useDeleteDocument(propertyId);

  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle="Documents are generated projections of the property record — regenerate any time the data changes."
        actions={
          <Button onClick={() => setGenerateOpen(true)}>Generate Document</Button>
        }
      />
      <PropertyNav propertyId={propertyId} />

      {isLoading ? (
        <Spinner label="Loading documents..." />
      ) : !documents || documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Generate a leasing flyer, brochure, or email flyer from the property record using a branded template."
          action={
            <Button onClick={() => setGenerateOpen(true)}>
              Generate Document
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <THead>
              <TR>
                <TH>Document</TH>
                <TH>Channel</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {documents.map((doc) => (
                <TR key={doc.id}>
                  <TD className="font-medium text-slate-900">
                    {doc.template.name}
                    {doc.status === "FAILED" && doc.error ? (
                      <p className="mt-0.5 text-xs font-normal text-red-600">
                        {doc.error}
                      </p>
                    ) : null}
                  </TD>
                  <TD>{labelize(doc.channel)}</TD>
                  <TD>
                    <StatusBadge status={doc.status} />
                  </TD>
                  <TD>{formatDate(doc.createdAt)}</TD>
                  <TD className="text-right">
                    {doc.outputAssetId ? (
                      <a
                        href={assetUrl(doc.outputAssetId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="secondary">
                          Download
                        </Button>
                      </a>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 text-red-600"
                      onClick={() => deleteDocument.mutate(doc.id)}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate Document"
      >
        <div className="space-y-4">
          <Field label="Template">
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Select a template...</option>
              {(templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({labelize(t.channel)})
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-sm text-slate-500">
            The document is rendered from the current property record — spaces,
            maps, demographics, tenant roster, site plan exports, and contacts.
          </p>
          {generateDocument.error ? (
            <p className="text-sm text-red-600">
              {generateDocument.error.message}
            </p>
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
