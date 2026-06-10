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
import { useAddDemographics, useAutoFetchDemographics } from "../hooks";
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

function sourceLabel(d: DemographicRecord): string {
  const params = d.geographyParams as {
    censusLabel?: string;
    acsVintage?: number;
  };
  if (params.censusLabel) {
    return params.acsVintage
      ? `${params.censusLabel} (ACS ${params.acsVintage})`
      : params.censusLabel;
  }
  return d.provider === "manual" ? "Manual entry" : d.provider;
}

export function DemographicsPanel({
  propertyId,
  demographics,
  hasZip,
  geocoded,
}: {
  propertyId: string;
  demographics: DemographicRecord[];
  hasZip: boolean;
  geocoded: boolean;
}) {
  const [open, setOpen] = useState(false);
  const addDemographics = useAddDemographics(propertyId);
  const autoFetch = useAutoFetchDemographics(propertyId);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { radiusMiles: 1 },
  });

  const canAutoFetch = hasZip || geocoded;

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
          <div className="flex gap-2">
            {canAutoFetch ? (
              <Button
                size="sm"
                loading={autoFetch.isPending}
                onClick={() => autoFetch.mutate()}
              >
                {datasets.length === 0 ? "Auto-fetch" : "Refresh"}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              Add Manual
            </Button>
          </div>
        }
      />
      <CardContent className="p-0">
        {autoFetch.error ? (
          <p className="px-5 pt-4 text-sm text-red-600">{autoFetch.error.message}</p>
        ) : null}
        {datasets.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No demographic data"
              description={
                canAutoFetch
                  ? "Demographics auto-populate when you geocode an address. You can also fetch 1/3/5-mile trade areas from US Census ACS using the zip code or coordinates."
                  : "Add an address with a zip code, then geocode or auto-fetch Census demographics."
              }
              action={
                canAutoFetch ? (
                  <Button loading={autoFetch.isPending} onClick={() => autoFetch.mutate()}>
                    Auto-fetch from Census
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
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
                      return (
                        <TD key={radius}>{typeof v === "number" ? fmt(v) : "—"}</TD>
                      );
                    })}
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              {datasets.map(([, d]) => sourceLabel(d)).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
            </p>
          </>
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
