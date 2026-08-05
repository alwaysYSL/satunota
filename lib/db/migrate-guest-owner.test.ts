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

  it("2. PERBAIKAN 1: migrasi tamu wajib sekali jalan per akun (login 1x -> migrasi; logout & tamu buat dokumen baru -> login 2x & 3x -> dokumen baru TIDAK dimigrasi)", async () => {
    const { updateLastUserId } = await import("./owner")
    const loggedInUserId = "user-account-888"
    const guestOwnerId = "guest-owner-id-xyz"
    const now = new Date().toISOString()

    await db.meta.bulkPut([
      { key: "guestId", value: guestOwnerId },
      { key: "lastUserId", value: "guest" },
    ])

    await db.businesses.add({
      id: "biz-1",
      userId: null,
      nama: "Toko Tamu 1",
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

    // Dokumen 1 milik tamu sebelum login pertama
    const doc1Id = uuidv7()
    await db.documents.add({
      id: doc1Id,
      ownerId: guestOwnerId,
      businessId: "biz-1",
      tipe: "nota",
      nomor: "NT/001",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Pelanggan 1",
      diterimaDari: null,
      status: "lunas",
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      subtotal: 10000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 10000,
      dibayar: 10000,
      sisa: 0,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    // (1) Login pertama -> migrasi sekali
    await migrateGuestToAccount(loggedInUserId)

    // Dokumen 1 telah berpindah ownerId ke loggedInUserId
    let accountDocs = await db.documents.where("ownerId").equals(loggedInUserId).toArray()
    expect(accountDocs).toHaveLength(1)
    expect(accountDocs[0].id).toBe(doc1Id)

    // (2) Logout -> tamu membuat dokumen 2 baru
    await updateLastUserId(null)
    const doc2Id = uuidv7()
    await db.documents.add({
      id: doc2Id,
      ownerId: guestOwnerId,
      businessId: "biz-guest-2",
      tipe: "nota",
      nomor: "NT/002",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Pelanggan Guest Baru",
      diterimaDari: null,
      status: "draf",
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      subtotal: 5000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 5000,
      dibayar: 0,
      sisa: 5000,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    // Login lagi ke-2 kali dengan akun yang sama
    await updateLastUserId(loggedInUserId)
    await migrateGuestToAccount(loggedInUserId)

    // Dokumen 2 TIDAK dimigrasi (tetap ber-ownerId guestOwnerId)
    accountDocs = await db.documents.where("ownerId").equals(loggedInUserId).toArray()
    expect(accountDocs).toHaveLength(1) // Hanya doc1
    expect(accountDocs[0].id).toBe(doc1Id)

    let guestDocs = await db.documents.where("ownerId").equals(guestOwnerId).toArray()
    expect(guestDocs).toHaveLength(1)
    expect(guestDocs[0].id).toBe(doc2Id)

    // (3) Login ke-3 kali -> tetap tidak ada migrasi
    await migrateGuestToAccount(loggedInUserId)

    accountDocs = await db.documents.where("ownerId").equals(loggedInUserId).toArray()
    expect(accountDocs).toHaveLength(1)
    expect(accountDocs[0].id).toBe(doc1Id)
  })
})
