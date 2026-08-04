"use client"

import Link from "next/link"
import { History } from "lucide-react"
import { NotionInput, NotionCurrencyInput } from "@/components/editor/notion-input"
import { DocTypeSelector } from "@/components/editor/doc-type-selector"
import { ItemList } from "@/components/editor/item-list"
import { ChipBar } from "@/components/editor/chip-bar"
import { CalcSummary } from "@/components/editor/calc-summary"
import { ActionBar } from "@/components/editor/action-bar"
import { PreviewDrawer } from "@/components/editor/preview-drawer"
import { useEditorStore } from "@/lib/stores/editor-store"
import { useAutoSave } from "@/lib/hooks/use-auto-save"

import { createNewDocumentDraft } from "@/lib/db/draft"
import { Plus } from "lucide-react"

export default function EditorPage() {
  // ─── Auto-save ke IndexedDB dengan debounce 500ms ─────
  useAutoSave()

  const businessNama = useEditorStore((s) => s.businessNama)
  const businessAlamat = useEditorStore((s) => s.businessAlamat)
  const businessTelepon = useEditorStore((s) => s.businessTelepon)
  const tipe = useEditorStore((s) => s.tipe)
  const tanggal = useEditorStore((s) => s.tanggal)
  const nomor = useEditorStore((s) => s.nomor)
  const customerNama = useEditorStore((s) => s.customerNama)
  const diterimaDari = useEditorStore((s) => s.diterimaDari)
  const dibayar = useEditorStore((s) => s.dibayar)
  const setField = useEditorStore((s) => s.setField)
  const setNomor = useEditorStore((s) => s.setNomor)

  const handleCreateNew = async () => {
    await createNewDocumentDraft()
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[720px] pb-24 px-4">
        {/* ─── Top Bar Navigasi ────────────────────────── */}
        <div className="flex items-center justify-between py-2 border-b border-line">
          <span className="text-[13px] font-bold text-fg tracking-wide">
            SATUNOTA
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] text-fg-secondary hover:text-fg hover:bg-bg-hover rounded-sm transition-[background-color] min-h-[44px]"
            >
              <Plus className="size-4" />
              <span>Buat Baru</span>
            </button>
            <Link
              href="/dokumen/riwayat"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-fg-secondary hover:text-fg hover:bg-bg-hover rounded-sm transition-[background-color] min-h-[44px]"
            >
              <History className="size-4" />
              <span>Riwayat</span>
            </Link>
          </div>
        </div>

        {/* ─── Identitas Usaha (DESIGN §7.1) ──────────── */}
        <section className="py-4 border-b border-line flex flex-col gap-2">
          <div>
            <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
              Nama Usaha
            </label>
            <NotionInput
              value={businessNama}
              onChange={(v) => setField("businessNama", v)}
              placeholder="Nama Usaha (mis. Toko Berkah)"
              className="text-[18px] font-bold text-fg"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
                Alamat
              </label>
              <NotionInput
                value={businessAlamat}
                onChange={(v) => setField("businessAlamat", v)}
                placeholder="Alamat usaha"
                className="text-[13px] text-fg"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
                Telepon / WA
              </label>
              <NotionInput
                value={businessTelepon}
                onChange={(v) => setField("businessTelepon", v)}
                placeholder="0812xxxxxxx"
                className="text-[13px] text-fg"
              />
            </div>
          </div>
        </section>

        {/* ─── Header Dokumen & Pemilih Jenis ──────────── */}
        <section className="py-4">
          <DocTypeSelector />
        </section>

        {/* ─── Info Dokumen ───────────────────────────── */}
        <section className="flex flex-col gap-3 pb-4">
          {/* Nomor dokumen */}
          <div>
            <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
              Nomor
            </label>
            <NotionInput
              value={nomor}
              onChange={(v) => setNomor(v, true)}
              placeholder="Otomatis"
              className="text-fg"
            />
          </div>

          {/* Tanggal */}
          <div>
            <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setField("tanggal", e.target.value)}
              className="w-full bg-transparent px-2 py-1.5 text-[16px] text-fg border border-transparent rounded-sm hover:bg-bg-hover focus:border-brand focus:outline-none transition-[background-color] duration-[20ms] ease-in min-h-[44px]"
            />
          </div>

          {/* Pelanggan */}
          <div>
            <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
              Pelanggan
            </label>
            <NotionInput
              value={customerNama}
              onChange={(v) => setField("customerNama", v)}
              placeholder="Nama pelanggan"
              className="text-fg"
            />
          </div>

          {/* Diterima dari — hanya kwitansi */}
          {tipe === "kwitansi" && (
            <div>
              <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
                Telah diterima dari
              </label>
              <NotionInput
                value={diterimaDari}
                onChange={(v) => setField("diterimaDari", v)}
                placeholder="Nama pembayar"
                className="text-fg"
              />
            </div>
          )}
        </section>

        {/* ─── Daftar Item ────────────────────────────── */}
        <section className="border-t border-line pt-2 pb-4">
          <ItemList />
        </section>

        {/* ─── Chip Progressive Disclosure ─────────────── */}
        <section className="pb-4">
          <ChipBar />
        </section>

        {/* ─── Rincian Hitung ─────────────────────────── */}
        <section className="border-t border-line">
          <CalcSummary />
        </section>

        {/* ─── Pembayaran (bukan kwitansi) ────────────── */}
        {tipe !== "kwitansi" && (
          <section className="border-t border-line py-3 px-1">
            <label className="text-[13px] font-medium text-fg-secondary mb-0.5 block">
              Jumlah dibayar
            </label>
            <NotionCurrencyInput
              value={dibayar}
              onChange={(val) => setField("dibayar", val)}
              placeholder="Rp 0"
            />
          </section>
        )}
      </main>

      {/* ─── Action Bar ─────────────────────────────── */}
      <ActionBar />

      {/* ─── Preview Drawer ─────────────────────────── */}
      <PreviewDrawer />
    </>
  )
}
