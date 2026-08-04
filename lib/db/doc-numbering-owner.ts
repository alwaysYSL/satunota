// lib/db/doc-numbering-owner.ts
// Pemilik tunggal keputusan nomor dokumen.
// Mengatur alokasi nomor idempoten dan ter-coalesce per (draftId, tipe).

import { db } from "./local"
import { ensureGuestBusiness } from "./guest"
import { reserveDocNomor, type DocType } from "./doc-numbering"

// Map untuk deduplikasi pemanggilan berbarengan (in-flight promise coalescing)
const pendingEnsures = new Map<string, Promise<string>>()

/**
 * Memastikan ada nomor dokumen untuk draf dan jenis tertentu.
 * Hanya fungsi ini yang berhak memutuskan nomor dokumen.
 *
 * URUTAN KEPUTUSAN:
 * 1. Peta persisten meta "draftNomor:<draftId>" punya nomor untuk tipe ini -> pakai itu.
 * 2. Baris dokumen draftId ada di db.documents dan tipe-nya sama -> pakai nomor barisnya, tulis ke peta.
 * 3. Belum ada -> panggil reserveDocNomor SATU KALI, tulis hasilnya ke peta dalam transaksi Dexie yang sama.
 */
export async function ensureNomorForDraft(
  draftId: string,
  tipe: DocType,
): Promise<string> {
  const key = `${draftId}|${tipe}`
  const pending = pendingEnsures.get(key)
  if (pending) {
    return pending
  }

  const promise = (async () => {
    const draftNomorKey = `draftNomor:${draftId}`
    const draftNomorEntry = await db.meta.get(draftNomorKey)

    let draftMap: Partial<Record<DocType, string>> = {}
    if (draftNomorEntry && typeof draftNomorEntry.value === "string") {
      try {
        draftMap = JSON.parse(draftNomorEntry.value)
      } catch {
        draftMap = {}
      }
    }

    // 1a. Peta persisten meta "draftNomor:<draftId>" punya nomor untuk tipe ini -> pakai itu
    if (draftMap[tipe]) {
      return draftMap[tipe]!
    }

    // 1b. Baris dokumen draftId ada di db.documents dan tipe-nya sama -> pakai nomor barisnya, tulis ke peta
    const existingDoc = await db.documents.get(draftId)
    if (existingDoc && existingDoc.tipe === tipe && existingDoc.nomor) {
      draftMap[tipe] = existingDoc.nomor
      await db.meta.put({ key: draftNomorKey, value: JSON.stringify(draftMap) })
      return existingDoc.nomor
    }

    // 1c. Belum ada -> panggil reserveDocNomor SATU KALI di dalam transaksi Dexie yang sama
    const businessId = await ensureGuestBusiness()
    let reservedNomor = ""

    await db.transaction("rw", [db.businesses, db.documents, db.meta], async () => {
      // Re-check di dalam transaksi jika ada penulisan bersamaan sebelum transaksi dibuka
      const freshEntry = await db.meta.get(draftNomorKey)
      let freshMap: Partial<Record<DocType, string>> = {}
      if (freshEntry && typeof freshEntry.value === "string") {
        try {
          freshMap = JSON.parse(freshEntry.value)
        } catch {
          freshMap = {}
        }
      }

      if (freshMap[tipe]) {
        reservedNomor = freshMap[tipe]!
        return
      }

      reservedNomor = await reserveDocNomor(businessId, tipe)
      freshMap[tipe] = reservedNomor
      await db.meta.put({ key: draftNomorKey, value: JSON.stringify(freshMap) })
    })

    return reservedNomor
  })()

  pendingEnsures.set(key, promise)

  try {
    return await promise
  } finally {
    pendingEnsures.delete(key)
  }
}
