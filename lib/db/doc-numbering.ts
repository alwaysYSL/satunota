// lib/db/doc-numbering.ts
// Penomoran dokumen dari meta.nextSeq:<tipe> sesuai SCHEMA.md §9.
// Menggunakan fungsi murni dari lib/numbering.ts untuk generate nomor.

import { db } from "./local"
import { generateNomor } from "@/lib/numbering"

type DocType = "nota" | "invoice" | "kwitansi"

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
 * Generate nomor dokumen baru berdasarkan pola dan nextSeq dari meta.
 * Reset otomatis saat bulan berganti jika pola mengandung {MM}.
 *
 * ATURAN:
 * - Sumber urutan: meta."nextSeq:<tipe>", bukan hitungan baris database
 * - Reset: otomatis kembali ke 1 saat bulan berganti, bila pola mengandung {MM}
 * - Nomor yang diubah manual tidak menaikkan nextSeq
 */
export async function generateDocNomor(
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

  let nextSeq: number

  await db.transaction("rw", db.meta, async () => {
    const seqEntry = await db.meta.get(seqKey(tipe))
    const monthEntry = await db.meta.get(monthKey(tipe))

    nextSeq = typeof seqEntry?.value === "number" ? seqEntry.value : 1
    const lastMonth = typeof monthEntry?.value === "string" ? monthEntry.value : null

    // Reset jika bulan berganti dan pola mengandung {MM}
    if (pola.includes("{MM}") && lastMonth !== null && lastMonth !== currentMonth) {
      nextSeq = 1
    }

    // Simpan seq yang dinaikkan dan bulan saat ini
    await db.meta.bulkPut([
      { key: seqKey(tipe), value: nextSeq! + 1 },
      { key: monthKey(tipe), value: currentMonth },
    ])
  })

  const nomor = generateNomor({
    pola,
    nextSeq: nextSeq!,
    tahun,
    bulan,
    hari,
  })

  return nomor
}
