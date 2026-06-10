"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/empty-state";
import { cn, formatDate, formatRate } from "@/lib/utils";
import { uploadAsset } from "@/lib/api";
import type { AnnotationData } from "@/types/annotations";
import { usePropertyDetail } from "@/features/properties/hooks";
import { tools } from "../tools";
import { useStudioStore } from "../store";
import {
  useCreateSnapshot,
  useRegisterExport,
  useRestoreSnapshot,
  useSaveAnnotations,
  useSitePlanDetail,
  useSnapshots,
} from "../hooks";
import { StudioCanvas } from "./studio-canvas";
import { LayersPanel } from "./layers-panel";
import { InspectorPanel } from "./inspector-panel";

const SAVE_DEBOUNCE_MS = 1200;

export function Studio({
  propertyId,
  sitePlanId,
}: {
  propertyId: string;
  sitePlanId: string;
}) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: plan, isLoading } = useSitePlanDetail(sitePlanId);
  const { data: property } = usePropertyDetail(propertyId);
  const saveAnnotations = useSaveAnnotations(sitePlanId);
  const { data: snapshots } = useSnapshots(sitePlanId);
  const createSnapshot = useCreateSnapshot(sitePlanId);
  const restoreSnapshot = useRestoreSnapshot(sitePlanId);
  const registerExport = useRegisterExport(sitePlanId);

  const loadPage = useStudioStore((s) => s.loadPage);
  const activeToolId = useStudioStore((s) => s.activeToolId);
  const setTool = useStudioStore((s) => s.setTool);
  const dirty = useStudioStore((s) => s.dirty);
  const markSaved = useStudioStore((s) => s.markSaved);
  const removeAnnotation = useStudioStore((s) => s.removeAnnotation);
  const workingAnnotations = useStudioStore((s) => s.annotations);
  const workingLayers = useStudioStore((s) => s.layers);

  const page = plan?.pages[pageIndex];
  const spaces = property?.spaces ?? [];

  // Load page state into the store when the page changes (not on every save refetch).
  const loadedPageRef = useRef<string | null>(null);
  useEffect(() => {
    if (page && loadedPageRef.current !== page.id) {
      loadedPageRef.current = page.id;
      loadPage(page);
    }
  }, [page, loadPage]);

  // Debounced batch save of the working state.
  useEffect(() => {
    if (!dirty || !page) return;
    const timer = setTimeout(() => {
      const { layers, annotations } = useStudioStore.getState();
      saveAnnotations.mutate(
        { pageId: page.id, payload: { layers, annotations } },
        { onSuccess: () => markSaved() },
      );
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, page?.id, workingAnnotations, workingLayers]);

  // Delete key removes the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId } = useStudioStore.getState();
        if (selectedId) removeAnnotation(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeAnnotation]);

  /** Resolves label text — bound labels derive from the Space record. */
  const resolveLabel = useCallback(
    (a: AnnotationData): string => {
      const binding = a.label?.binding;
      if (binding && a.spaceId) {
        const space = spaces.find((s) => s.id === a.spaceId);
        if (space) {
          const raw =
            binding.field === "suiteNumber"
              ? space.suiteNumber
              : binding.field === "squareFootage"
                ? (space.squareFootage?.toLocaleString("en-US") ?? "—")
                : formatRate(space.askingRate, space.rateType);
          return (binding.format ?? "{value}").replace("{value}", raw);
        }
      }
      return a.label?.text ?? "";
    },
    [spaces],
  );

  async function exportFlattened() {
    const stage = stageRef.current;
    if (!stage || !page) return;
    setExporting(true);
    try {
      const { select } = useStudioStore.getState();
      select(null); // hide the transformer before flattening
      await new Promise((r) => setTimeout(r, 50));
      const scale = stage.scaleX();
      const dataUrl = stage.toDataURL({ pixelRatio: 2 / scale });
      const blob = await (await fetch(dataUrl)).blob();
      const asset = await uploadAsset({
        file: blob,
        filename: `${plan?.title ?? "site-plan"}-export.png`,
        folder: `properties/${propertyId}/site-plans/${sitePlanId}/exports`,
        width: page.width * 2,
        height: page.height * 2,
      });
      await registerExport.mutateAsync(asset.id);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading || !plan || !page) {
    return <Spinner label="Loading studio..." />;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href={`/properties/${propertyId}/site-plans`}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← {plan.property.name}
          </Link>
          <span className="font-semibold text-slate-900">{plan.title}</span>
          <span
            className={cn(
              "text-xs",
              dirty || saveAnnotations.isPending
                ? "text-amber-600"
                : "text-emerald-600",
            )}
          >
            {saveAnnotations.isPending
              ? "Saving..."
              : dirty
                ? "Unsaved changes"
                : "All changes saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {plan.pages.length > 1 ? (
            <div className="flex items-center gap-1 text-sm">
              {plan.pages.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setPageIndex(i)}
                  className={cn(
                    "rounded px-2 py-1",
                    i === pageIndex
                      ? "bg-brand-900 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {p.pageNumber}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSnapshotsOpen(true)}
          >
            Versions
          </Button>
          <Button size="sm" loading={exporting} onClick={() => void exportFlattened()}>
            Export PNG
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Tool palette */}
        <div className="flex w-44 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-left text-sm",
                activeToolId === tool.id
                  ? "bg-brand-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {tool.label}
              {tool.shortcut ? (
                <span className="float-right text-xs opacity-50">
                  {tool.shortcut}
                </span>
              ) : null}
            </button>
          ))}
          <p className="mt-2 px-2 text-[11px] leading-4 text-slate-400">
            Polygon tools: click to add points, press Enter to finish, Esc to
            cancel.
          </p>
        </div>

        {/* Canvas */}
        <div className="min-w-0 flex-1 overflow-auto p-4">
          <StudioCanvas page={page} resolveLabel={resolveLabel} stageRef={stageRef} />
        </div>

        {/* Right rail */}
        <div className="flex w-72 flex-col gap-6 overflow-y-auto border-l border-slate-200 bg-white p-4">
          <InspectorPanel propertyId={propertyId} spaces={spaces} />
          <div className="border-t border-slate-200 pt-4">
            <LayersPanel />
          </div>
        </div>
      </div>

      {/* Snapshots */}
      <Modal
        open={snapshotsOpen}
        onClose={() => setSnapshotsOpen(false)}
        title="Version History"
      >
        <div className="mb-5 flex items-end gap-2">
          <Field label="Snapshot name" className="flex-1">
            <Input
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Before pad site revision"
            />
          </Field>
          <Button
            loading={createSnapshot.isPending}
            disabled={!snapshotName.trim()}
            onClick={() =>
              createSnapshot.mutate(snapshotName.trim(), {
                onSuccess: () => setSnapshotName(""),
              })
            }
          >
            Save Version
          </Button>
        </div>
        {!snapshots || snapshots.length === 0 ? (
          <p className="text-sm text-slate-500">No versions saved yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {snapshots.map((snap) => (
              <li key={snap.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{snap.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(snap.createdAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={restoreSnapshot.isPending}
                  onClick={() =>
                    restoreSnapshot.mutate(snap.id, {
                      onSuccess: () => {
                        loadedPageRef.current = null;
                        setSnapshotsOpen(false);
                      },
                    })
                  }
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
