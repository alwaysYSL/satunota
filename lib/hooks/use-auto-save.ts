"use client"

// lib/hooks/use-auto-save.ts
// Hook yang menyimpan perubahan editor ke Dexie dengan debounce 500ms.
// Memastikan hidrasi selesai sebelum simpan otomatis berjalan.

import { useEffect, useRef } from "react"
import { useEditorStore } from "@/lib/stores/editor-store"
import { saveDocument } from "@/lib/db/auto-save"
import { hydrateDraft } from "@/lib/db/draft"
import {
  cancelPendingAutoSave,
  getActiveSaveTimer,
  setActiveSaveTimer,
  clearActiveSaveTimer,
  getHasPendingSave,
  setHasPendingSave,
  getIsSaving,
  setIsSaving,
} from "@/lib/db/save-queue"

export { cancelPendingAutoSave }

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

// Module-level hydration deduplication promise (React Strict Mode safety)
let pendingHydration: Promise<string> | null = null

export function safeHydrateDraft(): Promise<string> {
  if (!pendingHydration) {
    pendingHydration = hydrateDraft().finally(() => {
      // Biarkan pendingHydration tersimpan agar pemanggilan berurutan tetap aman
    })
  }
  return pendingHydration
}

export function useAutoSave(): void {
  const firstSaveDoneRef = useRef(false)

  // 1. Jalankan hidrasi dari Dexie saat mounting (ter-deduplikasi)
  useEffect(() => {
    safeHydrateDraft().catch((err) => {
      console.error("[hydrateDraft] Gagal memuat draf:", err)
    })
  }, [])

  // 2. Berlangganan ke perubahan store di luar siklus render React
  useEffect(() => {
    const executeSave = async () => {
      if (getIsSaving()) {
        setHasPendingSave(true)
        return
      }

      setIsSaving(true)
      setHasPendingSave(false)

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

          // Setelah simpan berhasil, JANGAN memanggil setNomor bila result.nomor sama dengan nomor di store
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
        setIsSaving(false)
        if (getHasPendingSave()) {
          setHasPendingSave(false)
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

      clearActiveSaveTimer()

      const timer = setTimeout(() => {
        setActiveSaveTimer(null)
        executeSave()
      }, 500)
      setActiveSaveTimer(timer)
    })

    return () => {
      unsub()
      if (getActiveSaveTimer()) {
        clearActiveSaveTimer()
      }
    }
  }, [])
}
