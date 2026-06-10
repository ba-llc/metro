"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useAddDemographics } from "../hooks";
import type { DemographicRecord } from "../types";

type FormValues = {
  radiusMiles: number;
  population?: number;
  households?: number;
  avgHouseholdIncome?: number;
  daytimePopulation?: number;
  medianHousingValue?: number;
  medianAge?: number;
};

const metricRows: [keyof DemographicRecord["metrics"], string, (v: number) => string][] = [
  ["population", "Population", formatNumber],
  ["households", "Households", formatNumber],
  ["avgHouseholdIncome", "Avg HH Income", formatCurrency],
  ["daytimePopulation", "Daytime Population", formatNumber],
  ["medianHousingValue", "Median Housing Value", formatCurrency],
  ["medianAge", "Median Age", (v) => v.toFixed(1)],
];

export function DemographicsPanel({
  propertyId,
  demographics,
}: {
  propertyId: string;
  demographics: DemographicRecord[];
}) {
  const [open, setOpen] = useState(false);
  const addDemographics = useAddDemographics(propertyId);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { radiusMiles: 1 },
  });

  // Latest dataset per radius.
  const byRadius = new Map<number, DemographicRecord>();
  for (const d of demographics) {
    const r = d.geographyParams.radiusMiles;
    if (r != null && !byRadius.has(r)) byRadius.set(r, d);
  }
  const datasets = [...byRadius.entries()].sort((a, b) => a[0] - b[0]);

  const onSubmit = handleSubmit((values) => {
    const { radiusMiles, ...metrics } = values;
    addDemographics.mutate(
      {
        geographyType: "RADIUS",
        geographyParams: { radiusMiles: Number(radiusMiles) },
        metrics: Object.fromEntries(
          Object.entries(metrics).filter(([, v]) => v != null && `${v}` !== ""),
        ) as Record<string, number>,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      },
    );
  });

  return (
    <Card>
      <CardHeader
        title="Demographics"
        action={
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Add Dataset
          </Button>
        }
      />
      <CardContent className="p-0">
        {datasets.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No demographic data"
              description="Add 1/3/5-mile datasets. Provider integrations (ESRI, Placer.ai) plug in without changes."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH />
                {datasets.map(([radius]) => (
                  <TH key={radius}>{radius} Mile</TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {metricRows.map(([key, label, fmt]) => (
                <TR key={key}>
                  <TD className="font-medium text-slate-900">{label}</TD>
                  {datasets.map(([radius, d]) => {
                    const v = d.metrics[key];
                    return <TD key={radius}>{typeof v === "number" ? fmt(v) : "—"}</TD>;
                  })}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Demographic Dataset">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Radius">
            <Select {...register("radiusMiles", { valueAsNumber: true })}>
              <option value={1}>1 Mile</option>
              <option value={3}>3 Mile</option>
              <option value={5}>5 Mile</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Population">
              <Input type="number" {...register("population", { valueAsNumber: true })} />
            </Field>
            <Field label="Households">
              <Input type="number" {...register("households", { valueAsNumber: true })} />
            </Field>
            <Field label="Avg HH income ($)">
              <Input type="number" {...register("avgHouseholdIncome", { valueAsNumber: true })} />
            </Field>
            <Field label="Daytime population">
              <Input type="number" {...register("daytimePopulation", { valueAsNumber: true })} />
            </Field>
            <Field label="Median housing value ($)">
              <Input type="number" {...register("medianHousingValue", { valueAsNumber: true })} />
            </Field>
            <Field label="Median age">
              <Input type="number" step="0.1" {...register("medianAge", { valueAsNumber: true })} />
            </Field>
          </div>
          {addDemographics.error ? (
            <p className="text-sm text-red-600">{addDemographics.error.message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" loading={addDemographics.isPending}>
              Save Dataset
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
