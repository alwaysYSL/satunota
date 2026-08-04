// lib/db/dexie-upgrade.test.ts
// Tes bahwa upgrade Dexie dari versi 1 ke 2 tidak menghapus data.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import "fake-indexeddb/auto"
import Dexie, { type Table } from "dexie"
import { v7 as uuidv7 } from "uuid"

describe("Dexie upgrade v1 → v2", () => {
  const DB_NAME = "satunota-upgrade-test"
  const now = new Date().toISOString()

  afterEach(async () => {
    await Dexie.delete(DB_NAME)
  })

  it("data v1 tetap ada setelah upgrade ke v2 dan plan ditambahkan", async () => {
    // 1. Buat database v1 dan isi dengan data
    const dbV1 = new Dexie(DB_NAME) as Dexie & {
      businesses: Table<Record<string, unknown>, string>
      documents: Table<Record<string, unknown>, string>
      meta: Table<Record<string, unknown>, string>
    }

    dbV1.version(1).stores({
      businesses: "id, userId, updatedAt",
      customers: "id, businessId, nama, updatedAt, deletedAt",
      products: "id, businessId, nama, updatedAt, deletedAt",
      documents:
        "id, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
      documentItems: "id, documentId, urutan",
      payments: "id, documentId, tanggal",
      outbox: "id, entity, entityId, createdAt, attempts",
      meta: "key",
    })

    const bizId = uuidv7()
    const docId = uuidv7()

    await dbV1.table("businesses").add({
      id: bizId,
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
      createdAt: now,
      updatedAt: now,
      // Catatan: tidak ada field plan di v1
    })

    await dbV1.table("documents").add({
      id: docId,
      businessId: bizId,
      tipe: "nota",
      nomor: "NT/2608/0001",
      tanggal: "2026-08-04",
      dueDate: null,
      status: "draf",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await dbV1.table("meta").add({ key: "nextSeq:nota", value: 5 })

    dbV1.close()

    // 2. Buka database lagi dengan skema v2 (upgrade handler)
    const dbV2 = new Dexie(DB_NAME) as Dexie & {
      businesses: Table<Record<string, unknown>, string>
      documents: Table<Record<string, unknown>, string>
      meta: Table<Record<string, unknown>, string>
    }

    dbV2.version(1).stores({
      businesses: "id, userId, updatedAt",
      customers: "id, businessId, nama, updatedAt, deletedAt",
      products: "id, businessId, nama, updatedAt, deletedAt",
      documents:
        "id, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
      documentItems: "id, documentId, urutan",
      payments: "id, documentId, tanggal",
      outbox: "id, entity, entityId, createdAt, attempts",
      meta: "key",
    })

    dbV2
      .version(2)
      .stores({
        businesses: "id, userId, updatedAt",
        customers: "id, businessId, nama, updatedAt, deletedAt",
        products: "id, businessId, nama, updatedAt, deletedAt",
        documents:
          "id, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
        documentItems: "id, documentId, urutan",
        payments: "id, documentId, tanggal",
        outbox: "id, entity, entityId, createdAt, attempts",
        meta: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("businesses")
          .toCollection()
          .modify((biz: Record<string, unknown>) => {
            if (biz.userId === undefined) {
              biz.userId = null
            }
            if (biz.plan === undefined) {
              biz.plan = "guest"
            }
          })
      })

    // 3. Verifikasi data masih ada
    const biz = await dbV2.table("businesses").get(bizId)
    expect(biz).toBeDefined()
    expect(biz!.nama).toBe("Warung Test")
    expect(biz!.plan).toBe("guest") // Plan ditambahkan oleh upgrade

    const doc = await dbV2.table("documents").get(docId)
    expect(doc).toBeDefined()
    expect(doc!.nomor).toBe("NT/2608/0001")

    const seq = await dbV2.table("meta").get("nextSeq:nota")
    expect(seq).toBeDefined()
    expect(seq!.value).toBe(5) // Tidak direset

    dbV2.close()
  })
})
