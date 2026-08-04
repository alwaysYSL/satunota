// lib/db/auto-save.ts
// Simpan dokumen editor ke Dexie dalam satu transaksi.
// Angka snapshot diambil dari calc() — tidak menghitung ulang di sini.

import { db, type LocalDocument, type LocalDocumentItem } from "./local"
import { ensureGuestBusiness } from "./guest"
import { reserveDocNomor } from "./doc-numbering"
import { calc, type CalcInput } from "@/lib/calc"
import type { EditorState } from "@/lib/stores/editor-store"

export type SaveResult = {
  documentId: string
  nomor: string
  isNewDoc: boolean
  newlyAllocatedTipe: "nota" | "invoice" | "kwitansi" | null
}

/**
 * Predikat saringan item aktif (MASALAH C).
 * Digunakan oleh buildCalcInputFromState dan pemetaan itemSubtotalMap secara bersama.
 * Keduanya WAJIB identik agar pemetaan subtotal tidak bergeser.
 */
export function isActiveItem(item: { nama: string; hargaSatuan: number }): boolean {
  return item.nama.trim() !== "" || item.hargaSatuan > 0
}

/**
 * Bangun CalcInput dari state editor.
 * Dipisah agar tidak ada duplikasi rumus — tetap memakai calc().
 */
function buildCalcInputFromState(s: EditorState): CalcInput {
  return {
    items: s.items
      .filter(isActiveItem)
      .map((it) => ({
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
        diskonBaris: it.diskonBaris,
      })),
    diskonTipe: s.diskonTipe,
    diskonNilai: s.diskonNilai,
    pajakPersen: s.pajakPersen,
    pajakInklusif: s.pajakInklusif,
    ongkir: s.ongkir,
    biayaLain: s.biayaLain,
    pembulatanAktif: s.pembulatanAktif,
    dibayar: s.tipe === "kwitansi" ? 0 : s.dibayar,
  }
}

/**
 * Simpan dokumen dari editor ke Dexie dalam SATU transaksi.
 *
 * ATURAN KERAS:
 * 1. Simpan berhenti total selama state.hydrated === false.
 * 2. Dokumen beserta seluruh barisnya ditulis sebagai satu transaksi.
 *    Baris yang dihapus pengguna dihapus dari database (tidak meninggalkan baris yatim).
 * 3. Nomor HANYA dialokasikan satu kali per jenis dokumen per draf di database.
 * 4. Identitas usaha (nama, alamat, telepon) disimpan ke tabel businesses milik tamu.
 * 5. meta."docCount" diperbarui saat dokumen baru dibuat (bukan setiap penyimpanan).
 * 6. Angka tetap hanya dari calc(). Simpan hasilnya sebagai snapshot.
 * 7. Subtotal item dipetakan berbasis id item, BUKAN indeks.
 * 8. Status dipertahankan dari dokumen yang sudah ada (tidak menimpa status ke 'draf').
 * 9. sourceDocumentId & customerId dipertahankan dari dokumen yang sudah ada.
 * 10. Menolak penulisan dokumen yang deletedAt-nya tidak null.
 */
