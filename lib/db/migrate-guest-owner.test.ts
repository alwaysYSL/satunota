// lib/db/migrate-guest-owner.test.ts
// Test penjaga alur migrasi tamu -> akun memperbarui ownerId pada seluruh baris lokal.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import "fake-indexeddb/auto"
import Dexie from "dexie"
import { db } from "./local"
import { migrateGuestToAccount } from "./migrate-guest"
import { v7 as uuidv7 } from "uuid"

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: { plan: "free" }, error: null }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
  }),
}))

describe("Migrasi Guest -> Account Owner ID Guard", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    await db.close()
  })

  it("seluruh dokumen, pelanggan, dan pembayaran tamu diperbarui ke userId akun baru", async () => {
    const guestBizId = uuidv7()
    const guestOwnerId = guestBizId
    const docId = uuidv7()
    const custId = uuidv7()
    const payId = uuidv7()
    const now = new Date().toISOString()

    // 1. Seed data lokal tamu
    await db.businesses.add({
      id: guestBizId,
      userId: null,
      nama: "Toko Tamu",
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
    })

    await db.meta.bulkPut([
      { key: "guestId", value: guestOwnerId },
      { key: "lastUserId", value: "guest" },
    ])

    await db.documents.add({
      id: docId,
      ownerId: guestOwnerId,
      businessId: guestBizId,
      tipe: "invoice",
      nomor: "INV/2608/0001",
      tanggal: "2026-08-05",
      dueDate: "2026-08-12",
      customerId: custId,
      customerNama: "Budi",
      diterimaDari: null,
      status: "terkirim",
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      subtotal: 50000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 50000,
      dibayar: 0,
      sisa: 50000,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await db.customers.add({
      id: custId,
      ownerId: guestOwnerId,
      businessId: guestBizId,
      nama: "Budi",
      telepon: "08123456789",
      alamat: null,
      email: null,
      catatan: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await db.payments.add({
      id: payId,
      ownerId: guestOwnerId,
      documentId: docId,
      tanggal: "2026-08-05",
      metode: "tunai",
      jumlah: 20000,
      catatan: "DP",
      createdAt: now,
    })

    // 2. Jalankan migrasi tamu ke akun userId "user-account-777"
    const loggedInUserId = "user-account-777"
    await migrateGuestToAccount(loggedInUserId)

    // 3. Verifikasi kueri filtered by ownerId = loggedInUserId
    const docs = await db.documents.where("ownerId").equals(loggedInUserId).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe(docId)

    const custs = await db.customers.where("ownerId").equals(loggedInUserId).toArray()
    expect(custs).toHaveLength(1)
    expect(custs[0].id).toBe(custId)

    const pays = await db.payments.where("ownerId").equals(loggedInUserId).toArray()
    expect(pays).toHaveLength(1)
    expect(pays[0].id).toBe(payId)

    // 4. Periksa TIDAK ADA SATUPUN baris yang masih ber-ownerId guestOwnerId
    const oldDocs = await db.documents.where("ownerId").equals(guestOwnerId).toArray()
    expect(oldDocs).toHaveLength(0)

    const oldCusts = await db.customers.where("ownerId").equals(guestOwnerId).toArray()
    expect(oldCusts).toHaveLength(0)

    const oldPays = await db.payments.where("ownerId").equals(guestOwnerId).toArray()
    expect(oldPays).toHaveLength(0)

    // 5. meta.lastUserId harus sudah terupdate ke loggedInUserId
    const lastUserEntry = await db.meta.get("lastUserId")
    expect(lastUserEntry?.value).toBe(loggedInUserId)
  })
})
