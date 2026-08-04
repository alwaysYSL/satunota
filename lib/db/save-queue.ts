// lib/db/save-queue.ts
// Modul pengelola antrean dan penanda status penyimpanan otomatis IndexedDB.
// Mencegah impor melingkar (circular import) antara lapisan DB dan hook UI.

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

export function getActiveSaveTimer(): ReturnType<typeof setTimeout> | null {
  return activeSaveTimer
}

export function setActiveSaveTimer(timer: ReturnType<typeof setTimeout> | null): void {
  activeSaveTimer = timer
}

export function clearActiveSaveTimer(): void {
  if (activeSaveTimer) {
    clearTimeout(activeSaveTimer)
    activeSaveTimer = null
  }
}

export function getHasPendingSave(): boolean {
  return hasPendingSave
}

export function setHasPendingSave(pending: boolean): void {
  hasPendingSave = pending
}

export function getIsSaving(): boolean {
  return isSaving
}

export function setIsSaving(saving: boolean): void {
  isSaving = saving
}
