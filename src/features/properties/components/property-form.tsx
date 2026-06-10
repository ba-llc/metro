"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  propertyCreateSchema,
  propertyTypes,
  propertyStatuses,
  type PropertyCreateInput,
} from "../schemas";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { labelize } from "@/lib/utils";

export function PropertyForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
}: {
  defaultValues?: Partial<PropertyCreateInput>;
  onSubmit: (values: PropertyCreateInput) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyCreateInput>({
    resolver: zodResolver(propertyCreateSchema),
    defaultValues: {
      propertyType: "SHOPPING_CENTER",
      status: "ACTIVE",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Property name" error={errors.name?.message} required>
        <Input placeholder="Lawrence Park Shopping Center" {...register("name")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Property type" error={errors.propertyType?.message}>
          <Select {...register("propertyType")}>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            {propertyStatuses.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Street address" error={errors.address?.street?.message} required>
        <Input placeholder="3300 Trindle Road" {...register("address.street")} />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="City" error={errors.address?.city?.message} required>
          <Input {...register("address.city")} />
        </Field>
        <Field label="State" error={errors.address?.state?.message} required>
          <Input placeholder="PA" {...register("address.state")} />
        </Field>
        <Field label="ZIP" error={errors.address?.zip?.message} required>
          <Input {...register("address.zip")} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Total GLA (SF)" error={errors.totalGla?.message}>
          <Input type="number" {...register("totalGla")} />
        </Field>
        <Field label="Year built" error={errors.yearBuilt?.message}>
          <Input type="number" {...register("yearBuilt")} />
        </Field>
        <Field label="Parking ratio" error={errors.parkingRatio?.message}>
          <Input type="number" step="0.1" placeholder="5.0" {...register("parkingRatio")} />
        </Field>
      </div>

      <Field label="Description" error={errors.description?.message}>
        <Textarea
          placeholder="Grocery-anchored neighborhood center at a signalized intersection..."
          {...register("description")}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
