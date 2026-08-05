// lib/db/owner.ts
// Manajemen ownerId aktif per pengguna / sesi tamu.

import { v7 as uuidv7 } from "uuid"
import { db } from "./local"

/**
 * Memperbarui meta.lastUserId dari listener auth Supabase (saat login / logout).
 */
export async function updateLastUserId(userId: string | null): Promise<void> {
  const value = userId && userId.trim() !== "" ? userId : "guest"
  await db.meta.put({ key: "lastUserId", value })
}

/**
 * Mendapatkan ownerId aktif untuk kueri data lokal.
 * Urutan evaluasi:
 * 1. meta.lastUserId (jika ada dan bukan 'guest')
 * 2. meta.guestId (jika sesi tamu)
 * 3. Jika meta.guestId belum ada, buat UUID baru dan simpan ke meta
 */
export async function getActiveOwnerId(): Promise<string> {
  const lastUserEntry = await db.meta.get("lastUserId")
  if (
    lastUserEntry &&
    typeof lastUserEntry.value === "string" &&
    lastUserEntry.value !== "guest"
  ) {
    return lastUserEntry.value
  }

  const guestEntry = await db.meta.get("guestId")
  if (guestEntry && typeof guestEntry.value === "string") {
    return guestEntry.value
  }

  const newGuestId = uuidv7()
  await db.transaction("rw", db.meta, async () => {
    await db.meta.bulkPut([
      { key: "guestId", value: newGuestId },
      { key: "lastUserId", value: "guest" },
    ])
  })

  return newGuestId
}
