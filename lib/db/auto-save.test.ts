// lib/db/auto-save.test.ts
import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import { db } from "./local"
import { saveDocument } from "./auto-save"
import { hydrateDraft } from "./draft"
import { useEditorStore, type DocType } from "@/lib/stores/editor-store"
import { v7 as uuidv7 } from "uuid"

describe("Penyimpanan lokal & Auto-save (Hari 4A Fixes Lanjutan)", () => {
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

    // Simpan 20 kali berturut-turut
    for (let i = 0; i < 20; i++) {
      const state = useEditorStore.getState()
      const res = await saveDocument(state)
      if (res?.newlyAllocatedTipe) {
        useEditorStore.getState().setAllocatedNomor(res.newlyAllocatedTipe, res.nomor)
      }
    }

    const seqEntry = await db.meta.get("nextSeq:nota")
    // Karena dimulai dari 1 (digunakan untuk dokumen 1), nilai nextSeq berikutnya adalah 2
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
    expect(seqEntry).toBeUndefined() // nextSeq tidak pernah tersentuh

    const doc = await db.documents.get(docId)
    expect(doc?.nomor).toBe("MANUAL-001")
  })

  it("3. Hidrasi dengan store kosong tidak menimpa dokumen yang sudah ada di Dexie", async () => {
    // 1. Simpan dokumen awal dengan data item ke Dexie
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

    // 2. Simulasi muat ulang aplikasi (reset store ke keadaan awal/kosong un-hydrated)
    useEditorStore.setState({
      businessNama: "",
      documentId: null,
      customerNama: "",
      items: [],
      hydrated: false,
    })

    // 3. Jalankan hidrasi
    await hydrateDraft()

    // 4. Pastikan data yang ter-hidrasi sama dengan data yang ada di Dexie
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

    // Simpan dokumen pertama kali
    await saveDocument(useEditorStore.getState())
    let itemsInDb = await db.documentItems
      .where("documentId")
      .equals(docId)
      .toArray()
    expect(itemsInDb).toHaveLength(2)

    // Hapus item1 dari store
    useEditorStore.getState().removeItem(item1Id)

    // Simpan otomatis berikutnya
    await saveDocument(useEditorStore.getState())
    itemsInDb = await db.documentItems
      .where("documentId")
      .equals(docId)
      .toArray()

    expect(itemsInDb).toHaveLength(1)
    expect(itemsInDb[0]?.id).toBe(item2Id)
    expect(itemsInDb[0]?.nama).toBe("Barang B")
  })

  it("5. Membuka ulang aplikasi lima kali TIDAK menambah baris di tabel documents", async () => {
    for (let i = 0; i < 5; i++) {
      await hydrateDraft()
      useEditorStore.getState().setField("catatan", `Catatan revisi ${i}`)
      await saveDocument(useEditorStore.getState())
    }

    const docCount = await db.documents.count()
    expect(docCount).toBe(1)
  })

  it("6. Alokasi nomor hanya terjadi di transaksi baru sehingga nextSeq == count documents", async () => {
    for (let i = 0; i < 3; i++) {
      useEditorStore.getState().resetDocument()
      const docId = uuidv7()
      useEditorStore.setState({
        documentId: docId,
        hydrated: true,
        tipe: "nota",
        nomor: "",
        nomorManual: false,
      })

      for (let saveCount = 0; saveCount < 3; saveCount++) {
        const res = await saveDocument(useEditorStore.getState())
        if (res?.newlyAllocatedTipe) {
          useEditorStore.getState().setAllocatedNomor(res.newlyAllocatedTipe, res.nomor)
        }
      }
    }

    const docCountInDb = await db.documents.count()
    expect(docCountInDb).toBe(3)

    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(4)
    expect((seqEntry?.value ?? 0) - 1).toBe(docCountInDb)

    const metaDocCount = await db.meta.get("docCount")
    expect(metaDocCount?.value).toBe(3)
  })

  it("7. Berpindah jenis dokumen sepuluh kali hanya menaikkan urutan untuk jenis yang benar-benar baru disentuh, dan kembali ke jenis sebelumnya memakai nomor yang sama", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      nomor: "",
      nomorManual: false,
    })

    // Simpan nota pertama kali
    let res = await saveDocument(useEditorStore.getState())
    if (res?.newlyAllocatedTipe) {
      useEditorStore.getState().setAllocatedNomor(res.newlyAllocatedTipe, res.nomor)
      useEditorStore.getState().setNomor(res.nomor, false)
    }
    const notaNomorAwal = useEditorStore.getState().nomor
    expect(notaNomorAwal).toContain("NT/")

    // Berpindah tipe berkali-kali: nota -> invoice -> kwitansi -> nota -> invoice...
    const sequenceOfTypes: DocType[] = [
      "invoice",
      "nota",
      "kwitansi",
      "invoice",
      "nota",
      "kwitansi",
      "invoice",
      "nota",
      "kwitansi",
    ]

    let invoiceNomorFirst: string | null = null

    for (const targetTipe of sequenceOfTypes) {
      useEditorStore.getState().setTipe(targetTipe)
      res = await saveDocument(useEditorStore.getState())
      if (res?.newlyAllocatedTipe) {
        useEditorStore.getState().setAllocatedNomor(res.newlyAllocatedTipe, res.nomor)
        useEditorStore.getState().setNomor(res.nomor, false)
      }

      if (targetTipe === "nota") {
        // Harus tetap memakai nomor nota yang sama!
        expect(useEditorStore.getState().nomor).toBe(notaNomorAwal)
      } else if (targetTipe === "invoice") {
        if (!invoiceNomorFirst) {
          invoiceNomorFirst = useEditorStore.getState().nomor
        } else {
          // Harus tetap memakai nomor invoice yang sama!
          expect(useEditorStore.getState().nomor).toBe(invoiceNomorFirst)
        }
      }
    }

    // nextSeq untuk nota, invoice, kwitansi masing-masing hanya dialokasikan 1 kali (dari 1 naik ke 2)
    const seqNota = await db.meta.get("nextSeq:nota")
    const seqInvoice = await db.meta.get("nextSeq:invoice")
    const seqKwitansi = await db.meta.get("nextSeq:kwitansi")

    expect(seqNota?.value).toBe(2)
    expect(seqInvoice?.value).toBe(2)
    expect(seqKwitansi?.value).toBe(2)
  })

  it("8. Kunci meta yang tertulis di Dexie bernama tepat nextSeq:<tipe>", async () => {
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      nomor: "",
      nomorManual: false,
    })

    await saveDocument(useEditorStore.getState())

    const metaKeys = (await db.meta.toArray()).map((m) => m.key)
    expect(metaKeys).toContain("nextSeq:nota")
    expect(metaKeys).toContain("lastSeqMonth:nota")
    expect(metaKeys).toContain("docCount")
    expect(metaKeys).toContain("guestId")
  })

  it("9. Identitas usaha bertahan setelah muat ulang, dan jumlah baris businesses tetap satu", async () => {
    // 1. Simpan identitas usaha dari editor
    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      businessNama: "Toko Sembako Berkah",
      businessAlamat: "Jl. Merdeka No. 45",
      businessTelepon: "081234567890",
    })

    await saveDocument(useEditorStore.getState())

    // 2. Verifikasi hanya ada 1 baris di tabel businesses
    const bizCount = await db.businesses.count()
    expect(bizCount).toBe(1)

    const bizInDb = (await db.businesses.toArray())[0]
    expect(bizInDb?.nama).toBe("Toko Sembako Berkah")
    expect(bizInDb?.alamat).toBe("Jl. Merdeka No. 45")
    expect(bizInDb?.telepon).toBe("081234567890")

    // 3. Reset store dan jalankan hidrasi (simulasi muat ulang)
    useEditorStore.setState({
      businessNama: "",
      businessAlamat: "",
      businessTelepon: "",
      hydrated: false,
    })

    await hydrateDraft()

    // 4. Identitas usaha berhasil dimuat kembali dari Dexie
    const stateAfterHydration = useEditorStore.getState()
    expect(stateAfterHydration.businessNama).toBe("Toko Sembako Berkah")
    expect(stateAfterHydration.businessAlamat).toBe("Jl. Merdeka No. 45")
    expect(stateAfterHydration.businessTelepon).toBe("081234567890")

    // 5. Jumlah baris businesses tetap 1
    expect(await db.businesses.count()).toBe(1)
  })
})
