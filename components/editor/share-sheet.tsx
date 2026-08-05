"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  FileDown,
  Image as ImageIcon,
  MessageCircle,
  X,
  Loader2,
  Printer,
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DocumentPreview, type PreviewData } from "@/components/shared/document-preview"
import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"
import { downloadPDF, exportPNG, downloadBlob, shareWhatsApp } from "@/lib/share"
import { usePlan } from "@/lib/hooks/use-plan"
import { can } from "@/lib/entitlements"
import { StrukImage } from "@/components/struk/struk-image"
import type { StrukDocInput, StrukBusinessInput } from "@/lib/struk/lines"
import { buildItemSubtotalMap } from "@/lib/calc-map"
import { db } from "@/lib/db/local"
import { getActiveOwnerId } from "@/lib/db/owner"

import { describeError } from "@/lib/errors"

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
  const router = useRouter()
  const state = useEditorStore()
  const cr = useCalcResult()
  const plan = usePlan()

  const internalPreviewRef = React.useRef<HTMLDivElement>(null)
  const strukRef32 = React.useRef<HTMLDivElement>(null)
  const strukRef48 = React.useRef<HTMLDivElement>(null)

  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [guestDialogOpen, setGuestDialogOpen] = React.useState(false)
  const [freeProDialogOpen, setFreeProDialogOpen] = React.useState(false)

  const subtotalMap = React.useMemo(
    () => buildItemSubtotalMap(state.items, cr.itemSubtotals),
    [state.items, cr.itemSubtotals],
  )

  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [logoLoading, setLogoLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadLogo() {
      try {
        const ownerId = await getActiveOwnerId()
        const biz = await db.businesses.where("userId").equals(ownerId).first()
        if (biz?.logoUrl) {
          setLogoUrl(biz.logoUrl)
        } else {
          setLogoUrl(null)
        }
      } finally {
        setLogoLoading(false)
      }
    }
    loadLogo()
  }, [])

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

  const strukDoc: StrukDocInput = React.useMemo(
    () => ({
      tipe: state.tipe,
      nomor: state.nomor,
      tanggal: state.tanggal,
      dueDate: state.dueDate,
      customerNama: state.customerNama,
      diterimaDari: state.diterimaDari,
      items: state.items
        .filter((it) => it.nama.trim() !== "" || it.hargaSatuan > 0)
        .map((it) => ({
          nama: it.nama,
          qty: it.qty,
          satuan: it.satuan,
          hargaSatuan: it.hargaSatuan,
          diskonBaris: it.diskonBaris,
          subtotal: subtotalMap.get(it.id) ?? 0,
        })),
      diskonTipe: state.diskonTipe,
      diskonNilai: state.diskonNilai,
      pajakPersen: state.pajakPersen,
      pajakInklusif: state.pajakInklusif,
      ongkir: state.ongkir,
      biayaLain: state.biayaLain,
      dibayar: state.dibayar,
      catatan: state.catatan,
    }),
    [state, subtotalMap],
  )

  const strukBusiness: StrukBusinessInput = React.useMemo(
    () => ({
      nama: state.businessNama,
      alamat: state.businessAlamat,
      telepon: state.businessTelepon,
    }),
    [state],
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
      console.error(describeError(e))
      setErrorMsg(`Gagal mengunduh PDF: ${describeError(e)}`)
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
      console.error(describeError(e))
      setErrorMsg(`Gagal menyimpan gambar: ${describeError(e)}`)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDownloadStrukImage = async (width: 32 | 48) => {
    try {
      setLoadingAction(`struk-${width}`)
      setErrorMsg(null)

      const targetRef = width === 32 ? strukRef32 : strukRef48
      if (!targetRef.current) {
        throw new Error("Elemen struk tidak ditemukan")
      }

      const blob = await exportPNG(targetRef.current)
      const prefix = previewData.tipe.toUpperCase()
      const nomorSafe = previewData.nomor
        ? `-${previewData.nomor.replace(/[/\\]/g, "-")}`
        : ""
      const mmStr = width === 32 ? "58mm" : "80mm"
      const filename = `${prefix}${nomorSafe}-struk-${mmStr}.png`

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const file = new File([blob], filename, { type: "image/png" })
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Struk ${prefix} - ${state.businessNama || "SATUNOTA"}`,
              files: [file],
            })
            onOpenChange(false)
            return
          }
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") {
            return
          }
          console.warn("Web Share API gagal, beralih ke unduhan:", describeError(e))
        }
      }

      downloadBlob(blob, filename)
      onOpenChange(false)
    } catch (e) {
      console.error(describeError(e))
      setErrorMsg(`Gagal menyimpan gambar struk: ${describeError(e)}`)
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
        console.warn("Gagal membuat PNG untuk share, lanjut tanpa file:", describeError(e))
      }
      await shareWhatsApp(previewData, blob)
      onOpenChange(false)
    } catch (e) {
      console.error(describeError(e))
      setErrorMsg(`Gagal membagikan ke WhatsApp: ${describeError(e)}`)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleThermalClick = () => {
    if (!can("cetak_thermal", plan)) {
      setGuestDialogOpen(true)
      return
    }
    setFreeProDialogOpen(true)
  }

  return (
    <>
      <DrawerContent className="max-h-[85dvh]">
        {/* Hidden container for rendering DocumentPreview */}
        <div className="absolute left-[-9999px] top-[-9999px] w-[720px] bg-white">
          <div ref={internalPreviewRef}>
            <DocumentPreview data={previewData} />
          </div>
        </div>

        {/* Hidden containers for rendering StrukImage for 58mm (32 chars) and 80mm (48 chars) */}
        <div className="absolute left-[-9999px] top-[-9999px]">
          <StrukImage
            ref={strukRef32}
            doc={strukDoc}
            calcResult={cr}
            business={strukBusiness}
            lebarKarakter={32}
          />
          <StrukImage
            ref={strukRef48}
            doc={strukDoc}
            calcResult={cr}
            business={strukBusiness}
            lebarKarakter={48}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[16px] font-semibold text-fg">Bagikan Dokumen</h2>
          <DrawerClose
            render={
              <button
                type="button"
                className="flex h-[44px] w-[44px] items-center justify-center rounded-sm text-fg-secondary hover:bg-bg-hover"
                aria-label="Tutup menu bagikan"
              >
                <X className="size-5" />
              </button>
            }
          />
        </div>

        {/* Body / Options List */}
        <div className="p-4 flex flex-col gap-2 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-danger-bg text-danger text-[13px] rounded-md mb-2">
              {errorMsg}
            </div>
          )}

          {/* Section: Dokumen PDF & Gambar */}
          <div className="text-[12px] font-medium text-fg-secondary px-1 pt-1">
            DOKUMEN RESMI
          </div>

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
            disabled={loadingAction !== null || logoLoading}
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
            disabled={loadingAction !== null || logoLoading}
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

          {/* Section: Cetak Struk */}
          <div className="text-[12px] font-medium text-fg-secondary px-1 pt-3 border-t border-line mt-1">
            CETAK STRUK THERMAL
          </div>

          {/* Opsi 5a: Unduh Gambar Struk (58mm) */}
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => handleDownloadStrukImage(32)}
            className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="size-5 text-brand" />
              <div>
                <div className="text-[14px] font-medium text-fg">
                  Unduh gambar struk (58mm)
                </div>
                <div className="text-[12px] text-fg-secondary">
                  Gambar struk ringkas untuk printer kasir 58mm
                </div>
              </div>
            </div>
            {loadingAction === "struk-32" && (
              <Loader2 className="size-5 animate-spin text-brand" />
            )}
          </button>

          {/* Opsi 5b: Unduh Gambar Struk (80mm) */}
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => handleDownloadStrukImage(48)}
            className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="size-5 text-brand" />
              <div>
                <div className="text-[14px] font-medium text-fg">
                  Unduh gambar struk (80mm)
                </div>
                <div className="text-[12px] text-fg-secondary">
                  Gambar struk lebar untuk printer kasir 80mm
                </div>
              </div>
            </div>
            {loadingAction === "struk-48" && (
              <Loader2 className="size-5 animate-spin text-brand" />
            )}
          </button>

          {/* Opsi 5c: Printer Thermal (Bluetooth) */}
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleThermalClick}
            className="flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 rounded-md border border-line-strong hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Printer className="size-5 text-brand" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-fg">
                    Printer thermal (Bluetooth)
                  </span>
                  {!can("cetak_thermal", plan) && (
                    <span className="text-[11px] font-medium text-brand bg-brand-subtle px-1.5 py-0.5 rounded-sm">
                      Akun Gratis
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-fg-secondary">
                  Cetak langsung ke printer POS Bluetooth
                </div>
              </div>
            </div>
          </button>
        </div>
      </DrawerContent>

      {/* Dialog Tamu: Cetak thermal memerlukan akun gratis */}
      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cetak thermal memerlukan akun gratis</DialogTitle>
            <DialogDescription>
              Daftar atau masuk ke akun gratis untuk menggunakan fitur cetak thermal Bluetooth.
              Draf nota kamu tersimpan di perangkat ini dan tidak akan hilang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setGuestDialogOpen(false)}
            >
              Nanti saja
            </Button>
            <Button
              onClick={() => {
                setGuestDialogOpen(false)
                onOpenChange(false)
                const currentPath = typeof window !== "undefined" ? window.location.pathname : "/"
                router.push(`/masuk?next=${encodeURIComponent(currentPath)}`)
              }}
            >
              Daftar / Masuk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Free/Pro: Koneksi Bluetooth di pembaruan berikutnya */}
      <Dialog open={freeProDialogOpen} onOpenChange={setFreeProDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Printer Thermal Bluetooth</DialogTitle>
            <DialogDescription>
              Koneksi Bluetooth printer thermal akan tersedia di pembaruan berikutnya.
              Gunakan jalur unduh gambar struk sebagai jalur kerja saat ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFreeProDialogOpen(false)}
            >
              Tutup
            </Button>
            <Button
              onClick={() => {
                setFreeProDialogOpen(false)
                handleDownloadStrukImage(32)
              }}
            >
              Unduh gambar struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

