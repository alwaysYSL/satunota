// components/shared/retention-banner.tsx
// Komponen pengingat retensi data tamu (Tahap 1, 2, 3) dan cadangan otomatis (SRS §4.5).

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Download, UserPlus, X, ShieldAlert } from "lucide-react"
import { db } from "@/lib/db/local"
import { getActiveOwnerId } from "@/lib/db/owner"
import { tahapRetensi, ensureWeeklyBackup, type RetentionStage } from "@/lib/retention"
import { getExportDataForActiveOwner, toBackupJson, downloadFile } from "@/lib/export/index"
import { Button } from "@/components/ui/button"

export function RetentionBanner() {
  const [isGuest, setIsGuest] = useState(false)
  const [stage, setStage] = useState<RetentionStage>(0)
  const [showStage2Dialog, setShowStage2Dialog] = useState(false)
  const [showStage3Dialog, setShowStage3Dialog] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)

  useEffect(() => {
    async function initRetention() {
      // 1. Jalankan cadangan mingguan otomatis di latar
      await ensureWeeklyBackup()

      // 2. Periksa apakah pengguna adalah tamu
      const lastUserEntry = await db.meta.get("lastUserId")
      const lastUser = lastUserEntry?.value || "guest"

      if (lastUser !== "guest") {
        setIsGuest(false)
        return
      }

      setIsGuest(true)

      const guestStartedEntry = await db.meta.get("guestStartedAt")
      const docCountEntry = await db.meta.get("docCount")
      const lastOpenedEntry = await db.meta.get("lastOpenedAt")
      const stage2ShownEntry = await db.meta.get("retentionStage2Shown")
      const stage3ShownEntry = await db.meta.get("retentionStage3Shown")

      const now = new Date().toISOString()
      const guestStartedAt = guestStartedEntry?.value as string | undefined
      const docCount = typeof docCountEntry?.value === "number" ? docCountEntry.value : 0
      const lastOpenedAt = lastOpenedEntry?.value as string | undefined

      const currentStage = tahapRetensi(
        { guestStartedAt, docCount, lastOpenedAt },
        now,
      )

      setStage(currentStage)

      // Perbarui lastOpenedAt ke sekarang
      await db.meta.put({ key: "lastOpenedAt", value: now })

      // Atur dialog sekali jalan
      if (currentStage === 3 && stage3ShownEntry?.value !== "true") {
        setShowStage3Dialog(true)
      } else if (currentStage === 2 && stage2ShownEntry?.value !== "true") {
        setShowStage2Dialog(true)
      }
    }

    initRetention()
  }, [])

  if (!isGuest) return null

  const handleDownloadBackup = async () => {
    const data = await getExportDataForActiveOwner()
    const jsonStr = toBackupJson(data)
    const dateStr = new Date().toISOString().split("T")[0]
    downloadFile(jsonStr, `satunota-backup-${dateStr}.json`, "application/json")
  }

  const handleDismissStage2 = async () => {
    setShowStage2Dialog(false)
    await db.meta.put({ key: "retentionStage2Shown", value: "true" })
  }

  const handleDismissStage3 = async () => {
    setShowStage3Dialog(false)
    await db.meta.put({ key: "retentionStage3Shown", value: "true" })
  }

  return (
    <>
      {/* Tahap 1: Banner halus di bagian atas */}
      {stage === 1 && !dismissedBanner && (
        <div className="bg-bg-subtle border-b border-line px-4 py-2 flex items-center justify-between text-[12px] text-fg-secondary">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-warning" />
            <span>Data Anda hanya tersimpan di perangkat ini.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="font-medium text-brand hover:underline flex items-center gap-1 min-h-[36px]"
            >
              <Download className="size-3.5" />
              <span>Cadangkan</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedBanner(true)}
              className="p-1 hover:bg-bg-hover rounded text-fg-tertiary"
              aria-label="Tutup banner"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tahap 2: Dialog pilihan Cadangkan / Buat Akun */}
      {showStage2Dialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-bg border border-line rounded-lg p-5 max-w-sm w-full shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-2 text-warning">
              <ShieldAlert className="size-5" />
              <h3 className="font-bold text-[15px] text-fg">Amankan Data Dokumen Anda</h3>
            </div>
            <p className="text-[13px] text-fg-secondary leading-relaxed">
              Anda sudah membuat banyak dokumen sebagai tamu. Agar data tidak hilang saat pembersihan browser, amankan data Anda sekarang.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/masuk"
                onClick={handleDismissStage2}
                className="w-full bg-brand text-white text-[13px] font-medium py-2.5 rounded-md hover:bg-brand-hover transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <UserPlus className="size-4" />
                <span>Buat Akun Gratis</span>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await handleDownloadBackup()
                  await handleDismissStage2()
                }}
                className="w-full bg-bg-subtle text-fg text-[13px] font-medium py-2.5 rounded-md hover:bg-bg-hover transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Download className="size-4" />
                <span>Unduh File Cadangan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tahap 3: Dialog Pengingat 90 Hari */}
      {showStage3Dialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-bg border border-line rounded-lg p-5 max-w-sm w-full shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="size-5" />
              <h3 className="font-bold text-[15px] text-fg">Pengingat Cadangan Tamu</h3>
            </div>
            <p className="text-[13px] text-fg-secondary leading-relaxed">
              Anda belum membuka SATUNOTA dalam kurun waktu lama. Amankan file cadangan data Anda sebelum melanjutkan.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await handleDownloadBackup()
                  await handleDismissStage3()
                }}
                className="w-full bg-brand text-white text-[13px] font-medium py-2.5 rounded-md hover:bg-brand-hover transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Download className="size-4" />
                <span>Cadangkan Sekarang</span>
              </button>
              <button
                type="button"
                onClick={handleDismissStage3}
                className="w-full text-fg-tertiary hover:text-fg text-[12px] py-1 transition-colors min-h-[36px]"
              >
                Lanjutkan ke Aplikasi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
