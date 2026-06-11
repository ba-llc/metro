"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom-select";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/empty-state";
import {
  defaultMapParams,
  mapSizePresets,
  mapTypeOptions,
  markerColorOptions,
} from "../constants";
import { fetchMapPreviewBlob } from "../hooks";
import {
  competitorsTextFromParams,
  radiiTextFromParams,
  sizePresetFromParams,
} from "../map-input";
import {
  mapKinds,
  retailCategories,
  type MapCreateInput,
  type MapParams,
} from "../schemas";

type Props = {
  propertyId: string;
  loading?: boolean;
  error?: string | null;
  initialInput?: MapCreateInput;
  submitLabel?: string;
  onSubmit: (input: MapCreateInput) => void;
  onCancel: () => void;
};

const usesAutoZoom = (kind: MapCreateInput["kind"]) =>
  kind === "RADIUS" || kind === "RETAIL";

const defaultConfigWidth = 600;
const minConfigWidth = 360;
const minPreviewWidth = 280;
const resizeGutterWidth = 16;
const resizeKeyboardStep = 24;

const mapKindOptions: readonly CustomSelectOption<MapCreateInput["kind"]>[] =
  mapKinds.map((value) => ({
    value,
    label:
      value === "SATELLITE_AERIAL"
        ? "Satellite aerial"
        : value === "TRADE_AREA"
          ? "Trade area"
          : value === "RADIUS"
            ? "Radius rings"
            : "Retail POI",
  }));

const mapSizeSelectOptions: readonly CustomSelectOption<string>[] =
  mapSizePresets.map((preset) => ({
    value: preset.id,
    label: preset.label,
  }));

const scaleOptions: readonly CustomSelectOption<"1" | "2">[] = [
  { value: "1", label: "Standard (1x)" },
  { value: "2", label: "High resolution (2x, recommended)" },
];

