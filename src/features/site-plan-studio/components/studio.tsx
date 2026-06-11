"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { StudioSkeleton } from "@/components/ui/skeleton";
import { apiFetch, assetUrl, uploadAsset } from "@/lib/api";
import { formatDate, formatRate, labelize } from "@/lib/utils";
import type { AnnotationData } from "@/types/annotations";
import { usePropertyDetail } from "@/features/properties/hooks";
import type { OccupancyRecord, SpaceRecord } from "@/features/properties/types";
import { useMaps, type MapAssetRecord } from "@/features/maps/hooks";
import { useStudioStore } from "../store";
import {
  useAnalyzeSitePlanPage,
  useCreateSnapshot,
  useDeleteSitePlanPage,
  useRegisterExport,
  useRegisterSitePlanPage,
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
import {
  LogoAssetsPanel,
  logoOptionsFromOccupancies,
} from "./logo-assets-panel";
import { SymbolAssetsPanel } from "./symbol-assets-panel";
import { InsertAssetsPanel } from "./insert-assets-panel";
import { MapAssetsPanel } from "./map-assets-panel";

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
  const [analysisTone, setAnalysisTone] = useState<"info" | "warning" | "error">("info");
  const [mode, setMode] = useState<StudioMode>("edit");
  const [rightTab, setRightTab] = useState<RightPanelTab>("inspect");
  const [libraryPanel, setLibraryPanel] = useState<"pages" | "maps" | null>("pages");
  const [importingMapId, setImportingMapId] = useState<string | null>(null);
  const [pendingImportedAssetId, setPendingImportedAssetId] = useState<string | null>(null);
  const [logoPlacementRequest, setLogoPlacementRequest] = useState<{
    id: number;
    assetId: string;
    tenantName?: string;
  } | null>(null);
  const [toolInsertRequest, setToolInsertRequest] = useState<{
    id: number;
    toolId: string;
  } | null>(null);
  const [symbolPlacementRequest, setSymbolPlacementRequest] = useState<{
    id: number;
    text: string;
  } | null>(null);

  const {
    data: plan,
    error: planError,
    isError: planIsError,
    isLoading,
  } = useSitePlanDetail(sitePlanId);
  const qc = useQueryClient();
  const { data: property } = usePropertyDetail(propertyId);
  const mapsEnabled =
    libraryPanel === "maps" || Boolean(plan?.pages.some((p) => p.sourceMapAssetId));
  const { data: maps = [] } = useMaps(propertyId, { enabled: mapsEnabled });
  const saveAnnotations = useSaveAnnotations(sitePlanId);
  const analyzePage = useAnalyzeSitePlanPage();
  const { data: snapshots } = useSnapshots(sitePlanId, {
    enabled: snapshotsOpen,
  });
  const createSnapshot = useCreateSnapshot(sitePlanId);
  const restoreSnapshot = useRestoreSnapshot(sitePlanId);
  const registerExport = useRegisterExport(sitePlanId);
  const deletePage = useDeleteSitePlanPage(sitePlanId);
  const registerPage = useRegisterSitePlanPage(sitePlanId);

  const loadPage = useStudioStore((s) => s.loadPage);
  const activeToolId = useStudioStore((s) => s.activeToolId);
  const setTool = useStudioStore((s) => s.setTool);
  const dirty = useStudioStore((s) => s.dirty);
  const markSaved = useStudioStore((s) => s.markSaved);
  const removeAnnotation = useStudioStore((s) => s.removeAnnotation);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const canUndo = useStudioStore((s) => s.historyPast.length > 0);
  const canRedo = useStudioStore((s) => s.historyFuture.length > 0);
  const stageSuggestionLayer = useStudioStore((s) => s.stageSuggestionLayer);
  const reviewSuggestionCount = useStudioStore(
    (s) => s.reviewSuggestions?.annotations.length ?? 0,
  );
  const workingAnnotations = useStudioStore((s) => s.annotations);
  const workingLayers = useStudioStore((s) => s.layers);

  const page = plan?.pages[pageIndex];
  const spaces = property?.spaces ?? [];
  const occupancies: OccupancyRecord[] = property?.occupancies ?? [];
  const logoOptions = logoOptionsFromOccupancies(occupancies);
  const logoLabelsByAssetId = Object.fromEntries(
    logoOptions
      .filter((logo): logo is typeof logo & { assetId: string } =>
        Boolean(logo.assetId),
      )
      .map((logo) => [logo.assetId, logo.tenantName]),
  );
  const sourceMapForPage = page
    ? page.sourceMapAssetId
      ? (maps.find((map) => map.id === page.sourceMapAssetId) ??
        (page.sourceMapAsset
          ? { ...page.sourceMapAsset, imageAssetId: null }
          : null))
      : (maps.find((map) => map.imageAssetId === page.imageAssetId) ?? null)
    : null;
  const publicExportReady = sourceMapForPage
    ? Boolean(sourceMapForPage.imageAssetId)
    : Boolean(plan?.latestExportAssetId);
  const publicExportActionLabel = sourceMapForPage
    ? publicExportReady
      ? `Update ${labelize(sourceMapForPage.kind)}`
      : `Use as ${labelize(sourceMapForPage.kind)}`
    : publicExportReady
      ? "Update Site Plan"
      : "Use as Site Plan";

  // Load page state into the store when the page changes (not on every save refetch).
  const loadedPageRef = useRef<string | null>(null);
  useEffect(() => {
    if (page && loadedPageRef.current !== page.id) {
      loadedPageRef.current = page.id;
      loadPage(page);
    }
  }, [page, loadPage]);

  useEffect(() => {
    if (reviewSuggestionCount === 0 && mode === "review") {
      setMode("edit");
      setRightTab("inspect");
    }
  }, [mode, reviewSuggestionCount]);

  useEffect(() => {
    if (!pendingImportedAssetId || !plan) return;
    const index = plan.pages.findIndex(
      (candidate) => candidate.imageAssetId === pendingImportedAssetId,
    );
    if (index >= 0) {
      setPageIndex(index);
      setPendingImportedAssetId(null);
    }
  }, [pendingImportedAssetId, plan]);

  // Debounced batch save of the working state.
  useEffect(() => {
    if (!dirty || !page || reviewSuggestionCount > 0 || mode === "review") return;
    const timer = setTimeout(() => {
      const { layers, annotations } = useStudioStore.getState();
      saveAnnotations.mutate(
        { pageId: page.id, payload: { layers, annotations } },
        { onSuccess: () => markSaved() },
      );
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, page?.id, reviewSuggestionCount, mode, workingAnnotations, workingLayers]);

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
                : binding.field === "suiteAndSquareFootage"
                  ? `Suite ${space.suiteNumber}\n${space.squareFootage?.toLocaleString("en-US") ?? "—"} SF`
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
    setAnalysisMessage(null);
    try {
      if (dirty && reviewSuggestionCount === 0 && mode !== "review") {
        const { layers, annotations } = useStudioStore.getState();
        await saveAnnotations.mutateAsync({
          pageId: page.id,
          payload: { layers, annotations },
        });
        markSaved();
      }
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
      if (sourceMapForPage) {
        await apiFetch(`/api/maps/${sourceMapForPage.id}/export`, {
          method: "POST",
          json: { assetId: asset.id },
        });
        await qc.invalidateQueries({ queryKey: ["maps", propertyId] });
      } else {
        await registerExport.mutateAsync(asset.id);
      }
      setAnalysisTone("info");
      setAnalysisMessage(
        `${sourceMapForPage ? labelize(sourceMapForPage.kind) : "Site plan"} updated for the public site. Regenerate the property website draft from Marketing before publishing.`,
      );
    } finally {
      setExporting(false);
    }
  }

  const analyzeCurrentPage = useCallback(() => {
    if (!page) return;
    setAnalysisMessage(null);
    setAnalysisTone("info");
    analyzePage.mutate(page.id, {
      onSuccess: (result) => {
        stageSuggestionLayer(result.annotations, {
          provider: result.provider,
          notes: result.notes,
        });
        const count = result.annotations.annotations.length;
        const note = result.notes[0] ? ` ${result.notes[0]}` : "";
        const fallback = result.provider === "fallback-layout";
        setMode("review");
        setRightTab("layers");
        setAnalysisTone(fallback ? "warning" : "info");
        setAnalysisMessage(
          fallback
            ? `AI vision is not configured; generated ${count} placeholder suggestion${count === 1 ? "" : "s"} for review.${note}`
            : `Imported ${count} AI suggestion${count === 1 ? "" : "s"} from ${result.provider}. Suggestions are not saved until you accept them.${note}`,
        );
      },
      onError: (e) => {
        setAnalysisTone("error");
        setAnalysisMessage(e instanceof Error ? e.message : "Site plan analysis failed");
      },
    });
  }, [analyzePage, stageSuggestionLayer, page]);

  // Delete key removes the selection; common tool shortcuts mirror the status bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId } = useStudioStore.getState();
        if (selectedId) removeAnnotation(selectedId);
      }
      if (key === "v") setTool("select");
      if (key === "h") setTool("pan");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, removeAnnotation, setTool, undo]);

  function deletePageAt(pageId: string, index: number) {
    if (!plan || plan.pages.length <= 1) return;
    const nextIndex =
      index <= pageIndex
        ? Math.max(0, Math.min(pageIndex - 1, plan.pages.length - 2))
        : pageIndex;
    deletePage.mutate(pageId, {
      onSuccess: () => {
        setPageIndex(nextIndex);
        loadedPageRef.current = null;
      },
    });
  }

  function handleToolChange(toolId: string) {
    setLibraryPanel(null);
    setTool(toolId);
  }

  function insertTool(toolId: string) {
    setTool(toolId);
    setLibraryPanel(null);
    setToolInsertRequest({ id: Date.now(), toolId });
  }

  function imageDimensions(assetId: string): Promise<{ width: number; height: number }> {
    const image = new window.Image();
    image.src = assetUrl(assetId);
    return image
      .decode()
      .catch(
        () =>
          new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Map image failed to load"));
          }),
      )
      .then(() => ({
        width: image.naturalWidth || 1280,
        height: image.naturalHeight || 720,
      }));
  }

  async function importMapAsPage(map: MapAssetRecord) {
    if (!plan || !map.imageAssetId || map.status !== "READY") return;
    const existingIndex = plan.pages.findIndex(
      (candidate) => candidate.imageAssetId === map.imageAssetId,
    );
    if (existingIndex >= 0) {
      setPageIndex(existingIndex);
      return;
    }

    setImportingMapId(map.id);
    try {
      const dimensions = await imageDimensions(map.imageAssetId);
      const nextPageNumber =
        Math.max(0, ...plan.pages.map((candidate) => candidate.pageNumber)) + 1;
      await registerPage.mutateAsync({
        pageNumber: nextPageNumber,
        assetId: map.imageAssetId,
        width: dimensions.width,
        height: dimensions.height,
        sourceMapAssetId: map.id,
      });
      setPendingImportedAssetId(map.imageAssetId);
    } finally {
      setImportingMapId(null);
    }
  }

  if (isLoading) {
    return <StudioSkeleton />;
  }

  if (planIsError || !plan) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 p-6">
        <EmptyState
          title="Studio could not load"
          description={
            planError instanceof Error
              ? planError.message
              : "Reload the page or open the site plan again."
          }
        />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 p-6">
        <EmptyState
          title="No studio pages yet"
          description="Upload or import a page before opening the editor."
        />
      </div>
    );
  }

  return (
    <StudioShell
      propertyId={propertyId}
      plan={plan}
      pageIndex={pageIndex}
      dirty={dirty}
      saving={saveAnnotations.isPending}
      analyzing={analyzePage.isPending}
      exporting={exporting}
      analysisMessage={analysisMessage}
      analysisTone={analysisTone}
      reviewSuggestionCount={reviewSuggestionCount}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undo}
      onRedo={redo}
      onAnalyze={analyzeCurrentPage}
      onVersions={() => setSnapshotsOpen(true)}
      onExport={() => void exportFlattened()}
      publicExportReady={publicExportReady}
      publicExportLabel={publicExportActionLabel}
      toolRail={
        <ToolRail
          activeToolId={activeToolId}
          pagesActive={libraryPanel === "pages"}
          mapsActive={libraryPanel === "maps"}
          onToolChange={handleToolChange}
          onPagesOpen={() => {
            setTool("select");
            setLibraryPanel("pages");
          }}
          onMapsOpen={() => {
            setTool("select");
            setLibraryPanel("maps");
          }}
        />
      }
      leftPanel={
        libraryPanel === "pages" ? (
          <PagesPanel
            plan={plan}
            activeIndex={pageIndex}
            onPageChange={setPageIndex}
            onDeletePage={deletePageAt}
            deletingPageId={deletePage.isPending ? deletePage.variables : null}
          />
        ) : libraryPanel === "maps" ? (
          <MapAssetsPanel
            maps={maps}
            importedPageIndexForAsset={(assetId) =>
              plan.pages.findIndex((candidate) => candidate.imageAssetId === assetId)
            }
            importingMapId={importingMapId}
            onImportMap={(map) => void importMapAsPage(map)}
            onOpenPage={setPageIndex}
          />
        ) : activeToolId === "tenant-logo" ? (
          <LogoAssetsPanel
            logos={logoOptions}
            onPlaceLogo={(assetId, tenantName) =>
              setLogoPlacementRequest({ id: Date.now(), assetId, tenantName })
            }
          />
        ) : activeToolId === "directional-indicator" ? (
          <SymbolAssetsPanel
            onPlaceSymbol={(text) =>
              setSymbolPlacementRequest({ id: Date.now(), text })
            }
          />
        ) : activeToolId !== "select" && activeToolId !== "pan" ? (
          <InsertAssetsPanel
            activeToolId={activeToolId}
            onInsert={insertTool}
          />
        ) : null
      }
      canvas={
        <div className="relative h-full min-h-0">
          <StudioCanvas
            page={page}
            resolveLabel={resolveLabel}
            stageRef={stageRef}
            mode={mode}
            logoDropEnabled={activeToolId === "tenant-logo"}
            symbolDropEnabled={activeToolId === "directional-indicator"}
            logoPlacementRequest={logoPlacementRequest}
            toolInsertRequest={toolInsertRequest}
            symbolPlacementRequest={symbolPlacementRequest}
          />
        </div>
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
              <InspectorPanel
                propertyId={propertyId}
                spaces={spaces}
                occupancies={occupancies}
              />
            </div>
          ) : rightTab === "layers" ? (
            <StudioPanel
              title="Layers"
              description="Organize overlays, lock review layers, and control visibility."
            >
              <LayersPanel assetLabelsById={logoLabelsByAssetId} />
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
