// lib/db/guest.ts
// Business lokal untuk tamu — dibuat saat dokumen pertama disimpan.

import { v7 as uuidv7 } from "uuid"
import { db } from "./local"

/**
 * Pastikan ada satu business lokal untuk sesi tamu.
 * Jika sudah ada (guestId tersimpan di meta), kembalikan businessId-nya.
 * Jika belum, buat baris baru di businesses dan simpan guestId + guestStartedAt.
 */
export async function ensureGuestBusiness(): Promise<string> {
  const existing = await db.meta.get("guestId")
  if (existing && typeof existing.value === "string") {
    // Verifikasi business masih ada
    const biz = await db.businesses.get(existing.value)
    if (biz) return biz.id
  }

  const now = new Date().toISOString()
  const businessId = uuidv7()

  await db.transaction("rw", [db.businesses, db.meta], async () => {
    await db.businesses.add({
      id: businessId,
      userId: null,
      nama: "",
      logoUrl: null,
      alamat: null,
      telepon: null,
      email: null,
      npwp: null,
      polaNota: "NT/{YY}{MM}/{0001}",
      polaInvoice: "INV/{YY}{MM}/{0001}",
      polaKwitansi: "KW/{YY}{MM}/{0001}",
      defaultPajak: 0,
      defaultCatatan: null,
      qrisUrl: null,
      rekening: null,
      ttdUrl: null,
      createdAt: now,
      updatedAt: now,
    })

    await db.meta.bulkPut([
      { key: "guestId", value: businessId },
      { key: "guestStartedAt", value: now },
    ])
  })

  return businessId
}
