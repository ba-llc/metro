"use client";

import { create } from "zustand";
import type {
  AnnotationData,
  AnnotationLayerData,
  PageAnnotations,
} from "@/types/annotations";
import type { SitePlanPageDetail } from "./types";

/**
 * Canvas editor working state (Zustand — canvas state only, per architecture
 * rules). Server persistence happens via debounced batch saves in the Studio.
 */

function newId(): string {
  return `ann_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

const HISTORY_LIMIT = 100;

type HistorySnapshot = {
  layers: AnnotationLayerData[];
  annotations: AnnotationData[];
  activeLayerId: string | null;
  selectedId: string | null;
};

type StudioState = {
  pageId: string | null;
  layers: AnnotationLayerData[];
  annotations: AnnotationData[];
  activeLayerId: string | null;
  selectedId: string | null;
  activeToolId: string;
  dirty: boolean;
  reviewSuggestions: ReviewSuggestionState | null;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];

  loadPage: (page: SitePlanPageDetail) => void;
  setTool: (toolId: string) => void;
  select: (id: string | null) => void;
  undo: () => void;
  redo: () => void;

  addAnnotation: (a: Omit<AnnotationData, "id" | "layerId" | "zIndex">) => string;
  updateAnnotation: (id: string, patch: Partial<AnnotationData>) => void;
  removeAnnotation: (id: string) => void;
  stageSuggestionLayer: (
    payload: PageAnnotations,
    meta: { provider: string; notes: string[] },
  ) => void;
  updateSuggestionAnnotation: (id: string, patch: Partial<AnnotationData>) => void;
  acceptSuggestions: () => void;
  discardSuggestions: () => void;

  addLayer: (name: string) => void;
  updateLayer: (id: string, patch: Partial<AnnotationLayerData>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;
  setActiveLayer: (id: string) => void;

  markSaved: () => void;
};

type ReviewSuggestionState = PageAnnotations & {
  provider: string;
  notes: string[];
};

function snapshotState(s: StudioState): HistorySnapshot {
  return {
    layers: s.layers,
    annotations: s.annotations,
    activeLayerId: s.activeLayerId,
    selectedId: s.selectedId,
  };
}

function withHistory(
  s: StudioState,
  patch: Partial<Pick<
    StudioState,
    "layers" | "annotations" | "activeLayerId" | "selectedId" | "activeToolId" | "dirty" | "reviewSuggestions"
  >>,
) {
  return {
    ...patch,
    historyPast: [...s.historyPast, snapshotState(s)].slice(-HISTORY_LIMIT),
    historyFuture: [],
  };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  pageId: null,
  layers: [],
  annotations: [],
  activeLayerId: null,
  selectedId: null,
  activeToolId: "select",
  dirty: false,
  reviewSuggestions: null,
  historyPast: [],
  historyFuture: [],

  loadPage: (page) =>
    set({
      pageId: page.id,
      layers: page.layers.map(({ annotations: _a, ...layer }) => layer),
      annotations: page.layers.flatMap((layer) => layer.annotations),
      activeLayerId: page.layers[0]?.id ?? null,
      selectedId: null,
      dirty: false,
      reviewSuggestions: null,
      historyPast: [],
      historyFuture: [],
    }),

  setTool: (toolId) => set({ activeToolId: toolId, selectedId: null }),
  select: (id) => set({ selectedId: id }),

  undo: () =>
    set((s) => {
      const previous = s.historyPast.at(-1);
      if (!previous) return s;
      return {
        ...previous,
        historyPast: s.historyPast.slice(0, -1),
        historyFuture: [snapshotState(s), ...s.historyFuture].slice(0, HISTORY_LIMIT),
        activeToolId: "select",
        dirty: true,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.historyFuture[0];
      if (!next) return s;
      return {
        ...next,
        historyPast: [...s.historyPast, snapshotState(s)].slice(-HISTORY_LIMIT),
        historyFuture: s.historyFuture.slice(1),
        activeToolId: "select",
        dirty: true,
      };
    }),

  addAnnotation: (a) => {
    const { activeLayerId, annotations } = get();
    if (!activeLayerId) return "";
    const id = newId();
    const zIndex =
      Math.max(0, ...annotations.map((x) => x.zIndex)) + 1;
    set((s) =>
      withHistory(s, {
        annotations: [
          ...s.annotations,
          { ...a, id, layerId: activeLayerId, zIndex },
        ],
        dirty: true,
        selectedId: id,
        activeToolId: "select",
      }),
    );
    return id;
  },

  updateAnnotation: (id, patch) =>
    set((s) => {
      if (!s.annotations.some((a) => a.id === id)) return s;
      return withHistory(s, {
        annotations: s.annotations.map((a) =>
          a.id === id ? { ...a, ...patch } : a,
        ),
        dirty: true,
      });
    }),

  removeAnnotation: (id) =>
    set((s) => {
      if (!s.annotations.some((a) => a.id === id)) return s;
      return withHistory(s, {
        annotations: s.annotations.filter((a) => a.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        dirty: true,
      });
    }),

  stageSuggestionLayer: (payload, meta) =>
    set({
      reviewSuggestions: {
        provider: meta.provider,
        notes: meta.notes,
        layers: payload.layers.map((layer, index) => ({
          ...layer,
          sortOrder: index,
          visible: true,
          locked: false,
        })),
        annotations: payload.annotations,
      },
      selectedId: null,
      activeToolId: "select",
    }),

  updateSuggestionAnnotation: (id, patch) =>
    set((s) => {
      if (!s.reviewSuggestions) return s;
      return {
        reviewSuggestions: {
          ...s.reviewSuggestions,
          annotations: s.reviewSuggestions.annotations.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        },
      };
    }),

  acceptSuggestions: () =>
    set((s) => {
      if (!s.reviewSuggestions) return s;
      const nextSortStart = s.layers.length;
      const acceptedLayers = s.reviewSuggestions.layers.map((layer, index) => ({
        ...layer,
        name: "Accepted AI Overlays",
        sortOrder: nextSortStart + index,
        visible: true,
        locked: false,
      }));
      return withHistory(s, {
        layers: [...s.layers, ...acceptedLayers],
        annotations: [...s.annotations, ...s.reviewSuggestions.annotations],
        activeLayerId: acceptedLayers[0]?.id ?? s.activeLayerId,
        selectedId: null,
        activeToolId: "select",
        reviewSuggestions: null,
        dirty: true,
      });
    }),

  discardSuggestions: () =>
    set({
      reviewSuggestions: null,
      selectedId: null,
      activeToolId: "select",
    }),

  addLayer: (name) =>
    set((s) => {
      const id = newId();
      return withHistory(s, {
        layers: [
          ...s.layers,
          {
            id,
            name,
            sortOrder: s.layers.length,
            visible: true,
            locked: false,
          },
        ],
        activeLayerId: id,
        dirty: true,
      });
    }),

  updateLayer: (id, patch) =>
    set((s) => {
      if (!s.layers.some((l) => l.id === id)) return s;
      return withHistory(s, {
        layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        dirty: true,
      });
    }),

  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return s;
      const layers = s.layers
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, sortOrder: i }));
      return withHistory(s, {
        layers,
        annotations: s.annotations.filter((a) => a.layerId !== id),
        activeLayerId:
          s.activeLayerId === id ? (layers[0]?.id ?? null) : s.activeLayerId,
        dirty: true,
      });
    }),

  moveLayer: (id, direction) =>
    set((s) => {
      const index = s.layers.findIndex((l) => l.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= s.layers.length) return s;
      const layers = [...s.layers];
      const [moved] = layers.splice(index, 1);
      if (!moved) return s;
      layers.splice(target, 0, moved);
      return withHistory(s, {
        layers: layers.map((l, i) => ({ ...l, sortOrder: i })),
        dirty: true,
      });
    }),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  markSaved: () => set({ dirty: false }),
}));
