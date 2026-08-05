// lib/pattern.test.ts
// Unit test murni untuk validasi pola penomoran dokumen.

import { describe, it, expect } from "vitest"
import { validateDocPattern } from "./pattern"

describe("validateDocPattern", () => {
  it("menerima pola standar yang sah", () => {
    expect(validateDocPattern("NT/{YY}{MM}/{0001}").valid).toBe(true)
    expect(validateDocPattern("INV/{YYYY}/{001}").valid).toBe(true)
    expect(validateDocPattern("KW/{DD}{MM}/{01}").valid).toBe(true)
  })

  it("menolak pola tanpa token urutan", () => {
    const res = validateDocPattern("NT/{YY}{MM}")
    expect(res.valid).toBe(false)
    expect(res.message).toContain("wajib memuat token urutan")
  })

  it("menolak pola dengan token yang tidak dikenal", () => {
    const res = validateDocPattern("NT/{XYZ}/{0001}")
    expect(res.valid).toBe(false)
    expect(res.message).toContain("Token {XYZ} tidak dikenal")
  })

  it("menolak pola kosong", () => {
    const res = validateDocPattern("   ")
    expect(res.valid).toBe(false)
    expect(res.message).toContain("tidak boleh kosong")
  })
})
