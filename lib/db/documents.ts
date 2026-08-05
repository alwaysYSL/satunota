// lib/db/documents.ts
// Manajemen operasi dokumen: status jatuh tempo, duplikat, konversi kwitansi, dan soft delete.

import { v7 as uuidv7 } from "uuid"
import { db, type LocalDocument, type LocalDocumentItem } from "./local"
import { ensureGuestBusiness } from "./guest"
import { reserveDocNomor } from "./doc-numbering"
import { createNewDocumentDraft, openDocumentDraft } from "./draft"
import { cancelPendingAutoSave } from "./save-queue"
import { getActiveOwnerId } from "./owner"
import { statusTampil, type DisplayStatus } from "@/lib/status"
import { useEditorStore } from "@/lib/stores/editor-store"

export type { DisplayStatus }

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
  return statusTampil(doc, todayISO())
}

import { ensureCustomerFromDocument } from "./customers"

/**
 * Perbarui status dokumen ke 'terkirim' atau 'lunas' (MASALAH A).
 * - "Tandai lunas" mengisi dibayar = total dan sisa = 0.
 * - Status 'jatuh_tempo' TIDAK boleh pernah ditulis ke kolom status.
 * - Tidak menyentuh nextSeq, docCount, atau activeDraftId.
 * - Transisi draf -> non-draf menjalankan ensureCustomerFromDocument jika customerNama terisi.
 */
export async function updateDocumentStatus(
  documentId: string,
  newStatus: "terkirim" | "lunas",
): Promise<void> {
  let updatedTotal: number | null = null

  await db.transaction("rw", [db.documents, db.customers, db.meta], async () => {
    const doc = await db.documents.get(documentId)
    if (!doc || doc.deletedAt !== null) return
    if (doc.tipe === "kwitansi") return // Kwitansi selalu lunas

    // PERBAIKAN 2: Jika dibayar > 0, status diturunkan dari pembayaran (sebagian/lunas). Tolak memundurkan ke terkirim.
    if (newStatus === "terkirim" && doc.dibayar > 0) return

    const now = new Date().toISOString()
    const updates: Partial<LocalDocument> = {
      status: newStatus,
      updatedAt: now,
    }

    if (doc.customerNama && doc.customerNama.trim() !== "") {
      const custId = await ensureCustomerFromDocument(doc.customerNama, doc.businessId)
      if (custId) {
        updates.customerId = custId
      }
    }

    if (newStatus === "lunas") {
      updates.dibayar = doc.total
      updates.sisa = 0
      updatedTotal = doc.total
    }

    await db.documents.update(documentId, updates)
  })

  // Sinkronkan Zustand store di LUAR transaksi Dexie jika dokumen ini sedang aktif di editor
  const store = useEditorStore.getState()
  if (
    store.documentId === documentId &&
    newStatus === "lunas" &&
    updatedTotal !== null
  ) {
    useEditorStore.setState({ dibayar: updatedTotal })
  }
}

/**
 * Soft delete dokumen dengan mengisi deletedAt.
 * Baris fisik tidak dihapus agar sinkronisasi dan audit tetap utuh.
 *
 * ATURAN (MASALAH 4 & TAMBAHAN 3):
 * 1. Batalkan penyimpanan otomatis yang sedang tertunda.
 * 2. Kurangi docCount di meta.
 * 3. Jika dokumen yang dihapus sedang aktif di store / activeDraftId, pindahkan ke draf lain atau draf baru.
 */
export async function softDeleteDocument(documentId: string): Promise<void> {
  // 1. Batalkan pending save
  cancelPendingAutoSave()

  const now = new Date().toISOString()
  let nextActiveId: string | null = null

  await db.transaction("rw", [db.documents, db.meta], async () => {
    const doc = await db.documents.get(documentId)
    if (!doc || doc.deletedAt !== null) return

    await db.documents.update(documentId, { deletedAt: now })

    // TAMBAHAN 3: Kurangi docCount
    const docCountEntry = await db.meta.get("docCount")
    const currentCount =
      typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
    await db.meta.put({ key: "docCount", value: Math.max(0, currentCount - 1) })

    // MASALAH 4: Pindahkan draf aktif jika dokumen yang dihapus sedang aktif
    const activeDraftEntry = await db.meta.get("activeDraftId")
    const storeDocId = useEditorStore.getState().documentId

    if (activeDraftEntry?.value === documentId || storeDocId === documentId) {
      const ownerId = await getActiveOwnerId()
      const nonDeletedDocs = (await db.documents.where("ownerId").equals(ownerId).toArray())
        .filter((d) => !d.deletedAt && d.id !== documentId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

      if (nonDeletedDocs.length > 0) {
        nextActiveId = nonDeletedDocs[0]!.id
        await db.meta.put({ key: "activeDraftId", value: nextActiveId })
      } else {
        nextActiveId = null
      }
    }
  })

  // Perbarui store jika dokumen aktif dihapus
  const currentStoreDocId = useEditorStore.getState().documentId
  if (currentStoreDocId === documentId) {
    if (nextActiveId) {
      await openDocumentDraft(nextActiveId)
    } else {
      await createNewDocumentDraft()
    }
  }
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
  const ownerId = await getActiveOwnerId()
  const newDocId = uuidv7()
  const now = new Date().toISOString()

  let newNomor = ""

  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.meta],
    async () => {
      newNomor = await reserveDocNomor(businessId, sourceDoc.tipe)

      const docCountEntry = await db.meta.get("docCount")
      const currentCount =
        typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
      await db.meta.put({ key: "docCount", value: currentCount + 1 })

      const newDoc: LocalDocument = {
        ...sourceDoc,
        id: newDocId,
        ownerId,
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
 * - TAMBAHAN 1: Wajib menolak invoice yang belum lunas (status !== 'lunas').
 * - TAMBAHAN 2: diterimaDari = invoice.customerNama || invoice.diterimaDari || "" (tidak ditebak 'Pelanggan').
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
  // TAMBAHAN 1: Wajib menolak invoice yang belum lunas
  if (invoice.status !== "lunas") {
    throw new Error("Hanya invoice berstatus lunas yang dapat dikonversi menjadi kwitansi")
  }

  const invoiceItems = await db.documentItems
    .where("documentId")
    .equals(invoiceId)
    .sortBy("urutan")

  const businessId = await ensureGuestBusiness()
  const ownerId = await getActiveOwnerId()
  const kwitansiId = uuidv7()
  const now = new Date().toISOString()

  let kwitansiNomor = ""

  await db.transaction(
    "rw",
    [db.businesses, db.documents, db.documentItems, db.meta],
    async () => {
      kwitansiNomor = await reserveDocNomor(businessId, "kwitansi")

      const docCountEntry = await db.meta.get("docCount")
      const currentCount =
        typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
      await db.meta.put({ key: "docCount", value: currentCount + 1 })

      const kwitansiDoc: LocalDocument = {
        id: kwitansiId,
        ownerId,
        businessId,
        tipe: "kwitansi",
        nomor: kwitansiNomor,
        tanggal: todayISO(),
        dueDate: null,
        customerId: invoice.customerId,
        customerNama: invoice.customerNama,
        // TAMBAHAN 2: Tidak mengarang 'Pelanggan' jika kosong
        diterimaDari: invoice.customerNama || invoice.diterimaDari || "",
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
