// app/tentang/page.tsx
// Halaman Tentang SATUNOTA dan Penafian Pajak (SRS §4.5 & TUGAS 5).

"use client"

import Link from "next/link"
import { ChevronLeft, FileText, AlertTriangle, ShieldCheck, Cpu } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-4 text-fg">
      {/* Header Utama */}
      <div className="flex items-center gap-2 mb-6 border-b border-line pb-3">
        <Link
          href="/pengaturan"
          className="flex items-center justify-center h-11 w-11 rounded-md hover:bg-bg-hover text-fg-secondary transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Kembali ke Pengaturan"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-fg tracking-tight">
            Tentang SATUNOTA
          </h1>
          <p className="text-[12px] text-fg-secondary">
            Aplikasi Pembuat Nota, Invoice, & Kwitansi Komersial
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Penafian Resmi (SRS 4.5) */}
        <section className="bg-warning-bg border border-warning/30 rounded-md p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-warning font-bold text-[14px]">
            <AlertTriangle className="size-5" />
            <span>Penafian Pajak Resmi</span>
          </div>
          <p className="text-[13px] text-fg leading-relaxed font-medium">
            SATUNOTA menghasilkan nota komersial, bukan Faktur Pajak resmi. Faktur Pajak PKP wajib dibuat lewat e-Faktur/Coretax DJP.
          </p>
          <p className="text-[12px] text-fg-secondary leading-relaxed">
            Dokumen yang diterbitkan melalui aplikasi ini ditujukan sebagai bukti transaksi komersial antar pihak, pencatatan internal usaha, dan tanda terima pembayaran.
          </p>
        </section>

        {/* Identitas & Fitur Utama */}
        <section className="bg-bg border border-line rounded-md p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-brand/10 text-brand rounded-md flex items-center justify-center font-bold">
              <FileText className="size-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-fg">SATUNOTA v1.0</h2>
              <p className="text-[12px] text-fg-secondary">Pembuat Nota Cepat & Ringan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-bg-subtle rounded-md border border-line flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-[13px] text-fg">
                <ShieldCheck className="size-4 text-success" />
                <span>Offline-First</span>
              </div>
              <p className="text-[12px] text-fg-secondary">
                Seluruh data tersimpan aman di peramban Anda. Aplikasi dapat digunakan tanpa koneksi internet.
              </p>
            </div>

            <div className="p-3 bg-bg-subtle rounded-md border border-line flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-[13px] text-fg">
                <Cpu className="size-4 text-brand" />
                <span>Format Standar</span>
              </div>
              <p className="text-[12px] text-fg-secondary">
                Dukungan cetak thermal 58mm, ekspor PDF/PNG, serta cadangan data format CSV dan JSON.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
