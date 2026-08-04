// lib/db/documents.ts
// Manajemen operasi dokumen: status jatuh tempo, duplikat, konversi kwitansi, dan soft delete.

import { v7 as uuidv7 } from "uuid"
import { db, type LocalDocument, type LocalDocumentItem } from "./local"
import { ensureGuestBusiness } from "./guest"
import { generateDocNomor } from "./doc-numbering"

export type DisplayStatus =
  | "draf"
  | "terkirim"
  | "sebagian"
  | "lunas"
  | "jatuh_tempo"

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Hitung status tampil secara dinamis.
 * Status 'jatuh_tempo' HANYA dihitung saat tampil dari status 'terkirim'
 * dan dueDate < hari ini. Jangan pernah menyimpannya ke kolom status database!
 */
export function calculateDisplayStatus(doc: LocalDocument): DisplayStatus {
  if (doc.status === "terkirim" && doc.dueDate) {
    if (doc.dueDate < todayISO()) {
      return "jatuh_tempo"
    }
  }
  return doc.status
}

/**
 * Soft delete dokumen dengan mengisi deletedAt.
 * Baris fisik tidak dihapus agar sinkronisasi dan audit tetap utuh.
 * Jika dokumen yang dihapus sedang aktif (activeDraftId), activeDraftId dipindahkan
 * ke dokumen lain yang deletedAt-nya kosong (atau draf baru ID baru).
 */
export async function softDeleteDocument(documentId: string): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction("rw", [db.documents, db.meta], async () => {
    await db.documents.update(documentId, { deletedAt: now })

    const activeDraftEntry = await db.meta.get("activeDraftId")
    if (activeDraftEntry?.value === documentId) {
      const nonDeletedDocs = (await db.documents.toArray())
        .filter((d) => !d.deletedAt && d.id !== documentId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

      const nextActiveId = nonDeletedDocs[0]?.id || uuidv7()
      await db.meta.put({ key: "activeDraftId", value: nextActiveId })
    }
  })
}

/**
 * Duplikat dokumen menjadi dokumen baru dengan nomor baru dari jalur alokasi resmi.
 *
 * ATURAN KERAS:
 * - Menggunakan generateDocNomor (menaikkan nextSeq:<tipe> tepat 1 kali).
 * - Menjaga draf aktif di editor (tidak menimpa meta."activeDraftId").
 */
export async function duplicateDocument(
  sourceDocId: string,
): Promise<LocalDocument> {
  const sourceDoc = await db.documents.get(sourceDocId)
  if (!sourceDoc) {
    throw new Error("Dokumen asal tidak ditemukan")
  }

  const sourceItems = await db.documentItems
    .where("documentId")
    .equals(sourceDocId)
    .sortBy("urutan")

  const businessId = await ensureGuestBusiness()
  const newDocId = uuidv7()
  const now = new Date().toISOString()

  let newNomor = ""

  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.meta],
    async () => {
      newNomor = await generateDocNomor(businessId, sourceDoc.tipe)

      const docCountEntry = await db.meta.get("docCount")
      const currentCount =
        typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
      await db.meta.put({ key: "docCount", value: currentCount + 1 })

      const newDoc: LocalDocument = {
        ...sourceDoc,
        id: newDocId,
        businessId,
        nomor: newNomor,
        tanggal: todayISO(),
        status: sourceDoc.tipe === "kwitansi" ? "lunas" : "draf",
        dibayar: sourceDoc.tipe === "kwitansi" ? sourceDoc.total : 0,
        sisa: sourceDoc.tipe === "kwitansi" ? 0 : sourceDoc.total,
        sourceDocumentId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      const newItems: LocalDocumentItem[] = sourceItems.map((item, idx) => ({
        ...item,
        id: uuidv7(),
        documentId: newDocId,
        urutan: idx,
      }))

      await db.documents.put(newDoc)
      if (newItems.length > 0) {
        await db.documentItems.bulkAdd(newItems)
      }
    },
  )

  const createdDoc = await db.documents.get(newDocId)
  return createdDoc!
}

/**
 * Konversi invoice lunas menjadi kwitansi tertaut lewat sourceDocumentId.
 *
 * ATURAN KERAS:
 * - tipe = 'kwitansi'
 * - nomor baru dialokasikan via generateDocNomor (nextSeq:kwitansi)
 * - sourceDocumentId = invoice.id
 * - dibayar = total, sisa = 0, status = 'lunas'
 * - Menjaga draf aktif di editor (tidak menimpa meta."activeDraftId").
 */
export async function convertInvoiceToKwitansi(
  invoiceId: string,
): Promise<LocalDocument> {
  const invoice = await db.documents.get(invoiceId)
  if (!invoice) {
    throw new Error("Invoice tidak ditemukan")
  }
  if (invoice.tipe !== "invoice") {
    throw new Error("Hanya invoice yang dapat dikonversi menjadi kwitansi")
  }

  const invoiceItems = await db.documentItems
    .where("documentId")
    .equals(invoiceId)
    .sortBy("urutan")

  const businessId = await ensureGuestBusiness()
  const kwitansiId = uuidv7()
  const now = new Date().toISOString()

  let kwitansiNomor = ""

  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.meta],
    async () => {
      kwitansiNomor = await generateDocNomor(businessId, "kwitansi")

      const docCountEntry = await db.meta.get("docCount")
      const currentCount =
        typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
      await db.meta.put({ key: "docCount", value: currentCount + 1 })

      const kwitansiDoc: LocalDocument = {
        id: kwitansiId,
        businessId,
        tipe: "kwitansi",
        nomor: kwitansiNomor,
        tanggal: todayISO(),
        dueDate: null,
        customerId: invoice.customerId,
        customerNama: invoice.customerNama,
        diterimaDari:
          invoice.customerNama || invoice.diterimaDari || "Pelanggan",
        status: "lunas",
        diskonTipe: invoice.diskonTipe,
        diskonNilai: invoice.diskonNilai,
        pajakPersen: invoice.pajakPersen,
        pajakInklusif: invoice.pajakInklusif,
        ongkir: invoice.ongkir,
        biayaLain: invoice.biayaLain,
        pembulatanAktif: invoice.pembulatanAktif,
        // Snapshot angka
        subtotal: invoice.subtotal,
        diskonNominal: invoice.diskonNominal,
        pajakNominal: invoice.pajakNominal,
        pembulatanNominal: invoice.pembulatanNominal,
        total: invoice.total,
        dibayar: invoice.total,
        sisa: 0,
        catatan: invoice.catatan,
        syarat: null,
        sourceDocumentId: invoiceId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      const kwitansiItems: LocalDocumentItem[] = invoiceItems.map(
        (item, idx) => ({
          ...item,
          id: uuidv7(),
          documentId: kwitansiId,
          urutan: idx,
        }),
      )

      await db.documents.put(kwitansiDoc)
      if (kwitansiItems.length > 0) {
        await db.documentItems.bulkAdd(kwitansiItems)
      }
    },
  )

  const createdDoc = await db.documents.get(kwitansiId)
  return createdDoc!
}
