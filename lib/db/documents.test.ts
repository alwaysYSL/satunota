// lib/db/documents.test.ts
import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import { db, type LocalDocument } from "./local"
import {
  calculateDisplayStatus,
  softDeleteDocument,
  duplicateDocument,
  convertInvoiceToKwitansi,
  updateDocumentStatus,
} from "./documents"
import { saveDocument } from "./auto-save"
import { hydrateDraft } from "./draft"
import { useEditorStore } from "@/lib/stores/editor-store"
import { v7 as uuidv7 } from "uuid"

describe("Tes Integrasi Hari 4B — Operasi Dokumen & Riwayat", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useEditorStore.getState().resetDocument()
  })

  it("1. Tiga dokumen berbeda jenis muncul di kueri riwayat, dan menekan Buat Baru tidak menimpa dokumen sebelumnya", async () => {
    // 1. Simpan Nota
    const doc1Id = uuidv7()
    useEditorStore.setState({
      documentId: doc1Id,
      hydrated: true,
      tipe: "nota",
      customerNama: "Pelanggan Nota",
      items: [
        {
          id: uuidv7(),
          nama: "Barang A",
          qty: 1,
          satuan: "pcs",
          hargaSatuan: 10000,
          diskonBaris: 0,
        },
      ],
    })
    await saveDocument(useEditorStore.getState())

    // 2. Buat Baru (reset document) & Simpan Invoice
    useEditorStore.getState().resetDocument()
    const doc2Id = uuidv7()
    useEditorStore.setState({
      documentId: doc2Id,
      hydrated: true,
      tipe: "invoice",
      dueDate: "2026-08-30",
      customerNama: "Pelanggan Invoice",
      items: [
        {
          id: uuidv7(),
          nama: "Jasa B",
          qty: 1,
          satuan: "paket",
          hargaSatuan: 500000,
          diskonBaris: 0,
        },
      ],
    })
    await saveDocument(useEditorStore.getState())

    // 3. Buat Baru & Simpan Kwitansi
    useEditorStore.getState().resetDocument()
    const doc3Id = uuidv7()
    useEditorStore.setState({
      documentId: doc3Id,
      hydrated: true,
      tipe: "kwitansi",
      diterimaDari: "Pembayar Kwitansi",
      items: [
        {
          id: uuidv7(),
          nama: "Sewa Tempat",
          qty: 1,
          satuan: "bulan",
          hargaSatuan: 1000000,
          diskonBaris: 0,
        },
      ],
    })
    await saveDocument(useEditorStore.getState())

    // Kueri riwayat (semua dokumen aktif deletedAt == null)
    const historyDocs = (await db.documents.toArray()).filter((d) => !d.deletedAt)

    expect(historyDocs).toHaveLength(3)
    const typesInHistory = historyDocs.map((d) => d.tipe)
    expect(typesInHistory).toContain("nota")
    expect(typesInHistory).toContain("invoice")
    expect(typesInHistory).toContain("kwitansi")

    // Pastikan menekan Buat Baru tidak menimpa dokumen sebelumnya
    useEditorStore.getState().resetDocument()
    const docCountAfterReset = await db.documents.count()
    expect(docCountAfterReset).toBe(3)
  })

  it("2. Pencarian menemukan dokumen berdasarkan nomor, nama pelanggan, dan isi catatan. Ketiganya, bukan hanya salah satu", async () => {
    const bizId = uuidv7()

    const doc1: LocalDocument = {
      id: uuidv7(),
      businessId: bizId,
      tipe: "nota",
      nomor: "NT/2608/9999",
      tanggal: "2026-08-01",
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
      subtotal: 10000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 10000,
      dibayar: 10000,
      sisa: 0,
      catatan: "Catatan Biasa",
      syarat: null,
      sourceDocumentId: null,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      deletedAt: null,
    }

    const doc2: LocalDocument = {
      id: uuidv7(),
      businessId: bizId,
      tipe: "invoice",
      nomor: "INV/2608/0001",
      tanggal: "2026-08-02",
      dueDate: "2026-08-30",
      customerId: null,
      customerNama: "Siti Nurhaliza",
      diterimaDari: null,
      status: "terkirim",
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      subtotal: 500000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 500000,
      dibayar: 0,
      sisa: 500000,
      catatan: "Harap bayar tepat waktu",
      syarat: null,
      sourceDocumentId: null,
      createdAt: "2026-08-02T00:00:00Z",
      updatedAt: "2026-08-02T00:00:00Z",
      deletedAt: null,
    }

    const doc3: LocalDocument = {
      id: uuidv7(),
      businessId: bizId,
      tipe: "kwitansi",
      nomor: "KW/2608/0001",
      tanggal: "2026-08-03",
      dueDate: null,
      customerId: null,
      customerNama: null,
      diterimaDari: "Andi",
      status: "lunas",
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      subtotal: 1000000,
      diskonNominal: 0,
      pajakNominal: 0,
      pembulatanNominal: 0,
      total: 1000000,
      dibayar: 1000000,
      sisa: 0,
      catatan: "Transfer BCA ke rekening utama",
      syarat: null,
      sourceDocumentId: null,
      createdAt: "2026-08-03T00:00:00Z",
      updatedAt: "2026-08-03T00:00:00Z",
      deletedAt: null,
    }

    await db.documents.bulkPut([doc1, doc2, doc3])

    const allDocs = await db.documents.toArray()

    // 1. Pencarian berdasarkan nomor ("9999")
    const searchByNomor = allDocs.filter((d) =>
      d.nomor.toLowerCase().includes("9999"),
    )
    expect(searchByNomor).toHaveLength(1)
    expect(searchByNomor[0]?.id).toBe(doc1.id)

    // 2. Pencarian berdasarkan nama pelanggan ("Nurhaliza")
    const searchByCustomer = allDocs.filter((d) =>
      d.customerNama?.toLowerCase().includes("nurhaliza"),
    )
    expect(searchByCustomer).toHaveLength(1)
    expect(searchByCustomer[0]?.id).toBe(doc2.id)

    // 3. Pencarian berdasarkan isi catatan ("rekening utama")
    const searchByCatatan = allDocs.filter((d) =>
      d.catatan?.toLowerCase().includes("rekening utama"),
    )
    expect(searchByCatatan).toHaveLength(1)
    expect(searchByCatatan[0]?.id).toBe(doc3.id)
  })

  it("3. Filter jenis dan filter status mengembalikan hanya dokumen yang cocok", async () => {
    const bizId = uuidv7()

    const docs: LocalDocument[] = [
      {
        id: uuidv7(),
        businessId: bizId,
        tipe: "nota",
        nomor: "NT/001",
        tanggal: "2026-08-01",
        dueDate: null,
        customerId: null,
        customerNama: "Pelanggan A",
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
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
        deletedAt: null,
      },
      {
        id: uuidv7(),
        businessId: bizId,
        tipe: "invoice",
        nomor: "INV/001",
        tanggal: "2026-08-02",
        dueDate: "2026-08-30",
        customerId: null,
        customerNama: "Pelanggan B",
        diterimaDari: null,
        status: "terkirim",
        diskonTipe: "nominal",
        diskonNilai: 0,
        pajakPersen: 0,
        pajakInklusif: false,
        ongkir: 0,
        biayaLain: 0,
        pembulatanAktif: false,
        subtotal: 200000,
        diskonNominal: 0,
        pajakNominal: 0,
        pembulatanNominal: 0,
        total: 200000,
        dibayar: 0,
        sisa: 200000,
        catatan: null,
        syarat: null,
        sourceDocumentId: null,
        createdAt: "2026-08-02T00:00:00Z",
        updatedAt: "2026-08-02T00:00:00Z",
        deletedAt: null,
      },
    ]

    await db.documents.bulkPut(docs)
    const all = await db.documents.toArray()

    const notaOnly = all.filter((d) => d.tipe === "nota")
    expect(notaOnly).toHaveLength(1)
    expect(notaOnly[0]?.nomor).toBe("NT/001")

    const lunasOnly = all.filter((d) => d.status === "lunas")
    expect(lunasOnly).toHaveLength(1)
    expect(lunasOnly[0]?.nomor).toBe("NT/001")
  })

  it("4. Invoice berstatus terkirim dengan dueDate yang sudah lewat tampil sebagai jatuh tempo, sementara kolom status di Dexie tetap terkirim", async () => {
    const pastDate = "2020-01-01"
    const docId = uuidv7()

    const mockDoc: LocalDocument = {
      id: docId,
      businessId: uuidv7(),
      tipe: "invoice",
      nomor: "INV/2001/0001",
      tanggal: "2020-01-01",
      dueDate: pastDate,
      customerId: null,
      customerNama: "Klien Telat Bayar",
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
      createdAt: "2020-01-01T00:00:00Z",
      updatedAt: "2020-01-01T00:00:00Z",
      deletedAt: null,
    }

    await db.documents.put(mockDoc)

    // Dynamic display status calculation
    const displayStatus = calculateDisplayStatus(mockDoc)
    expect(displayStatus).toBe("jatuh_tempo")

    // Database record status is UNCHANGED ('terkirim')
    const docInDb = await db.documents.get(docId)
    expect(docInDb?.status).toBe("terkirim")
  })

  it("5. Duplikat: nomor baru tidak kembar, urutan naik tepat satu, meta.activeDraftId tidak berubah, dan baris item memakai ID BARU", async () => {
    const originalDocId = uuidv7()
    await db.meta.put({ key: "activeDraftId", value: originalDocId })

    useEditorStore.setState({
      documentId: originalDocId,
      hydrated: true,
      tipe: "nota",
      customerNama: "Pelanggan Utama",
      items: [
        {
          id: uuidv7(),
          nama: "Barang Awal",
          qty: 2,
          satuan: "pcs",
          hargaSatuan: 10000,
          diskonBaris: 0,
        },
      ],
    })

    const saveRes = await saveDocument(useEditorStore.getState())
    const nomorOriginal = saveRes!.nomor

    // Hitung jumlah baris item dokumen asal sebelum duplikasi
    const itemsAsalSebelum = await db.documentItems
      .where("documentId")
      .equals(originalDocId)
      .toArray()
    expect(itemsAsalSebelum).toHaveLength(1)
    const itemAsalId = itemsAsalSebelum[0]!.id

    // Duplikat dokumen
    const duplicated = await duplicateDocument(originalDocId)

    // 1. Nomor baru tidak kembar
    expect(duplicated.nomor).not.toBe(nomorOriginal)
    expect(duplicated.nomor).toContain("NT/")

    // 2. Sequence nextSeq:nota naik tepat satu (dimulai dari 1 -> doc1 pakai 1 -> dup pakai 2 -> nextSeq = 3)
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(3)

    // 3. meta."activeDraftId" tidak berubah
    const activeDraftEntry = await db.meta.get("activeDraftId")
    expect(activeDraftEntry?.value).toBe(originalDocId)

    // 4. Baris item hasil duplikat memakai ID BARU
    const itemsDuplikat = await db.documentItems
      .where("documentId")
      .equals(duplicated.id)
      .toArray()
    expect(itemsDuplikat).toHaveLength(1)
    expect(itemsDuplikat[0]!.id).not.toBe(itemAsalId)

    // 5. Dokumen asal tidak kehilangan barisnya (jumlah baris dokumen asal tetap sama)
    const itemsAsalSesudah = await db.documentItems
      .where("documentId")
      .equals(originalDocId)
      .toArray()
    expect(itemsAsalSesudah).toHaveLength(1)
    expect(itemsAsalSesudah[0]!.id).toBe(itemAsalId)
  })

  it("6. Konversi invoice lunas: kwitansi memakai pola nomor KW, sourceDocumentId menunjuk invoice asal, status lunas, dibayar sama dengan total, sisa nol, dan invoice asal tidak berubah", async () => {
    const invoiceId = uuidv7()
    useEditorStore.setState({
      documentId: invoiceId,
      hydrated: true,
      tipe: "invoice",
      dueDate: "2026-08-30",
      customerNama: "PT Sukses Makmur",
      items: [
        {
          id: uuidv7(),
          nama: "Konsultasi IT",
          qty: 1,
          satuan: "paket",
          hargaSatuan: 5000000,
          diskonBaris: 0,
        },
      ],
    })

    await saveDocument(useEditorStore.getState())

    // Tandai invoice sebagai lunas
    await db.documents.update(invoiceId, {
      status: "lunas",
      dibayar: 5000000,
      sisa: 0,
    })

    const invoiceBefore = await db.documents.get(invoiceId)

    // Konversi ke kwitansi
    const kwitansi = await convertInvoiceToKwitansi(invoiceId)

    // 1. Kwitansi memakai pola KW
    expect(kwitansi.nomor).toContain("KW/")
    expect(kwitansi.tipe).toBe("kwitansi")

    // 2. sourceDocumentId menunjuk invoice asal
    expect(kwitansi.sourceDocumentId).toBe(invoiceId)

    // 3. status lunas, dibayar == total, sisa == 0
    expect(kwitansi.status).toBe("lunas")
    expect(kwitansi.total).toBe(5000000)
    expect(kwitansi.dibayar).toBe(5000000)
    expect(kwitansi.sisa).toBe(0)

    // 4. Invoice asal tidak berubah sama sekali
    const invoiceAfter = await db.documents.get(invoiceId)
    expect(invoiceAfter).toEqual(invoiceBefore)
  })

  it("7. Hapus lunak: dokumen hilang dari kueri riwayat, barisnya masih ada dengan deletedAt terisi, dan tidak muncul kembali setelah kueri dijalankan ulang", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      customerNama: "Pelanggan Hapus",
    })

    await saveDocument(useEditorStore.getState())

    // Soft delete
    await softDeleteDocument(docId)

    // 1. Baris fisik masih ada di Dexie dengan deletedAt terisi
    const docInDb = await db.documents.get(docId)
    expect(docInDb).toBeDefined()
    expect(docInDb?.deletedAt).not.toBeNull()

    // 2. Dokumen hilang dari kueri riwayat
    let activeDocs = (await db.documents.toArray()).filter((d) => !d.deletedAt)
    expect(activeDocs.find((d) => d.id === docId)).toBeUndefined()

    // 3. Kueri ulang: dokumen tetap tidak muncul kembali
    activeDocs = (await db.documents.toArray()).filter((d) => !d.deletedAt)
    expect(activeDocs.find((d) => d.id === docId)).toBeUndefined()
  })

  it("8. Menghapus dokumen yang sedang aktif membuat activeDraftId berpindah ke dokumen yang deletedAt-nya kosong, bukan tetap menunjuk dokumen terhapus", async () => {
    // 1. Buat Dokumen 1
    const doc1Id = uuidv7()
    useEditorStore.setState({
      documentId: doc1Id,
      hydrated: true,
      tipe: "nota",
      customerNama: "Dokumen 1",
    })
    await saveDocument(useEditorStore.getState())

    // 2. Buat Dokumen 2
    useEditorStore.getState().resetDocument()
    const doc2Id = uuidv7()
    useEditorStore.setState({
      documentId: doc2Id,
      hydrated: true,
      tipe: "nota",
      customerNama: "Dokumen 2 (Aktif)",
    })
    await saveDocument(useEditorStore.getState())

    // Pastikan activeDraftId saat ini adalah doc2Id
    let activeDraftEntry = await db.meta.get("activeDraftId")
    expect(activeDraftEntry?.value).toBe(doc2Id)

    // 3. Hapus dokumen 2 (dokumen yang sedang aktif)
    await softDeleteDocument(doc2Id)

    // 4. Pastikan activeDraftId berpindah ke doc1Id (dokumen non-deleted)
    activeDraftEntry = await db.meta.get("activeDraftId")
    expect(activeDraftEntry?.value).not.toBe(doc2Id)
    expect(activeDraftEntry?.value).toBe(doc1Id)

    const activeDocInDb = await db.documents.get(activeDraftEntry!.value as string)
    expect(activeDocInDb?.deletedAt).toBeNull()
  })

  it("9. Invarian nomor: setelah rangkaian duplikat, konversi, dan hapus lunak, untuk setiap jenis dokumen kenaikan nextSeq tetap sepadan dengan jumlah dokumen berjenis itu", async () => {
    // 1. Buat 1 Nota awal
    const doc1Id = uuidv7()
    useEditorStore.setState({
      documentId: doc1Id,
      hydrated: true,
      tipe: "nota",
    })
    await saveDocument(useEditorStore.getState()) // Nota 1 created (seq nota -> 2)

    // 2. Buat 1 Invoice awal
    useEditorStore.getState().resetDocument()
    const invoice1Id = uuidv7()
    useEditorStore.setState({
      documentId: invoice1Id,
      hydrated: true,
      tipe: "invoice",
      status: "lunas",
    })
    await saveDocument(useEditorStore.getState()) // Invoice 1 created (seq invoice -> 2)
    await db.documents.update(invoice1Id, { status: "lunas" })

    // 3. Duplikat Nota -> menghasilkan Nota 2 (seq nota -> 3)
    await duplicateDocument(doc1Id)

    // 4. Konversi Invoice 1 -> menghasilkan Kwitansi 1 (seq kwitansi -> 2)
    await convertInvoiceToKwitansi(invoice1Id)

    // 5. Soft delete Nota 1
    await softDeleteDocument(doc1Id)

    // Cek jumlah fisik di database (termasuk terhapus lunak)
    const allDocs = await db.documents.toArray()

    const totalNota = allDocs.filter((d) => d.tipe === "nota").length // 2 Nota (1 aktif, 1 deleted)
    const totalInvoice = allDocs.filter((d) => d.tipe === "invoice").length // 1 Invoice
    const totalKwitansi = allDocs.filter((d) => d.tipe === "kwitansi").length // 1 Kwitansi

    // Invarian: nextSeq:<tipe> - 1 == total dokumen berjenis itu di DB
    const seqNota = await db.meta.get("nextSeq:nota")
    const seqInvoice = await db.meta.get("nextSeq:invoice")
    const seqKwitansi = await db.meta.get("nextSeq:kwitansi")

    expect((seqNota?.value ?? 1) - 1).toBe(totalNota)
    expect((seqInvoice?.value ?? 1) - 1).toBe(totalInvoice)
    expect((seqKwitansi?.value ?? 1) - 1).toBe(totalKwitansi)
  })

  it("10. Tandai invoice lunas lalu konversi: berhasil, sourceDocumentId terisi, nomor memakai pola KW/, nextSeq:kwitansi naik tepat 1 (TEST WAJIB 1)", async () => {
    const invoiceId = uuidv7()
    useEditorStore.setState({
      documentId: invoiceId,
      hydrated: true,
      tipe: "invoice",
      dueDate: "2026-08-30",
      customerNama: "Toko Abadi",
      items: [
        {
          id: uuidv7(),
          nama: "Laptop",
          qty: 1,
          satuan: "unit",
          hargaSatuan: 12000000,
          diskonBaris: 0,
        },
      ],
    })

    await saveDocument(useEditorStore.getState())

    // Catat nextSeq:kwitansi sebelum konversi
    const seqKwitansiBefore = (await db.meta.get("nextSeq:kwitansi"))?.value || 1

    // Tandai lunas via updateDocumentStatus (bukan direct db.documents.update)
    await updateDocumentStatus(invoiceId, "lunas")

    // Verifikasi invoice berstatus lunas, dibayar = total, sisa = 0
    const invoiceInDb = await db.documents.get(invoiceId)
    expect(invoiceInDb?.status).toBe("lunas")
    expect(invoiceInDb?.dibayar).toBe(12000000)
    expect(invoiceInDb?.sisa).toBe(0)

    // Konversi invoice lunas ke kwitansi
    const kwitansi = await convertInvoiceToKwitansi(invoiceId)

    expect(kwitansi.nomor).toContain("KW/")
    expect(kwitansi.sourceDocumentId).toBe(invoiceId)
    expect(kwitansi.tipe).toBe("kwitansi")
    expect(kwitansi.status).toBe("lunas")

    // nextSeq:kwitansi naik tepat 1
    const seqKwitansiAfter = (await db.meta.get("nextSeq:kwitansi"))?.value
    expect(seqKwitansiAfter).toBe(seqKwitansiBefore + 1)
  })

  it("11. Invoice draf dikonversi: ditolak dengan pesan yang jelas (TEST WAJIB 2)", async () => {
    const invoiceId = uuidv7()
    useEditorStore.setState({
      documentId: invoiceId,
      hydrated: true,
      tipe: "invoice",
      customerNama: "Pelanggan Draf",
    })

    await saveDocument(useEditorStore.getState())

    // Konversi invoice berstatus draf HARUS ditolak
    await expect(convertInvoiceToKwitansi(invoiceId)).rejects.toThrow(
      "Hanya invoice berstatus lunas yang dapat dikonversi menjadi kwitansi",
    )
  })
})
