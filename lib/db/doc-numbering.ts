// lib/db/doc-numbering.ts
// Penomoran dokumen dari meta.nextSeq:<tipe> sesuai SCHEMA.md §9.
// Menggunakan fungsi murni dari lib/numbering.ts untuk generate nomor.

import { db } from "./local"
import { generateNomor } from "@/lib/numbering"

export type DocType = "nota" | "invoice" | "kwitansi"

function seqKey(tipe: DocType): string {
  return `nextSeq:${tipe}`
}

function monthKey(tipe: DocType): string {
  return `lastSeqMonth:${tipe}`
}

function getPolaFromBusiness(
  business: { polaNota: string; polaInvoice: string; polaKwitansi: string },
  tipe: DocType,
): string {
  switch (tipe) {
    case "nota":
      return business.polaNota
    case "invoice":
      return business.polaInvoice
    case "kwitansi":
      return business.polaKwitansi
  }
}

/**
 * 1. Melihat (peek)
 * Mengembalikan nomor berikutnya untuk sebuah jenis TANPA menulis apa pun ke tabel meta.
 * Tidak menaikkan nextSeq, tidak menulis lastSeqMonth.
 * Dipakai untuk menampilkan nomor di editor selama dokumen belum pernah tersimpan.
 */
export async function peekDocNomor(
  businessId: string,
  tipe: DocType,
): Promise<string> {
  const business = await db.businesses.get(businessId)
  if (!business) throw new Error("Business tidak ditemukan")

  const pola = getPolaFromBusiness(business, tipe)
  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1
  const hari = now.getDate()
  const currentMonth = `${tahun}-${String(bulan).padStart(2, "0")}`

  const seqEntry = await db.meta.get(seqKey(tipe))
  const monthEntry = await db.meta.get(monthKey(tipe))

  let nextSeq = typeof seqEntry?.value === "number" ? seqEntry.value : 1
  const lastMonth = typeof monthEntry?.value === "string" ? monthEntry.value : null

  // Tampilkan reset 1 jika bulan berganti dan pola mengandung {MM} (TANPA me-write ke meta)
  if (pola.includes("{MM}") && lastMonth !== null && lastMonth !== currentMonth) {
    nextSeq = 1
  }

  return generateNomor({
    pola,
    nextSeq,
    tahun,
    bulan,
    hari,
  })
}

/**
 * 2. Memesan (reserve)
 * Menaikkan nextSeq:<tipe> dan menulis lastSeqMonth:<tipe>.
 * Dipanggil TEPAT SATU KALI, yaitu di dalam penyimpanan pertama sebuah dokumen baru
 * (saat isNewDoc bernilai true di lib/db/auto-save.ts), di dalam transaksi Dexie
 * yang sama dengan penyimpanan dokumennya. Kalau penyimpanan gagal dan transaksi
 * dibatalkan, nextSeq juga tidak boleh naik.
 */
export async function reserveDocNomor(
  businessId: string,
  tipe: DocType,
): Promise<string> {
  const business = await db.businesses.get(businessId)
  if (!business) throw new Error("Business tidak ditemukan")

  const pola = getPolaFromBusiness(business, tipe)
  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1
  const hari = now.getDate()
  const currentMonth = `${tahun}-${String(bulan).padStart(2, "0")}`

  const seqEntry = await db.meta.get(seqKey(tipe))
  const monthEntry = await db.meta.get(monthKey(tipe))

  let nextSeq = typeof seqEntry?.value === "number" ? seqEntry.value : 1
  const lastMonth = typeof monthEntry?.value === "string" ? monthEntry.value : null

  // Reset jika bulan berganti dan pola mengandung {MM}
  if (pola.includes("{MM}") && lastMonth !== null && lastMonth !== currentMonth) {
    nextSeq = 1
  }

  // Simpan seq yang dinaikkan (+1) dan bulan saat ini ke meta
  await db.meta.bulkPut([
    { key: seqKey(tipe), value: nextSeq + 1 },
    { key: monthKey(tipe), value: currentMonth },
  ])

  return generateNomor({
    pola,
    nextSeq,
    tahun,
    bulan,
    hari,
  })
}

