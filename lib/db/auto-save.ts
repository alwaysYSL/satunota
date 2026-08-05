// lib/db/auto-save.ts
// Simpan dokumen editor ke Dexie dalam satu transaksi.
// Angka snapshot diambil dari calc() — tidak menghitung ulang di sini.

import { db, type LocalDocument, type LocalDocumentItem } from "./local"
import { ensureGuestBusiness } from "./guest"
import { ensureNomorForDraft } from "./doc-numbering-owner"
import { getActiveOwnerId } from "./owner"
import { ensureCustomerFromDocument } from "./customers"
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
 * PERUBAHAN PEMILIK TUNGGAL NOMOR:
 * saveDocument tidak lagi pernah memutuskan nomor (semua cabang penentuan nomor dihapus).
 * Ia memakai state.nomor apa adanya bila state.nomorManual true, dan sebaliknya
 * memanggil ensureNomorForDraft(docId, state.tipe) SEBELUM transaksi dibuka.
 */
export async function saveDocument(
  state: EditorState,
): Promise<SaveResult | null> {
  if (!state.hydrated || !state.documentId) {
    return null
  }

  const businessId = await ensureGuestBusiness()
  const ownerId = await getActiveOwnerId()
  const docId = state.documentId

  // Dapatkan nomor dari pemilik keputusan nomor tunggal sebelum transaksi
  let finalNomor: string
  if (state.nomorManual && state.nomor.trim() !== "") {
    finalNomor = state.nomor
  } else {
    finalNomor = await ensureNomorForDraft(docId, state.tipe)
  }

  // Tautkan / buat pelanggan otomatis bila customerNama diisi
  let resolvedCustomerId: string | null = state.customerId
  if (state.customerNama && state.customerNama.trim() !== "") {
    resolvedCustomerId = await ensureCustomerFromDocument(
      state.customerNama,
      businessId,
    )
  }

  // Hitung angka snapshot lewat calc()
  const calcInput = buildCalcInputFromState(state)
  const result = calc(calcInput)

  const now = new Date().toISOString()
  let isNewDoc = false
  let wasAborted = false

  // Eksekusi penulisan identitas usaha, dokumen, item, dan meta dalam SATU transaksi Dexie
  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.customers, db.meta],
    async () => {
      const existingDoc = await db.documents.get(docId)

      // Menolak menyimpan dokumen yang deletedAt-nya sudah terisi
      if (existingDoc && existingDoc.deletedAt !== null) {
        wasAborted = true
        return
      }

      if (!existingDoc) {
        isNewDoc = true
        // Perbarui meta."docCount" untuk dokumen baru (SCHEMA.md §6.1)
        const docCountEntry = await db.meta.get("docCount")
        const currentCount =
          typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
        await db.meta.put({ key: "docCount", value: currentCount + 1 })
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

      // Hitung dibayar dan sisa
      const total = result.total
      const dibayar = state.tipe === "kwitansi" ? total : state.dibayar
      const sisa = state.tipe === "kwitansi" ? 0 : result.sisa

      // Reset status ke 'draf' jika tipe dokumen berubah (kwitansi tetap 'lunas')
      let finalStatus: LocalDocument["status"] = "draf"
      if (state.tipe === "kwitansi") {
        finalStatus = "lunas"
      } else if (existingDoc && existingDoc.tipe === state.tipe) {
        finalStatus = existingDoc.status
      } else {
        finalStatus = "draf"
      }

      const finalSourceDocumentId =
        existingDoc && existingDoc.tipe === state.tipe
          ? existingDoc.sourceDocumentId
          : null

      const doc: LocalDocument = {
        id: docId,
        ownerId,
        businessId,
        tipe: state.tipe,
        nomor: finalNomor,
        tanggal: state.tanggal,
        dueDate: state.dueDate,
        customerId: resolvedCustomerId,
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

      // Pemetaan subtotal berbasis ID item memakai isActiveItem
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
    newlyAllocatedTipe: null,
  }
}
