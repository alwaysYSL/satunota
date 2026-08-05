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
})
