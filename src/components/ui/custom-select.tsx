"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type CustomSelectOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type CustomSelectProps<Value extends string> = {
  label?: string;
  value: Value;
  options: readonly CustomSelectOption<Value>[];
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  renderOption?: (option: CustomSelectOption<Value>) => ReactNode;
  renderValue?: (option: CustomSelectOption<Value> | undefined) => ReactNode;
};

const menuViewportPadding = 8;
const menuGap = 4;
const minMenuHeight = 160;
const maxMenuHeight = 320;

function clampMenuHeight(value: number) {
  return Math.min(Math.max(value, minMenuHeight), maxMenuHeight);
}

export function CustomSelect<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
  className,
  triggerClassName,
  renderOption,
  renderValue,
}: CustomSelectProps<Value>) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.value === value)),
    [options, value],
  );
  const selectedOption = options[selectedIndex];
  const labelId = `${id}-label`;
  const listboxId = `${id}-listbox`;
  const activeOption = options[activeIndex];
  const activeOptionId = activeOption ? `${id}-option-${activeIndex}` : undefined;
  const triggerLabelledBy = label ? `${labelId} ${id}-value` : `${id}-value`;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - menuViewportPadding;
      const spaceAbove = rect.top - menuViewportPadding;
      const openAbove = spaceBelow < minMenuHeight && spaceAbove > spaceBelow;
      const availableHeight = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = clampMenuHeight(availableHeight - menuGap);
      const top = openAbove
        ? Math.max(menuViewportPadding, rect.top - maxHeight - menuGap)
        : Math.min(
            rect.bottom + menuGap,
            window.innerHeight - menuViewportPadding - maxHeight,
          );

      const maxLeft = window.innerWidth - menuViewportPadding - rect.width;

      setPosition({
        top,
        left: Math.max(menuViewportPadding, Math.min(rect.left, maxLeft)),
        width: rect.width,
        maxHeight,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function moveActive(direction: 1 | -1) {
    setActiveIndex((current) => {
      for (let offset = 1; offset <= options.length; offset += 1) {
        const next = (current + direction * offset + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return current;
    });
  }

  function selectOption(option: CustomSelectOption<Value>) {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        moveActive(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        moveActive(-1);
        return;
      case "Home":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(
          Math.max(
            0,
            options.findIndex((option) => !option.disabled),
          ),
        );
        return;
      case "End":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(
          Math.max(
            0,
            options.map((option) => option.disabled).lastIndexOf(false),
          ),
        );
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (activeOption) selectOption(activeOption);
        return;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        return;
    }
  }

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            className="fixed z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm text-slate-900 shadow-lg ring-1 ring-slate-900/5"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            <div className="max-h-[inherit] overflow-y-auto p-1">
              {options.map((option, index) => {
                const selected = option.value === value;
                const active = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    id={`${id}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                      selected
                        ? "bg-brand-50 font-medium text-brand-900"
                        : "text-slate-700",
                      active && !selected ? "bg-slate-100 text-slate-950" : "",
                      option.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
	                  >
	                    <span className="min-w-0 flex-1 truncate">
	                      {renderOption ? renderOption(option) : option.label}
	                    </span>
                    {selected ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4 shrink-0 text-brand-700"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("block", className)}>
      {label ? (
        <span
          id={labelId}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600"
        >
          {label}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-labelledby={triggerLabelledBy}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 shadow-sm transition-colors",
          "focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
          open ? "border-brand-700 ring-1 ring-brand-700" : "",
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
	      >
	        <span id={`${id}-value`} className="min-w-0 flex-1 truncate">
	          {renderValue ? renderValue(selectedOption) : (selectedOption?.label ?? "")}
	        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-4 shrink-0 text-slate-500 transition-transform",
            open ? "rotate-180" : "",
          )}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </div>
  );
}

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
