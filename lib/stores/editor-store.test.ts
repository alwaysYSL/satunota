import { describe, it, expect, beforeEach } from "vitest"
import { useEditorStore } from "./editor-store"

describe("editor-store setTipe & reset behavior", () => {
  beforeEach(() => {
    useEditorStore.getState().resetDocument()
  })

  it("resets syarat, dueDate, and showJatuhTempo when switching away from invoice", () => {
    const store = useEditorStore.getState()

    // Switch to invoice and set invoice-specific fields
    store.setTipe("invoice")
    store.setField("dueDate", "2026-08-31")
    store.setField("syarat", "Pembayaran 30 hari")
    store.toggleChip("showJatuhTempo")

    expect(useEditorStore.getState().dueDate).toBe("2026-08-31")
    expect(useEditorStore.getState().syarat).toBe("Pembayaran 30 hari")
    expect(useEditorStore.getState().chips.showJatuhTempo).toBe(true)

    // Switch to nota
    useEditorStore.getState().setTipe("nota")

    expect(useEditorStore.getState().tipe).toBe("nota")
    expect(useEditorStore.getState().dueDate).toBe(null)
    expect(useEditorStore.getState().syarat).toBe("")
    expect(useEditorStore.getState().chips.showJatuhTempo).toBe(false)
  })

  it("resets diterimaDari when switching away from kwitansi", () => {
    const store = useEditorStore.getState()

    store.setTipe("kwitansi")
    store.setField("diterimaDari", "Budi")

    expect(useEditorStore.getState().diterimaDari).toBe("Budi")

    store.setTipe("nota")

    expect(useEditorStore.getState().diterimaDari).toBe("")
  })
})
