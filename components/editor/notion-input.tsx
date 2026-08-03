"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type NotionInputProps = Omit<React.ComponentProps<"input">, "onChange"> & {
  onChange?: (value: string) => void
}

/**
 * Input bergaya Notion (DESIGN §4.2):
 * - Tanpa border saat idle, latar transparan
 * - Hover: bg-bg-hover
 * - Focus: border 1px brand, tanpa ring tebal
 * - Minimal 16px font size (mencegah auto-zoom iOS)
 * - Warna teks utama: text-fg (#37352F)
 */
export function NotionInput({
  className,
  onChange,
  ...props
}: NotionInputProps) {
  return (
    <input
      className={cn(
        "w-full bg-transparent px-2 py-1.5 text-[16px] leading-normal text-fg font-normal",
        "placeholder:text-fg-tertiary",
        "border border-transparent rounded-sm",
        "hover:bg-bg-hover",
        "focus:border-brand focus:bg-transparent focus:outline-none",
        "transition-[background-color] duration-[20ms] ease-in",
        className,
      )}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  )
}

type NotionTextareaProps = Omit<React.ComponentProps<"textarea">, "onChange"> & {
  onChange?: (value: string) => void
}

export function NotionTextarea({
  className,
  onChange,
  ...props
}: NotionTextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full bg-transparent px-2 py-1.5 text-[16px] leading-normal text-fg font-normal",
        "placeholder:text-fg-tertiary",
        "border border-transparent rounded-sm",
        "hover:bg-bg-hover",
        "focus:border-brand focus:bg-transparent focus:outline-none",
        "transition-[background-color] duration-[20ms] ease-in",
        "resize-none",
        className,
      )}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  )
}

/**
 * Input angka mata uang / nominal (DESIGN §4.2):
 * - Pemisah ribuan otomatis saat mengetik (mis. 15.000)
 * - Nilai di store tetap integer rupiah
 * - rata kanan, inputmode="decimal", tnum
 */
export function NotionCurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  ...props
}: {
  value: number
  onChange: (val: number) => void
  placeholder?: string
  className?: string
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "placeholder">) {
  const formatDisplay = (num: number): string => {
    if (num === 0) return ""
    return num.toLocaleString("id-ID")
  }

  const [text, setText] = React.useState<string>(() => formatDisplay(value))

  React.useEffect(() => {
    const cleanedTextNum = parseInt(text.replace(/\D/g, ""), 10) || 0
    if (cleanedTextNum !== value) {
      setText(formatDisplay(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digitsOnly = raw.replace(/\D/g, "")
    const num = digitsOnly ? parseInt(digitsOnly, 10) : 0
    setText(num === 0 ? (raw === "0" ? "0" : "") : num.toLocaleString("id-ID"))
    onChange(num)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent px-2 py-1.5 text-[16px] leading-normal text-fg font-normal",
        "placeholder:text-fg-tertiary",
        "border border-transparent rounded-sm",
        "hover:bg-bg-hover",
        "focus:border-brand focus:bg-transparent focus:outline-none",
        "transition-[background-color] duration-[20ms] ease-in",
        "text-right tnum",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Input Qty (DESIGN §4.2):
 * - Pemisah ribuan otomatis untuk angka bulat (mis. 1.000)
 * - Mendukung desimal (mis. 0,5 atau 0.5)
 * - rata kanan, inputmode="decimal", tnum
 */
export function NotionQtyInput({
  value,
  onChange,
  placeholder = "1",
  className,
  ...props
}: {
  value: number
  onChange: (val: number) => void
  placeholder?: string
  className?: string
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "placeholder">) {
  const formatQty = (n: number): string => {
    if (n === 0) return ""
    if (Number.isInteger(n)) {
      return n.toLocaleString("id-ID")
    }
    return String(n).replace(".", ",")
  }

  const [text, setText] = React.useState<string>(() => formatQty(value))

  React.useEffect(() => {
    const cleanedFloat = parseQtyString(text)
    if (cleanedFloat !== value) {
      setText(formatQty(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setText(raw)
    const num = parseQtyString(raw)
    onChange(num)
  }

  const handleBlur = () => {
    if (value > 0) {
      setText(formatQty(value))
    } else {
      setText("")
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent px-2 py-1.5 text-[16px] leading-normal text-fg font-normal",
        "placeholder:text-fg-tertiary",
        "border border-transparent rounded-sm",
        "hover:bg-bg-hover",
        "focus:border-brand focus:bg-transparent focus:outline-none",
        "transition-[background-color] duration-[20ms] ease-in",
        "text-right tnum",
        className,
      )}
      {...props}
    />
  )
}

function parseQtyString(str: string): number {
  if (!str.trim()) return 0
  const normalized = str.replace(/,/g, ".")
  const parts = normalized.split(".")
  if (parts.length > 2) {
    // Multiple dots -> thousand separators
    const cleaned = normalized.replace(/\./g, "")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }
  if (parts.length === 2 && parts[1]?.length === 3 && parts[0] !== "0") {
    // Looks like thousand separator e.g. 1.000
    const parsedInt = parseInt(normalized.replace(/\./g, ""), 10)
    return isNaN(parsedInt) ? 0 : parsedInt
  }
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : parsed
}
