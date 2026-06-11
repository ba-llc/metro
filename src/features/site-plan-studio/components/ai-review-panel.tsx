"use client";

import type { ReactNode } from "react";
import { Bot, Check, FileText, MousePointer2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, labelize } from "@/lib/utils";
import { useStudioStore } from "../store";
import { StudioPanel } from "./studio-shell";

export function AiReviewPanel({
  onContinueEditing,
}: {
  onContinueEditing: () => void;
}) {
  const reviewSuggestions = useStudioStore((s) => s.reviewSuggestions);
  const select = useStudioStore((s) => s.select);
  const acceptSuggestions = useStudioStore((s) => s.acceptSuggestions);
  const discardSuggestions = useStudioStore((s) => s.discardSuggestions);

  const suggestions = reviewSuggestions?.annotations ?? [];
  const provider = reviewSuggestions?.provider ?? "Unknown provider";
  const notes = reviewSuggestions?.notes ?? [];
  const isDemo = provider === "fallback-layout";

  return (
    <StudioPanel
      title="AI Review"
      description="Review generated overlays before saving them to this site plan."
    >
      <div className="space-y-3">
        <div
          className={cn(
            "rounded-2xl border p-4",
            isDemo ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-2xl bg-white shadow-sm",
                isDemo ? "text-amber-600" : "text-blue-700",
              )}
            >
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {suggestions.length} suggestions ready
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Accept saves these overlays to the site plan. Discard removes them
                without saving.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ReviewFact icon={<Bot className="size-4" />} label="Provider" value={provider} />
          <ReviewFact
            icon={<FileText className="size-4" />}
            label="Overlays"
            value={String(suggestions.length)}
          />
        </div>

        {notes.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider notes
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-5 text-slate-600">
              {notes.slice(0, 4).map((note, index) => (
                <li key={`${index}:${note}`}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => {
              acceptSuggestions();
              onContinueEditing();
            }}
            disabled={suggestions.length === 0}
          >
            <Check className="size-4" />
            Accept and Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              discardSuggestions();
              onContinueEditing();
            }}
          >
            <Trash2 className="size-4" />
            Discard Unsaved
          </Button>
        </div>

        <div className="space-y-2">
          {suggestions.slice(0, 12).map((annotation, index) => (
            <button
              key={annotation.id}
              type="button"
              onClick={() => select(annotation.id)}
              className="grid w-full grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">
                  {labelize(annotation.type)}
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MousePointer2 className="size-3" />
                  Focus and adjust
                </span>
              </span>
            </button>
          ))}
          {suggestions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No AI suggestion layer is active. Run AI Analyze to create one.
            </p>
          ) : null}
        </div>
      </div>
    </StudioPanel>
  );
}

function ReviewFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-brand-900">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
