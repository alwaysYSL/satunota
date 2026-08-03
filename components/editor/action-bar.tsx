"use client"

import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalcResult, useEditorStore } from "@/lib/stores/editor-store"
import { formatRupiah } from "@/lib/format"

export function ActionBar() {
  const cr = useCalcResult()
  const setShowPreview = useEditorStore((s) => s.setShowPreview)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t border-line bg-bg px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Kiri: Total */}
      <div className="flex flex-col">
        <span className="text-[12px] text-fg-secondary leading-tight">
          Total
        </span>
        <span className="text-[24px] font-bold text-fg tnum leading-tight">
          {formatRupiah(cr.total)}
        </span>
      </div>

      {/* Kanan: Tombol Primary */}
      <Button
        variant="default"
        size="lg"
        className="min-h-[44px] rounded-md bg-brand text-white hover:bg-brand-hover"
        onClick={() => setShowPreview(true)}
      >
        <Eye className="size-4" data-icon="inline-start" />
        Pratinjau
      </Button>
    </div>
  )
}
