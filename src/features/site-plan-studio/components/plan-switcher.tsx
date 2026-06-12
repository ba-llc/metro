"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { labelize } from "@/lib/utils";
import { useSitePlans } from "../hooks";

/**
 * Header dropdown for switching between the property's site plans without
 * leaving the studio. Plans that are not READY are listed but disabled.
 */
export function PlanSwitcher({
  propertyId,
  sitePlanId,
  currentTitle,
  onSwitch,
}: {
  propertyId: string;
  sitePlanId: string;
  currentTitle: string;
  onSwitch: (planId: string) => void;
}) {
  const { data: sitePlans } = useSitePlans(propertyId);

  const options =
    sitePlans && sitePlans.length > 0
      ? sitePlans.map((plan) => ({
          value: plan.id,
          label:
            plan.status === "READY"
              ? plan.title
              : `${plan.title} — ${labelize(plan.status)}`,
          disabled: plan.status !== "READY",
        }))
      : [{ value: sitePlanId, label: currentTitle, disabled: false }];

  return (
    <CustomSelect
      value={sitePlanId}
      options={options}
      onValueChange={(planId) => {
        if (planId !== sitePlanId) onSwitch(planId);
      }}
      className="min-w-0"
      triggerClassName="h-8 w-auto max-w-64 gap-1.5 border-transparent bg-transparent px-2 font-semibold text-slate-950 hover:border-slate-300"
    />
  );
}
