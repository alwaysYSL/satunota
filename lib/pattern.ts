// lib/pattern.ts
// Validasi pola nomor dokumen (SCHEMA §9).

export type PatternValidation = {
  valid: boolean
  message?: string
}

export const VALID_TOKENS = new Set(["YYYY", "YY", "MM", "DD", "0001", "001", "01"])

/**
 * Memvalidasi pola penomoran dokumen.
 * Menerima token: {YYYY}, {YY}, {MM}, {DD}, {0001}, {001}, {01}.
 * Harus memuat setidaknya satu token urutan ({0001}, {001}, atau {01}).
 */
export function validateDocPattern(pattern: string): PatternValidation {
  const trimmed = pattern.trim()
  if (!trimmed) {
    return { valid: false, message: "Pola nomor tidak boleh kosong." }
  }

  const matches = trimmed.match(/{([^}]+)}/g)
  if (!matches) {
    return { valid: false, message: "Pola nomor harus memuat setidaknya satu token urutan seperti {0001}." }
  }

  let hasSeqToken = false

  for (const m of matches) {
    const token = m.slice(1, -1)
    if (!VALID_TOKENS.has(token)) {
      return {
        valid: false,
        message: `Token {${token}} tidak dikenal. Gunakan token {YYYY}, {YY}, {MM}, {DD}, {0001}, {001}, atau {01}.`,
      }
    }
    if (token === "0001" || token === "001" || token === "01") {
      hasSeqToken = true
    }
  }

  if (!hasSeqToken) {
    return { valid: false, message: "Pola nomor wajib memuat token urutan ({0001}, {001}, atau {01})." }
  }

  return { valid: true }
}
