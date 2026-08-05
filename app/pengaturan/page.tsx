// app/pengaturan/page.tsx
// Halaman Pengaturan SATUNOTA (Profil Usaha, Logo, Pola Nomor, Pajak Default, Ekspor/Cadangan, Logout).

"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ChevronLeft,
  Building,
  Upload,
  Trash2,
  Hash,
  Percent,
  Download,
  LogOut,
  Info,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { db, type LocalBusiness } from "@/lib/db/local"
import { getActiveOwnerId, updateLastUserId } from "@/lib/db/owner"
import { createClient } from "@/lib/supabase/client"
import { validateDocPattern } from "@/lib/pattern"
import {
  getExportDataForActiveOwner,
  toCsvDokumen,
  toCsvItem,
  toBackupJson,
  downloadFile,
} from "@/lib/export/index"
import { ensureWeeklyBackup } from "@/lib/retention"
import { formatTanggal } from "@/lib/format"
import { v7 as uuidv7 } from "uuid"

export default function SettingsPage() {
  const router = useRouter()
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form Profil Usaha & Pengaturan
  const [nama, setNama] = useState("")
  const [alamat, setAlamat] = useState("")
  const [telepon, setTelepon] = useState("")
  const [email, setEmail] = useState("")
  const [npwp, setNpwp] = useState("")

  const [polaNota, setPolaNota] = useState("NT/{YY}{MM}/{0001}")
  const [polaInvoice, setPolaInvoice] = useState("INV/{YY}{MM}/{0001}")
  const [polaKwitansi, setPolaKwitansi] = useState("KW/{YY}{MM}/{0001}")

  const [defaultPajak, setDefaultPajak] = useState(0)
  const [logoBlob, setLogoBlob] = useState<Blob | string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  // System Backup Info
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)

  // Errors
  const [notaPatternError, setNotaPatternError] = useState<string | null>(null)
  const [invPatternError, setInvPatternError] = useState<string | null>(null)
  const [kwPatternError, setKwPatternError] = useState<string | null>(null)

  // Fetch Business Data
  const business = useLiveQuery(async () => {
    const ownerId = await getActiveOwnerId()
    const allBiz = await db.businesses.toArray()
    return allBiz.find((b) => b.userId === ownerId) || allBiz[0] || null
  }, [])

  // Sync state when business changes
  useEffect(() => {
    if (business) {
      setNama(business.nama || "")
      setAlamat(business.alamat || "")
      setTelepon(business.telepon || "")
      setEmail(business.email || "")
      setNpwp(business.npwp || "")
      setPolaNota(business.polaNota || "NT/{YY}{MM}/{0001}")
      setPolaInvoice(business.polaInvoice || "INV/{YY}{MM}/{0001}")
      setPolaKwitansi(business.polaKwitansi || "KW/{YY}{MM}/{0001}")
      setDefaultPajak(typeof business.defaultPajak === "number" ? business.defaultPajak : 0)

      if (business.logoUrl) {
        setLogoBlob(business.logoUrl)
      }
    }
  }, [business])

  // Manage Object URL for logo preview
  useEffect(() => {
    if (!logoBlob) {
      setLogoPreviewUrl(null)
      return
    }

    let url: string
    if (logoBlob instanceof Blob) {
      url = URL.createObjectURL(logoBlob)
    } else {
      url = String(logoBlob)
    }

    setLogoPreviewUrl(url)

    return () => {
      if (logoBlob instanceof Blob && url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [logoBlob])

  // Check auth state & lastBackupAt
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        setUserId(user.id)
      } else {
        setIsLoggedIn(false)
        setUserId(null)
      }
    })

    db.meta.get("lastBackupAt").then((entry) => {
      if (entry?.value) {
        setLastBackupAt(String(entry.value))
      }
    })
  }, [])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Handle Logo Upload
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      showToast("File harus berupa gambar (PNG/JPG)")
      return
    }

    setLogoBlob(file)
    showToast("Logo berhasil dipilih. Klik Simpan Pengaturan.")
  }

  function handleRemoveLogo() {
    setLogoBlob(null)
    showToast("Logo dihapus. Klik Simpan Pengaturan.")
  }

  // Handle Save All Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()

    // Validate Patterns
    const vNota = validateDocPattern(polaNota)
    const vInv = validateDocPattern(polaInvoice)
    const vKw = validateDocPattern(polaKwitansi)

    setNotaPatternError(vNota.valid ? null : vNota.message || "Pola tidak valid")
    setInvPatternError(vInv.valid ? null : vInv.message || "Pola tidak valid")
    setKwPatternError(vKw.valid ? null : vKw.message || "Pola tidak valid")

    if (!vNota.valid || !vInv.valid || !vKw.valid) {
      showToast("Terdapat kesalahan pada pola penomoran")
      return
    }

    const ownerId = await getActiveOwnerId()
    const now = new Date().toISOString()
    const targetId = business?.id || uuidv7()

    const updatedBiz: LocalBusiness = {
      id: targetId,
      userId: isLoggedIn ? userId : null,
      nama: nama.trim() || "Usaha Saya",
      logoUrl: logoBlob as string | null,
      alamat: alamat.trim() || null,
      telepon: telepon.trim() || null,
      email: email.trim() || null,
      npwp: npwp.trim() || null,
      polaNota: polaNota.trim(),
      polaInvoice: polaInvoice.trim(),
      polaKwitansi: polaKwitansi.trim(),
      defaultPajak: Math.min(100, Math.max(0, defaultPajak)),
      defaultCatatan: business?.defaultCatatan || null,
      qrisUrl: business?.qrisUrl || null,
      rekening: business?.rekening || null,
      ttdUrl: business?.ttdUrl || null,
      plan: business?.plan || (isLoggedIn ? "free" : "guest"),
      createdAt: business?.createdAt || now,
      updatedAt: now,
    }

    await db.businesses.put(updatedBiz)

    // Jika pengguna login, antrekan ke outbox (outbox dipasang, tidak perlu disinkronkan sekarang)
    if (isLoggedIn && userId) {
      await db.outbox.add({
        id: uuidv7(),
        entity: "business",
        entityId: targetId,
        op: "upsert",
        payload: updatedBiz,
        updatedAt: now,
        createdAt: now,
        attempts: 0,
      })
    }

    showToast("Pengaturan berhasil disimpan")
  }

  // Exports
  async function handleExportDokumenCsv() {
    const data = await getExportDataForActiveOwner()
    const csv = toCsvDokumen(data.documents)
    const dateStr = new Date().toISOString().split("T")[0]
    downloadFile(csv, `dokumen-${dateStr}.csv`, "text/csv;charset=utf-8;")
    showToast("dokumen.csv berhasil diunduh")
  }

  async function handleExportItemCsv() {
    const data = await getExportDataForActiveOwner()
    const csv = toCsvItem(data.documents, data.items)
    const dateStr = new Date().toISOString().split("T")[0]
    downloadFile(csv, `item-${dateStr}.csv`, "text/csv;charset=utf-8;")
    showToast("item.csv berhasil diunduh")
  }

  async function handleExportBackupJson() {
    const data = await getExportDataForActiveOwner()
    const jsonStr = toBackupJson(data)
    const dateStr = new Date().toISOString().split("T")[0]
    downloadFile(jsonStr, `satunota-backup-${dateStr}.json`, "application/json")
    showToast("satunota-backup.json berhasil diunduh")
  }

  async function handleDownloadAutoBackup() {
    const autoBackupEntry = await db.meta.get("autoBackupJson")
    if (!autoBackupEntry?.value) {
      // Jika belum ada, buat baru sekarang
      await ensureWeeklyBackup()
      const newEntry = await db.meta.get("autoBackupJson")
      if (!newEntry?.value) {
        showToast("Belum ada cadangan otomatis")
        return
      }
      const dateStr = new Date().toISOString().split("T")[0]
      downloadFile(String(newEntry.value), `satunota-autobackup-${dateStr}.json`, "application/json")
      showToast("Cadangan otomatis berhasil diunduh")
      return
    }

    const dateStr = new Date().toISOString().split("T")[0]
    downloadFile(String(autoBackupEntry.value), `satunota-autobackup-${dateStr}.json`, "application/json")
    showToast("Cadangan otomatis berhasil diunduh")
  }

  async function handleLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      await updateLastUserId(null)
      setIsLoggedIn(false)
      showToast("Berhasil keluar dari akun")
      router.push("/")
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-4 text-fg">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg text-[13px] px-4 py-2 rounded-md shadow-md flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Utama */}
      <div className="flex items-center justify-between mb-5 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center justify-center h-11 w-11 rounded-md hover:bg-bg-hover text-fg-secondary transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Kembali ke Editor"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-fg tracking-tight">
            Pengaturan
          </h1>
        </div>

        <Link
          href="/tentang"
          className="flex items-center gap-1.5 px-3 py-2 bg-bg-subtle text-fg-secondary hover:text-fg text-[13px] font-medium rounded-md transition-colors min-h-[44px]"
        >
          <Info className="size-4" />
          <span>Tentang</span>
        </Link>
      </div>

      <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
        {/* Seksi Profil Usaha */}
        <section className="bg-bg border border-line rounded-md p-4 flex flex-col gap-4">
          <h2 className="text-[15px] font-bold text-fg flex items-center gap-2">
            <Building className="size-4 text-brand" />
            <span>Profil Usaha</span>
          </h2>

          {/* Upload Logo */}
          <div className="flex items-center gap-4 py-2 border-b border-line">
            <div className="size-16 bg-bg-subtle border border-line rounded-md flex items-center justify-center overflow-hidden relative">
              {logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreviewUrl}
                  alt="Logo Usaha"
                  className="object-contain size-full"
                />
              ) : (
                <span className="text-[11px] text-fg-tertiary text-center px-1">Tanpa Logo</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-bg-subtle border border-line rounded-md text-[13px] font-medium text-fg hover:bg-bg-hover cursor-pointer min-h-[44px]">
                <Upload className="size-4 text-fg-secondary" />
                <span>Unggah Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {logoBlob && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-[12px] text-danger hover:underline text-left"
                >
                  Hapus Logo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                Nama Usaha
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Toko Jaya Abadi"
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="08123456789"
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
              Alamat Lengkap
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Jl. Merdeka No. 10, Jakarta"
              className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kontak@usaha.com"
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                NPWP (Opsional)
              </label>
              <input
                type="text"
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                placeholder="00.000.000.0-000.000"
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px]"
              />
            </div>
          </div>
        </section>

        {/* Pola Penomoran Dokumen */}
        <section className="bg-bg border border-line rounded-md p-4 flex flex-col gap-4">
          <h2 className="text-[15px] font-bold text-fg flex items-center gap-2">
            <Hash className="size-4 text-brand" />
            <span>Pola Penomoran Dokumen</span>
          </h2>
          <p className="text-[12px] text-fg-tertiary">
            Token tersedia: <code className="bg-bg-subtle px-1 rounded text-fg">{`{YYYY}`}</code>, <code className="bg-bg-subtle px-1 rounded text-fg">{`{YY}`}</code>, <code className="bg-bg-subtle px-1 rounded text-fg">{`{MM}`}</code>, <code className="bg-bg-subtle px-1 rounded text-fg">{`{DD}`}</code>, <code className="bg-bg-subtle px-1 rounded text-fg">{`{0001}`}</code>, <code className="bg-bg-subtle px-1 rounded text-fg">{`{001}`}</code>, <code className="bg-bg-subtle px-1 rounded text-fg">{`{01}`}</code>.
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                Pola Nomor Nota
              </label>
              <input
                type="text"
                value={polaNota}
                onChange={(e) => setPolaNota(e.target.value)}
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px] font-mono"
              />
              {notaPatternError && (
                <span className="text-[12px] text-danger mt-1 block">{notaPatternError}</span>
              )}
            </div>

            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                Pola Nomor Invoice
              </label>
              <input
                type="text"
                value={polaInvoice}
                onChange={(e) => setPolaInvoice(e.target.value)}
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px] font-mono"
              />
              {invPatternError && (
                <span className="text-[12px] text-danger mt-1 block">{invPatternError}</span>
              )}
            </div>

            <div>
              <label className="text-[12px] font-medium text-fg-secondary mb-1 block">
                Pola Nomor Kwitansi
              </label>
              <input
                type="text"
                value={polaKwitansi}
                onChange={(e) => setPolaKwitansi(e.target.value)}
                className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px] font-mono"
              />
              {kwPatternError && (
                <span className="text-[12px] text-danger mt-1 block">{kwPatternError}</span>
              )}
            </div>
          </div>
        </section>

        {/* Pajak Default & Penafian */}
        <section className="bg-bg border border-line rounded-md p-4 flex flex-col gap-4">
          <h2 className="text-[15px] font-bold text-fg flex items-center gap-2">
            <Percent className="size-4 text-brand" />
            <span>Pajak Default</span>
          </h2>

          <div>
            <label className="text-[12px] font-medium text-fg-secondary mb-2 block">
              Tarif Pajak Default Dokumen Baru (%)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDefaultPajak(0)}
                className={`px-3 py-2 rounded-md text-[13px] font-medium border min-h-[44px] transition-colors ${
                  defaultPajak === 0
                    ? "bg-brand text-white border-brand"
                    : "bg-bg-subtle text-fg border-line hover:bg-bg-hover"
                }`}
              >
                0% (Tanpa Pajak)
              </button>
              <button
                type="button"
                onClick={() => setDefaultPajak(11)}
                className={`px-3 py-2 rounded-md text-[13px] font-medium border min-h-[44px] transition-colors ${
                  defaultPajak === 11
                    ? "bg-brand text-white border-brand"
                    : "bg-bg-subtle text-fg border-line hover:bg-bg-hover"
                }`}
              >
                11% (PPN)
              </button>
              <div className="flex items-center gap-1 min-h-[44px]">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={defaultPajak}
                  onChange={(e) =>
                    setDefaultPajak(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                  }
                  className="w-20 bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:outline-none min-h-[44px] text-center"
                />
                <span className="text-[14px] text-fg font-medium">%</span>
              </div>
            </div>
          </div>

          {/* Penafian Pajak Resmi */}
          <div className="bg-warning-bg border border-warning/30 rounded-md p-3 flex items-start gap-2 text-[12px] text-fg mt-2">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Penafian:</strong> SATUNOTA menghasilkan nota komersial, bukan Faktur Pajak resmi. Faktur Pajak PKP wajib dibuat lewat e-Faktur/Coretax DJP.
            </p>
          </div>
        </section>

        {/* Tombol Simpan Utama */}
        <button
          type="submit"
          className="w-full bg-brand text-white text-[14px] font-bold py-3 rounded-md hover:bg-brand-hover transition-colors min-h-[44px] flex items-center justify-center gap-2"
        >
          <Check className="size-4" />
          <span>Simpan Pengaturan</span>
        </button>
      </form>

      {/* Seksi Ekspor & Cadangan */}
      <section className="bg-bg border border-line rounded-md p-4 flex flex-col gap-4 mt-6">
        <h2 className="text-[15px] font-bold text-fg flex items-center gap-2">
          <Download className="size-4 text-brand" />
          <span>Ekspor Data & Cadangan</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleExportDokumenCsv}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-bg-subtle text-fg text-[13px] font-medium rounded-md border border-line hover:bg-bg-hover transition-colors min-h-[44px]"
          >
            <Download className="size-4 text-fg-secondary" />
            <span>dokumen.csv</span>
          </button>

          <button
            type="button"
            onClick={handleExportItemCsv}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-bg-subtle text-fg text-[13px] font-medium rounded-md border border-line hover:bg-bg-hover transition-colors min-h-[44px]"
          >
            <Download className="size-4 text-fg-secondary" />
            <span>item.csv</span>
          </button>

          <button
            type="button"
            onClick={handleExportBackupJson}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-brand text-white text-[13px] font-medium rounded-md hover:bg-brand-hover transition-colors min-h-[44px]"
          >
            <Download className="size-4" />
            <span>satunota-backup.json</span>
          </button>
        </div>

        {/* Cadangan Otomatis Mingguan */}
        <div className="p-3 bg-bg-subtle rounded-md border border-line flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-fg">Cadangan Otomatis Mingguan</span>
            <span className="text-[11px] text-fg-tertiary">
              {lastBackupAt ? `Terakhir: ${formatTanggal(lastBackupAt.split("T")[0])}` : "Belum ada cadangan"}
            </span>
          </div>
          <p className="text-[12px] text-fg-secondary">
            File cadangan JSON disiapkan secara otomatis di latar belakang setiap 7 hari sekali.
          </p>
          <button
            type="button"
            onClick={handleDownloadAutoBackup}
            className="mt-1 w-full bg-bg text-fg border border-line text-[13px] font-medium py-2 rounded-md hover:bg-bg-hover transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <Download className="size-4 text-fg-secondary" />
            <span>Unduh File Cadangan Otomatis</span>
          </button>
        </div>
      </section>

      {/* Akun & Logout */}
      {isLoggedIn && (
        <section className="bg-bg border border-danger/30 rounded-md p-4 flex flex-col gap-3 mt-6">
          <h2 className="text-[15px] font-bold text-danger flex items-center gap-2">
            <LogOut className="size-4" />
            <span>Akun Pengguna</span>
          </h2>
          <p className="text-[12px] text-fg-secondary">
            Anda sedang masuk ke akun SATUNOTA.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-danger-bg text-danger text-[13px] font-medium py-2.5 rounded-md hover:bg-danger/20 transition-colors min-h-[44px] flex items-center justify-center gap-2"
          >
            <LogOut className="size-4" />
            <span>Keluar dari Akun</span>
          </button>
        </section>
      )}
    </div>
  )
}
