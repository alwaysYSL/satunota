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
    }),
  }),
  upsert: async (rows: UpsertedRow | UpsertedRow[], _opts?: Record<string, unknown>) => {
    if (!upsertedData[table]) upsertedData[table] = []
    const arr = Array.isArray(rows) ? rows : [rows]
    for (const row of arr) {
      const idx = upsertedData[table].findIndex((r) => r.id === row.id)
      if (idx >= 0) {
        upsertedData[table][idx] = row
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

import { migrateGuestToAccount } from "./migrate-guest"

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

function makeItem(
  documentId: string,
  overrides?: Partial<LocalDocumentItem>,
): LocalDocumentItem {
  return {
    id: uuidv7(),
    documentId,
    urutan: 0,
    nama: "Nasi Goreng",
    qty: 1,
    satuan: "pcs",
    hargaSatuan: 15000,
    diskonBaris: 0,
    subtotal: 15000,
    ...overrides,
  }
}

function makePayment(
  documentId: string,
  overrides?: Partial<LocalPayment>,
): LocalPayment {
  return {
    id: uuidv7(),
    documentId,
    tanggal: "2026-08-04",
    metode: "tunai",
    jumlah: 15000,
    catatan: null,
    createdAt: now,
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

  // TES WAJIB 1: Dua kali masuk berturut-turut dengan email yang sama: tetap satu baris businesses, tidak ada duplikat.
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

  // TES WAJIB 2: Setelah migrasi, paket lokal menjadi "free" dan can() mengizinkan fitur yang butuh akun.
  it("TES WAJIB 2: Setelah migrasi, paket lokal menjadi 'free' dan can() mengizinkan fitur yang butuh akun", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    // Sebelum migrasi, plan = guest
    const bizBefore = await db.businesses.get(biz.id)
    expect(bizBefore?.plan).toBe("guest")
    expect(can("cetak_thermal", bizBefore!.plan)).toBe(false)
    expect(can("sinkron_antar_perangkat", bizBefore!.plan)).toBe(false)

    // Jalankan migrasi
    await migrateGuestToAccount(userId)

    // Setelah migrasi, plan = free
    const bizAfter = await db.businesses.get(biz.id)
    expect(bizAfter?.plan).toBe("free")
    expect(bizAfter?.userId).toBe(userId)

    // can() mengizinkan fitur yang butuh akun (seperti cetak thermal dan sinkron)
    expect(can("cetak_thermal", bizAfter!.plan)).toBe(true)
    expect(can("sinkron_antar_perangkat", bizAfter!.plan)).toBe(true)
  })

  // TES WAJIB 3: Status jatuh_tempo pada data yang diunggah memicu galat, bukan diubah diam-diam.
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

  it("nomor dokumen berikutnya melanjutkan urutan lama (nextSeq tidak direset)", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    await db.meta.put({ key: "nextSeq:nota", value: 42 })
    await db.meta.put({ key: "lastSeqMonth:nota", value: "2608" })

    await migrateGuestToAccount(userId)

    const nextSeq = await db.meta.get("nextSeq:nota")
    expect(nextSeq?.value).toBe(42)

    const lastMonth = await db.meta.get("lastSeqMonth:nota")
    expect(lastMonth?.value).toBe("2608")
  })

  it("draf yang sedang terbuka tetap sama id-nya", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    const draftDoc = makeDocument(biz.id, {
      status: "draf",
      nomor: "NT/2608/0003",
    })
    const draftId = draftDoc.id
    await db.documents.add(draftDoc)

    const item = makeItem(draftDoc.id)
    await db.documentItems.add(item)

    await migrateGuestToAccount(userId)

    const localDoc = await db.documents.get(draftId)
    expect(localDoc).toBeDefined()
    expect(localDoc!.id).toBe(draftId)
  })

  it("dokumen dengan deletedAt tetap diunggah", async () => {
    const biz = makeBusiness()
    await db.businesses.add(biz)

    const deletedDoc = makeDocument(biz.id, {
      deletedAt: now,
      nomor: "NT/2608/0099",
    })
    await db.documents.add(deletedDoc)

    await migrateGuestToAccount(userId)

    expect(upsertedData["documents"]).toHaveLength(1)
    expect(upsertedData["documents"][0].deleted_at).toBe(now)
  })
})
