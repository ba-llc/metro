"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatSF } from "@/lib/utils";
import { occupancyCreateSchema, type OccupancyCreateInput } from "../schemas";
import { useCreateOccupancy, useDeleteOccupancy } from "../hooks";
import type { OccupancyRecord } from "../types";
import { TenantLogoCell } from "./tenant-logo-cell";
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
      <CardContent>
        {occupancies.length === 0 ? (
          <EmptyState
            title="No tenants yet"
            description="Use 'Discover nearby' to pull in businesses around this address, or add a tenant manually."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {occupancies.map((o) => (
              <li
                key={o.id}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <TenantLogoCell
                  tenant={o.tenant}
                  meta={
                    <>
                      {o.isAnchor ? <Badge tone="blue">Anchor</Badge> : null}
                      {o.suiteNumber ? (
                        <span className="text-xs font-medium text-slate-500">
                          Suite {o.suiteNumber}
                        </span>
                      ) : null}
                      {o.squareFootage ? (
                        <span className="text-xs font-medium text-slate-500">
                          {formatSF(o.squareFootage)}
                        </span>
                      ) : null}
                    </>
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => deleteOccupancy.mutate(o.id)}
                >
                  Remove
                </Button>
              </li>
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
