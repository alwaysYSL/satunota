"use client"

// lib/hooks/use-auto-save.ts
// Hook yang menyimpan perubahan editor ke Dexie dengan debounce 500ms.
// Memastikan hidrasi selesai sebelum simpan otomatis berjalan.

import { useEffect, useRef } from "react"
import { useEditorStore } from "@/lib/stores/editor-store"
import { saveDocument } from "@/lib/db/auto-save"
import { hydrateDraft } from "@/lib/db/draft"

let persistRequested = false

async function requestPersistentStorage(): Promise<void> {
  if (persistRequested) return
  if (typeof navigator === "undefined") return
  if (!navigator.storage?.persist) return

  persistRequested = true
  try {
    await navigator.storage.persist()
  } catch {
    // Abaikan jika browser menolak
  }
}

// Module-level reference to handle queued saves and cancellation
let activeSaveTimer: ReturnType<typeof setTimeout> | null = null
let hasPendingSave = false
let isSaving = false

/**
 * Batalkan penyimpanan yang sedang tertunda / diantrekan.
 * Dipanggil saat dokumen disoft-delete agar perubahan terakhir tidak menghidupkan kembali dokumen.
 */
export function cancelPendingAutoSave(): void {
  if (activeSaveTimer) {
    clearTimeout(activeSaveTimer)
    activeSaveTimer = null
  }
  hasPendingSave = false
}

export function useAutoSave(): void {
  const firstSaveDoneRef = useRef(false)

  // 1. Jalankan hidrasi dari Dexie saat mounting
  useEffect(() => {
    hydrateDraft().catch((err) => {
      console.error("[hydrateDraft] Gagal memuat draf:", err)
    })
  }, [])

  // 2. Berlangganan ke perubahan store di luar siklus render React
  useEffect(() => {
    const executeSave = async () => {
      if (isSaving) {
        hasPendingSave = true
        return
      }

      isSaving = true
      hasPendingSave = false

      try {
        const currentState = useEditorStore.getState()
        if (!currentState.hydrated || !currentState.documentId) return

        const result = await saveDocument(currentState)

        if (result) {
          const latestState = useEditorStore.getState()
          if (result.newlyAllocatedTipe) {
            latestState.setAllocatedNomor(
              result.newlyAllocatedTipe,
              result.nomor,
            )
          }
          if (
            !latestState.nomorManual &&
            latestState.nomor !== result.nomor
          ) {
            latestState.setNomor(result.nomor, false)
          }

          if (!firstSaveDoneRef.current) {
            firstSaveDoneRef.current = true
            requestPersistentStorage()
          }
        }
      } catch (err) {
        console.error("[auto-save] Gagal menyimpan:", err)
      } finally {
        isSaving = false
        // MASALAH 5: Jika ada perubahan baru saat penyimpanan berlangsung, jalankan ulang segera
        if (hasPendingSave) {
          hasPendingSave = false
          executeSave()
        }
      }
    }

    const unsub = useEditorStore.subscribe((state, prevState) => {
      if (!state.hydrated) return

      const contentChanged =
        state.tipe !== prevState.tipe ||
        state.nomor !== prevState.nomor ||
        state.tanggal !== prevState.tanggal ||
        state.dueDate !== prevState.dueDate ||
        state.customerNama !== prevState.customerNama ||
        state.diterimaDari !== prevState.diterimaDari ||
        state.catatan !== prevState.catatan ||
        state.syarat !== prevState.syarat ||
        state.items !== prevState.items ||
        state.diskonTipe !== prevState.diskonTipe ||
        state.diskonNilai !== prevState.diskonNilai ||
        state.pajakPersen !== prevState.pajakPersen ||
        state.pajakInklusif !== prevState.pajakInklusif ||
        state.ongkir !== prevState.ongkir ||
        state.biayaLain !== prevState.biayaLain ||
        state.pembulatanAktif !== prevState.pembulatanAktif ||
        state.dibayar !== prevState.dibayar ||
        state.businessNama !== prevState.businessNama ||
        state.businessAlamat !== prevState.businessAlamat ||
        state.businessTelepon !== prevState.businessTelepon

      if (!contentChanged) return

      if (activeSaveTimer) {
        clearTimeout(activeSaveTimer)
      }

      activeSaveTimer = setTimeout(() => {
        activeSaveTimer = null
        executeSave()
      }, 500)
    })

    return () => {
      unsub()
      if (activeSaveTimer) {
        clearTimeout(activeSaveTimer)
        activeSaveTimer = null
      }
    }
  }, [])
}
