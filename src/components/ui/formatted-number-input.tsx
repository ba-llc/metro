"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

type FormattedIntegerInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value?: number | string | null;
  onValueChange: (value: number | undefined) => void;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatInteger(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const digits = digitsOnly(String(value));
  if (!digits) return "";
  return new Intl.NumberFormat("en-US").format(Number(digits));
}

export const FormattedIntegerInput = forwardRef<
  HTMLInputElement,
  FormattedIntegerInputProps
>(function FormattedIntegerInput(
  { value, onValueChange, placeholder, onBlur, ...props },
  ref,
) {
  return (
    <Input
      {...props}
      ref={ref}
      inputMode="numeric"
      value={formatInteger(value)}
      placeholder={formatInteger(placeholder)}
      onChange={(event) => {
        const digits = digitsOnly(event.target.value);
        onValueChange(digits ? Number(digits) : undefined);
      }}
      onBlur={onBlur}
    />
  );
});
