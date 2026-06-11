"use client";

import { useState } from "react";
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
import { useSearchPropertyPlaces } from "../hooks";
import type { DiscoveredPlaceRecord } from "../types";

function componentText(
  place: DiscoveredPlaceRecord,
  type: string,
  format: "longText" | "shortText" = "longText",
) {
  return (
    place.addressComponents?.find((component) => component.types.includes(type))?.[
      format
    ] ?? ""
  );
}

function addressFromPlace(place: DiscoveredPlaceRecord) {
  const street = [
    componentText(place, "street_number"),
    componentText(place, "route"),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    street,
    city:
      componentText(place, "locality") ||
      componentText(place, "postal_town") ||
      componentText(place, "sublocality") ||
      componentText(place, "administrative_area_level_3"),
    state: componentText(place, "administrative_area_level_1", "shortText"),
    zip: componentText(place, "postal_code", "shortText"),
  };
}

function propertyTypeFromPlace(place: DiscoveredPlaceRecord): PropertyCreateInput["propertyType"] | null {
  const types = new Set(place.types);
  if (types.has("shopping_mall")) return "SHOPPING_CENTER";
  if (types.has("real_estate_agency")) return "OFFICE";
  if (types.has("store") || types.has("restaurant")) return "RETAIL";
  return null;
}

export function PropertyForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
  enablePlaceSearch = true,
}: {
  defaultValues?: Partial<PropertyCreateInput>;
  onSubmit: (values: PropertyCreateInput) => void;
  submitting: boolean;
  submitLabel: string;
  enablePlaceSearch?: boolean;
}) {
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<DiscoveredPlaceRecord[]>([]);
  const searchPlaces = useSearchPropertyPlaces();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PropertyCreateInput>({
    resolver: zodResolver(propertyCreateSchema),
    defaultValues: {
      propertyType: "SHOPPING_CENTER",
      status: "ACTIVE",
      ...defaultValues,
    },
  });

  async function runPlaceSearch() {
    const results = await searchPlaces.mutateAsync({
      query: placeQuery,
      maxResults: 5,
    });
    setPlaceResults(results);
  }

  function applyPlace(place: DiscoveredPlaceRecord) {
    const address = addressFromPlace(place);
    const inferredType = propertyTypeFromPlace(place);

    setValue("name", place.name, { shouldDirty: true, shouldValidate: true });
    if (inferredType) {
      setValue("propertyType", inferredType, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.street) {
      setValue("address.street", address.street, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.city) {
      setValue("address.city", address.city, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.state) {
      setValue("address.state", address.state, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.zip) {
      setValue("address.zip", address.zip, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (place.location) {
      setValue("latitude", place.location.lat, { shouldDirty: true });
      setValue("longitude", place.location.lng, { shouldDirty: true });
    }
    setValue("googlePlaceId", place.placeId, { shouldDirty: true });
    setValue("placeTypes", place.types, { shouldDirty: true });
    if (place.formattedAddress) {
      setValue("formattedAddress", place.formattedAddress, { shouldDirty: true });
    }
    if (place.website) {
      setValue("website", place.website, { shouldDirty: true });
    }
    if (place.phoneNumber) {
      setValue("phoneNumber", place.phoneNumber, { shouldDirty: true });
    }
    setPlaceResults([]);
    setPlaceQuery(place.name);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {enablePlaceSearch ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <Field label="Search Google Places">
            <div className="flex gap-2">
              <Input
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                placeholder="Search a property, shopping center, or business name"
              />
              <Button
                type="button"
                variant="secondary"
                loading={searchPlaces.isPending}
                disabled={placeQuery.trim().length < 3}
                onClick={runPlaceSearch}
              >
                Search
              </Button>
            </div>
          </Field>
          {searchPlaces.error ? (
            <p className="mt-2 text-xs text-red-600">
              {searchPlaces.error.message}
            </p>
          ) : null}
          {placeResults.length ? (
            <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-white">
              {placeResults.map((place) => (
                <button
                  key={place.placeId}
                  type="button"
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                  onClick={() => applyPlace(place)}
                >
                  <span className="block text-sm font-medium text-slate-800">
                    {place.name}
                  </span>
                  {place.formattedAddress ? (
                    <span className="block text-xs text-slate-500">
                      {place.formattedAddress}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

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
