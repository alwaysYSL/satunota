"use client"

import * as React from "react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { NotionInput, NotionCurrencyInput, NotionTextarea } from "./notion-input"
import { useEditorStore, type ChipVisibility } from "@/lib/stores/editor-store"

type ChipDrawerProps = {
  activeChip: keyof ChipVisibility | null
  onClose: () => void
}

export function ChipDrawer({ activeChip, onClose }: ChipDrawerProps) {
  const open = activeChip !== null

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      showSwipeHandle
    >
      <DrawerContent>
        {activeChip === "showDiskon" && <DiskonForm onClose={onClose} />}
        {activeChip === "showPajak" && <PajakForm onClose={onClose} />}
        {activeChip === "showOngkir" && <OngkirForm onClose={onClose} />}
        {activeChip === "showBiayaLain" && <BiayaLainForm onClose={onClose} />}
        {activeChip === "showCatatan" && <CatatanForm onClose={onClose} />}
        {activeChip === "showJatuhTempo" && <JatuhTempoForm onClose={onClose} />}
      </DrawerContent>
    </Drawer>
  )
}

// ─── Diskon ─────────────────────────────────────────────

function DiskonForm({ onClose }: { onClose: () => void }) {
  const diskonTipe = useEditorStore((s) => s.diskonTipe)
  const diskonNilai = useEditorStore((s) => s.diskonNilai)
  const setField = useEditorStore((s) => s.setField)
  const toggleChip = useEditorStore((s) => s.toggleChip)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Diskon</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-4 p-4">
        {/* Tipe diskon */}
        <div className="flex gap-1 rounded-md bg-bg-subtle p-1">
          <button
            type="button"
            onClick={() => setField("diskonTipe", "nominal")}
            className={`flex-1 rounded-sm px-3 py-1.5 text-[13px] font-medium min-h-[44px] transition-[background-color] duration-[20ms] ease-in ${
              diskonTipe === "nominal"
                ? "bg-brand-subtle text-brand"
                : "text-fg-secondary hover:bg-bg-hover"
            }`}
          >
            Nominal (Rp)
          </button>
          <button
            type="button"
            onClick={() => setField("diskonTipe", "persen")}
            className={`flex-1 rounded-sm px-3 py-1.5 text-[13px] font-medium min-h-[44px] transition-[background-color] duration-[20ms] ease-in ${
              diskonTipe === "persen"
                ? "bg-brand-subtle text-brand"
                : "text-fg-secondary hover:bg-bg-hover"
            }`}
          >
            Persen (%)
          </button>
        </div>

        {/* Nilai diskon */}
        <div>
          <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
            {diskonTipe === "persen" ? "Persen diskon (%)" : "Nominal diskon (Rp)"}
          </label>
          <NotionCurrencyInput
            value={diskonNilai}
            onChange={(val) => setField("diskonNilai", val)}
            placeholder="0"
            className="border border-line-strong rounded-sm"
          />
        </div>
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button variant="default" size="lg" className="min-h-[44px] bg-brand text-white hover:bg-brand-hover" onClick={onClose}>Selesai</Button>} />
        <button
          type="button"
          onClick={() => {
            setField("diskonNilai", 0)
            toggleChip("showDiskon")
            onClose()
          }}
          className="text-[13px] text-danger py-2 min-h-[44px]"
        >
          Hapus diskon
        </button>
      </DrawerFooter>
    </>
  )
}

// ─── Pajak ──────────────────────────────────────────────

function PajakForm({ onClose }: { onClose: () => void }) {
  const pajakPersen = useEditorStore((s) => s.pajakPersen)
  const pajakInklusif = useEditorStore((s) => s.pajakInklusif)
  const setField = useEditorStore((s) => s.setField)
  const toggleChip = useEditorStore((s) => s.toggleChip)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Pajak</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-4 p-4">
        {/* Preset pajak */}
        <div className="flex gap-2">
          {[0, 11].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setField("pajakPersen", val)}
              className={`rounded-sm px-4 py-1.5 text-[13px] font-medium min-h-[44px] border transition-[background-color] duration-[20ms] ease-in ${
                pajakPersen === val
                  ? "border-transparent bg-brand-subtle text-brand"
                  : "border-line-strong text-fg-secondary hover:bg-bg-hover"
              }`}
            >
              {val}%
            </button>
          ))}
        </div>

        {/* Persen bebas */}
        <div>
          <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
            Persen pajak (%)
          </label>
          <NotionCurrencyInput
            value={pajakPersen}
            onChange={(val) => setField("pajakPersen", Math.min(100, val))}
            placeholder="0"
            className="border border-line-strong rounded-sm"
          />
        </div>

        {/* Inklusif toggle */}
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={pajakInklusif}
            onChange={(e) => setField("pajakInklusif", e.target.checked)}
            className="size-5 rounded-sm accent-brand"
          />
          <span className="text-[16px] text-fg">Harga sudah termasuk pajak</span>
        </label>
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button variant="default" size="lg" className="min-h-[44px] bg-brand text-white hover:bg-brand-hover" onClick={onClose}>Selesai</Button>} />
        <button
          type="button"
          onClick={() => {
            setField("pajakPersen", 0)
            setField("pajakInklusif", false)
            toggleChip("showPajak")
            onClose()
          }}
          className="text-[13px] text-danger py-2 min-h-[44px]"
        >
          Hapus pajak
        </button>
      </DrawerFooter>
    </>
  )
}

