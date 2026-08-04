"use client"

import { cn } from "@/lib/utils"
import { type DocType, useEditorStore } from "@/lib/stores/editor-store"
import { db } from "@/lib/db/local"
import { ensureGuestBusiness } from "@/lib/db/guest"
import { peekDocNomor } from "@/lib/db/doc-numbering"

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "invoice", label: "Invoice" },
  { value: "kwitansi", label: "Kwitansi" },
]

export function DocTypeSelector() {
  const tipe = useEditorStore((s) => s.tipe)
  const setTipe = useEditorStore((s) => s.setTipe)
  const documentId = useEditorStore((s) => s.documentId)

  const handleSelectTipe = async (newTipe: DocType) => {
    setTipe(newTipe)
    const state = useEditorStore.getState()
    if (!state.nomorManual && !state.allocatedNomor[newTipe]) {
      if (documentId) {
        const existing = await db.documents.get(documentId)
        if (existing && existing.tipe === newTipe && existing.nomor) {
          useEditorStore.setState({ nomor: existing.nomor })
          return
        }
      }
      try {
        const businessId = await ensureGuestBusiness()
        const peeked = await peekDocNomor(businessId, newTipe)
        useEditorStore.setState({ nomor: peeked })
      } catch (err) {
        console.error("[DocTypeSelector] Gagal mengintip nomor:", err)
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
