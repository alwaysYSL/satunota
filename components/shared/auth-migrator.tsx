"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { migrateGuestToAccount, isUserMigrated } from "@/lib/db/migrate-guest"
import { db } from "@/lib/db/local"
import { updateLastUserId } from "@/lib/db/owner"
import { AlertCircle, RefreshCw } from "lucide-react"

/**
 * Komponen pembantu untuk menjalankan migrasi data tamu (migrateGuestToAccount)
 * secara otomatis begitu sesi autentikasi Supabase terbentuk.
 *
 * FITUR (MASALAH 3):
 * - Memeriksa penanda permanen via isUserMigrated. Melewati migrasi bila sudah pernah migrasi.
 * - Bila navigator.onLine bernilai false, JANGAN jalankan migrasi dan JANGAN tampilkan spanduk galat.
 *   Menyediakan listener peristiwa "online" untuk menjalankan migrasi saat koneksi kembali.
 * - Menampilkan spanduk galat dan tombol Coba Lagi hanya untuk kegagalan nyata saat daring.
 */
export function AuthMigrator() {
  const [error, setError] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const runMigration = useCallback(async (uid: string) => {
    // Bila offline, jangan jalankan dan jangan tampilkan spanduk galat
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return
    }

    // Periksa apakah user ini sudah pernah dimigrasi
    if (await isUserMigrated(uid)) {
      return
    }

    try {
      setMigrating(true)
      setError(null)
      await migrateGuestToAccount(uid)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyinkronkan data tamu ke akun."
      setError(msg)
    } finally {
      setMigrating(false)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // 1. Periksa sesi pengguna saat komponen pertama kali dimuat
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        updateLastUserId(user.id)
        runMigration(user.id)
      } else {
        updateLastUserId(null)
      }
    })

    // 2. Berlangganan perubahan sesi auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        updateLastUserId(session.user.id)
        runMigration(session.user.id)
      } else {
        setUserId(null)
        updateLastUserId(null)
      }
    })

    // 3. Listener saat koneksi kembali online
    const handleOnline = () => {
      if (userId) {
        runMigration(userId)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
    }

    return () => {
      subscription.unsubscribe()
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
      }
    }
  }, [userId, runMigration])

  if (!error) return null

  return (
    <div className="bg-danger-bg border-b border-danger/30 px-4 py-2.5 text-danger text-[13px] flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0" />
        <span>Gagal menyinkronkan data tamu: {error}</span>
      </div>
      {userId && (
        <button
          type="button"
          disabled={migrating}
          onClick={() => runMigration(userId)}
          className="flex items-center gap-1 font-medium underline hover:opacity-80 disabled:opacity-50 min-h-[44px] px-2"
        >
          <RefreshCw className={`size-3.5 ${migrating ? "animate-spin" : ""}`} />
          <span>{migrating ? "Mencoba..." : "Coba Lagi"}</span>
        </button>
      )}
    </div>
  )
}
