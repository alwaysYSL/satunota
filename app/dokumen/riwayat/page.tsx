"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Search,
  Plus,
  MoreVertical,
  Copy,
  ArrowRightLeft,
  Trash2,
  ChevronLeft,
  FileText,
  Edit3,
  X,
} from "lucide-react"
import { db, type LocalDocument } from "@/lib/db/local"
import {
  calculateDisplayStatus,
  softDeleteDocument,
  duplicateDocument,
  convertInvoiceToKwitansi,
  type DisplayStatus,
} from "@/lib/db/documents"
import { createNewDocumentDraft, openDocumentDraft } from "@/lib/db/draft"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"

type TypeFilter = "semua" | "nota" | "invoice" | "kwitansi"
type StatusFilter = "semua" | DisplayStatus

export default function HistoryPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("semua")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua")
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Subscription Dexie live query
  const documents = useLiveQuery(async () => {
    const all = await db.documents.toArray()
    return all.filter((d) => !d.deletedAt)
  }, [])

  // Close dropdown menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Filter dokumen
  const filteredDocs = (documents ?? [])
    .filter((doc) => {
      if (typeFilter !== "semua" && doc.tipe !== typeFilter) return false

      const displayStatus = calculateDisplayStatus(doc)
      if (statusFilter !== "semua" && displayStatus !== statusFilter) return false

      if (search.trim() !== "") {
        const q = search.toLowerCase()
        const matchNomor = doc.nomor.toLowerCase().includes(q)
        const matchCustomer = doc.customerNama?.toLowerCase().includes(q) ?? false
        const matchDiterima = doc.diterimaDari?.toLowerCase().includes(q) ?? false
        const matchCatatan = doc.catatan?.toLowerCase().includes(q) ?? false
        if (!matchNomor && !matchCustomer && !matchDiterima && !matchCatatan) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal)
      return b.createdAt.localeCompare(a.createdAt)
    })

  // Kelompokkan dokumen berdasarkan Bulan (misal: "Agustus 2026")
  const groupedDocs = filteredDocs.reduce<Record<string, LocalDocument[]>>(
    (acc, doc) => {
      const [year, month] = doc.tanggal.split("-")
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ]
      const key = `${monthNames[parseInt(month, 10) - 1]} ${year}`
      if (!acc[key]) acc[key] = []
      acc[key].push(doc)
      return acc
    },
    {}
  )

  async function handleCreateNew() {
    await createNewDocumentDraft()
    router.push("/")
  }

  async function handleOpenDoc(docId: string) {
    await openDocumentDraft(docId)
    router.push("/")
  }

  async function handleDuplicate(doc: LocalDocument) {
    setActiveMenuId(null)
    try {
      const newDoc = await duplicateDocument(doc.id)
      showToast(`Dokumen diduplikasi (${newDoc.nomor})`)
    } catch {
      showToast("Gagal menduplikasi dokumen")
    }
  }

  async function handleConvert(doc: LocalDocument) {
    setActiveMenuId(null)
    try {
      const kwitansi = await convertInvoiceToKwitansi(doc.id)
      showToast(`Kwitansi berhasil dibuat (${kwitansi.nomor})`)
    } catch {
      showToast("Gagal mengonversi ke kwitansi")
    }
  }

  async function handleDelete(docId: string) {
    setActiveMenuId(null)
    try {
      await softDeleteDocument(docId)
      showToast("Dokumen berhasil dihapus")
    } catch {
      showToast("Gagal menghapus dokumen")
    }
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-4 text-[#37352F]">
      {/* Toast Notifikasi (Notion Toast Style) */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#37352F] text-white text-[13px] px-4 py-2 rounded-md shadow-md animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Utama */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center justify-center h-10 w-10 rounded-md hover:bg-bg-hover text-fg-secondary transition-colors"
            aria-label="Kembali ke editor"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-fg tracking-tight">
              Riwayat Dokumen
            </h1>
            {documents && (
              <span className="text-[13px] text-fg-tertiary font-medium">
                ({filteredDocs.length})
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-[13px] font-medium rounded-md hover:bg-brand-hover transition-colors min-h-[44px]"
        >
          <Plus className="size-4" />
          <span>Buat Baru</span>
        </button>
      </div>

      {/* Baris Pencarian & Filter (DESIGN §7) */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor, pelanggan, atau catatan..."
            className="w-full bg-bg-subtle pl-9 pr-9 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none min-h-[44px] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg p-1"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Pills (Jenis & Status) */}
        <div className="flex flex-col gap-2">
          {/* Tipe Dokumen */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[12px] font-medium text-fg-tertiary shrink-0 w-12">
              Jenis:
            </span>
            {(["semua", "nota", "invoice", "kwitansi"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-3 py-1 text-[13px] font-medium rounded-md border transition-colors capitalize shrink-0 min-h-[36px]",
                  typeFilter === t
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-bg-subtle text-fg-secondary border-transparent hover:bg-bg-hover hover:text-fg",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status Dokumen */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[12px] font-medium text-fg-tertiary shrink-0 w-12">
              Status:
            </span>
            {(
              [
                "semua",
                "draf",
                "terkirim",
                "sebagian",
                "lunas",
                "jatuh_tempo",
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1 text-[13px] font-medium rounded-md border transition-colors capitalize shrink-0 min-h-[36px]",
                  statusFilter === st
                    ? "bg-[#37352F] text-white border-[#37352F]"
                    : "bg-bg-subtle text-fg-secondary border-transparent hover:bg-bg-hover hover:text-fg",
                )}
              >
                {st === "jatuh_tempo" ? "Jatuh Tempo" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Konten Daftar Dokumen */}
      {documents === undefined ? (
        <div className="py-16 text-center text-fg-tertiary text-[14px]">
          Memuat riwayat dokumen...
        </div>
      ) : filteredDocs.length === 0 ? (
        /* Keadaan Kosong (DESIGN §4.8) */
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-lg bg-bg-subtle/40 px-4">
          <FileText className="size-8 text-fg-tertiary mb-2" />
          <p className="text-[14px] text-fg-secondary font-medium mb-1">
            Belum ada dokumen yang sesuai.
          </p>
          <p className="text-[13px] text-fg-tertiary mb-5 max-w-[320px]">
            {search || typeFilter !== "semua" || statusFilter !== "semua"
              ? "Coba sesuaikan kata kunci atau filter yang Anda pilih."
              : "Buat nota, invoice, atau kwitansi pertamamu sekarang."}
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2 bg-[#37352F] text-white text-[13px] font-medium rounded-md hover:bg-[#2F2D28] min-h-[44px] flex items-center gap-1.5 transition-colors"
          >
            <Plus className="size-4" />
            <span>Buat Dokumen Baru</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6" ref={menuRef}>
          {Object.entries(groupedDocs).map(([groupTitle, docs]) => (
            <div key={groupTitle} className="flex flex-col gap-2">
              {/* Header Kelompok Bulan */}
              <div className="flex items-center gap-2 pb-1 border-b border-line">
                <span className="text-[12px] font-bold text-fg-tertiary uppercase tracking-wider">
                  {groupTitle}
                </span>
                <span className="text-[11px] text-fg-tertiary font-normal">
                  • {docs.length} dokumen
                </span>
              </div>

              {/* Daftar Kartu Dokumen dalam Kelompok */}
              <div className="flex flex-col gap-2">
                {docs.map((doc) => {
                  const displayStatus = calculateDisplayStatus(doc)

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenDoc(doc.id)}
                      className={cn(
                        "group relative flex items-center justify-between p-3.5 bg-bg border border-line rounded-md hover:bg-bg-hover hover:border-line-strong transition-all cursor-pointer",
                      )}
                    >
                      {/* Informasi Kiri */}
                      <div className="flex flex-col gap-1 min-w-0 pr-3">
                        {/* Judul & Status Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-fg truncate">
                            {doc.customerNama || doc.diterimaDari || "Tanpa nama"}
                          </span>
                          <StatusBadge status={displayStatus} />
                        </div>

                        {/* Nomor & Tanggal & Jenis */}
                        <div className="flex items-center gap-2 text-[12px] text-fg-secondary">
                          <span className="font-mono text-fg font-medium">
                            {doc.nomor}
                          </span>
                          <span className="text-fg-tertiary">•</span>
                          <span>{formatTanggal(doc.tanggal)}</span>
                          <span className="text-fg-tertiary">•</span>
                          <span className="uppercase text-[11px] font-semibold text-fg-tertiary tracking-wide">
                            {doc.tipe}
                          </span>
                        </div>
                      </div>

                      {/* Informasi Kanan & Menu */}
                      <div
                        className="flex items-center gap-3 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Total Nominal Snapshot */}
                        <div className="text-right">
                          <div className="text-[15px] font-bold tnum text-fg">
                            {formatRupiah(doc.total)}
                          </div>
                          {doc.tipe !== "kwitansi" && doc.sisa > 0 && (
                            <div className="text-[11px] tnum text-[#CB912F] font-medium">
                              Sisa {formatRupiah(doc.sisa)}
                            </div>
                          )}
                        </div>

                        {/* Menu Aksi */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(
                                activeMenuId === doc.id ? null : doc.id,
                              )
                            }
                            className="flex h-[40px] w-[40px] items-center justify-center rounded-md text-fg-secondary hover:bg-bg-subtle hover:text-fg transition-colors"
                            aria-label="Menu aksi"
                          >
                            <MoreVertical className="size-4" />
                          </button>

                          {/* Popover Dropdown (DESIGN §4.6) */}
                          {activeMenuId === doc.id && (
                            <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-bg border border-line rounded-md shadow-md py-1 animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null)
                                  handleOpenDoc(doc.id)
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-fg hover:bg-bg-hover transition-colors"
                              >
                                <Edit3 className="size-4 text-fg-secondary" />
                                <span>Buka / Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicate(doc)}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-fg hover:bg-bg-hover transition-colors"
                              >
                                <Copy className="size-4 text-fg-secondary" />
                                <span>Duplikat</span>
                              </button>

                              {/* Konversi ke Kwitansi (hanya invoice lunas) */}
                              {doc.tipe === "invoice" && doc.status === "lunas" && (
                                <button
                                  type="button"
                                  onClick={() => handleConvert(doc)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-fg hover:bg-bg-hover transition-colors"
                                >
                                  <ArrowRightLeft className="size-4 text-fg-secondary" />
                                  <span>Konversi ke Kwitansi</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-line" />

                              <button
                                type="button"
                                onClick={() => handleDelete(doc.id)}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-danger hover:bg-danger-bg transition-colors"
                              >
                                <Trash2 className="size-4" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Status Badge mengikuti panduan warna Notion DESIGN.md §4.5
 */
function StatusBadge({ status }: { status: DisplayStatus }) {
  const styles: Record<DisplayStatus, { text: string; bg: string; label: string }> = {
    draf: { text: "#787774", bg: "#E3E2E0", label: "Draf" },
    terkirim: { text: "#337EA9", bg: "#D3E5EF", label: "Terkirim" },
    sebagian: { text: "#CB912F", bg: "#FDECC8", label: "Sebagian" },
    lunas: { text: "#448361", bg: "#DBEDDB", label: "Lunas" },
    jatuh_tempo: { text: "#D44C47", bg: "#FFE2DD", label: "Jatuh Tempo" },
  }

  const s = styles[status]

  return (
    <span
      style={{ color: s.text, backgroundColor: s.bg }}
      className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium leading-none select-none"
    >
      {s.label}
    </span>
  )
}
