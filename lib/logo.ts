// lib/logo.ts
// Utilitas normalisasi dan pembatasan logo usaha (TUGAS 1).

export const LOGO_MAX_DIMENSION = 512
export const LOGO_MAX_BYTES = 200 * 1024 // 200 KB

export function getDataUrlByteSize(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",")
  if (commaIdx === -1) return dataUrl.length
  const base64Str = dataUrl.slice(commaIdx + 1)
  return Math.round((base64Str.length * 3) / 4)
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Gagal memuat gambar logo"))
    img.src = src
  })
}

async function renderCanvasDataUrl(
  imgSource: CanvasImageSource,
  origWidth: number,
  origHeight: number,
  maxDim: number,
  mimeType: "image/png" | "image/jpeg",
  quality?: number,
): Promise<string> {
  let w = origWidth
  let h = origHeight

  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h * maxDim) / w)
      w = maxDim
    } else {
      w = Math.round((w * maxDim) / h)
      h = maxDim
    }
  }

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Gagal membuat konteks 2D canvas")
  }

  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  ctx.drawImage(imgSource, 0, 0, w, h)

  return canvas.toDataURL(mimeType, quality)
}

export async function normalizeLogo(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran berkas logo melebihi 5 MB")
  }

  const validTypes = ["image/png", "image/jpeg", "image/webp"]
  if (!validTypes.includes(file.type)) {
    throw new Error("Tipe berkas tidak didukung (gunakan PNG, JPEG, atau WebP)")
  }

  let bitmap: ImageBitmap | null = null
  try {
    let imgSource: CanvasImageSource
    let origW = 0
    let origH = 0

    if (typeof createImageBitmap !== "undefined") {
      bitmap = await createImageBitmap(file)
      imgSource = bitmap
      origW = bitmap.width
      origH = bitmap.height
    } else {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Gagal membaca file logo"))
        reader.readAsDataURL(file)
      })
      const img = await loadImageElement(dataUrl)
      imgSource = img
      origW = img.naturalWidth || img.width
      origH = img.naturalHeight || img.height
    }

    // 1. PNG @ 512
    let result = await renderCanvasDataUrl(imgSource, origW, origH, LOGO_MAX_DIMENSION, "image/png")
    if (getDataUrlByteSize(result) <= LOGO_MAX_BYTES) return result

    // 2. PNG @ 384
    result = await renderCanvasDataUrl(imgSource, origW, origH, 384, "image/png")
    if (getDataUrlByteSize(result) <= LOGO_MAX_BYTES) return result

    // 3. PNG @ 256
    result = await renderCanvasDataUrl(imgSource, origW, origH, 256, "image/png")
    if (getDataUrlByteSize(result) <= LOGO_MAX_BYTES) return result

    // 4. JPEG 0.85 @ 256
    result = await renderCanvasDataUrl(imgSource, origW, origH, 256, "image/jpeg", 0.85)
    return result
  } finally {
    if (bitmap) {
      bitmap.close()
    }
  }
}

export async function normalizeLogoDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null
  if (getDataUrlByteSize(dataUrl) <= LOGO_MAX_BYTES) return dataUrl

  try {
    const img = await loadImageElement(dataUrl)
    const origW = img.naturalWidth || img.width
    const origH = img.naturalHeight || img.height

    // 1. PNG @ 512
    let result = await renderCanvasDataUrl(img, origW, origH, LOGO_MAX_DIMENSION, "image/png")
    if (getDataUrlByteSize(result) <= LOGO_MAX_BYTES) return result

    // 2. PNG @ 384
    result = await renderCanvasDataUrl(img, origW, origH, 384, "image/png")
    if (getDataUrlByteSize(result) <= LOGO_MAX_BYTES) return result

    // 3. PNG @ 256
    result = await renderCanvasDataUrl(img, origW, origH, 256, "image/png")
    if (getDataUrlByteSize(result) <= LOGO_MAX_BYTES) return result

    // 4. JPEG 0.85 @ 256
    result = await renderCanvasDataUrl(img, origW, origH, 256, "image/jpeg", 0.85)
    return result
  } catch {
    return null
  }
}
