"use client";

import { Compass, LocateFixed, Navigation } from "lucide-react";
import { StudioPanel } from "./studio-shell";

export type SymbolAssetOption = {
  id: string;
  label: string;
  text: string;
};

export const directionalSymbols: SymbolAssetOption[] = [
  { id: "north-arrow", label: "North Arrow", text: "▲ N" },
  { id: "site-pin", label: "Property Pin", text: "◎" },
  { id: "entry-arrow", label: "Entry Arrow", text: "➜" },
];

const iconBySymbol: Record<string, React.ReactNode> = {
  "north-arrow": <Compass className="size-6" />,
  "site-pin": <LocateFixed className="size-6" />,
  "entry-arrow": <Navigation className="size-6" />,
};

export function SymbolAssetsPanel() {
  return (
    <StudioPanel
      title="Map Symbols"
      description="Drag directional markers onto the site plan."
    >
      <div className="grid grid-cols-2 gap-3">
        {directionalSymbols.map((symbol) => (
          <button
            key={symbol.id}
            type="button"
            draggable
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
            title={`Drag ${symbol.label} onto the canvas`}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData("application/x-metro-symbol", symbol.text);
              event.dataTransfer.setData("text/plain", symbol.label);
            }}
          >
            <span className="flex size-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-brand-900">
              {iconBySymbol[symbol.id]}
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {symbol.label}
            </span>
          </button>
        ))}
      </div>
    </StudioPanel>
  );
}
