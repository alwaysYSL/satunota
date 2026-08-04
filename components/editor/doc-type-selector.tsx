"use client"

import { cn } from "@/lib/utils"
import { type DocType, useEditorStore } from "@/lib/stores/editor-store"
import { ensureNomorForDraft } from "@/lib/db/doc-numbering-owner"

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "invoice", label: "Invoice" },
  { value: "kwitansi", label: "Kwitansi" },
]

export function DocTypeSelector() {
  const tipe = useEditorStore((s) => s.tipe)
  const setTipe = useEditorStore((s) => s.setTipe)
  const setNomor = useEditorStore((s) => s.setNomor)

  const handleSelectTipe = async (newTipe: DocType) => {
    setTipe(newTipe)
    const state = useEditorStore.getState()
    if (state.documentId && !state.nomorManual) {
      try {
        const nomor = await ensureNomorForDraft(state.documentId, newTipe)
        setNomor(nomor, false)
      } catch (err) {
        console.error("[DocTypeSelector] Gagal memastikan nomor:", err)
      }
    }
  }

  return (
    <div className="flex gap-1 rounded-md bg-bg-subtle p-1">
      {DOC_TYPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleSelectTipe(value)}
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
