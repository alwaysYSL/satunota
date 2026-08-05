// lib/export/export.test.ts
// Unit test murni untuk pembangun CSV, JSON, dan penyaringan ownerId (SCHEMA §11).

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import "fake-indexeddb/auto"
import { db, type LocalDocument, type LocalDocumentItem, type LocalPayment } from "../db/local"
import { toCsvDokumen, toCsvItem, toBackupJson, getExportDataForActiveOwner } from "./index"
import { updateLastUserId } from "../db/owner"
import { v7 as uuidv7 } from "uuid"

describe("Export CSV & JSON (SCHEMA §11)", () => {
  const ownerA = "owner-a-export-id"
  const ownerB = "owner-b-export-id"
  const now = new Date().toISOString()

  beforeEach(async () => {
    await db.delete()
    await db.open()
    await updateLastUserId(ownerA)
  })

  afterEach(async () => {
    await db.close()
  })

  it("1. toCsvDokumen menghasilkan format CSV ber-BOM, escaping benar, dan angka polos", () => {
    const docs: LocalDocument[] = [
      {
        id: uuidv7(),
        ownerId: ownerA,
        businessId: "biz-1",
        tipe: "invoice",
        nomor: "INV/001",
        tanggal: "2026-08-05",
        dueDate: "2026-08-12",
        customerId: null,
        customerNama: 'Toko "Maju" Jaya, PT',
        diterimaDari: null,
        status: "terkirim",
        diskonTipe: "nominal",
        diskonNilai: 0,
        pajakPersen: 11,
        pajakInklusif: false,
        ongkir: 15000,
        biayaLain: 0,
        pembulatanAktif: false,
        subtotal: 100000,
        diskonNominal: 0,
        pajakNominal: 11000,
        pembulatanNominal: 0,
        total: 126000,
        dibayar: 50000,
        sisa: 76000,
        catatan: "Barang\nSudah Dikirim",
        syarat: null,
        sourceDocumentId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]

    const csv = toCsvDokumen(docs, "2026-08-05")

    // Awalan BOM UTF-8
    expect(csv.startsWith("\uFEFF")).toBe(true)

    // Header
    expect(csv).toContain("nomor;tipe;tanggal;jatuh_tempo;pelanggan;status;subtotal;diskon;pajak;ongkir;biaya_lain;total;dibayar;sisa;catatan")

    // Escaping double quote -> "" dan comma inside quotes
    expect(csv).toContain('"Toko ""Maju"" Jaya, PT"')

    // Escaping newline inside quotes
    expect(csv).toContain('"Barang\nSudah Dikirim"')

    // Plain numbers (no Rp, no thousand separator, semicolon separator)
    expect(csv).toContain("100000;0;11000;15000;0;126000;50000;76000")
  })

  it("2. toCsvItem menghasilkan format CSV item ber-BOM dan angka polos", () => {
    const docId = uuidv7()
    const docs: LocalDocument[] = [
      {
        id: docId,
        ownerId: ownerA,
        businessId: "biz-1",
        tipe: "nota",
        nomor: "NT/001",
        tanggal: "2026-08-05",
        dueDate: null,
        customerId: null,
        customerNama: "Budi",
        diterimaDari: null,
        status: "lunas",
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
        dibayar: 50000,
        sisa: 0,
        catatan: null,
        syarat: null,
        sourceDocumentId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]

    const items: LocalDocumentItem[] = [
      {
        id: uuidv7(),
        documentId: docId,
        urutan: 0,
        nama: "Kopi Gajah, 250g",
        qty: 1.5,
        satuan: "kg",
        hargaSatuan: 25000,
        diskonBaris: 0,
        subtotal: 37500,
      },
    ]

    const csv = toCsvItem(docs, items)
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain("nomor_dokumen;urutan;nama;qty;satuan;harga_satuan;diskon_baris;subtotal")
    expect(csv).toContain('"NT/001";0;"Kopi Gajah, 250g";1,5;"kg";25000;0;37500')
  })

  it("3. toBackupJson menghasilkan struktur JSON persis SCHEMA §11", () => {
    const docId = uuidv7()
    const doc: LocalDocument = {
      id: docId,
      ownerId: ownerA,
      businessId: "biz-1",
      tipe: "nota",
      nomor: "NT/001",
      tanggal: "2026-08-05",
      dueDate: null,
      customerId: null,
      customerNama: "Budi",
      diterimaDari: null,
      status: "lunas",
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
      dibayar: 50000,
      sisa: 0,
      catatan: null,
      syarat: null,
      sourceDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    const item: LocalDocumentItem = {
      id: uuidv7(),
      documentId: docId,
      urutan: 0,
      nama: "Barang A",
      qty: 1,
      satuan: "pcs",
      hargaSatuan: 50000,
      diskonBaris: 0,
      subtotal: 50000,
    }

    const jsonStr = toBackupJson({
      exportedAt: "2026-08-05T18:00:00.000Z",
      business: null,
      customers: [],
      products: [],
      documents: [doc],
      items: [item],
      payments: [],
    })

    const parsed = JSON.parse(jsonStr)
    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe("2026-08-05T18:00:00.000Z")
    expect(parsed.documents).toHaveLength(1)
    expect(parsed.documents[0].nomor).toBe("NT/001")
    expect(parsed.documents[0].items).toHaveLength(1)
    expect(parsed.documents[0].items[0].nama).toBe("Barang A")
  })

  it("4. getExportDataForActiveOwner memfilter hanya data milik ownerId aktif", async () => {
    const docAId = uuidv7()
    const docBId = uuidv7()

    await db.documents.bulkAdd([
      {
        id: docAId,
        ownerId: ownerA,
        businessId: "biz-a",
        tipe: "nota",
        nomor: "NT/A",
        tanggal: "2026-08-05",
        dueDate: null,
        customerId: null,
        customerNama: "A",
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
      },
      {
        id: docBId,
        ownerId: ownerB,
        businessId: "biz-b",
        tipe: "nota",
        nomor: "NT/B",
        tanggal: "2026-08-05",
        dueDate: null,
        customerId: null,
        customerNama: "B",
        diterimaDari: null,
        status: "lunas",
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
        dibayar: 20000,
        sisa: 0,
        catatan: null,
        syarat: null,
        sourceDocumentId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ])

    const dataA = await getExportDataForActiveOwner()
    expect(dataA.documents).toHaveLength(1)
    expect(dataA.documents[0].nomor).toBe("NT/A")

    // Switch to ownerB
    await updateLastUserId(ownerB)
    const dataB = await getExportDataForActiveOwner()
    expect(dataB.documents).toHaveLength(1)
    expect(dataB.documents[0].nomor).toBe("NT/B")
  })
})
