"use client"

import * as React from "react"
import { buildStrukLines, type StrukDocInput, type StrukBusinessInput } from "@/lib/struk/lines"
import type { CalcResult } from "@/lib/calc"

export type StrukImageProps = {
  doc: StrukDocInput
  calcResult: CalcResult
  business: StrukBusinessInput
  lebarKarakter: 32 | 48
}

export const StrukImage = React.forwardRef<HTMLDivElement, StrukImageProps>(
  ({ doc, calcResult, business, lebarKarakter }, ref) => {
    const lines = React.useMemo(
      () => buildStrukLines(doc, calcResult, business, lebarKarakter),
      [doc, calcResult, business, lebarKarakter],
    )

    return (
      <div
        ref={ref}
        style={{
          width: `calc(${lebarKarakter} * 1ch)`,
          boxSizing: "content-box",
          fontFamily: "var(--font-mono)",
        }}
        className="bg-white text-black px-[12px] py-[16px] font-mono leading-tight tracking-normal text-[13px] whitespace-pre select-none shadow-sm border border-line"
      >
        {lines.map((line, idx) => (
          <div key={idx} className="w-full">
            {line}
          </div>
        ))}
      </div>
    )
  },
)

StrukImage.displayName = "StrukImage"
