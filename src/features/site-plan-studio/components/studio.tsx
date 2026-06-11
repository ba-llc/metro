"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/empty-state";
import { formatDate, formatRate } from "@/lib/utils";
import { uploadAsset } from "@/lib/api";
import type { AnnotationData } from "@/types/annotations";
import { usePropertyDetail } from "@/features/properties/hooks";
import type { SpaceRecord } from "@/features/properties/types";
import { useStudioStore } from "../store";
import {
  useAnalyzeSitePlanPage,
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
import {
  RightPanelTabs,
  StudioPanel,
  StudioShell,
  type RightPanelTab,
  type StudioMode,
} from "./studio-shell";
import { ToolRail } from "./tool-rail";
import { PagesPanel } from "./pages-panel";
import { AiReviewPanel } from "./ai-review-panel";

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
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<StudioMode>("edit");
  const [rightTab, setRightTab] = useState<RightPanelTab>("inspect");

  const { data: plan, isLoading } = useSitePlanDetail(sitePlanId);
  const { data: property } = usePropertyDetail(propertyId);
  const saveAnnotations = useSaveAnnotations(sitePlanId);
  const analyzePage = useAnalyzeSitePlanPage();
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
  const importSuggestionLayer = useStudioStore((s) => s.importSuggestionLayer);
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

  const analyzeCurrentPage = useCallback(() => {
    if (!page) return;
    setAnalysisMessage(null);
    analyzePage.mutate(page.id, {
      onSuccess: (result) => {
        importSuggestionLayer(result.annotations);
        const count = result.annotations.annotations.length;
        const note = result.notes[0] ? ` ${result.notes[0]}` : "";
        setMode("review");
        setRightTab("layers");
        setAnalysisMessage(
          `Imported ${count} AI suggestion${count === 1 ? "" : "s"} from ${result.provider}.${note}`,
        );
      },
      onError: (e) => {
        setAnalysisMessage(e instanceof Error ? e.message : "Site plan analysis failed");
      },
    });
  }, [analyzePage, importSuggestionLayer, page]);

  // Delete key removes the selection; common tool shortcuts mirror the status bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId } = useStudioStore.getState();
        if (selectedId) removeAnnotation(selectedId);
      }
      const key = e.key.toLowerCase();
      if (key === "v") setTool("select");
      if (key === "h") setTool("pan");
      if (key === "a") analyzeCurrentPage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analyzeCurrentPage, removeAnnotation, setTool]);

  if (isLoading || !plan || !page) {
    return <Spinner label="Loading studio..." />;
  }

  return (
    <StudioShell
      propertyId={propertyId}
      plan={plan}
      pageIndex={pageIndex}
      onPageChange={setPageIndex}
      mode={mode}
      onModeChange={setMode}
      dirty={dirty}
      saving={saveAnnotations.isPending}
      analyzing={analyzePage.isPending}
      exporting={exporting}
      analysisMessage={analysisMessage}
      onAnalyze={analyzeCurrentPage}
      onVersions={() => setSnapshotsOpen(true)}
      onExport={() => void exportFlattened()}
      toolRail={
        <ToolRail
          activeToolId={activeToolId}
          onToolChange={setTool}
          onAnalyze={analyzeCurrentPage}
          analyzing={analyzePage.isPending}
        />
      }
      leftPanel={
        <PagesPanel
          plan={plan}
          activeIndex={pageIndex}
          onPageChange={setPageIndex}
          onAnalyze={analyzeCurrentPage}
          analyzing={analyzePage.isPending}
        />
      }
      canvas={
        <StudioCanvas
          page={page}
          resolveLabel={resolveLabel}
          stageRef={stageRef}
          mode={mode}
        />
      }
      rightPanel={
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          <RightPanelTabs active={rightTab} onChange={setRightTab} />
          {mode === "review" ? (
            <AiReviewPanel
              onContinueEditing={() => {
                setMode("edit");
                setRightTab("inspect");
              }}
            />
          ) : rightTab === "inspect" ? (
            <div className="min-h-0 overflow-y-auto p-4">
              <InspectorPanel propertyId={propertyId} spaces={spaces} />
            </div>
          ) : rightTab === "layers" ? (
            <StudioPanel
              title="Layers"
              description="Organize overlays, lock review layers, and control visibility."
            >
              <LayersPanel />
            </StudioPanel>
          ) : (
            <StudioPanel
              title="Property Data"
              description="Reference record data while binding overlays."
            >
              <PropertyDataPanel spaces={spaces} />
            </StudioPanel>
          )}
        </div>
      }
    >

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
    </StudioShell>
  );
}

function PropertyDataPanel({ spaces }: { spaces: SpaceRecord[] }) {
  const available = spaces.filter((space) => space.status === "AVAILABLE");
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">Spaces</p>
        <p className="mt-1 text-xs text-slate-500">
          {spaces.length} total / {available.length} available
        </p>
      </div>
      <div className="space-y-2">
        {spaces.slice(0, 12).map((space) => (
          <div
            key={space.id}
            className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900">Suite {space.suiteNumber}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {space.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {space.squareFootage
                ? `${space.squareFootage.toLocaleString()} SF`
                : "No SF entered"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