const markerColorSelectOptions: readonly CustomSelectOption<string>[] =
  markerColorOptions.map((value) => ({
    value,
    label: value,
  }));

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function MapGenerateForm({
  propertyId,
  loading,
  error,
  initialInput,
  submitLabel = "Generate",
  onSubmit,
  onCancel,
}: Props) {
  const [kind, setKind] = useState<MapCreateInput["kind"]>(
    initialInput?.kind ?? "SATELLITE_AERIAL",
  );
  const [params, setParams] = useState<MapParams>(
    () => initialInput?.params ?? defaultMapParams("SATELLITE_AERIAL"),
  );
  const [sizePreset, setSizePreset] = useState(
    initialInput ? sizePresetFromParams(initialInput.params) : "standard",
  );
  const [competitorText, setCompetitorText] = useState(
    initialInput ? competitorsTextFromParams(initialInput.params) : "",
  );
  const [customRadii, setCustomRadii] = useState(
    initialInput ? radiiTextFromParams(initialInput.params) : "1, 3, 5",
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [configWidth, setConfigWidth] = useState(defaultConfigWidth);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialInput) return;
    setKind(initialInput.kind);
    setParams(initialInput.params);
    setSizePreset(sizePresetFromParams(initialInput.params));
    setCustomRadii(radiiTextFromParams(initialInput.params));
    setCompetitorText(competitorsTextFromParams(initialInput.params));
  }, [initialInput]);

  function changeKind(next: MapCreateInput["kind"]) {
    setKind(next);
    setParams(defaultMapParams(next));
    if (next === "RADIUS") setCustomRadii("1, 3, 5");
    if (next === "RETAIL") {
      setCustomRadii("3");
      setCompetitorText("");
    }
  }

  function patch(partial: Partial<MapParams>) {
    setParams((prev) => ({ ...prev, ...partial }));
  }

  function parseRadii(): number[] {
    const values = customRadii
      .split(/[,\s]+/)
      .map((v) => Number.parseFloat(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    return values.length ? values : [3];
  }

  const buildInput = useCallback((): MapCreateInput => {
    const size =
      mapSizePresets.find((p) => p.id === sizePreset) ?? mapSizePresets[0];
    return {
      kind,
      params: {
        ...params,
        width: size.width,
        height: size.height,
        ...(kind === "RADIUS" || kind === "RETAIL"
          ? { radiusMiles: parseRadii() }
          : {}),
        ...(kind === "RETAIL"
          ? {
              competitorKeywords: competitorText
                .split(/[,\n]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
      },
    };
  }, [kind, params, sizePreset, customRadii, competitorText]);

  useEffect(() => {
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blob = await fetchMapPreviewBlob(
          propertyId,
          buildInput(),
          ac.signal,
        );
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        if (ac.signal.aborted) return;
        setPreviewError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        if (!ac.signal.aborted) setPreviewLoading(false);
      }
    }, 700);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [propertyId, buildInput]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    const resizeObserver = new ResizeObserver(() => {
      setConfigWidth((current) =>
        clamp(
          current,
          minConfigWidth,
          Math.max(
            minConfigWidth,
            layout.clientWidth - resizeGutterWidth - minPreviewWidth,
          ),
        ),
      );
    });

    resizeObserver.observe(layout);
    return () => resizeObserver.disconnect();
  }, []);

  function handleSubmit() {
    onSubmit(buildInput());
  }

  const showManualZoom = !usesAutoZoom(kind) || params.autoZoom === false;
  const maxConfigWidth =
    layoutRef.current?.clientWidth != null
      ? Math.max(
          minConfigWidth,
          layoutRef.current.clientWidth - resizeGutterWidth - minPreviewWidth,
        )
      : defaultConfigWidth;

  function setClampedConfigWidth(nextWidth: number) {
    setConfigWidth(clamp(nextWidth, minConfigWidth, maxConfigWidth));
  }

  function startResize(startX: number) {
    const startConfigWidth = configWidth;
    const containerWidth = layoutRef.current?.clientWidth ?? 0;
    const maxWidth = Math.max(
      minConfigWidth,
      containerWidth - resizeGutterWidth - minPreviewWidth,
    );

    const onMove = (event: PointerEvent) => {
      setConfigWidth(
        clamp(
          startConfigWidth + event.clientX - startX,
          minConfigWidth,
          maxWidth,
        ),
      );
    };

    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setClampedConfigWidth(configWidth - resizeKeyboardStep);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setClampedConfigWidth(configWidth + resizeKeyboardStep);
    } else if (event.key === "Home") {
      event.preventDefault();
      setClampedConfigWidth(minConfigWidth);
    } else if (event.key === "End") {
      event.preventDefault();
      setClampedConfigWidth(maxConfigWidth);
    }
  }

  return (
    <div
      ref={layoutRef}
      className="grid gap-6 lg:grid-cols-[minmax(0,var(--map-config-width))_16px_minmax(280px,1fr)] lg:gap-0"
      style={
        {
          "--map-config-width": `${configWidth}px`,
        } as CSSProperties
      }
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <CustomSelect
          label="Map type"
          value={kind}
          options={mapKindOptions}
          onValueChange={changeKind}
        />

        <div className="grid grid-cols-2 gap-4">
          <CustomSelect
            label="Base map style"
            value={params.mapType ?? defaultMapParams(kind).mapType ?? "roadmap"}
            options={mapTypeOptions}
            onValueChange={(mapType) => patch({ mapType })}
          />

          <CustomSelect
            label="Output size"
            value={sizePreset}
            options={mapSizeSelectOptions}
            onValueChange={setSizePreset}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Viewport
          </p>

          {usesAutoZoom(kind) ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={params.autoZoom ?? true}
                onChange={(e) => patch({ autoZoom: e.target.checked })}
              />
              Auto-fit zoom to radius
            </label>
          ) : null}

          {showManualZoom ? (
            <div>
              <Field label={`Zoom level (${params.zoom ?? 12})`}>
                <input
                  type="range"
                  min={8}
                  max={20}
                  value={params.zoom ?? 12}
                  onChange={(e) => patch({ zoom: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
              <p className="mt-1 text-xs text-slate-500">
                8 = regional · 14 = neighborhood · 18 = site close-up
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Pan north (mi)">
              <Input
                type="number"
                step="0.1"
                value={params.centerOffsetNorthMiles ?? 0}
                onChange={(e) =>
                  patch({ centerOffsetNorthMiles: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Pan east (mi)">
              <Input
                type="number"
                step="0.1"
                value={params.centerOffsetEastMiles ?? 0}
                onChange={(e) =>
                  patch({ centerOffsetEastMiles: Number(e.target.value) })
                }
              />
            </Field>
          </div>

          <CustomSelect
            label="Resolution"
            value={String(params.scale ?? 2) as "1" | "2"}
            options={scaleOptions}
            onValueChange={(scale) =>
              patch({ scale: Number(scale) as 1 | 2 })
            }
          />
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Property marker
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={params.showPropertyMarker ?? true}
              onChange={(e) => patch({ showPropertyMarker: e.target.checked })}
            />
            Show property pin
          </label>
          {params.showPropertyMarker !== false ? (
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Pin color"
                value={params.propertyMarkerColor ?? "red"}
                options={markerColorSelectOptions}
                onValueChange={(propertyMarkerColor) =>
                  patch({ propertyMarkerColor })
                }
              />
              <Field label="Pin label">
                <Input
                  maxLength={1}
                  value={params.propertyMarkerLabel ?? ""}
                  onChange={(e) =>
                    patch({ propertyMarkerLabel: e.target.value || undefined })
                  }
                  placeholder="P"
                />
              </Field>
            </div>
          ) : null}
        </div>

        {kind === "RADIUS" ? (
          <div className="space-y-3">
            <Field label="Radius rings (miles)">
              <Input
                value={customRadii}
                onChange={(e) => setCustomRadii(e.target.value)}
                placeholder="1, 3, 5"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {["1", "1, 3", "1, 3, 5", "3, 5, 10"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  onClick={() => setCustomRadii(preset)}
                >
                  {preset} mi
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {kind === "RETAIL" ? (
          <div className="space-y-4">
            <Field label="Search radius (miles)">
              <Input
                value={customRadii}
                onChange={(e) => setCustomRadii(e.target.value)}
                placeholder="3"
              />
            </Field>
            <Field label="Max POI markers">
              <Input
                type="number"
                min={0}
                max={40}
                value={params.maxPlaceMarkers ?? 25}
                onChange={(e) =>
                  patch({ maxPlaceMarkers: Number(e.target.value) })
                }
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                POI categories
              </p>
              <div className="space-y-1.5">
                {retailCategories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={(params.categories ?? []).includes(cat.id)}
                      onChange={(e) => {
                        const current = params.categories ?? [];
                        patch({
                          categories: e.target.checked
                            ? [...current, cat.id]
                            : current.filter((c) => c !== cat.id),
                        });
                      }}
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Competitor keywords">
              <textarea
                className="min-h-[72px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={competitorText}
                onChange={(e) => setCompetitorText(e.target.value)}
                placeholder="Target, Walmart, Whole Foods"
              />
            </Field>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <div
        role="separator"
        aria-label="Resize map settings and live preview columns"
        aria-orientation="vertical"
        aria-valuemin={minConfigWidth}
        aria-valuemax={maxConfigWidth}
        aria-valuenow={Math.round(configWidth)}
        tabIndex={0}
        className="group relative mx-1 hidden cursor-col-resize bg-slate-100 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 lg:block"
        onPointerDown={(event) => {
          event.preventDefault();
          startResize(event.clientX);
        }}
        onDoubleClick={() => setClampedConfigWidth(defaultConfigWidth)}
        onKeyDown={handleResizeKeyDown}
      >
        <div className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-brand-400 group-focus:bg-brand-500" />
      </div>

      <div className="space-y-2 lg:sticky lg:top-0 lg:self-start lg:pl-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Live preview
        </p>
        <div className="relative aspect-4/3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Map preview"
              className="size-full object-cover"
            />
          ) : previewLoading ? (
            <Spinner label="Rendering preview..." />
          ) : (
            <div className="flex size-full items-center justify-center px-4 text-center text-xs text-slate-500">
              Adjust settings to see a preview
            </div>
          )}
          {previewLoading && previewUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Spinner label="Updating..." />
            </div>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Lower resolution than final output. Retail maps may show fewer POI
          markers in preview.
        </p>
        {previewError ? (
          <p className="text-xs text-red-600">{previewError}</p>
        ) : null}
      </div>
    </div>
  );
}
