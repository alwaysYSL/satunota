"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { migrateGuestToAccount } from "@/lib/db/migrate-guest"
import { AlertCircle, RefreshCw } from "lucide-react"

/**
 * Komponen pembantu untuk menjalankan migrasi data tamu (migrateGuestToAccount)
 * secara otomatis begitu sesi autentikasi Supabase terbentuk.
 *
 * FITUR (MASALAH 2):
 * - Menjalankan migrasi secara otomatis setelah pengguna masuk (onAuthStateChange atau getUser).
 * - Menampilkan spanduk galat di bagian atas antarmuka jika migrasi gagal, dilengkapi tombol 'Coba Lagi'.
 */
export function AuthMigrator() {
  const [error, setError] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const runMigration = async (uid: string) => {
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
  }

  useEffect(() => {
    const supabase = createClient()

    // 1. Periksa sesi pengguna saat komponen pertama kali dimuat
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        runMigration(user.id)
      }
    })

    // 2. Berlangganan perubahan sesi auth (misal setelah berhasil klik magic link)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        runMigration(session.user.id)
      } else {
        setUserId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
