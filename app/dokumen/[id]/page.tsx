// app/dokumen/[id]/page.tsx
// Halaman detail dokumen tersimpan: Rincian dokumen, daftar pembayaran, & form "Catat Pembayaran".

"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ChevronLeft,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  User,
  AlertCircle,
  FileText,
  DollarSign,
} from "lucide-react"
import { db } from "@/lib/db/local"
import { getActiveOwnerId } from "@/lib/db/owner"
import { getPayments, addPayment, deletePayment, type PaymentMethod } from "@/lib/db/payments"
import { calculateDisplayStatus } from "@/lib/db/documents"
import { statusTampil } from "@/lib/status"
import { openDocumentDraft } from "@/lib/db/draft"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: docId } = use(params)
  const router = useRouter()

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // State Form Pembayaran
  const todayDate = new Date().toISOString().split("T")[0]
  const [tanggal, setTanggal] = useState(todayDate)
  const [metode, setMetode] = useState<PaymentMethod>("tunai")
  const [jumlah, setJumlah] = useState<number | "">("")
  const [catatan, setCatatan] = useState("")

  // Dexie live query dokumen, item, dan pembayaran
  const doc = useLiveQuery(async () => {
    const ownerId = await getActiveOwnerId()
    const d = await db.documents.get(docId)
    if (!d || d.deletedAt || d.ownerId !== ownerId) return null
    return d
  }, [docId])

  const items = useLiveQuery(async () => {
    if (!docId) return []
    return db.documentItems.where("documentId").equals(docId).sortBy("urutan")
  }, [docId])

  const payments = useLiveQuery(async () => {
    if (!docId) return []
    return getPayments(docId)
  }, [docId])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  async function handleOpenInEditor() {
    if (!doc) return
    await openDocumentDraft(doc.id)
    router.push("/")
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const numericJumlah = typeof jumlah === "number" ? jumlah : parseInt(String(jumlah), 10)
    if (isNaN(numericJumlah) || numericJumlah <= 0) {
      setFormError("Jumlah pembayaran harus lebih besar dari Rp 0")
      return
    }

    try {
      await addPayment(docId, {
        tanggal,
        metode,
        jumlah: numericJumlah,
        catatan: catatan.trim() || null,
      })
      setJumlah("")
      setCatatan("")
      showToast("Pembayaran berhasil dicatat")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDeletePayment(payId: string) {
    if (!confirm("Hapus catatan pembayaran ini?")) return
    try {
      await deletePayment(payId)
      showToast("Pembayaran berhasil dihapus")
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err))
    }
  }

  if (doc === null) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-16 text-center text-fg-tertiary text-[14px]">
        Dokumen tidak ditemukan atau telah dihapus.
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-16 text-center text-fg-tertiary text-[14px]">
        Memuat dokumen...
      </div>
    )
  }

  const displayStatus = statusTampil(doc, todayDate)

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-4 text-fg">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg text-[13px] px-4 py-2 rounded-md shadow-md flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Utama */}
      <div className="flex items-center justify-between mb-5 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dokumen/riwayat"
            className="flex items-center justify-center h-11 w-11 rounded-md hover:bg-bg-hover text-fg-secondary transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Kembali ke riwayat"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] sm:text-[22px] font-bold text-fg tracking-tight">
                {doc.nomor}
              </h1>
              <StatusBadge status={displayStatus} />
            </div>
            <p className="text-[12px] text-fg-secondary capitalize">
              {doc.tipe} • {formatTanggal(doc.tanggal)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenInEditor}
          className="flex items-center gap-1.5 px-3 py-2 bg-fg text-bg text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity min-h-[44px]"
        >
          <Edit3 className="size-4" />
          <span>Edit Dokumen</span>
        </button>
      </div>

      {/* Detail Ringkasan Dokumen */}
      <section className="bg-bg border border-line rounded-md p-4 mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="text-[13px] text-fg-secondary font-medium">Pelanggan</span>
          <span className="text-[14px] font-bold text-fg">
            {doc.customerNama || doc.diterimaDari || "Tanpa nama"}
          </span>
        </div>

        {/* Ringkasan Angka */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 bg-bg-subtle rounded-md">
          <div className="p-2">
            <div className="text-[11px] text-fg-tertiary font-medium">Total</div>
            <div className="text-[14px] font-bold text-fg tnum">
              {formatRupiah(doc.total)}
            </div>
          </div>
          <div className="p-2 border-x border-line">
            <div className="text-[11px] text-fg-tertiary font-medium">Dibayar</div>
            <div className="text-[14px] font-bold text-success tnum">
              {formatRupiah(doc.dibayar)}
            </div>
          </div>
          <div className="p-2">
            <div className="text-[11px] text-fg-tertiary font-medium">Sisa</div>
            <div className="text-[14px] font-bold text-warning tnum">
              {formatRupiah(doc.sisa)}
            </div>
          </div>
        </div>
      </section>

      {/* Seksi Catat Pembayaran & Daftar Pembayaran (Hanya jika bukan Kwitansi) */}
      {doc.tipe !== "kwitansi" && (
        <section className="flex flex-col gap-6">
          {/* Form Catat Pembayaran */}
          <div className="bg-bg border border-line rounded-md p-4">
            <h2 className="text-[15px] font-bold text-fg mb-3 flex items-center gap-2">
              <CreditCard className="size-4 text-brand" />
              <span>Catat Pembayaran</span>
            </h2>

            {formError && (
              <div className="p-3 mb-3 bg-danger-bg text-danger text-[13px] rounded-md border border-danger/30 font-medium">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleAddPayment} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                    Metode Pembayaran
                  </label>
                  <select
                    value={metode}
                    onChange={(e) => setMetode(e.target.value as PaymentMethod)}
                    className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px] capitalize"
                  >
                    <option value="tunai">Tunai</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="qris">QRIS</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                  Jumlah Dibayar (Rp) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={jumlah}
                  onChange={(e) =>
                    setJumlah(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                  }
                  placeholder="cth. 50000"
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="cth. Pelunasan / DP Pertama"
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                className="mt-1 w-full bg-brand text-white text-[13px] font-medium py-2.5 rounded-md hover:bg-brand-hover transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <Plus className="size-4" />
                <span>Simpan Pembayaran</span>
              </button>
            </form>
          </div>

          {/* Riwayat Pembayaran */}
          <div>
            <h3 className="text-[14px] font-bold text-fg mb-3 flex items-center gap-2">
              <span>Riwayat Pembayaran</span>
              <span className="text-[12px] font-normal text-fg-tertiary">
                ({payments ? payments.length : 0})
              </span>
            </h3>

            {!payments || payments.length === 0 ? (
              <div className="p-6 text-center text-fg-tertiary text-[13px] border border-dashed border-line rounded-md bg-bg-subtle/30">
                Belum ada pembayaran yang dicatat untuk dokumen ini.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-bg border border-line rounded-md"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-success tnum">
                          {formatRupiah(p.jumlah)}
                        </span>
                        <span className="text-[11px] font-semibold uppercase px-1.5 py-0.5 bg-bg-hover text-fg-secondary rounded">
                          {p.metode}
                        </span>
                      </div>
                      <span className="text-[12px] text-fg-tertiary">
                        {formatTanggal(p.tanggal)}
                        {p.catatan ? ` • ${p.catatan}` : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-2 text-danger hover:bg-danger-bg rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Hapus pembayaran"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { className: string; label: string }> = {
    draf: { className: "bg-neutral-bg text-neutral", label: "Draf" },
    terkirim: { className: "bg-info-bg text-info", label: "Terkirim" },
    sebagian: { className: "bg-warning-bg text-warning", label: "Sebagian" },
    lunas: { className: "bg-success-bg text-success", label: "Lunas" },
    jatuh_tempo: { className: "bg-danger-bg text-danger", label: "Jatuh Tempo" },
  }

  const s = styles[status] || styles.draf

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium leading-none select-none",
        s.className,
      )}
    >
      {s.label}
    </span>
  )
}
