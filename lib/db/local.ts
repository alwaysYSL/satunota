// lib/db/local.ts
// Skema IndexedDB via Dexie — persis SCHEMA.md bagian 6.
// File terkunci: hanya diubah bila diminta eksplisit.

import Dexie, { type Table } from "dexie"

// ─── Tipe lokal ─────────────────────────────────────────

export type LocalBusiness = {
  id: string
  userId: string | null
  nama: string
  logoUrl: string | null
  alamat: string | null
  telepon: string | null
  email: string | null
  npwp: string | null
  polaNota: string
  polaInvoice: string
  polaKwitansi: string
  defaultPajak: number
  defaultCatatan: string | null
  qrisUrl: string | null
  rekening: string | null
  ttdUrl: string | null
  plan: "guest" | "free" | "pro"
  createdAt: string
  updatedAt: string
}

export type LocalCustomer = {
  id: string
  ownerId: string
  businessId: string
  nama: string
  telepon: string | null
  alamat: string | null
  email: string | null
  catatan: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type LocalProduct = {
  id: string
  businessId: string
  nama: string
  satuan: string
  harga: number
  kategori: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type LocalDocument = {
  id: string
  ownerId: string
  businessId: string
  tipe: "nota" | "invoice" | "kwitansi"
  nomor: string
  tanggal: string
  dueDate: string | null
  customerId: string | null
  customerNama: string | null
  diterimaDari: string | null
  status: "draf" | "terkirim" | "sebagian" | "lunas" | "jatuh_tempo"
  diskonTipe: "nominal" | "persen"
  diskonNilai: number
  pajakPersen: number
  pajakInklusif: boolean
  ongkir: number
  biayaLain: number
  pembulatanAktif: boolean
  subtotal: number
  diskonNominal: number
  pajakNominal: number
  pembulatanNominal: number
  total: number
  dibayar: number
  sisa: number
  catatan: string | null
  syarat: string | null
  sourceDocumentId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type LocalDocumentItem = {
  id: string
  documentId: string
  urutan: number
  nama: string
  qty: number
  satuan: string
  hargaSatuan: number
  diskonBaris: number
  subtotal: number
}

export type LocalPayment = {
  id: string
  ownerId: string
  documentId: string
  tanggal: string
  metode: "tunai" | "transfer" | "qris" | "ewallet" | "lainnya"
  jumlah: number
  catatan: string | null
  createdAt: string
}

export type OutboxEntry = {
  id: string
  entity: "business" | "customer" | "product" | "document" | "payment"
  entityId: string
  op: "upsert" | "delete"
  payload: unknown
  updatedAt: string
  createdAt: string
  attempts: number
  lastError?: string
}

export type MetaEntry = {
  key: string
  value: string | number
}

// ─── Database ───────────────────────────────────────────

export const db = new Dexie("satunota") as Dexie & {
  businesses: Table<LocalBusiness, string>
  customers: Table<LocalCustomer, string>
  products: Table<LocalProduct, string>
  documents: Table<LocalDocument, string>
  documentItems: Table<LocalDocumentItem, string>
  payments: Table<LocalPayment, string>
  outbox: Table<OutboxEntry, string>
  meta: Table<MetaEntry, string>
}

db.version(1).stores({
  businesses:    "id, userId, updatedAt",
  customers:     "id, businessId, nama, updatedAt, deletedAt",
  products:      "id, businessId, nama, updatedAt, deletedAt",
  documents:     "id, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
  documentItems: "id, documentId, urutan",
  payments:      "id, documentId, tanggal",
  outbox:        "id, entity, entityId, createdAt, attempts",
  meta:          "key",
})

// v2: tambah ownerId pada customers, documents, payments. Indeks ownerId disertakan.
// JANGAN mengubah db.version(1) di atas.
db.version(2).stores({
  businesses:    "id, userId, updatedAt",
  customers:     "id, ownerId, businessId, nama, updatedAt, deletedAt",
  products:      "id, businessId, nama, updatedAt, deletedAt",
  documents:     "id, ownerId, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
  documentItems: "id, documentId, urutan",
  payments:      "id, ownerId, documentId, tanggal",
  outbox:        "id, entity, entityId, createdAt, attempts",
  meta:          "key",
}).upgrade(async (tx) => {
  // 1. Upgrade businesses
  await tx.table("businesses").toCollection().modify((biz: Record<string, unknown>) => {
    if (biz.userId === undefined) {
      biz.userId = null
    }
    if (biz.plan === undefined) {
      biz.plan = "guest"
    }
  })

  // 2. Tentukan ownerId aktif dengan fallback bertingkat:
  // meta.lastUserId -> guestId -> business.userId -> business.id -> "guest"
  const lastUserEntry = await tx.table("meta").get("lastUserId")
  let fallbackOwnerId: string | null = null

  if (
    lastUserEntry &&
    typeof lastUserEntry.value === "string" &&
    lastUserEntry.value !== "guest"
  ) {
    fallbackOwnerId = lastUserEntry.value
  } else {
    const guestEntry = await tx.table("meta").get("guestId")
    if (guestEntry && typeof guestEntry.value === "string") {
      fallbackOwnerId = guestEntry.value
    } else {
      const firstBiz = await tx.table("businesses").toCollection().first()
      if (firstBiz && typeof firstBiz.userId === "string" && firstBiz.userId) {
        fallbackOwnerId = firstBiz.userId
      } else if (firstBiz && typeof firstBiz.id === "string") {
        fallbackOwnerId = firstBiz.id
      } else {
        fallbackOwnerId = "guest"
      }
    }
  }

  // 3. Backfill ownerId pada documents, customers, payments
  await tx.table("documents").toCollection().modify((doc: Record<string, unknown>) => {
    if (!doc.ownerId || typeof doc.ownerId !== "string" || doc.ownerId.trim() === "") {
      doc.ownerId = fallbackOwnerId
    }
  })

  await tx.table("customers").toCollection().modify((cust: Record<string, unknown>) => {
    if (!cust.ownerId || typeof cust.ownerId !== "string" || cust.ownerId.trim() === "") {
      cust.ownerId = fallbackOwnerId
    }
  })

  await tx.table("payments").toCollection().modify((pay: Record<string, unknown>) => {
    if (!pay.ownerId || typeof pay.ownerId !== "string" || pay.ownerId.trim() === "") {
      pay.ownerId = fallbackOwnerId
    }
  })
})

// v3: Backfill userId guestId (T2 & T4)
db.version(3).stores({
  businesses:    "id, userId, updatedAt",
  customers:     "id, ownerId, businessId, nama, updatedAt, deletedAt",
  products:      "id, businessId, nama, updatedAt, deletedAt",
  documents:     "id, ownerId, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
  documentItems: "id, documentId, urutan",
  payments:      "id, ownerId, documentId, tanggal",
  outbox:        "id, entity, entityId, createdAt, attempts",
  meta:          "key",
}).upgrade(async (tx) => {
  const metaGuest = await tx.table("meta").get("guestId")
  const guestId = metaGuest && typeof metaGuest.value === "string" ? metaGuest.value : null

  await tx.table("businesses").toCollection().modify((biz: Record<string, unknown>) => {
    if ((biz.userId === null || biz.userId === undefined) && guestId) {
      biz.userId = guestId
    }
  })
})

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  ;(window as unknown as { db: typeof db }).db = db
}
