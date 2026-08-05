// lib/calc-map.ts
// Memetakan subtotal per item berdasarkan ID item untuk menghindari pergeseran indeks setelah filter.

export function buildItemSubtotalMap<T extends { id: string }>(
  items: readonly T[],
  itemSubtotals: readonly number[],
): Map<string, number> {
  const map = new Map<string, number>()
  items.forEach((item, idx) => {
    map.set(item.id, itemSubtotals[idx] ?? 0)
  })
  return map
}
