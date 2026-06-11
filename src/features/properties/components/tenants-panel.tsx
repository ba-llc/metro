"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { occupancyCreateSchema, type OccupancyCreateInput } from "../schemas";
import { useCreateOccupancy, useDeleteOccupancy } from "../hooks";
import type { OccupancyRecord } from "../types";
import { TenantRosterItem } from "./tenant-roster-item";
import { TenantDiscoverModal } from "./tenant-discover-modal";

export function TenantsPanel({
  propertyId,
  occupancies,
  geocoded,
}: {
  propertyId: string;
  occupancies: OccupancyRecord[];
  geocoded: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const createOccupancy = useCreateOccupancy(propertyId);
  const deleteOccupancy = useDeleteOccupancy(propertyId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OccupancyCreateInput>({
    resolver: zodResolver(occupancyCreateSchema),
    defaultValues: { isAnchor: false },
  });

  const onSubmit = handleSubmit((values) =>
    createOccupancy.mutate(values, {
      onSuccess: () => {
        reset();
        setAddOpen(false);
      },
    }),
  );

  return (
    <Card>
      <CardHeader
        title="Tenant Roster"
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDiscoverOpen(true)}
            >
              Discover nearby
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
              Add Tenant
            </Button>
          </div>
        }
      />
      <CardContent className="px-4 py-3">
        {occupancies.length === 0 ? (
          <EmptyState
            title="No tenants yet"
            description="Use 'Discover nearby' to pull in businesses around this address, or add a tenant manually."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {occupancies.map((o) => (
              <TenantRosterItem
                key={o.id}
                tenant={o.tenant}
                isAnchor={o.isAnchor}
                suiteNumber={o.suiteNumber}
                squareFootage={o.squareFootage}
                onRemove={() => deleteOccupancy.mutate(o.id)}
                removing={deleteOccupancy.isPending}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Tenant">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Tenant name" error={errors.tenantName?.message} required>
            <Input placeholder="Giant Food Stores" {...register("tenantName")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Suite">
              <Input {...register("suiteNumber")} />
            </Field>
            <Field label="Square footage">
              <Input type="number" {...register("squareFootage")} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register("isAnchor")} />
            Anchor tenant
          </label>
          {createOccupancy.error ? (
            <p className="text-sm text-red-600">{createOccupancy.error.message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" loading={createOccupancy.isPending}>
              Add Tenant
            </Button>
          </div>
        </form>
      </Modal>

      <TenantDiscoverModal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        propertyId={propertyId}
        geocoded={geocoded}
      />
    </Card>
  );
}
