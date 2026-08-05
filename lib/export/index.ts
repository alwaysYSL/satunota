// lib/export/index.ts
// Pembangun murni & utilitas ekspor CSV & JSON sesuai SCHEMA §11.

import { db, type LocalDocument, type LocalDocumentItem, type LocalPayment, type LocalCustomer, type LocalProduct, type LocalBusiness } from "../db/local"
import { getActiveOwnerId } from "../db/owner"
import { statusTampil } from "../status"

/**
 * Pembangun murni dokumen.csv (SCHEMA §11 amandemen Excel Indonesia).
 * Awalan BOM UTF-8 (\uFEFF), pemisah titik koma (;), kutip ganda ter-escape, angka numerik polos tanpa Rp.
 */
export function toCsvDokumen(docs: LocalDocument[], todayDate?: string): string {
  const today = todayDate || new Date().toISOString().split("T")[0]
  const header = "nomor;tipe;tanggal;jatuh_tempo;pelanggan;status;subtotal;diskon;pajak;ongkir;biaya_lain;total;dibayar;sisa;catatan"

  const escapeCsv = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = docs.map((doc) => {
    const displayStat = statusTampil(doc, today)
    const pelanggan = doc.customerNama || doc.diterimaDari || ""
    const jatuhTempo = doc.dueDate || ""

    return [
      escapeCsv(doc.nomor),
      escapeCsv(doc.tipe),
      escapeCsv(doc.tanggal),
      escapeCsv(jatuhTempo),
      escapeCsv(pelanggan),
      escapeCsv(displayStat),
      doc.subtotal,
      doc.diskonNominal,
      doc.pajakNominal,
      doc.ongkir,
      doc.biayaLain,
      doc.total,
      doc.dibayar,
      doc.sisa,
      escapeCsv(doc.catatan || ""),
    ].join(";")
  })

  return "\uFEFF" + [header, ...rows].join("\r\n")
}

/**
 * Pembangun murni item.csv (SCHEMA §11 amandemen Excel Indonesia).
 */
export function toCsvItem(docs: LocalDocument[], items: LocalDocumentItem[]): string {
  const header = "nomor_dokumen;urutan;nama;qty;satuan;harga_satuan;diskon_baris;subtotal"

  const escapeCsv = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const docMap = new Map<string, string>()
  for (const d of docs) {
    docMap.set(d.id, d.nomor)
  }

  const validItems = items.filter((it) => docMap.has(it.documentId))

  const rows = validItems.map((it) => {
    const nomorDoc = docMap.get(it.documentId) || ""
    return [
      escapeCsv(nomorDoc),
      it.urutan,
      escapeCsv(it.nama),
      it.qty,
      escapeCsv(it.satuan),
      it.hargaSatuan,
      it.diskonBaris,
      it.subtotal,
    ].join(";")
  })

  return "\uFEFF" + [header, ...rows].join("\r\n")
}

/**
 * Format payload cadangan satunota-backup.json (SCHEMA §11).
 */
export type BackupJsonData = {
  version: 1
  exportedAt: string
  business: LocalBusiness | null
  customers: LocalCustomer[]
  products: LocalProduct[]
  documents: Array<LocalDocument & { items: LocalDocumentItem[]; payments: LocalPayment[] }>
}

export function toBackupJson(data: {
  exportedAt?: string
  business: LocalBusiness | null
  customers: LocalCustomer[]
  products: LocalProduct[]
  documents: LocalDocument[]
  items: LocalDocumentItem[]
  payments: LocalPayment[]
}): string {
  const exportedAt = data.exportedAt || new Date().toISOString()

  const itemMap = new Map<string, LocalDocumentItem[]>()
  for (const it of data.items) {
    const list = itemMap.get(it.documentId) || []
    list.push(it)
    itemMap.set(it.documentId, list)
  }

  const payMap = new Map<string, LocalPayment[]>()
  for (const p of data.payments) {
    const list = payMap.get(p.documentId) || []
    list.push(p)
    payMap.set(p.documentId, list)
  }

  const docsWithDetails = data.documents.map((d) => ({
    ...d,
    items: (itemMap.get(d.id) || []).sort((a, b) => a.urutan - b.urutan),
    payments: (payMap.get(d.id) || []).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
  }))

  const payload: BackupJsonData = {
    version: 1,
    exportedAt,
    business: data.business,
    customers: data.customers,
    products: data.products,
    documents: docsWithDetails,
  }

  return JSON.stringify(payload, null, 2)
}

/**
 * Mengambil data lokal milik ownerId aktif saja.
 */
export async function getExportDataForActiveOwner() {
  const ownerId = await getActiveOwnerId()

  const biz = (await db.businesses.where("userId").equals(ownerId).first()) || null

  const customers = (await db.customers.where("ownerId").equals(ownerId).toArray())
    .filter((c) => !c.deletedAt)

  const products = (await db.products.toArray())
    .filter((p) => p.businessId === (biz?.id || ""))

  const documents = (await db.documents.where("ownerId").equals(ownerId).toArray())
    .filter((d) => !d.deletedAt)

  const docIds = new Set(documents.map((d) => d.id))

  const allItems = await db.documentItems.toArray()
  const items = allItems.filter((it) => docIds.has(it.documentId))

  const payments = (await db.payments.where("ownerId").equals(ownerId).toArray())

  return {
    business: biz,
    customers,
    products,
    documents,
    items,
    payments,
  }
}

/**
 * Memicu unduhan file Blob pada browser.
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
