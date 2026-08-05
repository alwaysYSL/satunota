// lib/status.test.ts
// Unit test murni untuk fungsi statusTampil.

import { describe, it, expect } from "vitest"
import { statusTampil } from "./status"

describe("statusTampil (TUGAS 4)", () => {
  const today = "2026-08-05"

  it("tepat di tanggal dueDate -> belum jatuh tempo (kembali terkirim)", () => {
    const doc = {
      tipe: "invoice" as const,
      status: "terkirim" as const,
      dueDate: "2026-08-05",
    }
    expect(statusTampil(doc, today)).toBe("terkirim")
  })

  it("sehari sesudah dueDate -> jatuh tempo", () => {
    const doc = {
      tipe: "invoice" as const,
      status: "terkirim" as const,
      dueDate: "2026-08-04",
    }
    expect(statusTampil(doc, today)).toBe("jatuh_tempo")
  })

  it("dueDate kosong -> tidak pernah (kembali terkirim)", () => {
    const doc = {
      tipe: "invoice" as const,
      status: "terkirim" as const,
      dueDate: null,
    }
    expect(statusTampil(doc, today)).toBe("terkirim")
  })

  it("status sebagian -> tidak pernah jatuh tempo", () => {
    const doc = {
      tipe: "invoice" as const,
      status: "sebagian" as const,
      dueDate: "2026-08-01",
    }
    expect(statusTampil(doc, today)).toBe("sebagian")
  })

  it("status lunas -> tidak pernah jatuh tempo", () => {
    const doc = {
      tipe: "invoice" as const,
      status: "lunas" as const,
      dueDate: "2026-08-01",
    }
    expect(statusTampil(doc, today)).toBe("lunas")
  })

  it("tipe nota atau kwitansi -> tidak pernah jatuh tempo", () => {
    const notaDoc = {
      tipe: "nota" as const,
      status: "terkirim" as const,
      dueDate: "2026-08-01",
    }
    expect(statusTampil(notaDoc, today)).toBe("terkirim")

    const kwitansiDoc = {
      tipe: "kwitansi" as const,
      status: "lunas" as const,
      dueDate: "2026-08-01",
    }
    expect(statusTampil(kwitansiDoc, today)).toBe("lunas")
  })
})
