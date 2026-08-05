// lib/db/owner.test.ts
// Test penjaga isolasi multi-owner pada data lokal IndexedDB.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import "fake-indexeddb/auto"
import Dexie from "dexie"
import { db, type LocalDocument, type LocalCustomer, type LocalPayment } from "./local"
import { getActiveOwnerId, updateLastUserId } from "./owner"
import { v7 as uuidv7 } from "uuid"

describe("Owner ID & Data Isolation", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    await db.close()
  })

  it("getActiveOwnerId mengembalikan guestId jika belum login", async () => {
    await updateLastUserId(null)
    const ownerId = await getActiveOwnerId()
    expect(ownerId).toBeDefined()
    expect(typeof ownerId).toBe("string")
    expect(ownerId.length).toBeGreaterThan(0)
  })

  it("getActiveOwnerId mengembalikan userId jika sudah login", async () => {
    const testUserId = "user-123-abc"
    await updateLastUserId(testUserId)
    const ownerId = await getActiveOwnerId()
    expect(ownerId).toBe(testUserId)
  })

  it("penjaga kueri hanya mengembalikan baris milik owner aktif", async () => {
    const ownerA = "owner-a-id"
    const ownerB = "owner-b-id"
    const now = new Date().toISOString()

    const docA: LocalDocument = {
      id: uuidv7(),
      ownerId: ownerA,
      businessId: "biz-a",
      tipe: "nota",
      nomor: "NT/001",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Pelanggan A",
      diterimaDari: null,
      status: "draf",
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
      dibayar: 0,
      sisa: 10000,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    const docB: LocalDocument = {
      id: uuidv7(),
      ownerId: ownerB,
      businessId: "biz-b",
      tipe: "nota",
      nomor: "NT/002",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Pelanggan B",
      diterimaDari: null,
      status: "draf",
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      subtotal: 20000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 20000,
      dibayar: 0,
      sisa: 20000,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.documents.bulkAdd([docA, docB])

    // Filter kueri untuk ownerA
    const docsA = await db.documents.where("ownerId").equals(ownerA).toArray()
    expect(docsA).toHaveLength(1)
    expect(docsA[0].id).toBe(docA.id)

    // Filter kueri untuk ownerB
    const docsB = await db.documents.where("ownerId").equals(ownerB).toArray()
    expect(docsB).toHaveLength(1)
    expect(docsB[0].id).toBe(docB.id)
  })

  it("4. PERBAIKAN 2: login owner A -> logout -> mode tamu / login owner B -> masing-masing sesi hanya melihat data miliknya", async () => {
    const ownerA = "user-owner-A"
    const ownerB = "user-owner-B"
    const now = new Date().toISOString()

    // 1. Login owner A & buat dokumen milik owner A
    await updateLastUserId(ownerA)
    const activeA = await getActiveOwnerId()
    expect(activeA).toBe(ownerA)

    const docA: LocalDocument = {
      id: uuidv7(),
      ownerId: ownerA,
      businessId: "biz-a",
      tipe: "nota",
      nomor: "NT/001",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Pelanggan Owner A",
      diterimaDari: null,
      status: "draf",
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
      dibayar: 0,
      sisa: 10000,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    await db.documents.add(docA)

    // 2. Logout -> updateLastUserId(null) -> beralih ke mode guest
    await updateLastUserId(null)
    const guestOwnerId = await getActiveOwnerId()
    expect(guestOwnerId).not.toBe(ownerA)

    // Buat dokumen milik guest
    const docGuest: LocalDocument = {
      id: uuidv7(),
      ownerId: guestOwnerId,
      businessId: "biz-guest",
      tipe: "nota",
      nomor: "NT/002",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Pelanggan Guest",
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
    }
    await db.documents.add(docGuest)

    // Mode guest HANYA melihat docGuest
    const guestDocs = await db.documents.where("ownerId").equals(guestOwnerId).toArray()
    expect(guestDocs).toHaveLength(1)
    expect(guestDocs[0].id).toBe(docGuest.id)

    // 3. Login owner B -> updateLastUserId(ownerB)
    await updateLastUserId(ownerB)
    const activeB = await getActiveOwnerId()
    expect(activeB).toBe(ownerB)

    // Sesi owner B TIDAK melihat data owner A maupun data guest
    const bDocs = await db.documents.where("ownerId").equals(ownerB).toArray()
    expect(bDocs).toHaveLength(0)

    // Switch kembali ke owner A -> HANYA melihat docA
    await updateLastUserId(ownerA)
    const aDocs = await db.documents.where("ownerId").equals(await getActiveOwnerId()).toArray()
    expect(aDocs).toHaveLength(1)
    expect(aDocs[0].id).toBe(docA.id)
  })

  it("dua baris businesses dengan userId berbeda: masing-masing pemilik hanya melihat logo dan identitas usahanya sendiri", async () => {
    const user1 = "user-1-uuid"
    const user2 = "user-2-uuid"
    const now = new Date().toISOString()

    await db.businesses.bulkPut([
      {
        id: "biz-1",
        userId: user1,
        nama: "Usaha Pemilik 1",
        logoUrl: "data:image/png;base64,LOGO1",
        alamat: "Alamat 1",
        telepon: "0811",
        email: "user1@test.com",
        npwp: null,
        polaNota: "NT/{0001}",
        polaInvoice: "INV/{0001}",
        polaKwitansi: "KW/{0001}",
        defaultPajak: 0,
        defaultCatatan: null,
        qrisUrl: null,
        rekening: null,
        ttdUrl: null,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "biz-2",
        userId: user2,
        nama: "Usaha Pemilik 2",
        logoUrl: "data:image/png;base64,LOGO2",
        alamat: "Alamat 2",
        telepon: "0822",
        email: "user2@test.com",
        npwp: null,
        polaNota: "NT/{0001}",
        polaInvoice: "INV/{0001}",
        polaKwitansi: "KW/{0001}",
        defaultPajak: 0,
        defaultCatatan: null,
        qrisUrl: null,
        rekening: null,
        ttdUrl: null,
        plan: "pro",
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Pemilik 1 query kueri berindeks userId
    const bizUser1 = await db.businesses.where("userId").equals(user1).first()
    expect(bizUser1).toBeDefined()
    expect(bizUser1?.nama).toBe("Usaha Pemilik 1")
    expect(bizUser1?.logoUrl).toBe("data:image/png;base64,LOGO1")

    // Pemilik 2 query kueri berindeks userId
    const bizUser2 = await db.businesses.where("userId").equals(user2).first()
    expect(bizUser2).toBeDefined()
    expect(bizUser2?.nama).toBe("Usaha Pemilik 2")
    expect(bizUser2?.logoUrl).toBe("data:image/png;base64,LOGO2")

    // Pengguna 3 yang belum punya profil usaha -> mengembalikan undefined/null, TIDAK jatuh ke biz-1 atau biz-2
    const bizUser3 = await db.businesses.where("userId").equals("user-3-uuid").first()
    expect(bizUser3).toBeUndefined()
  })
})
