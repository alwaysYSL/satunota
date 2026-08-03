// lib/calc.ts
// Satu-satunya sumber kebenaran angka.
// Fungsi murni, tanpa akses jaringan atau penyimpanan.

export type CalcInput = {
  items: { qty: number; hargaSatuan: number; diskonBaris: number }[]
  diskonTipe: "nominal" | "persen"
  diskonNilai: number
  pajakPersen: number
  pajakInklusif: boolean
  ongkir: number
  biayaLain: number
  pembulatanAktif: boolean
  dibayar: number
}

export type CalcResult = {
  subtotal: number
  diskonNominal: number
  dasarPajak: number
  pajakNominal: number
  pembulatanNominal: number
  total: number
  sisa: number
  itemSubtotals: number[]
}

const r = (n: number) => Math.round(n)

export function calc(i: CalcInput): CalcResult {
  // 1. subtotalBaris = qty × hargaSatuan − diskonBaris
  const itemSubtotals = i.items.map((it) =>
    Math.max(0, r(it.qty * it.hargaSatuan) - it.diskonBaris),
  )

  // 2. subtotal = Σ subtotalBaris
  const subtotal = itemSubtotals.reduce((a, b) => a + b, 0)

  // 3. setelahDiskon = subtotal − diskonNota
  const diskonNominal =
    i.diskonTipe === "persen"
      ? r((subtotal * i.diskonNilai) / 100)
      : Math.min(i.diskonNilai, subtotal)

  const dasarPajak = Math.max(0, subtotal - diskonNominal)
  const p = i.pajakPersen / 100

  // 4–5. pajak
  const pajakNominal = i.pajakInklusif
    ? r((dasarPajak * p) / (1 + p))
    : r(dasarPajak * p)

  // 6. total
  const totalKasar = i.pajakInklusif
    ? dasarPajak + i.ongkir + i.biayaLain
    : dasarPajak + pajakNominal + i.ongkir + i.biayaLain

  const total = i.pembulatanAktif
    ? Math.round(totalKasar / 100) * 100
    : totalKasar

  // 7. sisa = total − dibayar
  return {
    subtotal,
    diskonNominal,
    dasarPajak,
    pajakNominal,
    pembulatanNominal: total - totalKasar,
    total,
    sisa: total - i.dibayar,
    itemSubtotals,
  }
}
