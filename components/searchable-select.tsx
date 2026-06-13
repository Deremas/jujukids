"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  meta?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const selected = options.find((option) => option.value === value);
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.meta || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 70,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <span className={cn("min-w-0 truncate", !selected && "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && typeof document !== 'undefined' ? createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-slate-100 p-2 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                No results
              </div>
            ) : filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-zinc-800",
                  value === option.value && "text-indigo-600"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.meta ? <span className="mt-0.5 block truncate text-[10px] text-slate-400">{option.meta}</span> : null}
                </span>
                {value === option.value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ))}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
