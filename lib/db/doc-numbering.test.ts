// lib/db/doc-numbering.test.ts
// Unit test untuk penomoran dokumen dengan pemilik tunggal keputusan nomor (ensureNomorForDraft).

import { describe, it, expect, beforeEach } from "vitest"
import "fake-indexeddb/auto"
import { db } from "./local"
import { ensureGuestBusiness } from "./guest"
import { ensureNomorForDraft } from "./doc-numbering-owner"
import { peekDocNomor, reserveDocNomor } from "./doc-numbering"
import { saveDocument } from "./auto-save"
import { hydrateDraft, createNewDocumentDraft } from "./draft"
import { useEditorStore } from "@/lib/stores/editor-store"
import { safeHydrateDraft } from "@/lib/hooks/use-auto-save"
import fs from "fs"
import path from "path"

describe("Penomoran Dokumen — Pemilik Tunggal Keputusan Nomor", () => {
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

  // TES WAJIB 1: ensureNomorForDraft dipanggil sepuluh kali berbarengan dengan argumen sama lewat Promise.all:
  // reserveDocNomor terpanggil tepat satu kali dan semua hasil identik.
  it("TES WAJIB 1: ensureNomorForDraft 10 kali berbarengan lewat Promise.all -> reserveDocNomor dipanggil tepat 1 kali dan hasil identik", async () => {
    const draftId = "draft-test-concurrent"

    // Panggil 10 kali berbarengan dengan Promise.all
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => ensureNomorForDraft(draftId, "nota")),
    )

    // 1. Semua hasil identik
    const firstNomor = results[0]
    expect(firstNomor).toBeDefined()
    expect(results.every((n) => n === firstNomor)).toBe(true)

    // 2. reserveDocNomor terpanggil tepat 1 kali (nextSeq:nota di meta bernilai 2)
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(2)
  })

  // TES WAJIB 2: Pindah tab nota → invoice → kwitansi dua putaran penuh: nextSeq naik paling banyak satu kali per jenis, putaran kedua tidak naik sama sekali.
  it("TES WAJIB 2: Pindah tab nota -> invoice -> kwitansi 2 putaran penuh: nextSeq naik paling banyak 1 kali per jenis, putaran kedua tidak naik", async () => {
    await hydrateDraft()
    const draftId = useEditorStore.getState().documentId!

    // Putaran 1
    const n1 = await ensureNomorForDraft(draftId, "nota")
    const i1 = await ensureNomorForDraft(draftId, "invoice")
    const k1 = await ensureNomorForDraft(draftId, "kwitansi")

    expect((await db.meta.get("nextSeq:nota"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:invoice"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBe(2)

    // Putaran 2
    const n2 = await ensureNomorForDraft(draftId, "nota")
    const i2 = await ensureNomorForDraft(draftId, "invoice")
    const k2 = await ensureNomorForDraft(draftId, "kwitansi")

    expect(n2).toBe(n1)
    expect(i2).toBe(i1)
    expect(k2).toBe(k1)

    // nextSeq TIDAK naik lagi pada putaran kedua (tetap 2)
    expect((await db.meta.get("nextSeq:nota"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:invoice"))?.value).toBe(2)
    expect((await db.meta.get("nextSeq:kwitansi"))?.value).toBe(2)
  })

  // TES WAJIB 3: Hidrasi dipanggil dua kali berturut-turut: nextSeq tidak naik dua kali, dan documentId tetap sama.
  it("TES WAJIB 3: Hidrasi dipanggil dua kali berturut-turut: nextSeq tidak naik dua kali, documentId tetap sama", async () => {
    // Panggil safeHydrateDraft dua kali berturut-turut
    const [id1, id2] = await Promise.all([safeHydrateDraft(), safeHydrateDraft()])

    expect(id1).toBe(id2)

    // Verifikasi nextSeq tidak dipesan berulang
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(2)
  })

  // TES WAJIB 4: Draf belum tersimpan, dimuat ulang lima kali tanpa perubahan: nextSeq tidak naik.
  it("TES WAJIB 4: Draf belum tersimpan dimuat ulang 5 kali tanpa perubahan -> nextSeq tidak naik", async () => {
    const initialId = await hydrateDraft()
    const initialSeq = (await db.meta.get("nextSeq:nota"))?.value ?? 1

    for (let i = 0; i < 5; i++) {
      useEditorStore.setState({ hydrated: false, documentId: null })
      await hydrateDraft()
    }

    const finalSeq = (await db.meta.get("nextSeq:nota"))?.value ?? 1
    expect(finalSeq).toBe(initialSeq)
    expect(useEditorStore.getState().documentId).toBe(initialId)
  })

  // TES WAJIB 5: Nomor manual tidak menaikkan nextSeq dan tidak pernah ditimpa oleh hasil simpan otomatis.
  it("TES WAJIB 5: Nomor manual tidak menaikkan nextSeq dan tidak ditimpa simpan otomatis", async () => {
    await hydrateDraft()

    const store = useEditorStore.getState()
    store.setNomor("NT-MANUAL-999", true)
    store.updateItem(store.items[0].id, { nama: "Barang Test", hargaSatuan: 10000 })

    const result = await saveDocument(useEditorStore.getState())
    expect(result?.nomor).toBe("NT-MANUAL-999")
    expect(useEditorStore.getState().nomor).toBe("NT-MANUAL-999")

    // nextSeq:nota tidak naik (tetap undefined atau bernilai 2 awal)
    const seqEntry = await db.meta.get("nextSeq:nota")
    expect(seqEntry?.value).toBe(2) // Hanya 1 kali dari ensureNomorForDraft saat hidrasi draf awal
  })

  // TES WAJIB 6: saveDocument tidak lagi mengandung pemanggilan reserveDocNomor (periksa dengan pencarian teks).
  it("TES WAJIB 6: saveDocument tidak mengandung pemanggilan reserveDocNomor", () => {
    const autoSaveContent = fs.readFileSync(
      path.resolve(process.cwd(), "lib/db/auto-save.ts"),
      "utf-8",
    )
    expect(autoSaveContent.includes("reserveDocNomor")).toBe(false)
  })
})
