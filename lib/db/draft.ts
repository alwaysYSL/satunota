// lib/db/draft.ts
// Pengelolaan draf dokumen dan hidrasi ke store editor.

import { v7 as uuidv7 } from "uuid"
import { db } from "./local"
import { ensureGuestBusiness } from "./guest"
import { useEditorStore } from "@/lib/stores/editor-store"
import { peekDocNomor } from "./doc-numbering"

/**
 * Panggil saat aplikasi / editor dibuka untuk memuat draf aktif dari Dexie.
 *
 * ATURAN 3:
 * `hydrateDraft` HARUS memuat peta `draftNomor:<draftId>` ke `allocatedNomor` di store
 * untuk ketiga jenis dokumen sekaligus — bukan hanya jenis dokumen yang tersimpan.
 */
export async function hydrateDraft(): Promise<string> {
  const store = useEditorStore.getState()
  if (store.hydrated && store.documentId) {
    return store.documentId
  }

  const businessId = await ensureGuestBusiness()

  // 1. Muat identitas usaha dari tabel businesses
  const biz = await db.businesses.get(businessId)
  if (biz) {
    useEditorStore.setState({
      businessNama: biz.nama ?? "",
      businessAlamat: biz.alamat ?? "",
      businessTelepon: biz.telepon ?? "",
    })
  }

  // 2. Muat draf aktif
  const activeDraftEntry = await db.meta.get("activeDraftId")
  const activeDraftId =
    typeof activeDraftEntry?.value === "string" ? activeDraftEntry.value : null

  const targetDraftId = activeDraftId || uuidv7()
  if (!activeDraftEntry) {
    await db.meta.put({ key: "activeDraftId", value: targetDraftId })
  }

  // ATURAN 3: Muat peta draftNomor:<draftId> dari meta ke allocatedNomor di store untuk ketiga jenis sekaligus
  const draftNomorEntry = await db.meta.get(`draftNomor:${targetDraftId}`)
  let draftNomorMap: Partial<Record<"nota" | "invoice" | "kwitansi", string>> = {}
  if (draftNomorEntry && typeof draftNomorEntry.value === "string") {
    try {
      draftNomorMap = JSON.parse(draftNomorEntry.value)
    } catch {
      draftNomorMap = {}
    }
  }

  if (activeDraftId) {
    const doc = await db.documents.get(activeDraftId)
    if (doc && !doc.deletedAt) {
      const items = await db.documentItems
        .where("documentId")
        .equals(activeDraftId)
        .sortBy("urutan")

      store.loadDocument(doc, items)

      // Gabungkan draftNomorMap dengan allocatedNomor di store
      useEditorStore.setState((s) => ({
        allocatedNomor: {
          ...draftNomorMap,
          ...s.allocatedNomor,
          [doc.tipe]: doc.nomor,
        },
      }))
      return activeDraftId
    }
  }

  // Jika draf belum pernah disimpan di db.documents
  const currentTipe = store.tipe
  let initialNomor = draftNomorMap[currentTipe]

  if (!initialNomor) {
    // ATURAN 4: Untuk jenis yang belum pernah punya nomor, nomor yang tampil WAJIB dari peekDocNomor
    initialNomor = await peekDocNomor(businessId, currentTipe)
  }

  useEditorStore.setState({
    documentId: targetDraftId,
    nomor: store.nomor || initialNomor,
    allocatedNomor: draftNomorMap,
    hydrated: true,
  })

  return targetDraftId
}

/**
 * Buat draf dokumen baru dengan UUID v7 baru.
 * ATURAN 6: Draf baru mulai dengan peta kosong (allocatedNomor = {}).
 */
export async function createNewDocumentDraft(): Promise<string> {
  const newDraftId = uuidv7()
  await db.meta.put({ key: "activeDraftId", value: newDraftId })
  const store = useEditorStore.getState()
  store.resetDocument() // resetDocument mereset allocatedNomor ke {}
  const businessId = await ensureGuestBusiness()
  const peekedNomor = await peekDocNomor(businessId, "nota")
  useEditorStore.setState({
    documentId: newDraftId,
    nomor: peekedNomor,
    allocatedNomor: {},
    hydrated: true,
  })
  return newDraftId
}

/**
 * Buka dokumen tersimpan dari riwayat sebagai activeDraftId dan muat ke editor store.
 */
export async function openDocumentDraft(docId: string): Promise<void> {
  await db.meta.put({ key: "activeDraftId", value: docId })
  const doc = await db.documents.get(docId)
  if (doc && !doc.deletedAt) {
    const items = await db.documentItems
      .where("documentId")
      .equals(docId)
      .sortBy("urutan")

    const draftNomorEntry = await db.meta.get(`draftNomor:${docId}`)
    let draftNomorMap: Partial<Record<"nota" | "invoice" | "kwitansi", string>> = {}
    if (draftNomorEntry && typeof draftNomorEntry.value === "string") {
      try {
        draftNomorMap = JSON.parse(draftNomorEntry.value)
      } catch {
        draftNomorMap = {}
      }
    }

    useEditorStore.getState().loadDocument(doc, items)

    useEditorStore.setState((s) => ({
      allocatedNomor: {
        ...draftNomorMap,
        ...s.allocatedNomor,
        [doc.tipe]: doc.nomor,
      },
    }))
  }
}
