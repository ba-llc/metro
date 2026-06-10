import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 disabled:bg-slate-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(fieldBase, "h-10 px-3", className)} {...props} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(fieldBase, "h-10 pl-3", className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-20 px-3 py-2", className)}
      {...props}
    />
  );
});
