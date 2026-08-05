"use client"

import * as React from "react"
import { Share2, X } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer"
import { DocumentPreview, type PreviewData } from "@/components/shared/document-preview"
import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"
import { ShareSheet } from "./share-sheet"
import { buildItemSubtotalMap } from "@/lib/calc-map"
import { db } from "@/lib/db/local"
import { getActiveOwnerId } from "@/lib/db/owner"

export function PreviewDrawer() {
  const showPreview = useEditorStore((s) => s.showPreview)
  const setShowPreview = useEditorStore((s) => s.setShowPreview)

  return (
    <Drawer
      open={showPreview}
      onOpenChange={(isOpen) => {
        if (!isOpen) setShowPreview(false)
      }}
      showSwipeHandle
    >
      {showPreview && <PreviewDrawerContent />}
    </Drawer>
  )
}

function PreviewDrawerContent() {
  const state = useEditorStore()
  const cr = useCalcResult()
  const previewRef = React.useRef<HTMLDivElement>(null)
  const [showShare, setShowShare] = React.useState(false)

  const subtotalMap = React.useMemo(
    () => buildItemSubtotalMap(state.items, cr.itemSubtotals),
    [state.items, cr.itemSubtotals],
  )

  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadLogo() {
      const ownerId = await getActiveOwnerId()
      const biz = await db.businesses.where("userId").equals(ownerId).first()
      if (biz?.logoUrl) {
        setLogoUrl(biz.logoUrl)
      } else {
        setLogoUrl(null)
      }
    }
    loadLogo()
  }, [])

  const previewData: PreviewData = React.useMemo(
    () => ({
      tipe: state.tipe,
      nomor: state.nomor,
      tanggal: state.tanggal,
      dueDate: state.tipe === "invoice" ? (state.dueDate || state.tanggal) : null,
      customerNama: state.customerNama,
      diterimaDari:
        state.tipe === "kwitansi"
          ? state.diterimaDari || state.customerNama || "Pelanggan"
          : "",
      catatan: state.catatan,
      syarat: state.syarat,
      businessNama: state.businessNama,
      businessAlamat: state.businessAlamat,
      businessTelepon: state.businessTelepon,
      logoUrl,
      items: state.items
        .filter((it) => it.nama.trim() !== "" || it.hargaSatuan > 0)
        .map((it) => ({
          nama: it.nama,
          qty: it.qty,
          satuan: it.satuan,
          hargaSatuan: it.hargaSatuan,
          subtotal: subtotalMap.get(it.id) ?? 0,
        })),
      calc: cr,
      diskonTipe: state.diskonTipe,
      diskonNilai: state.diskonNilai,
      pajakPersen: state.pajakPersen,
      pajakInklusif: state.pajakInklusif,
      ongkir: state.ongkir,
      biayaLain: state.biayaLain,
    }),
    [state, cr, subtotalMap, logoUrl],
  )

  return (
    <>
      <DrawerContent className="max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[16px] font-semibold text-fg">Pratinjau Dokumen</h2>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-[44px] px-3 items-center gap-1.5 rounded-sm text-[13px] font-medium text-fg hover:bg-bg-hover"
              onClick={() => setShowShare(true)}
              aria-label="Bagikan dokumen"
            >
              <Share2 className="size-4" />
              Bagikan
            </button>

            <DrawerClose
              render={
                <button
                  type="button"
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-sm text-fg-secondary hover:bg-bg-hover"
                  aria-label="Tutup pratinjau"
                >
                  <X className="size-5" />
                </button>
              }
            />
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-y-auto p-4 bg-bg-subtle">
          <div className="shadow-md rounded-none overflow-hidden" ref={previewRef}>
            <DocumentPreview data={previewData} />
          </div>
        </div>
      </DrawerContent>

      <ShareSheet
        open={showShare}
        onOpenChange={setShowShare}
        previewRef={previewRef}
      />
    </>
  )
}
