# SATUNOTA — Aturan untuk AI Coding Agent

## Konteks wajib dibaca
Sebelum menulis kode apa pun, baca:
- docs/SRS.md      — kebutuhan produk, sumber kebenaran tunggal
- docs/SCHEMA.md   — skema data, DDL, rumus perhitungan
- docs/ROADMAP.md  — fase pengerjaan tujuh hari
- docs/PRICING.md  — pembagian fitur paket gratis dan Pro
- docs/DESIGN.md   — aturan desain dan warna, sumber kebenaran visual

## Stack (tidak boleh diganti)
Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui,
React Hook Form + Zod, Zustand, Dexie, Supabase, @react-pdf/renderer, Vitest.

## Aturan keras
1. Uang selalu integer rupiah. Dilarang float untuk uang.
2. Semua perhitungan hanya lewat calc() di lib/calc.ts.
   Dilarang menghitung ulang di komponen, PDF, atau printer.
3. Nama tabel dan kolom persis seperti SCHEMA.md. Dilarang mengarang atau menyingkat.
4. Berkas terkunci — hanya diubah bila saya minta eksplisit:
   lib/calc.ts, lib/schema/*, lib/db/local.ts
5. Fitur di luar SRS bagian 4.1 dan 4.2 tidak boleh dikerjakan.
   Bagian 4.3 adalah daftar terlarang.
6. Mobile-first. Target sentuh minimal 44x44px.
7. Bahasa Indonesia untuk seluruh teks antarmuka.
8. Desain wajib mengikuti docs/DESIGN.md (gaya Notion, tanpa gradien, tanpa ungu).
   Jika ada pertentangan antara dokumen lain dan DESIGN.md, DESIGN.md menang.

## Cara kerja
- Satu sesi = satu hari di ROADMAP.md = satu cabang git.
- Jangan mengerjakan hari berikutnya sebelum saya bilang gerbangnya hijau.
- Kalau ada yang ambigu, tanya dulu. Jangan menebak.
- Kalau saya minta sesuatu yang bertentangan dengan dokumen, tunjukkan
  bagian mana yang bertentangan sebelum mengerjakannya.
- shadcn/ui memakai Base UI, BUKAN Radix UI.
- Dilarang menulis komponen shadcn dari nol atau dari ingatan.
  Pasang lewat: pnpm dlx shadcn@latest add <nama>
  Kalau perlu memodifikasi, baca dulu file yang sudah ada di
  components/ui/ dan ikuti pola impornya persis.