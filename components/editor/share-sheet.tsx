"use client"

import * as React from "react"
import {
  FileDown,
  Image as ImageIcon,
  MessageCircle,
  X,
  Loader2,
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer"
import { DocumentPreview, type PreviewData } from "@/components/shared/document-preview"
import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"
import { downloadPDF, exportPNG, downloadBlob, shareWhatsApp } from "@/lib/share"

type ShareSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  previewRef?: React.RefObject<HTMLDivElement | null>
}

export function ShareSheet({ open, onOpenChange, previewRef }: ShareSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      {open && (
        <ShareSheetContent onOpenChange={onOpenChange} previewRef={previewRef} />
      )}
    </Drawer>
  )
}

function ShareSheetContent({
  onOpenChange,
  previewRef,
}: {
  onOpenChange: (open: boolean) => void
  previewRef?: React.RefObject<HTMLDivElement | null>
}) {
  const state = useEditorStore()
  const cr = useCalcResult()
  const internalPreviewRef = React.useRef<HTMLDivElement>(null)

  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const previewData: PreviewData = React.useMemo(
    () => ({
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
    }),
    [state, cr],
  )

  const getPngBlob = async (): Promise<Blob> => {
    const targetEl = previewRef?.current || internalPreviewRef.current
    if (!targetEl) {
      throw new Error("Elemen pratinjau tidak ditemukan")
    }
    return await exportPNG(targetEl)
  }

  const handleDownloadPdf = async (size: "A4" | "A5") => {
    try {
      setLoadingAction(`pdf-${size}`)
      setErrorMsg(null)
      await downloadPDF(previewData, size)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      setErrorMsg("Gagal mengunduh PDF. Silakan coba lagi.")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDownloadPng = async () => {
    try {
      setLoadingAction("png")
      setErrorMsg(null)
      const blob = await getPngBlob()
      const prefix = previewData.tipe.toUpperCase()
      const nomorSafe = previewData.nomor
        ? `-${previewData.nomor.replace(/[/\\]/g, "-")}`
        : ""
      downloadBlob(blob, `${prefix}${nomorSafe}.png`)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      setErrorMsg("Gagal menyimpan gambar. Silakan coba lagi.")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleShareWa = async () => {
    try {
      setLoadingAction("wa")
      setErrorMsg(null)
      let blob: Blob | null = null
      try {
        blob = await getPngBlob()
      } catch (e) {
        console.warn("Gagal membuat PNG untuk share, lanjut tanpa file:", e)
      }
      await shareWhatsApp(previewData, blob)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      setErrorMsg("Gagal membagikan ke WhatsApp.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <DrawerContent className="max-h-[85dvh]">
      {/* Hidden container for rendering DocumentPreview if previewRef is not available */}
      {!previewRef?.current && (
        <div className="absolute left-[-9999px] top-[-9999px] w-[720px] bg-white">
          <div ref={internalPreviewRef}>
            <DocumentPreview data={previewData} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[16px] font-semibold text-fg">Bagikan Dokumen</h2>
        <DrawerClose
          render={
            <button
              type="button"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-sm text-fg-secondary hover:bg-bg-hover"
              aria-label="Tutup sheet bagikan"
            >
              <X className="size-5" />
            </button>
          }
        />
      </div>

      {/* Body / Options List */}
      <div className="p-4 flex flex-col gap-2">
        {errorMsg && (
          <div className="p-3 bg-danger-bg text-danger text-[13px] rounded-md mb-2">
            {errorMsg}
          </div>
        )}

        {/* Opsi 1: PDF A4 */}
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={() => handleDownloadPdf("A4")}
          className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <FileDown className="size-5 text-brand" />
            <div>
              <div className="text-[14px] font-medium text-fg">
                Unduh PDF (Ukuran A4)
              </div>
              <div className="text-[12px] text-fg-secondary">
                Format standar untuk cetak dan dokumen resmi
              </div>
            </div>
          </div>
          {loadingAction === "pdf-A4" && (
            <Loader2 className="size-5 animate-spin text-brand" />
          )}
        </button>

        {/* Opsi 2: PDF A5 */}
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={() => handleDownloadPdf("A5")}
          className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <FileDown className="size-5 text-brand" />
            <div>
              <div className="text-[14px] font-medium text-fg">
                Unduh PDF (Ukuran A5)
              </div>
              <div className="text-[12px] text-fg-secondary">
                Format setengah kertas, hemat lembaran
              </div>
            </div>
          </div>
          {loadingAction === "pdf-A5" && (
            <Loader2 className="size-5 animate-spin text-brand" />
          )}
        </button>

        {/* Opsi 3: Simpan Gambar PNG */}
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleDownloadPng}
          className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <ImageIcon className="size-5 text-success" />
            <div>
              <div className="text-[14px] font-medium text-fg">
                Simpan Gambar (PNG)
              </div>
              <div className="text-[12px] text-fg-secondary">
                Format gambar jernih untuk dikirim di aplikasi chat
              </div>
            </div>
          </div>
          {loadingAction === "png" && (
            <Loader2 className="size-5 animate-spin text-success" />
          )}
        </button>

        {/* Opsi 4: Kirim ke WhatsApp */}
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleShareWa}
          className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="size-5 text-success" />
            <div>
              <div className="text-[14px] font-medium text-fg">
                Kirim ke WhatsApp
              </div>
              <div className="text-[12px] text-fg-secondary">
                Bagikan dokumen langsung ke kontak WhatsApp
              </div>
            </div>
          </div>
          {loadingAction === "wa" && (
            <Loader2 className="size-5 animate-spin text-success" />
          )}
        </button>
      </div>
    </DrawerContent>
  )
}
