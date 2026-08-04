// lib/db/auto-save.test.ts
import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import { db } from "./local"
import { saveDocument } from "./auto-save"
import { hydrateDraft } from "./draft"
import { softDeleteDocument, convertInvoiceToKwitansi } from "./documents"
import { useEditorStore, type DocType } from "@/lib/stores/editor-store"
import { v7 as uuidv7 } from "uuid"

describe("Penyimpanan lokal & Auto-save (Hari 4A & 4B Fixes)", () => {
  beforeEach(async () => {
    // Reset database IndexedDB dan Zustand store sebelum setiap tes
    await db.delete()
    await db.open()
    useEditorStore.getState().resetDocument()
  })

  it("1. Satu dokumen disimpan dua puluh kali berturut-turut hanya menaikkan nextSeq sebanyak satu", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      nomor: "",
      nomorManual: false,
    })

    for (let i = 0; i < 20; i++) {
      const state = useEditorStore.getState()
      const res = await saveDocument(state)
      if (res?.newlyAllocatedTipe) {
        useEditorStore.getState().setAllocatedNomor(res.newlyAllocatedTipe, res.nomor)
      }
    }

    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(2)

    const docCount = await db.documents.count()
    expect(docCount).toBe(1)
  })

  it("2. Mengubah nomor secara manual tidak menaikkan nextSeq", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      nomor: "MANUAL-001",
      nomorManual: true,
    })

    const state = useEditorStore.getState()
    await saveDocument(state)

    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry).toBeUndefined()

    const doc = await db.documents.get(docId)
    expect(doc?.nomor).toBe("MANUAL-001")
  })

  it("3. Hidrasi dengan store kosong tidak menimpa dokumen yang sudah ada di Dexie", async () => {
    const docId = uuidv7()
    await db.meta.put({ key: "activeDraftId", value: docId })
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      customerNama: "Budi Santoso",
      items: [
        {
          id: uuidv7(),
          nama: "Kopi Hitam",
          qty: 2,
          satuan: "cangkir",
          hargaSatuan: 10000,
          diskonBaris: 0,
        },
      ],
    })
    await saveDocument(useEditorStore.getState())

    useEditorStore.setState({
      businessNama: "",
      documentId: null,
      customerNama: "",
      items: [],
      hydrated: false,
    })

    await hydrateDraft()

    const stateAfterHydration = useEditorStore.getState()
    expect(stateAfterHydration.hydrated).toBe(true)
    expect(stateAfterHydration.documentId).toBe(docId)
    expect(stateAfterHydration.customerNama).toBe("Budi Santoso")
    expect(stateAfterHydration.items).toHaveLength(1)
    expect(stateAfterHydration.items[0]?.nama).toBe("Kopi Hitam")
  })

  it("4. Menghapus satu baris item benar-benar menghapusnya dari documentItems", async () => {
    const docId = uuidv7()
    const item1Id = uuidv7()
    const item2Id = uuidv7()

    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      items: [
        {
          id: item1Id,
          nama: "Barang A",
          qty: 1,
          satuan: "pcs",
          hargaSatuan: 5000,
          diskonBaris: 0,
        },
        {
          id: item2Id,
          nama: "Barang B",
          qty: 1,
          satuan: "pcs",
          hargaSatuan: 10000,
          diskonBaris: 0,
        },
      ],
    })

    await saveDocument(useEditorStore.getState())
    let itemsInDb = await db.documentItems
      .where("documentId")
      .equals(docId)
      .toArray()
    expect(itemsInDb).toHaveLength(2)

    useEditorStore.getState().removeItem(item1Id)
    await saveDocument(useEditorStore.getState())

    itemsInDb = await db.documentItems
      .where("documentId")
      .equals(docId)
      .toArray()

    expect(itemsInDb).toHaveLength(1)
    expect(itemsInDb[0]?.id).toBe(item2Id)
    expect(itemsInDb[0]?.nama).toBe("Barang B")
  })

  it("5. Daftar item dengan baris kosong di tengah: subtotal setiap baris tersimpan tepat pada barisnya (MASALAH 1)", async () => {
    const docId = uuidv7()
    const item1Id = uuidv7()
    const item2Id = uuidv7() // Baris kosong di tengah
    const item3Id = uuidv7()

    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      items: [
        {
          id: item1Id,
          nama: "Kopi Hitam",
          qty: 2,
          satuan: "cangkir",
          hargaSatuan: 10000,
          diskonBaris: 0,
        },
        {
          id: item2Id,
          nama: "", // Kosong
          qty: 1,
          satuan: "pcs",
          hargaSatuan: 0,
          diskonBaris: 0,
        },
        {
          id: item3Id,
          nama: "Teh Manis",
          qty: 1,
          satuan: "gelas",
          hargaSatuan: 5000,
          diskonBaris: 0,
        },
      ],
    })

    await saveDocument(useEditorStore.getState())

    const dbItems = await db.documentItems
      .where("documentId")
      .equals(docId)
      .sortBy("urutan")

    expect(dbItems).toHaveLength(3)

    // Item 1: subtotal 20.000
    expect(dbItems[0]!.id).toBe(item1Id)
    expect(dbItems[0]!.subtotal).toBe(20000)

    // Item 2 (kosong): subtotal 0
    expect(dbItems[1]!.id).toBe(item2Id)
    expect(dbItems[1]!.subtotal).toBe(0)

    // Item 3: subtotal 5.000 (TIDAK tergeser menjadi 20.000)
    expect(dbItems[2]!.id).toBe(item3Id)
    expect(dbItems[2]!.subtotal).toBe(5000)
  })

  it("6. Dokumen berstatus terkirim disunting lalu disimpan: status tetap terkirim (MASALAH 2)", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "invoice",
      dueDate: "2026-08-30",
    })

    await saveDocument(useEditorStore.getState())

    // Update status di Dexie menjadi 'terkirim'
    await db.documents.update(docId, { status: "terkirim" })

    // Sunting dokumen dari editor store
    useEditorStore.setState({ catatan: "Catatan diperbarui" })
    await saveDocument(useEditorStore.getState())

    // Cek di Dexie: status HARUS tetap 'terkirim', bukan ter-reset ke 'draf'
    const docInDb = await db.documents.get(docId)
    expect(docInDb?.status).toBe("terkirim")
    expect(docInDb?.catatan).toBe("Catatan diperbarui")
  })

  it("7. Kwitansi hasil konversi disunting: sourceDocumentId tetap utuh (MASALAH 3)", async () => {
    const invoiceId = uuidv7()
    useEditorStore.setState({
      documentId: invoiceId,
      hydrated: true,
      tipe: "invoice",
      dueDate: "2026-08-30",
      customerNama: "PT Sukses Bersama",
      items: [
        {
          id: uuidv7(),
          nama: "Jasa Pembuatan Software",
          qty: 1,
          satuan: "paket",
          hargaSatuan: 10000000,
          diskonBaris: 0,
        },
      ],
    })

    await saveDocument(useEditorStore.getState())

    // Update invoice ke lunas
    await db.documents.update(invoiceId, {
      status: "lunas",
      dibayar: 10000000,
      sisa: 0,
    })

    // Konversi ke kwitansi
    const kwitansi = await convertInvoiceToKwitansi(invoiceId)
    expect(kwitansi.sourceDocumentId).toBe(invoiceId)

    // Buka kwitansi di editor dan sunting
    useEditorStore.setState({
      documentId: kwitansi.id,
      hydrated: true,
      tipe: "kwitansi",
      catatan: "Pembayaran lunas via transfer",
    })

    await saveDocument(useEditorStore.getState())

    // Cek di Dexie: sourceDocumentId HARUS tetap menunjuk ke invoiceId
    const kwitansiInDb = await db.documents.get(kwitansi.id)
    expect(kwitansiInDb?.sourceDocumentId).toBe(invoiceId)
    expect(kwitansiInDb?.catatan).toBe("Pembayaran lunas via transfer")
  })

  it("8. Dokumen dihapus lalu ada penyimpanan tertunda: dokumen TIDAK muncul kembali di riwayat (MASALAH 4)", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      customerNama: "Pelanggan Hapus",
    })

    await saveDocument(useEditorStore.getState())

    // Soft delete dokumen
    await softDeleteDocument(docId)

    // Percobaan simpan dokumen yang sudah disoft-delete
    useEditorStore.setState({ documentId: docId, customerNama: "Percobaan Timpa" })
    const saveResult = await saveDocument(useEditorStore.getState())
    expect(saveResult).toBeNull()

    // Verifikasi di Dexie: deletedAt tetap terisi timestamp (bukan null)
    const docInDb = await db.documents.get(docId)
    expect(docInDb?.deletedAt).not.toBeNull()

    // Verifikasi dokumen tidak muncul di kueri riwayat
    const activeDocs = (await db.documents.toArray()).filter((d) => !d.deletedAt)
    expect(activeDocs.find((d) => d.id === docId)).toBeUndefined()
  })

  it("9. Invoice belum lunas ditolak saat dikonversi menjadi kwitansi (TAMBAHAN 1)", async () => {
    const invoiceId = uuidv7()
    useEditorStore.setState({
      documentId: invoiceId,
      hydrated: true,
      tipe: "invoice",
      dueDate: "2026-08-30",
      status: "terkirim",
    })

    await saveDocument(useEditorStore.getState())

    // Mencoba konversi invoice terkirim (belum lunas) ke kwitansi
    await expect(convertInvoiceToKwitansi(invoiceId)).rejects.toThrow(
      "Hanya invoice berstatus lunas yang dapat dikonversi menjadi kwitansi",
    )
  })
})
