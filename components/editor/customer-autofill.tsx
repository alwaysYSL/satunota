// components/editor/customer-autofill.tsx
// Input autofill nama pelanggan dengan dropdown saran dari tabel customers.

"use client"

import { useState, useEffect, useRef } from "react"
import { searchCustomers } from "@/lib/db/customers"
import type { LocalCustomer } from "@/lib/db/local"
import { useEditorStore } from "@/lib/stores/editor-store"
import { cn } from "@/lib/utils"

export function CustomerAutofillInput() {
  const customerNama = useEditorStore((s) => s.customerNama)
  const setField = useEditorStore((s) => s.setField)

  const [suggestions, setSuggestions] = useState<LocalCustomer[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Cari saran saat nilai customerNama berubah
  useEffect(() => {
    let isCancelled = false

    if (!customerNama || customerNama.trim() === "") {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    searchCustomers(customerNama).then((res) => {
      if (!isCancelled) {
        setSuggestions(res)
        setIsOpen(res.length > 0)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [customerNama])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelect(customer: LocalCustomer) {
    setField("customerNama", customer.nama)
    setField("customerId", customer.id)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={customerNama}
        onChange={(e) => {
          setField("customerNama", e.target.value)
          setField("customerId", null)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true)
        }}
        placeholder="Nama pelanggan"
        className="w-full bg-transparent px-2 py-1.5 text-[15px] font-normal text-fg border border-transparent rounded-sm hover:bg-bg-hover focus:border-brand focus:outline-none transition-[background-color] duration-[20ms] ease-in min-h-[44px]"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-30 w-full bg-bg border border-line rounded-md shadow-md py-1 animate-in fade-in zoom-in-95">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="flex w-full flex-col text-left px-3 py-2 text-[13px] hover:bg-bg-hover transition-colors min-h-[44px] justify-center"
            >
              <span className="font-medium text-fg">{c.nama}</span>
              {(c.telepon || c.alamat) && (
                <span className="text-[11px] text-fg-tertiary truncate">
                  {[c.telepon, c.alamat].filter(Boolean).join(" • ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
