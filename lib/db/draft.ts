// lib/db/draft.ts
// Pengelolaan draf dokumen dan hidrasi ke store editor.

import { v7 as uuidv7 } from "uuid"
import { db } from "./local"
import { ensureGuestBusiness } from "./guest"
import { useEditorStore } from "@/lib/stores/editor-store"
import { ensureNomorForDraft } from "./doc-numbering-owner"

/**
 * Panggil saat aplikasi / editor dibuka untuk memuat draf aktif dari Dexie.
 *
 * PERUBAHAN PEMILIK TUNGGAL:
 * hydrateDraft dan openDocumentDraft memakai ensureNomorForDraft untuk
 * menentukan nomor yang tampil. Hapus pemanggilan peekDocNomor langsung dari kedua fungsi.
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

  // Muat peta draftNomor:<draftId> dari meta ke allocatedNomor di store untuk ketiga jenis sekaligus
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
  const initialNomor = await ensureNomorForDraft(targetDraftId, currentTipe)

  useEditorStore.setState({
    documentId: targetDraftId,
    nomor: store.nomor || initialNomor,
    allocatedNomor: {
      ...draftNomorMap,
      [currentTipe]: initialNomor,
    },
    hydrated: true,
  })

  return targetDraftId
}

/**
 * Buat draf dokumen baru dengan UUID v7 baru.
 * Draf baru mulai dengan peta kosong (allocatedNomor = {}).
 */
export async function createNewDocumentDraft(): Promise<string> {
  const newDraftId = uuidv7()
  await db.meta.put({ key: "activeDraftId", value: newDraftId })
  const store = useEditorStore.getState()
  store.resetDocument() // resetDocument mereset allocatedNomor ke {}

  const initialNomor = await ensureNomorForDraft(newDraftId, "nota")

  useEditorStore.setState({
    documentId: newDraftId,
    nomor: initialNomor,
    allocatedNomor: { nota: initialNomor },
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

    const ensuredNomor = await ensureNomorForDraft(docId, doc.tipe)

    useEditorStore.setState((s) => ({
      nomor: ensuredNomor,
      allocatedNomor: {
        ...draftNomorMap,
        ...s.allocatedNomor,
        [doc.tipe]: ensuredNomor,
      },
    }))
  }
}
