"use client"

import { X } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer"
import { DocumentPreview, type PreviewData } from "@/components/shared/document-preview"
import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"

export function PreviewDrawer() {
  const state = useEditorStore()
  const cr = useCalcResult()

  const previewData: PreviewData = {
    tipe: state.tipe,
    nomor: state.nomor,
    tanggal: state.tanggal,
    dueDate: state.dueDate,
    customerNama: state.customerNama,
    diterimaDari: state.diterimaDari,
    catatan: state.catatan,
    syarat: state.syarat,
    businessNama: state.businessNama,
    businessAlamat: state.businessAlamat,
    businessTelepon: state.businessTelepon,
    items: state.items
      .filter((it) => it.nama.trim() !== "" || it.hargaSatuan > 0)
      .map((it, idx) => ({
        nama: it.nama,
        qty: it.qty,
        satuan: it.satuan,
        hargaSatuan: it.hargaSatuan,
        subtotal: cr.itemSubtotals[idx] ?? 0,
      })),
    calc: cr,
    diskonTipe: state.diskonTipe,
    diskonNilai: state.diskonNilai,
    pajakPersen: state.pajakPersen,
    pajakInklusif: state.pajakInklusif,
    ongkir: state.ongkir,
    biayaLain: state.biayaLain,
  }

  return (
    <Drawer
      open={state.showPreview}
      onOpenChange={(isOpen) => {
        if (!isOpen) state.setShowPreview(false)
      }}
      showSwipeHandle
    >
      <DrawerContent className="max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[16px] font-semibold text-fg">Pratinjau Dokumen</h2>
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

        {/* Preview body */}
        <div className="flex-1 overflow-y-auto p-4 bg-bg-subtle">
          <div className="shadow-md rounded-none overflow-hidden">
            <DocumentPreview data={previewData} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
