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
 * - Jika meta."activeDraftId" ada dan dokumen ditemukan di db.documents:
 *   muat dokumen beserta itemnya ke Zustand store dan tandai hydrated = true.
 * - Jika draf belum tersimpan di db.documents atau meta."activeDraftId" belum ada:
 *   gunakan activeDraftId tersebut (atau buat UUID v7 baru) sebagai documentId,
 *   simpan ke meta."activeDraftId", dan tandai hydrated = true.
 *   Nomor ditampilkan menggunakan peekDocNomor (tanpa menaikkan nextSeq).
 *
 * PENTING: Simpan otomatis WAJIB berhenti total sampai hidrasi selesai.
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

  if (activeDraftId) {
    const doc = await db.documents.get(activeDraftId)
    if (doc && !doc.deletedAt) {
      const items = await db.documentItems
        .where("documentId")
        .equals(activeDraftId)
        .sortBy("urutan")

      store.loadDocument(doc, items)
      return activeDraftId
    }
  }

  // Jika draf belum ada di Dexie atau belum pernah disimpan
  const draftId = activeDraftId || uuidv7()
  if (!activeDraftEntry) {
    await db.meta.put({ key: "activeDraftId", value: draftId })
  }

  const peekedNomor = await peekDocNomor(businessId, store.tipe)

  useEditorStore.setState({
    documentId: draftId,
    nomor: store.nomor || peekedNomor,
    hydrated: true,
  })
  return draftId
}

/**
 * Buat draf dokumen baru dengan UUID v7 baru.
 * Memperbarui meta."activeDraftId" ke ID baru ini dan mereset Zustand store.
 * Ini memastikan dokumen baru tidak menimpa dokumen sebelumnya di riwayat.
 */
export async function createNewDocumentDraft(): Promise<string> {
  const newDraftId = uuidv7()
  await db.meta.put({ key: "activeDraftId", value: newDraftId })
  const store = useEditorStore.getState()
  store.resetDocument()
  const businessId = await ensureGuestBusiness()
  const peekedNomor = await peekDocNomor(businessId, "nota")
  useEditorStore.setState({ documentId: newDraftId, nomor: peekedNomor, hydrated: true })
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
    useEditorStore.getState().loadDocument(doc, items)
  }
}
