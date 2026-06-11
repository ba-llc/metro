import type {
  AnnotationData,
  AnnotationLayerData,
} from "@/types/annotations";

export type SitePlanListItem = {
  id: string;
  title: string;
  status: string;
  pageCount: number;
  latestExportAssetId: string | null;
  createdAt: string;
};

export type SitePlanPageDetail = {
  id: string;
  pageNumber: number;
  imageAssetId: string;
  sourceMapAssetId: string | null;
  sourceMapAsset?: { id: string; kind: string } | null;
  width: number;
  height: number;
  layers: (AnnotationLayerData & { annotations: AnnotationData[] })[];
};

export type SitePlanDetail = {
  id: string;
  title: string;
  status: string;
  pageCount: number;
  latestExportAssetId: string | null;
  property: { id: string; name: string };
  pages: SitePlanPageDetail[];
};

export type SnapshotListItem = {
  id: string;
  name: string;
  createdAt: string;
};
