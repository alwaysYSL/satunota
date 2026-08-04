import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // PENJELASAN MASALAH 1 (Dua baris usaha untuk satu pengguna):
      // Di rute ini kita sengaja TIDAK membuat baris 'businesses' baru dengan UUID acak.
      // Jika rute server ini membuat baris 'businesses' ber-ID acak untuk pengguna baru,
      // maka saat 'migrateGuestToAccount' di sisi klien mengunggah data usaha milik tamu
      // (yang menggunakan UUIDv7 lokal), Postgres akan menolak karena indeks unik
      // `businesses_user_unique` melarang satu user_id memiliki lebih dari satu usaha.
      //
      // Dengan menyerahkan pembuatan/pengunggahan baris 'businesses' ke 'migrateGuestToAccount'
      // di sisi klien, ID usaha di IndexedDB lokal dan ID usaha di Supabase server
      // dipastikan PERSIS SAMA (1:1). Pendekatan ini menjamin TIDAK AKAN PERNAH menghasilkan
      // dua baris usaha untuk satu pengguna.

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Kalau ada error, redirect ke halaman masuk
  return NextResponse.redirect(`${origin}/masuk?error=auth`)
}
