// lib/retention.ts
// Logika retensi data tamu dan cadangan otomatis mingguan (SRS §4.5).

import { db } from "./db/local"
import { getExportDataForActiveOwner, toBackupJson } from "./export/index"

export type RetentionInput = {
  guestStartedAt?: string | null
  docCount?: number
  lastOpenedAt?: string | null
}

export type RetentionStage = 0 | 1 | 2 | 3

const DAY_MS = 24 * 60 * 60 * 1000

function diffDays(startIso: string | null | undefined, nowIso: string): number {
  if (!startIso) return 0
  const startMs = new Date(startIso).getTime()
  const nowMs = new Date(nowIso).getTime()
  if (isNaN(startMs) || isNaN(nowMs)) return 0
  return Math.floor((nowMs - startMs) / DAY_MS)
}

/**
 * Menghitung tahap retensi data tamu secara murni (SRS §4.5).
 */
export function tahapRetensi(input: RetentionInput, nowIso: string): RetentionStage {
  const lastOpenedDays = diffDays(input.lastOpenedAt, nowIso)
  const startedDays = diffDays(input.guestStartedAt, nowIso)
  const docs = input.docCount ?? 0

  // Tahap 3: Tamu tidak membuka aplikasi >= 90 hari
  if (input.lastOpenedAt && lastOpenedDays >= 90) {
    return 3
  }

  // Tahap 2: Pemakaian >= 30 hari atau >= 50 dokumen
  if (startedDays >= 30 || docs >= 50) {
    return 2
  }

  // Tahap 1: Pemakaian >= 7 hari atau >= 10 dokumen
  if (startedDays >= 7 || docs >= 10) {
    return 1
  }

  return 0
}

/**
 * Menjalankan cadangan otomatis mingguan di latar (SRS §4.5 & TUGAS 3).
 * Bila now - meta.lastBackupAt >= 7 hari, siapkan file cadangan dan simpan di IndexedDB meta.
 */
export async function ensureWeeklyBackup(nowIsoStr?: string): Promise<boolean> {
  const now = nowIsoStr || new Date().toISOString()
  const lastBackupEntry = await db.meta.get("lastBackupAt")
  const lastBackupAt = lastBackupEntry?.value as string | undefined

  if (lastBackupAt) {
    const days = diffDays(lastBackupAt, now)
    if (days < 7) {
      return false
    }
  }

  // Buat cadangan baru
  const exportData = await getExportDataForActiveOwner()
  const backupJson = toBackupJson({ ...exportData, exportedAt: now })

  await db.meta.put({ key: "autoBackupJson", value: backupJson })
  await db.meta.put({ key: "lastBackupAt", value: now })

  return true
}