export async function saveDocument(
  state: EditorState,
): Promise<SaveResult | null> {
  if (!state.hydrated || !state.documentId) {
    return null
  }

  const businessId = await ensureGuestBusiness()
  const docId = state.documentId

  // Hitung angka snapshot lewat calc()
  const calcInput = buildCalcInputFromState(state)
  const result = calc(calcInput)

  const now = new Date().toISOString()
  let finalNomor = state.nomor
  let isNewDoc = false
  let newlyAllocatedTipe: "nota" | "invoice" | "kwitansi" | null = null

  let wasAborted = false

  // Eksekusi penulisan identitas usaha, dokumen, item, dan meta dalam SATU transaksi Dexie
  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.meta],
    async () => {
      const existingDoc = await db.documents.get(docId)

      // MASALAH 4: Menolak menyimpan dokumen yang deletedAt-nya sudah terisi
      if (existingDoc && existingDoc.deletedAt !== null) {
        wasAborted = true
        return
      }

      // 1. Simpan/perbarui identitas usaha di tabel businesses
      const biz = await db.businesses.get(businessId)
      if (biz) {
        await db.businesses.put({
          ...biz,
          nama: state.businessNama || "",
          alamat: state.businessAlamat || null,
          telepon: state.businessTelepon || null,
          updatedAt: now,
        })
      }

      // 2. Tentukan nomor dokumen (ATURAN 1, 2, 5)
      const draftNomorKey = `draftNomor:${docId}`
      const draftNomorEntry = await db.meta.get(draftNomorKey)
      let draftMap: Partial<Record<"nota" | "invoice" | "kwitansi", string>> = {}
      if (draftNomorEntry && typeof draftNomorEntry.value === "string") {
        try {
          draftMap = JSON.parse(draftNomorEntry.value)
        } catch {
          draftMap = {}
        }
      }

      if (!existingDoc) {
        // DOKUMEN BARU PERTAMA KALI DISIMPAN KE DATABASE
        isNewDoc = true

        if (state.nomorManual && state.nomor.trim() !== "") {
          // Nomor diisi manual oleh pengguna — tidak menaikkan nextSeq
          finalNomor = state.nomor
        } else if (draftMap[state.tipe]) {
          // ATURAN 2: Jika jenis ini sudah punya nomor di draftNomorMap, PAKAI nomor itu
          finalNomor = draftMap[state.tipe]!
        } else if (state.allocatedNomor[state.tipe]) {
          finalNomor = state.allocatedNomor[state.tipe]!
          draftMap[state.tipe] = finalNomor
          await db.meta.put({ key: draftNomorKey, value: JSON.stringify(draftMap) })
        } else {
          // Memesan nomor resmi (reserve) TEPAT SATU KALI di dalam transaksi Dexie yang sama
          finalNomor = await reserveDocNomor(businessId, state.tipe)
          newlyAllocatedTipe = state.tipe
          draftMap[state.tipe] = finalNomor
          await db.meta.put({ key: draftNomorKey, value: JSON.stringify(draftMap) })
        }

        // Perbarui meta."docCount" untuk dokumen baru (SCHEMA.md §6.1)
        const docCountEntry = await db.meta.get("docCount")
        const currentCount =
          typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
        await db.meta.put({ key: "docCount", value: currentCount + 1 })
      } else {
        // DOKUMEN SUDAH ADA DI DATABASE
        if (state.nomorManual && state.nomor.trim() !== "") {
          finalNomor = state.nomor
        } else if (existingDoc.tipe === state.tipe && existingDoc.nomor) {
          finalNomor = existingDoc.nomor
          if (!draftMap[state.tipe]) {
            draftMap[state.tipe] = finalNomor
            await db.meta.put({ key: draftNomorKey, value: JSON.stringify(draftMap) })
          }
        } else if (draftMap[state.tipe]) {
          // ATURAN 2: Jika draf ini sudah punya nomor untuk jenis ini di meta, PAKAI nomor itu
          finalNomor = draftMap[state.tipe]!
        } else if (state.allocatedNomor[state.tipe]) {
          finalNomor = state.allocatedNomor[state.tipe]!
          draftMap[state.tipe] = finalNomor
          await db.meta.put({ key: draftNomorKey, value: JSON.stringify(draftMap) })
        } else {
          // Memesan nomor untuk jenis baru pada draf tersimpan
          finalNomor = await reserveDocNomor(businessId, state.tipe)
          newlyAllocatedTipe = state.tipe
          draftMap[state.tipe] = finalNomor
          await db.meta.put({ key: draftNomorKey, value: JSON.stringify(draftMap) })
        }
      }

      // Hitung dibayar dan sisa
      const total = result.total
      const dibayar = state.tipe === "kwitansi" ? total : state.dibayar
      const sisa = state.tipe === "kwitansi" ? 0 : result.sisa

      // MASALAH B: Reset status ke 'draf' jika tipe dokumen berubah (kwitansi tetap 'lunas')
      let finalStatus: LocalDocument["status"] = "draf"
      if (state.tipe === "kwitansi") {
        finalStatus = "lunas"
      } else if (existingDoc && existingDoc.tipe === state.tipe) {
        finalStatus = existingDoc.status
      } else {
        finalStatus = "draf"
      }

      // MASALAH 3: Pertahankan customerId & sourceDocumentId yang sudah ada jika tipe sama
      const finalCustomerId = existingDoc ? existingDoc.customerId : null
      const finalSourceDocumentId =
        existingDoc && existingDoc.tipe === state.tipe
          ? existingDoc.sourceDocumentId
          : null

      const doc: LocalDocument = {
        id: docId,
        businessId,
        tipe: state.tipe,
        nomor: finalNomor,
        tanggal: state.tanggal,
        dueDate: state.dueDate,
        customerId: finalCustomerId,
        customerNama: state.customerNama || null,
        diterimaDari: state.diterimaDari || null,
        status: finalStatus,
        diskonTipe: state.diskonTipe,
        diskonNilai: state.diskonNilai,
        pajakPersen: state.pajakPersen,
        pajakInklusif: state.pajakInklusif,
        ongkir: state.ongkir,
        biayaLain: state.biayaLain,
        pembulatanAktif: state.pembulatanAktif,
        // Snapshot angka dari calc()
        subtotal: result.subtotal,
        diskonNominal: result.diskonNominal,
        pajakNominal: result.pajakNominal,
        pembulatanNominal: result.pembulatanNominal,
        total,
        dibayar,
        sisa,
        catatan: state.catatan || null,
        syarat: state.syarat || null,
        sourceDocumentId: finalSourceDocumentId,
        createdAt: existingDoc ? existingDoc.createdAt : now,
        updatedAt: now,
        deletedAt: null,
      }

      // MASALAH C: Pemetaan subtotal berbasis ID item memakai isActiveItem
      const activeItems = state.items.filter(isActiveItem)
      const itemSubtotalMap = new Map<string, number>()
      activeItems.forEach((item, activeIdx) => {
        itemSubtotalMap.set(item.id, result.itemSubtotals[activeIdx] ?? 0)
      })

      const items: LocalDocumentItem[] = state.items.map((item, idx) => ({
        id: item.id,
        documentId: docId,
        urutan: idx,
        nama: item.nama,
        qty: item.qty > 0 ? item.qty : 1,
        satuan: item.satuan || "pcs",
        hargaSatuan: item.hargaSatuan,
        diskonBaris: item.diskonBaris,
        subtotal: itemSubtotalMap.get(item.id) ?? 0,
      }))

      await db.documents.put(doc)

      // Hapus seluruh item lama milik dokumen ini agar baris terhapus tidak jadi yatim
      await db.documentItems.where("documentId").equals(docId).delete()
      if (items.length > 0) {
        await db.documentItems.bulkPut(items)
      }

      // Simpan draf aktif
      await db.meta.put({ key: "activeDraftId", value: docId })
    },
  )

  if (wasAborted) {
    return null
  }

  return {
    documentId: docId,
    nomor: finalNomor,
    isNewDoc,
    newlyAllocatedTipe,
  }
}
