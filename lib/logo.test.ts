// lib/logo.test.ts
// Unit test murni untuk normalisasi logo dan pembatasan ukuran logo (SRS §6 / TUGAS 2).

import { describe, it, expect } from "vitest"
import { normalizeLogo, normalizeLogoDataUrl, LOGO_MAX_BYTES, LOGO_MAX_DIMENSION, getDataUrlByteSize } from "./logo"

describe("Logo Normalization (TUGAS 2)", () => {
  it("menolak berkas logo > 5MB", async () => {

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "large.png", { type: "image/png" })
    await expect(normalizeLogo(bigFile)).rejects.toThrow("Ukuran berkas logo melebihi 5 MB")
  })

  it("menolak tipe berkas selain PNG, JPEG, WebP (misalnya SVG)", async () => {

    const svgFile = new File(["<svg></svg>"], "logo.svg", { type: "image/svg+xml" })
    await expect(normalizeLogo(svgFile)).rejects.toThrow("Tipe berkas tidak didukung")
  })

  it("normalizeLogoDataUrl mengembalikan null jika dataUrl tidak valid", async () => {

    const result = await normalizeLogoDataUrl("invalid-data")
    expect(result).toBeNull()
  })

  it("getDataUrlByteSize mengukur ukuran byte Base64 dengan benar", () => {

    const dummyDataUrl = "data:image/png;base64,AAAA"
    expect(getDataUrlByteSize(dummyDataUrl)).toBe(3)
  })
})
