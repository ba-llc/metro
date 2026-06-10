"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRate, formatSF, labelize } from "@/lib/utils";
import {
  spaceCreateSchema,
  spaceStatuses,
  spaceTypes,
  type SpaceCreateInput,
} from "../schemas";
import { useCreateSpace, useDeleteSpace, useUpdateSpace } from "../hooks";
import type { SpaceRecord } from "../types";

function SpaceForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
}: {
  defaultValues?: Partial<SpaceCreateInput>;
  onSubmit: (values: SpaceCreateInput) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SpaceCreateInput>({
    resolver: zodResolver(spaceCreateSchema),
    defaultValues: { spaceType: "INLINE", status: "AVAILABLE", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Suite number" error={errors.suiteNumber?.message} required>
          <Input placeholder="101" {...register("suiteNumber")} />
        </Field>
        <Field label="Square footage" error={errors.squareFootage?.message}>
          <Input type="number" placeholder="2400" {...register("squareFootage")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Space type">
          <Select {...register("spaceType")}>
            {spaceTypes.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select {...register("status")}>
            {spaceStatuses.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Asking rate ($/SF/yr)" error={errors.askingRate?.message}>
          <Input type="number" step="0.01" placeholder="24.00" {...register("askingRate")} />
        </Field>
        <Field label="Rate type">
          <Select {...register("rateType")}>
            <option value="">—</option>
            <option value="NNN">NNN</option>
            <option value="Gross">Gross</option>
            <option value="FS">Full Service</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes" error={errors.notes?.message}>
        <Textarea {...register("notes")} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function SpacesPanel({
  propertyId,
  spaces,
}: {
  propertyId: string;
  spaces: SpaceRecord[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SpaceRecord | null>(null);
  const createSpace = useCreateSpace(propertyId);
  const updateSpace = useUpdateSpace(propertyId);
  const deleteSpace = useDeleteSpace(propertyId);

  return (
    <Card>
      <CardHeader
        title="Available Spaces"
        action={
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
            Add Space
          </Button>
        }
      />
      <CardContent className="p-0">
        {spaces.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No spaces yet"
              description="Add available suites and pad sites — they drive availability tables, site plan labels, and listings."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Suite</TH>
                <TH>Size</TH>
                <TH>Type</TH>
                <TH>Rate</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {spaces.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-slate-900">{s.suiteNumber}</TD>
                  <TD>{formatSF(s.squareFootage)}</TD>
                  <TD>{labelize(s.spaceType)}</TD>
                  <TD>{formatRate(s.askingRate, s.rateType)}</TD>
                  <TD>
                    <StatusBadge status={s.status} />
                  </TD>
                  <TD className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => deleteSpace.mutate(s.id)}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Space">
        <SpaceForm
          submitLabel="Add Space"
          submitting={createSpace.isPending}
          onSubmit={(values) =>
            createSpace.mutate(values, { onSuccess: () => setAddOpen(false) })
          }
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit Suite ${editing?.suiteNumber ?? ""}`}
      >
        {editing ? (
          <SpaceForm
            submitLabel="Save Changes"
            submitting={updateSpace.isPending}
            defaultValues={{
              suiteNumber: editing.suiteNumber,
              squareFootage: editing.squareFootage ?? undefined,
              spaceType: editing.spaceType as SpaceCreateInput["spaceType"],
              status: editing.status as SpaceCreateInput["status"],
              askingRate: editing.askingRate ? Number(editing.askingRate) : undefined,
              rateType: editing.rateType ?? undefined,
              notes: editing.notes ?? undefined,
            }}
            onSubmit={(values) =>
              updateSpace.mutate(
                { spaceId: editing.id, input: values },
                { onSuccess: () => setEditing(null) },
              )
            }
          />
        ) : null}
      </Modal>
    </Card>
  );
}
