"use client";

import { create } from "zustand";
import type {
  AnnotationData,
  AnnotationLayerData,
} from "@/types/annotations";
import type { SitePlanPageDetail } from "./types";

/**
 * Canvas editor working state (Zustand — canvas state only, per architecture
 * rules). Server persistence happens via debounced batch saves in the Studio.
 */

function newId(): string {
  return `ann_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

type StudioState = {
  pageId: string | null;
  layers: AnnotationLayerData[];
  annotations: AnnotationData[];
  activeLayerId: string | null;
  selectedId: string | null;
  activeToolId: string;
  dirty: boolean;

  loadPage: (page: SitePlanPageDetail) => void;
  setTool: (toolId: string) => void;
  select: (id: string | null) => void;

  addAnnotation: (a: Omit<AnnotationData, "id" | "layerId" | "zIndex">) => string;
  updateAnnotation: (id: string, patch: Partial<AnnotationData>) => void;
  removeAnnotation: (id: string) => void;

  addLayer: (name: string) => void;
  updateLayer: (id: string, patch: Partial<AnnotationLayerData>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;
  setActiveLayer: (id: string) => void;

  markSaved: () => void;
};

export const useStudioStore = create<StudioState>((set, get) => ({
  pageId: null,
  layers: [],
  annotations: [],
  activeLayerId: null,
  selectedId: null,
  activeToolId: "select",
  dirty: false,

  loadPage: (page) =>
    set({
      pageId: page.id,
      layers: page.layers.map(({ annotations: _a, ...layer }) => layer),
      annotations: page.layers.flatMap((layer) => layer.annotations),
      activeLayerId: page.layers[0]?.id ?? null,
      selectedId: null,
      dirty: false,
    }),

  setTool: (toolId) => set({ activeToolId: toolId, selectedId: null }),
  select: (id) => set({ selectedId: id }),

  addAnnotation: (a) => {
    const { activeLayerId, annotations } = get();
    if (!activeLayerId) return "";
    const id = newId();
    const zIndex =
      Math.max(0, ...annotations.map((x) => x.zIndex)) + 1;
    set({
      annotations: [
        ...annotations,
        { ...a, id, layerId: activeLayerId, zIndex },
      ],
      dirty: true,
      selectedId: id,
      activeToolId: "select",
    });
    return id;
  },

  updateAnnotation: (id, patch) =>
    set((s) => ({
      annotations: s.annotations.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
      dirty: true,
    })),

  removeAnnotation: (id) =>
    set((s) => ({
      annotations: s.annotations.filter((a) => a.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      dirty: true,
    })),

  addLayer: (name) =>
    set((s) => {
      const id = newId();
      return {
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
      };
    }),

  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      dirty: true,
    })),

  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return s;
      const layers = s.layers
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, sortOrder: i }));
      return {
        layers,
        annotations: s.annotations.filter((a) => a.layerId !== id),
        activeLayerId:
          s.activeLayerId === id ? (layers[0]?.id ?? null) : s.activeLayerId,
        dirty: true,
      };
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
      return {
        layers: layers.map((l, i) => ({ ...l, sortOrder: i })),
        dirty: true,
      };
    }),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  markSaved: () => set({ dirty: false }),
}));
