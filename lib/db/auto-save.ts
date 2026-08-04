// lib/db/auto-save.ts
// Simpan dokumen editor ke Dexie dalam satu transaksi.
// Angka snapshot diambil dari calc() — tidak menghitung ulang di sini.

import { db, type LocalDocument, type LocalDocumentItem } from "./local"
import { ensureGuestBusiness } from "./guest"
import { generateDocNomor } from "./doc-numbering"
import { calc, type CalcInput } from "@/lib/calc"
import type { EditorState } from "@/lib/stores/editor-store"

export type SaveResult = {
  documentId: string
  nomor: string
  isNewDoc: boolean
  newlyAllocatedTipe: "nota" | "invoice" | "kwitansi" | null
}

/**
 * Bangun CalcInput dari state editor.
 * Dipisah agar tidak ada duplikasi rumus — tetap memakai calc().
 */
function buildCalcInputFromState(s: EditorState): CalcInput {
  return {
    items: s.items
      .filter((it) => it.nama.trim() !== "" || it.hargaSatuan > 0)
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
 *    Penyimpanan berikutnya untuk draf/jenis yang sama TIDAK MENYENTUH nextSeq sama sekali.
 * 4. Identitas usaha (nama, alamat, telepon) disimpan ke tabel businesses milik tamu.
 * 5. meta."docCount" diperbarui saat dokumen baru dibuat (bukan setiap penyimpanan).
 * 6. Angka tetap hanya dari calc(). Simpan hasilnya sebagai snapshot.
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

  // Eksekusi penulisan identitas usaha, dokumen, item, dan meta dalam SATU transaksi Dexie
  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.meta],
    async () => {
      // 1. Simpan/perbarui identitas usaha di tabel businesses (MASALAH 3)
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

      // 2. Tentukan nomor dokumen (MASALAH 1)
      const existingDoc = await db.documents.get(docId)

      if (!existingDoc) {
        // DOKUMEN BARU PERTAMA KALI DISIMPAN KE DATABASE
        isNewDoc = true

        if (state.nomorManual && state.nomor.trim() !== "") {
          finalNomor = state.nomor
        } else if (state.allocatedNomor[state.tipe]) {
          finalNomor = state.allocatedNomor[state.tipe]!
        } else {
          finalNomor = await generateDocNomor(businessId, state.tipe)
          newlyAllocatedTipe = state.tipe
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
        } else if (state.allocatedNomor[state.tipe]) {
          // Re-use nomor yang sudah pernah dialokasikan untuk jenis dokumen ini pada draf aktif
          finalNomor = state.allocatedNomor[state.tipe]!
        } else if (existingDoc.tipe === state.tipe && existingDoc.nomor) {
          finalNomor = existingDoc.nomor
        } else {
          // Tipe dokumen diubah ke jenis baru yang belum punya alokasi nomor untuk draf ini
          finalNomor = await generateDocNomor(businessId, state.tipe)
          newlyAllocatedTipe = state.tipe
        }
      }

      // Hitung dibayar dan sisa
      const total = result.total
      const dibayar = state.tipe === "kwitansi" ? total : state.dibayar
      const sisa = state.tipe === "kwitansi" ? 0 : result.sisa

      const doc: LocalDocument = {
        id: docId,
        businessId,
        tipe: state.tipe,
        nomor: finalNomor,
        tanggal: state.tanggal,
        dueDate: state.dueDate,
        customerId: null,
        customerNama: state.customerNama || null,
        diterimaDari: state.diterimaDari || null,
        status: state.tipe === "kwitansi" ? "lunas" : "draf",
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
        sourceDocumentId: null,
        createdAt: existingDoc ? existingDoc.createdAt : now,
        updatedAt: now,
        deletedAt: null,
      }

      // Simpan SELURUH baris item pengguna yang ada di store
      const items: LocalDocumentItem[] = state.items.map((item, idx) => ({
        id: item.id,
        documentId: docId,
        urutan: idx,
        nama: item.nama,
        qty: item.qty > 0 ? item.qty : 1,
        satuan: item.satuan || "pcs",
        hargaSatuan: item.hargaSatuan,
        diskonBaris: item.diskonBaris,
        subtotal: result.itemSubtotals[idx] ?? 0,
      }))

      await db.documents.put(doc)

      // Hapus seluruh item lama milik dokumen ini agar baris terhapus tidak jadi yatim
      await db.documentItems.where("documentId").equals(docId).delete()
      if (items.length > 0) {
        await db.documentItems.bulkAdd(items)
      }

      // Simpan draf aktif
      await db.meta.put({ key: "activeDraftId", value: docId })
    },
  )

  return {
    documentId: docId,
    nomor: finalNomor,
    isNewDoc,
    newlyAllocatedTipe,
  }
}

