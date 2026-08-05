// lib/db/migrate-guest.test.ts
// Tes migrasi data tamu ke akun.
// Memakai fake-indexeddb agar bisa dijalankan di Node.

import { describe, it, expect, beforeEach, vi } from "vitest"
import "fake-indexeddb/auto"
import Dexie from "dexie"
import { v7 as uuidv7 } from "uuid"
import { can } from "@/lib/entitlements"

// ─── Mock Supabase client ──────────────────────────────────

type UpsertedRow = Record<string, unknown>
const upsertedData: Record<string, UpsertedRow[]> = {}

const mockFrom = (table: string) => ({
  select: (_cols?: string) => ({
    eq: (_col: string, val: string) => ({
      maybeSingle: async () => {
        const rows = upsertedData[table] || []
        const found = rows.find((r) => r.user_id === val || r.id === val)
        return { data: found || null, error: null }
      },
      single: async () => {
        const rows = upsertedData[table] || []
        const found = rows.find((r) => r.user_id === val || r.id === val)
        return { data: found || null, error: null }
      },
    }),
  }),
  upsert: async (rows: UpsertedRow | UpsertedRow[], _opts?: Record<string, unknown>) => {
    if (!upsertedData[table]) upsertedData[table] = []
    const arr = Array.isArray(rows) ? rows : [rows]
    for (const row of arr) {
      const idx = upsertedData[table].findIndex((r) => r.id === row.id)
      if (idx >= 0) {
        // Gabungkan atribut lama bila ada (misal plan di server yang tidak dikirim oleh client)
        upsertedData[table][idx] = { ...upsertedData[table][idx], ...row }
      } else {
        upsertedData[table].push(row)
      }
    }
    return { error: null }
  },
})

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => mockFrom(table),
  }),
}))

// ─── Impor setelah mock ────────────────────────────────────

import {
  db,
  type LocalBusiness,
  type LocalDocument,
  type LocalDocumentItem,
  type LocalPayment,
} from "./local"

import {
  migrateGuestToAccount,
  businessToRow,
  customerToRow,
  documentToRow,
  itemToRow,
  paymentToRow,
} from "./migrate-guest"

// ─── Helper ────────────────────────────────────────────────

const now = new Date().toISOString()
const userId = "user-" + uuidv7()

