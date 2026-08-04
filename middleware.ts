import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * MASALAH 4: Kecualikan sw.js, offline.html, manifest, /_next/static, dan berkas di public/fonts.
     * Middleware tidak boleh menyentuh permintaan yang dilayani oleh Service Worker offline.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|offline\\.html|manifest|manifest\\.webmanifest|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
}
