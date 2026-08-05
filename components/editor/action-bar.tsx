"use client"

import * as React from "react"
import { Eye, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalcResult, useEditorStore } from "@/lib/stores/editor-store"
import { formatRupiah } from "@/lib/format"
import { ShareSheet } from "./share-sheet"

import { saveDocument } from "@/lib/db/auto-save"

export function ActionBar() {
  const cr = useCalcResult()
  const setShowPreview = useEditorStore((s) => s.setShowPreview)
  const validateDocument = useEditorStore((s) => s.validateDocument)
  const [showShare, setShowShare] = React.useState(false)

  const handlePreview = async () => {
    if (validateDocument()) {
      await saveDocument(useEditorStore.getState(), true)
      setShowPreview(true)
    }
  }

  const handleShare = async () => {
    if (validateDocument()) {
      await saveDocument(useEditorStore.getState(), true)
      setShowShare(true)
    }
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-line bg-bg px-4"
        style={{
          height: "calc(4rem + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Kiri: Total */}
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] text-fg-secondary leading-tight">
            Total
          </span>
          <span className="text-[20px] sm:text-[24px] font-bold text-fg tnum leading-tight truncate">
            {formatRupiah(cr.total)}
          </span>
        </div>

        {/* Kanan: Tombol Aksi */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Secondary: Bagikan */}
          <Button
            variant="outline"
            size="default"
            aria-label="Bagikan"
            className="min-h-[44px] rounded-md border-line-strong text-fg hover:bg-bg-hover"
            onClick={handleShare}
          >
            <Share2 className="size-4" data-icon="inline-start" />
            <span className="hidden sm:inline">Bagikan</span>
          </Button>

          {/* Primary: Pratinjau */}
          <Button
            variant="default"
            size="default"
            aria-label="Pratinjau"
            className="min-h-[44px] rounded-md bg-brand text-white hover:bg-brand-hover"
            onClick={handlePreview}
          >
            <Eye className="size-4" data-icon="inline-start" />
            <span className="hidden sm:inline">Pratinjau</span>
          </Button>
        </div>
      </div>

      <ShareSheet open={showShare} onOpenChange={setShowShare} />
    </>
  )
}