function makeBusiness(overrides?: Partial<LocalBusiness>): LocalBusiness {
  return {
    id: uuidv7(),
    userId: null,
    nama: "Warung Test",
    logoUrl: null,
    alamat: null,
    telepon: null,
    email: null,
    npwp: null,
    polaNota: "NT/{YY}{MM}/{0001}",
    polaInvoice: "INV/{YY}{MM}/{0001}",
    polaKwitansi: "KW/{YY}{MM}/{0001}",
    defaultPajak: 0,
    defaultCatatan: null,
    qrisUrl: null,
    rekening: null,
    ttdUrl: null,
    plan: "guest",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeDocument(
  businessId: string,
  overrides?: Partial<LocalDocument>,
): LocalDocument {
  return {
    id: uuidv7(),
    businessId,
    tipe: "nota",
    nomor: "NT/2608/0001",
    tanggal: "2026-08-04",
    dueDate: null,
    customerId: null,
    customerNama: null,
    diterimaDari: null,
    status: "draf",
    diskonTipe: "nominal",
    diskonNilai: 0,
    pajakPersen: 0,
    pajakInklusif: false,
    ongkir: 0,
    biayaLain: 0,
    pembulatanAktif: false,
    subtotal: 15000,
    diskonNominal: 0,
    pajakNominal: 0,
    pembulatanNominal: 0,
    total: 15000,
    dibayar: 0,
    sisa: 15000,
    catatan: null,
    syarat: null,
    sourceDocumentId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

// ─── Tes ───────────────────────────────────────────────────

describe("migrateGuestToAccount", () => {
  beforeEach(async () => {
    await db.businesses.clear()
    await db.customers.clear()
    await db.documents.clear()
    await db.documentItems.clear()
    await db.payments.clear()
    await db.meta.clear()

    for (const key of Object.keys(upsertedData)) {
      delete upsertedData[key]
    }
  })

  it("TES WAJIB 1: Dua kali masuk berturut-turut dengan user ID yang sama: tetap satu baris businesses, tidak ada duplikat", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    // Masuk pertama
    await migrateGuestToAccount(userId)
    expect(upsertedData["businesses"]).toHaveLength(1)
    expect(upsertedData["businesses"][0].id).toBe(biz.id)
    expect(upsertedData["businesses"][0].user_id).toBe(userId)

    // Masuk kedua (email/user ID yang sama)
    await migrateGuestToAccount(userId)
    expect(upsertedData["businesses"]).toHaveLength(1)
    expect(upsertedData["businesses"][0].id).toBe(biz.id)
    expect(upsertedData["businesses"][0].user_id).toBe(userId)
  })

  it("TES WAJIB 2: Setelah migrasi, paket lokal menjadi 'free' dan can() mengizinkan fitur yang butuh akun", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    const bizBefore = await db.businesses.get(biz.id)
    expect(bizBefore?.plan).toBe("guest")

    await migrateGuestToAccount(userId)

    const bizAfter = await db.businesses.get(biz.id)
    expect(bizAfter?.plan).toBe("free")
    expect(bizAfter?.userId).toBe(userId)
    expect(can("cetak_thermal", bizAfter!.plan)).toBe(true)
  })

  it("MASALAH 1: Usaha server dengan plan 'pro' tetap 'pro' setelah migrasi dijalankan dua kali, dan Dexie lokal bernilai 'pro'", async () => {
    const proUserId = "user-pro-" + uuidv7()
    const serverBizId = uuidv7()

    upsertedData["businesses"] = [
      { id: serverBizId, user_id: proUserId, nama: "Usaha Pro", plan: "pro" },
    ]

    const biz = makeBusiness()
    await db.businesses.add(biz)

    // Jalankan migrasi pertama
    await migrateGuestToAccount(proUserId)
    let serverBiz = upsertedData["businesses"].find((b) => b.id === serverBizId)
    expect(serverBiz?.plan).toBe("pro")

    let localBiz = await db.businesses.get(serverBizId)
    expect(localBiz?.plan).toBe("pro")

    // Hapus penanda migratedForUser agar migrasi kedua berjalan
    await db.meta.delete("migratedForUser")

    // Jalankan migrasi kedua
    await migrateGuestToAccount(proUserId)
    serverBiz = upsertedData["businesses"].find((b) => b.id === serverBizId)
    expect(serverBiz?.plan).toBe("pro")

    localBiz = await db.businesses.get(serverBizId)
    expect(localBiz?.plan).toBe("pro")
  })

  it("MASALAH 2: Dengan usaha server ber-ID berbeda, setelah migrasi tidak ada lagi baris lokal yang menunjuk ID usaha lama, dan jumlah dokumen tetap sama", async () => {
    const diffUserId = "user-diff-" + uuidv7()
    const serverBizId = uuidv7()

    upsertedData["businesses"] = [
      { id: serverBizId, user_id: diffUserId, nama: "Usaha Server", plan: "free" },
    ]

    const localBiz = makeBusiness()
    await db.businesses.add(localBiz)

    const doc1 = makeDocument(localBiz.id, { nomor: "NT/2608/0001" })
    const doc2 = makeDocument(localBiz.id, { nomor: "NT/2608/0002" })
    await db.documents.bulkAdd([doc1, doc2])

    await migrateGuestToAccount(diffUserId)

    // 1. Tidak ada baris bisnis lokal yang menunjuk ke ID usaha lama
    const oldBiz = await db.businesses.get(localBiz.id)
    expect(oldBiz).toBeUndefined()

    const oldDocs = await db.documents.where("businessId").equals(localBiz.id).toArray()
    expect(oldDocs).toHaveLength(0)

    // 2. Baris bisnis baru ber-ID server ada di Dexie
    const newLocalBiz = await db.businesses.get(serverBizId)
    expect(newLocalBiz).toBeDefined()
    expect(newLocalBiz?.id).toBe(serverBizId)

    // 3. Seluruh dokumen lokal sekarang menunjuk ke serverBizId dan jumlah dokumen tetap sama (2)
    const newDocs = await db.documents.where("businessId").equals(serverBizId).toArray()
    expect(newDocs).toHaveLength(2)
  })

  it("TES WAJIB 3: Status jatuh_tempo pada data yang diunggah memicu galat, bukan diubah diam-diam", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    const doc = makeDocument(biz.id, {
      tipe: "invoice",
      status: "jatuh_tempo" as LocalDocument["status"],
      dueDate: "2026-07-01",
      nomor: "INV/2607/0001",
    })
    await db.documents.add(doc)

    await expect(migrateGuestToAccount(userId)).rejects.toThrow(
      "Status 'jatuh_tempo' tidak boleh disimpan di database",
    )
  })
})

describe("Tes penjaga kunci kolom database Postgres (snake_case)", () => {
  const BUSINESSES_COLUMNS = new Set([
    "id",
    "user_id",
    "nama",
    "logo_url",
    "alamat",
    "telepon",
    "email",
    "npwp",
    "pola_nota",
    "pola_invoice",
    "pola_kwitansi",
    "default_pajak",
    "default_catatan",
    "qris_url",
    "rekening",
    "ttd_url",
    "plan",
    "created_at",
    "updated_at",
  ])

  const CUSTOMERS_COLUMNS = new Set([
    "id",
    "business_id",
    "nama",
    "telepon",
    "alamat",
    "email",
    "catatan",
    "created_at",
    "updated_at",
    "deleted_at",
  ])

  const DOCUMENTS_COLUMNS = new Set([
    "id",
    "business_id",
    "tipe",
    "nomor",
    "tanggal",
    "due_date",
    "customer_id",
    "customer_nama",
    "diterima_dari",
    "status",
    "diskon_tipe",
    "diskon_nilai",
    "pajak_persen",
    "pajak_inklusif",
    "ongkir",
    "biaya_lain",
    "pembulatan_aktif",
    "subtotal",
    "diskon_nominal",
    "pajak_nominal",
    "pembulatan_nominal",
    "total",
    "dibayar",
    "sisa",
    "catatan",
    "syarat",
    "source_document_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ])

  const DOCUMENT_ITEMS_COLUMNS = new Set([
    "id",
    "document_id",
    "urutan",
    "nama",
    "qty",
    "satuan",
    "harga_satuan",
    "diskon_baris",
    "subtotal",
  ])

  const PAYMENTS_COLUMNS = new Set([
    "id",
    "document_id",
    "tanggal",
    "metode",
    "jumlah",
    "catatan",
    "created_at",
  ])

  it("businessToRow hanya menghasilkan kunci yang terdaftar di schema Postgres businesses", () => {
    const row = businessToRow(makeBusiness(), userId)
    for (const key of Object.keys(row)) {
      expect(BUSINESSES_COLUMNS.has(key)).toBe(true)
    }
  })

  it("customerToRow hanya menghasilkan kunci yang terdaftar di schema Postgres customers", () => {
    const row = customerToRow({
      id: uuidv7(),
      businessId: uuidv7(),
      nama: "Pelanggan A",
      createdAt: now,
      updatedAt: now,
    })
    for (const key of Object.keys(row)) {
      expect(CUSTOMERS_COLUMNS.has(key)).toBe(true)
    }
  })

  it("documentToRow hanya menghasilkan kunci yang terdaftar di schema Postgres documents", () => {
    const row = documentToRow(makeDocument("biz-id"))
    for (const key of Object.keys(row)) {
      expect(DOCUMENTS_COLUMNS.has(key)).toBe(true)
    }
  })

  it("itemToRow hanya menghasilkan kunci yang terdaftar di schema Postgres document_items", () => {
    const row = itemToRow({
      id: uuidv7(),
      documentId: uuidv7(),
      urutan: 1,
      nama: "Barang A",
      qty: 1,
      satuan: "pcs",
      hargaSatuan: 10000,
      diskonBaris: 0,
      subtotal: 10000,
    })
    for (const key of Object.keys(row)) {
      expect(DOCUMENT_ITEMS_COLUMNS.has(key)).toBe(true)
    }
  })

  it("paymentToRow hanya menghasilkan kunci yang terdaftar di schema Postgres payments", () => {
    const row = paymentToRow({
      id: uuidv7(),
      documentId: uuidv7(),
      tanggal: "2026-08-04",
      metode: "tunai",
      jumlah: 10000,
      createdAt: now,
    })
    for (const key of Object.keys(row)) {
      expect(PAYMENTS_COLUMNS.has(key)).toBe(true)
    }
  })
})
