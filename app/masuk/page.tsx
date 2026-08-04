"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function MasukPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (countdown > 0) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      // TAMBAHAN MASALAH 5: Tangani status 429 atau pesan rate limit
      const isRateLimit =
        authError.status === 429 ||
        authError.message.toLowerCase().includes("rate limit")

      if (isRateLimit) {
        setError(
          "Terlalu banyak permintaan tautan masuk. Tunggu beberapa menit lalu coba lagi.",
        )
      } else {
        // Tampilkan pesan galat asli dari Supabase di bawah teks ramah
        setError(`Gagal mengirim tautan masuk: ${authError.message}`)
      }
      return
    }

    setSent(true)
    setCountdown(60)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-[var(--space-4)]">
      <div className="w-full max-w-[360px]">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-fg mb-[var(--space-2)]">
          Masuk ke SATUNOTA
        </h1>
        <p className="text-fg-secondary text-[16px] leading-[1.5] mb-[var(--space-6)]">
          Masukkan email untuk menerima tautan masuk. Tanpa kata sandi.
        </p>

        {sent ? (
          <div className="space-y-[var(--space-4)]">
            <div className="rounded-md bg-brand-subtle p-[var(--space-4)]">
              <div className="flex items-start gap-[var(--space-3)]">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <p className="text-fg text-[16px] font-medium leading-[1.5]">
                    Tautan masuk sudah dikirim ke emailmu
                  </p>
                  <p className="text-fg-secondary text-[13px] leading-[1.4] mt-[var(--space-1)]">
                    Buka email <span className="font-medium text-fg">{email}</span> dan klik tautannya untuk masuk.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={countdown > 0}
              onClick={() => setSent(false)}
              className="w-full"
              style={{ minHeight: "44px" }}
            >
              {countdown > 0
                ? `Kirim ulang dalam ${countdown}s`
                : "Kirim ulang tautan masuk"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-[var(--space-4)]">
            <div>
              <label
                htmlFor="email-input"
                className="block text-[13px] font-medium leading-[1.4] text-fg-secondary mb-[var(--space-1)]"
              >
                Email
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@contoh.com"
                className="w-full rounded-md border border-line-strong bg-bg px-[var(--space-3)] py-[var(--space-3)] text-[16px] text-fg placeholder:text-fg-tertiary focus:border-brand focus:outline-none transition-colors duration-[20ms] ease-in"
                style={{ minHeight: "44px" }}
              />
            </div>

            {error && (
              <p className="text-[13px] text-danger leading-[1.4]">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !email || countdown > 0}
              className="w-full"
              style={{ minHeight: "44px" }}
            >
              {loading
                ? "Mengirim..."
                : countdown > 0
                ? `Tunggu ${countdown}s`
                : "Kirim tautan masuk"}
            </Button>
          </form>
        )}

        <div className="mt-[var(--space-6)] text-center">
          <a
            href="/"
            className="text-[13px] text-fg-secondary hover:text-fg transition-colors duration-[20ms] ease-in"
          >
            Kembali ke editor
          </a>
        </div>
      </div>
    </main>
  )
}
