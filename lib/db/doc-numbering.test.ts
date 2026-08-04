// lib/db/doc-numbering.test.ts
// Unit test untuk penomoran dokumen (peekDocNomor & reserveDocNomor)
// Uji 7 kasus wajib sesuai instruksi.

import { describe, it, expect, beforeEach } from "vitest"
import "fake-indexeddb/auto"
import { db, type LocalDocument } from "./local"
import { ensureGuestBusiness } from "./guest"
import { peekDocNomor, reserveDocNomor } from "./doc-numbering"
import { saveDocument } from "./auto-save"
import { hydrateDraft, createNewDocumentDraft } from "./draft"
import { useEditorStore } from "@/lib/stores/editor-store"
import { v7 as uuidv7 } from "uuid"

const now = new Date().toISOString()

describe("Penomoran Dokumen (peekDocNomor & reserveDocNomor)", () => {
  let businessId: string

  beforeEach(async () => {
    await db.businesses.clear()
    await db.customers.clear()
    await db.documents.clear()
    await db.documentItems.clear()
    await db.payments.clear()
    await db.meta.clear()

    useEditorStore.getState().resetDocument()
    businessId = await ensureGuestBusiness()
  })

  // TES WAJIB 1: Editor dibuka tanpa menyimpan apa pun, lalu dimuat ulang lima kali: nilai nextSeq:<tipe> tidak berubah sama sekali.
  it("TES WAJIB 1: Editor dibuka tanpa menyimpan apa pun, dimuat ulang 5 kali -> nextSeq tidak berubah", async () => {
    // Panggilan pertama (buka editor)
    await hydrateDraft()
    const seq1 = await db.meta.get("nextSeq:nota")
    expect(seq1).toBeUndefined() // Belum pernah ditulis ke meta

    // Muat ulang 5 kali (reset store state dan panggil hydrateDraft)
    for (let i = 0; i < 5; i++) {
      useEditorStore.setState({ hydrated: false, documentId: null })
      await hydrateDraft()
      const seq = await db.meta.get("nextSeq:nota")
      expect(seq).toBeUndefined()
    }
  })

  // TES WAJIB 2: Berpindah antar ketiga jenis dokumen sepuluh kali tanpa menyimpan: nextSeq tidak berubah.
  it("TES WAJIB 2: Berpindah antar 3 jenis dokumen 10 kali tanpa menyimpan -> nextSeq tidak berubah", async () => {
    await hydrateDraft()

    const docTypes = ["nota", "invoice", "kwitansi"] as const
    for (let i = 0; i < 10; i++) {
      const tipe = docTypes[i % 3]!
      const peeked = await peekDocNomor(businessId, tipe)
      expect(peeked).toBeDefined()

      // Verifikasi meta.nextSeq untuk ketiga tipe belum pernah ditulis
      expect(await db.meta.get("nextSeq:nota")).toBeUndefined()
      expect(await db.meta.get("nextSeq:invoice")).toBeUndefined()
      expect(await db.meta.get("nextSeq:kwitansi")).toBeUndefined()
    }
  })

  // TES WAJIB 3: Menyimpan dokumen baru pertama kali: nextSeq naik tepat 1.
  it("TES WAJIB 3: Menyimpan dokumen baru pertama kali -> nextSeq naik tepat 1", async () => {
    await hydrateDraft()

    // Ambil state terkini dan isi nama item agar valid
    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Barang Test", hargaSatuan: 10000 })

    const result = await saveDocument(useEditorStore.getState())
    expect(result).not.toBeNull()
    expect(result!.isNewDoc).toBe(true)

    // nextSeq:nota di meta sekarang bernilai 2 (setelah alokasi 1)
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(2)
  })

  // TES WAJIB 4: Menyimpan perubahan pada dokumen yang sudah ada: nextSeq tidak naik.
  it("TES WAJIB 4: Menyimpan perubahan pada dokumen yang sudah ada -> nextSeq tidak naik", async () => {
    await hydrateDraft()

    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Barang Test", hargaSatuan: 10000 })

    // Simpan pertama kali
    await saveDocument(useEditorStore.getState())
    const seqAfterFirst = (await db.meta.get("nextSeq:nota"))?.value

    // Simpan perubahan kedua
    store.updateItem(store.items[0].id, { hargaSatuan: 20000 })
    await saveDocument(useEditorStore.getState())

    const seqAfterSecond = (await db.meta.get("nextSeq:nota"))?.value
    expect(seqAfterSecond).toBe(seqAfterFirst) // Tidak naik
  })

  // TES WAJIB 5: Draf yang sudah tersimpan, setelah hidrasi, punya nomor yang sama persis seperti sebelum muat ulang.
  it("TES WAJIB 5: Draf tersimpan setelah hidrasi punya nomor sama persis seperti sebelum muat ulang", async () => {
    await hydrateDraft()

    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Barang Test", hargaSatuan: 10000 })

    const result = await saveDocument(useEditorStore.getState())
    const originalNomor = result!.nomor

    // Simulasi reload halaman (reset store dan panggil hydrateDraft)
    useEditorStore.setState({ hydrated: false, documentId: null })
    await hydrateDraft()

    const restoredNomor = useEditorStore.getState().nomor
    expect(restoredNomor).toBe(originalNomor)
  })

  // TES WAJIB 6: Nomor manual tidak menaikkan nextSeq.
  it("TES WAJIB 6: Nomor manual tidak menaikkan nextSeq", async () => {
    await hydrateDraft()

    const store = useEditorStore.getState()
    store.setNomor("NT-MANUAL-001", true)
    store.updateItem(store.items[0].id, { nama: "Barang Test", hargaSatuan: 10000 })

    const result = await saveDocument(useEditorStore.getState())
    expect(result?.nomor).toBe("NT-MANUAL-001")

    // nextSeq:nota tetap tidak pernah ditulis
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry).toBeUndefined()
  })

  // TES WAJIB 7: Penyimpanan pertama yang gagal di tengah transaksi tidak menaikkan nextSeq.
  it("TES WAJIB 7: Penyimpanan pertama yang gagal di tengah transaksi tidak menaikkan nextSeq", async () => {
    await hydrateDraft()
    const docId = useEditorStore.getState().documentId!

    // Buat dokumen yang sudah di-soft-delete di DB dengan ID yang sama
    // agar saveDocument dibatalkan (abort) di tengah transaksi
    const deletedDoc: LocalDocument = {
      id: docId,
      businessId,
      tipe: "nota",
      nomor: "NT/2608/0001",
      tanggal: "2026-08-04",
      dueDate: null,
      customerId: null,
      customerNama: null,
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
      deletedAt: now,
    }
    await db.documents.add(deletedDoc)

    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Barang Test", hargaSatuan: 10000 })

    const result = await saveDocument(useEditorStore.getState())
    expect(result).toBeNull() // Dibatalkan

    // nextSeq tidak naik / belum ditulis
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry).toBeUndefined()
  })
})
