// lib/calc-map.test.ts
import { describe, it, expect } from "vitest"
import { buildItemSubtotalMap } from "./calc-map"

describe("buildItemSubtotalMap", () => {
  it("memetakan id item ke subtotal berdasarkan indeks awal 1-to-1", () => {
    const items = [
      { id: "item-a", nama: "Kopi Susu" },
      { id: "item-b", nama: "" }, // baris kosong
      { id: "item-c", nama: "Roti Bakar" },
    ]
    const itemSubtotals = [30000, 0, 12000]

    const map = buildItemSubtotalMap(items, itemSubtotals)
    expect(map.get("item-a")).toBe(30000)
    expect(map.get("item-b")).toBe(0)
    expect(map.get("item-c")).toBe(12000)
  })
})
