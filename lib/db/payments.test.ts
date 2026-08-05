// lib/db/payments.test.ts
// Unit test untuk perhitungan pembayaran & matriks status otomatis (SRS §5.6).

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import "fake-indexeddb/auto"
import Dexie from "dexie"
import { db, type LocalDocument } from "./local"
import { addPayment, deletePayment, getPayments, deriveDocumentStatus } from "./payments"
import { updateLastUserId } from "./owner"
import { v7 as uuidv7 } from "uuid"

describe("Payments & Status Derivation (SRS 5.6)", () => {
  const ownerId = "test-owner-payments-123"

  beforeEach(async () => {
    await db.delete()
    await db.open()
    await updateLastUserId(ownerId)
  })

  afterEach(async () => {
    await db.close()
  })

  it("1. Matriks status murni deriveDocumentStatus", () => {
    // Invoice
    expect(deriveDocumentStatus("invoice", "terkirim", 100000, 0)).toBe("terkirim")
    expect(deriveDocumentStatus("invoice", "terkirim", 100000, 40000)).toBe("sebagian")
    expect(deriveDocumentStatus("invoice", "sebagian", 100000, 100000)).toBe("lunas")
    expect(deriveDocumentStatus("invoice", "sebagian", 100000, 120000)).toBe("lunas")

    // Nota
    expect(deriveDocumentStatus("nota", "terkirim", 100000, 40000)).toBe("terkirim") // Nota tidak kenal sebagian
    expect(deriveDocumentStatus("nota", "terkirim", 100000, 100000)).toBe("lunas")

    // Kwitansi
    expect(deriveDocumentStatus("kwitansi", "draf", 100000, 0)).toBe("lunas")
  })

  it("2. addPayment memperbarui dibayar, sisa, dan status dokumen secara otomatis", async () => {
    const docId = uuidv7()
    const now = new Date().toISOString()

    const doc: LocalDocument = {
      id: docId,
      ownerId,
      businessId: "biz-1",
      tipe: "invoice",
      nomor: "INV/2608/0010",
      tanggal: "2026-08-05",
      dueDate: "2026-08-12",
      customerId: null,
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
      subtotal: 100000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 100000,
      dibayar: 0,
      sisa: 100000,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.documents.add(doc)

    // Catat pembayaran 1: Rp 30.000 -> status sebagian
    await addPayment(docId, {
      tanggal: "2026-08-05",
      metode: "transfer",
      jumlah: 30000,
      catatan: "DP",
    })

    let updatedDoc = await db.documents.get(docId)
    expect(updatedDoc!.dibayar).toBe(30000)
    expect(updatedDoc!.sisa).toBe(70000)
    expect(updatedDoc!.status).toBe("sebagian")

    // Catat pembayaran 2: Rp 70.000 -> status lunas
    await addPayment(docId, {
      tanggal: "2026-08-05",
      metode: "qris",
      jumlah: 70000,
      catatan: "Pelunasan",
    })

    updatedDoc = await db.documents.get(docId)
    expect(updatedDoc!.dibayar).toBe(100000)
    expect(updatedDoc!.sisa).toBe(0)
    expect(updatedDoc!.status).toBe("lunas")

    const paymentsList = await getPayments(docId)
    expect(paymentsList).toHaveLength(2)
  })

  it("3. deletePayment menghapus pembayaran dan menghitung ulang status", async () => {
    const docId = uuidv7()
    const now = new Date().toISOString()

    await db.documents.add({
      id: docId,
      ownerId,
      businessId: "biz-1",
      tipe: "invoice",
      nomor: "INV/2608/0011",
      tanggal: "2026-08-05",
      dueDate: "2026-08-12",
      customerId: null,
      customerNama: "Rani",
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

    const p1 = await addPayment(docId, {
      tanggal: "2026-08-05",
      metode: "tunai",
      jumlah: 50000,
    })

    let docInDb = await db.documents.get(docId)
    expect(docInDb!.status).toBe("lunas")

    // Hapus pembayaran
    await deletePayment(p1.id)

    docInDb = await db.documents.get(docId)
    expect(docInDb!.dibayar).toBe(0)
    expect(docInDb!.sisa).toBe(50000)
    expect(docInDb!.status).toBe("terkirim")
  })
})
