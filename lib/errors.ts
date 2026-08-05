// lib/errors.ts
// Utilitas deskripsi kesalahan murni untuk log dan UI error message.

export function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  if (typeof Event !== "undefined" && e instanceof Event) {
    const t = e.target as HTMLImageElement | null
    return `Gagal memuat sumber daya${t?.src ? `: ${String(t.src).slice(0, 120)}` : ""}`
  }
  if (e && typeof e === "object") {
    try {
      return JSON.stringify(e)
    } catch {
      return Object.prototype.toString.call(e)
    }
  }
  return String(e)
}
