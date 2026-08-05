// lib/status.ts
// Perhitungan status tampil murni tanpa menyentuh database.
// Status 'jatuh_tempo' HANYA dihitung saat tampil dari status 'terkirim'
// dan dueDate < hari ini (SRS 5.6 & SCHEMA §3).

import type { LocalDocument } from "@/lib/db/local"

export type DisplayStatus =
  | "draf"
  | "terkirim"
  | "sebagian"
  | "lunas"
  | "jatuh_tempo"

/**
 * Menghitung status tampil secara murni.
 * @param doc Dokumen minimal (tipe, status, dueDate)
 * @param today Tanggal hari ini dalam format YYYY-MM-DD
 */
export function statusTampil(
  doc: Pick<LocalDocument, "tipe" | "status" | "dueDate">,
  today: string,
): DisplayStatus {
  if (doc.tipe === "invoice" && doc.status === "terkirim" && doc.dueDate) {
    if (doc.dueDate < today) {
      return "jatuh_tempo"
    }
  }
  return doc.status
}
