"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom-select";

/** React Hook Form bridge — use inside `Field` (Field supplies the visible label). */
export function ControlledSelect<
  TFieldValues extends FieldValues,
  TValue extends string = string,
>({
  name,
  control,
  options,
  disabled,
  className,
  triggerClassName,
  parse,
}: {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  options: readonly CustomSelectOption<TValue>[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  parse?: (value: TValue) => unknown;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <CustomSelect
          value={(field.value == null ? "" : String(field.value)) as TValue}
          options={options}
          onValueChange={(value) =>
            field.onChange(parse ? parse(value) : value)
          }
          disabled={disabled}
          className={className}
          triggerClassName={triggerClassName}
        />
      )}
    />
  );
}
