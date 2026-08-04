// lib/db/doc-numbering.test.ts
// Unit test untuk penomoran dokumen (peekDocNomor & reserveDocNomor)
// Uji 7 kasus wajib sesuai instruksi perbaikan lanjutan.

import { describe, it, expect, beforeEach } from "vitest"
import "fake-indexeddb/auto"
import { db } from "./local"
import { ensureGuestBusiness } from "./guest"
import { peekDocNomor, reserveDocNomor } from "./doc-numbering"
import { saveDocument } from "./auto-save"
import { hydrateDraft, createNewDocumentDraft } from "./draft"
import { useEditorStore } from "@/lib/stores/editor-store"

describe("Penomoran Dokumen — Perbaikan Lanjutan", () => {
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

  // TES WAJIB 1: Draf tersimpan bertipe nota. Pindah nota → invoice → kwitansi → nota → invoice → kwitansi.
  // nextSeq untuk ketiga jenis naik paling banyak satu kali per jenis, tidak lebih.
  it("TES WAJIB 1: Pindah nota -> invoice -> kwitansi -> nota -> invoice -> kwitansi: nextSeq naik paling banyak 1 kali per jenis", async () => {
    await hydrateDraft()

    // 1. Simpan dokumen awal bertipe nota
    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Item Test", hargaSatuan: 10000 })
    await saveDocument(useEditorStore.getState()) // Nota reserved -> nextSeq:nota = 2

    expect((await db.meta.get("nextSeq:nota"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:invoice"))?.value).toBeUndefined()
    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBeUndefined()

    // 2. Pindah ke invoice dan simpan
    store.setTipe("invoice")
    await saveDocument(useEditorStore.getState()) // Invoice reserved -> nextSeq:invoice = 2

    expect((await db.meta.get("nextSeq:invoice"))?.value).toBe(2)

    // 3. Pindah ke kwitansi dan simpan
    store.setTipe("kwitansi")
    await saveDocument(useEditorStore.getState()) // Kwitansi reserved -> nextSeq:kwitansi = 2

    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBe(2)

    // 4. Pindah kembali ke nota dan simpan
    store.setTipe("nota")
    await saveDocument(useEditorStore.getState())

    // 5. Pindah kembali ke invoice dan simpan
    store.setTipe("invoice")
    await saveDocument(useEditorStore.getState())

    // 6. Pindah kembali ke kwitansi dan simpan
    store.setTipe("kwitansi")
    await saveDocument(useEditorStore.getState())

    // Verifikasi: nextSeq untuk ketiga jenis naik tepat 1 kali (bernilai 2, bukan 3 atau lebih)
    expect((await db.meta.get("nextSeq:nota"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:invoice"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBe(2)
  })

  // TES WAJIB 2: Ulangi urutan yang sama untuk putaran kedua: nextSeq TIDAK naik lagi sama sekali.
  it("TES WAJIB 2: Putaran kedua pindah tipe: nextSeq TIDAK naik lagi sama sekali", async () => {
    await hydrateDraft()
    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Item Test", hargaSatuan: 10000 })

    // Putaran 1
    store.setTipe("nota")
    await saveDocument(useEditorStore.getState())
    store.setTipe("invoice")
    await saveDocument(useEditorStore.getState())
    store.setTipe("kwitansi")
    await saveDocument(useEditorStore.getState())

    // Putaran 2
    store.setTipe("nota")
    await saveDocument(useEditorStore.getState())
    store.setTipe("invoice")
    await saveDocument(useEditorStore.getState())
    store.setTipe("kwitansi")
    await saveDocument(useEditorStore.getState())

    expect((await db.meta.get("nextSeq:nota"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:invoice"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBe(2)
  })

  // TES WAJIB 3: Muat ulang halaman lalu ulangi urutan itu: nextSeq tetap tidak naik.
  it("TES WAJIB 3: Muat ulang halaman lalu ulangi urutan: nextSeq tetap tidak naik", async () => {
    await hydrateDraft()
    const store = useEditorStore.getState()
    store.updateItem(store.items[0].id, { nama: "Item Test", hargaSatuan: 10000 })

    store.setTipe("nota")
    await saveDocument(useEditorStore.getState())
    store.setTipe("invoice")
    await saveDocument(useEditorStore.getState())
    store.setTipe("kwitansi")
    await saveDocument(useEditorStore.getState())

    // Simulasi muat ulang halaman (clear store, run hydrateDraft)
    useEditorStore.setState({ hydrated: false, documentId: null })
    await hydrateDraft()

    // Ulangi urutan perpindahan setelah reload
    const currentStore = useEditorStore.getState()
    currentStore.setTipe("nota")
    await saveDocument(useEditorStore.getState())
    currentStore.setTipe("invoice")
    await saveDocument(useEditorStore.getState())
    currentStore.setTipe("kwitansi")
    await saveDocument(useEditorStore.getState())

    expect((await db.meta.get("nextSeq:nota"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:invoice"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBe(2)
  })

  // TES WAJIB 4: Draf yang belum pernah disimpan, dibuka lalu dimuat ulang lima kali tanpa mengubah apa pun: nextSeq tidak naik sama sekali.
  it("TES WAJIB 4: Draf belum pernah disimpan dimuat ulang 5 kali -> nextSeq tidak naik", async () => {
    await hydrateDraft()

    for (let i = 0; i < 5; i++) {
      useEditorStore.setState({ hydrated: false, documentId: null })
      await hydrateDraft()

      expect(await db.meta.get("nextSeq:nota")).toBeUndefined()
      expect(await db.meta.get("nextSeq:invoice")).toBeUndefined()
      expect(await db.meta.get("nextSeq:kwitansi")).toBeUndefined()
    }
  })

  // TES WAJIB 5: Nomor yang tampil untuk jenis yang belum pernah dipesan sama dengan hasil peekDocNomor, bukan string kosong.
  it("TES WAJIB 5: Nomor tampil untuk jenis belum dipesan sama dengan peekDocNomor, bukan string kosong", async () => {
    await hydrateDraft()
    const store = useEditorStore.getState()

    const expectedPeek = await peekDocNomor(businessId, store.tipe)
    expect(store.nomor).toBe(expectedPeek)
    expect(store.nomor).not.toBe("")
  })

  // TES WAJIB 6: Nomor manual tidak menaikkan nextSeq.
  it("TES WAJIB 6: Nomor manual tidak menaikkan nextSeq", async () => {
    await hydrateDraft()

    const store = useEditorStore.getState()
    store.setNomor("NT-MANUAL-999", true)
    store.updateItem(store.items[0].id, { nama: "Item Test", hargaSatuan: 10000 })

    const result = await saveDocument(useEditorStore.getState())
    expect(result?.nomor).toBe("NT-MANUAL-999")

    expect(await db.meta.get("nextSeq:nota")).toBeUndefined()
  })

  // TES WAJIB 7: Draf baru lewat createNewDocumentDraft tidak memakai nomor draf lama.
  it("TES WAJIB 7: Draf baru lewat createNewDocumentDraft tidak memakai nomor draf lama", async () => {
    await hydrateDraft()
    const store1 = useEditorStore.getState()
    store1.updateItem(store1.items[0].id, { nama: "Item 1", hargaSatuan: 10000 })
    await saveDocument(useEditorStore.getState()) // Nota 1 reserved ("NT/2608/0001")

    // Buat draf baru
    await createNewDocumentDraft()
    const store2 = useEditorStore.getState()

    // Peta draf lama (allocatedNomor) tidak dipakai lagi pada draf baru
    expect(Object.keys(store2.allocatedNomor)).toHaveLength(0)

    // Nomor draf baru peek ke urutan 2
    const peekedForNewDraft = await peekDocNomor(businessId, "nota")
    expect(store2.nomor).toBe(peekedNomorForNewDraft(peekedForNewDraft))
  })
})

function peekedNomorForNewDraft(str: string) {
  return str
}
