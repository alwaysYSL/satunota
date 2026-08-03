"use client"

import { cn } from "@/lib/utils"
import { type DocType, useEditorStore } from "@/lib/stores/editor-store"

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "invoice", label: "Invoice" },
  { value: "kwitansi", label: "Kwitansi" },
]

export function DocTypeSelector() {
  const tipe = useEditorStore((s) => s.tipe)
  const setTipe = useEditorStore((s) => s.setTipe)

  return (
    <div className="flex gap-1 rounded-md bg-bg-subtle p-1">
      {DOC_TYPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTipe(value)}
          className={cn(
            "flex-1 rounded-sm px-3 py-1.5 text-[13px] font-medium",
            "min-h-[44px]",
            "transition-[background-color] duration-[20ms] ease-in",
            value === tipe
              ? "bg-brand-subtle text-brand"
              : "text-fg-secondary hover:bg-bg-hover",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