// ─── Ongkir ─────────────────────────────────────────────

function OngkirForm({ onClose }: { onClose: () => void }) {
  const ongkir = useEditorStore((s) => s.ongkir)
  const setField = useEditorStore((s) => s.setField)
  const toggleChip = useEditorStore((s) => s.toggleChip)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Ongkos kirim</DrawerTitle>
      </DrawerHeader>
      <div className="p-4">
        <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
          Nominal ongkir (Rp)
        </label>
        <NotionCurrencyInput
          value={ongkir}
          onChange={(val) => setField("ongkir", val)}
          placeholder="0"
          className="border border-line-strong rounded-sm"
        />
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button variant="default" size="lg" className="min-h-[44px] bg-brand text-white hover:bg-brand-hover" onClick={onClose}>Selesai</Button>} />
        <button
          type="button"
          onClick={() => {
            setField("ongkir", 0)
            toggleChip("showOngkir")
            onClose()
          }}
          className="text-[13px] text-danger py-2 min-h-[44px]"
        >
          Hapus ongkir
        </button>
      </DrawerFooter>
    </>
  )
}

// ─── Biaya Lain ─────────────────────────────────────────

function BiayaLainForm({ onClose }: { onClose: () => void }) {
  const biayaLain = useEditorStore((s) => s.biayaLain)
  const setField = useEditorStore((s) => s.setField)
  const toggleChip = useEditorStore((s) => s.toggleChip)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Biaya lain</DrawerTitle>
      </DrawerHeader>
      <div className="p-4">
        <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
          Nominal biaya lain (Rp)
        </label>
        <NotionCurrencyInput
          value={biayaLain}
          onChange={(val) => setField("biayaLain", val)}
          placeholder="0"
          className="border border-line-strong rounded-sm"
        />
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button variant="default" size="lg" className="min-h-[44px] bg-brand text-white hover:bg-brand-hover" onClick={onClose}>Selesai</Button>} />
        <button
          type="button"
          onClick={() => {
            setField("biayaLain", 0)
            toggleChip("showBiayaLain")
            onClose()
          }}
          className="text-[13px] text-danger py-2 min-h-[44px]"
        >
          Hapus biaya lain
        </button>
      </DrawerFooter>
    </>
  )
}

// ─── Catatan ────────────────────────────────────────────

function CatatanForm({ onClose }: { onClose: () => void }) {
  const catatan = useEditorStore((s) => s.catatan)
  const syarat = useEditorStore((s) => s.syarat)
  const setField = useEditorStore((s) => s.setField)
  const toggleChip = useEditorStore((s) => s.toggleChip)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Catatan & syarat</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
            Catatan
          </label>
          <NotionTextarea
            value={catatan}
            onChange={(v) => setField("catatan", v)}
            placeholder="Terima kasih atas pembeliannya"
            rows={3}
            className="border border-line-strong rounded-sm"
          />
        </div>
        <div>
          <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
            Syarat pembayaran
          </label>
          <NotionTextarea
            value={syarat}
            onChange={(v) => setField("syarat", v)}
            placeholder="Pembayaran dalam 30 hari"
            rows={2}
            className="border border-line-strong rounded-sm"
          />
        </div>
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button variant="default" size="lg" className="min-h-[44px] bg-brand text-white hover:bg-brand-hover" onClick={onClose}>Selesai</Button>} />
        <button
          type="button"
          onClick={() => {
            setField("catatan", "")
            setField("syarat", "")
            toggleChip("showCatatan")
            onClose()
          }}
          className="text-[13px] text-danger py-2 min-h-[44px]"
        >
          Hapus catatan
        </button>
      </DrawerFooter>
    </>
  )
}

// ─── Jatuh Tempo ────────────────────────────────────────

function JatuhTempoForm({ onClose }: { onClose: () => void }) {
  const dueDate = useEditorStore((s) => s.dueDate)
  const setField = useEditorStore((s) => s.setField)
  const toggleChip = useEditorStore((s) => s.toggleChip)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Jatuh tempo</DrawerTitle>
      </DrawerHeader>
      <div className="p-4">
        <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
          Tanggal jatuh tempo
        </label>
        <input
          type="date"
          value={dueDate ?? ""}
          onChange={(e) => setField("dueDate", e.target.value || null)}
          className="w-full rounded-sm border border-line-strong bg-transparent px-3 py-2 text-[16px] text-fg min-h-[44px] focus:border-brand focus:outline-none"
        />
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button variant="default" size="lg" className="min-h-[44px] bg-brand text-white hover:bg-brand-hover" onClick={onClose}>Selesai</Button>} />
        <button
          type="button"
          onClick={() => {
            setField("dueDate", null)
            toggleChip("showJatuhTempo")
            onClose()
          }}
          className="text-[13px] text-danger py-2 min-h-[44px]"
        >
          Hapus jatuh tempo
        </button>
      </DrawerFooter>
    </>
  )
}
