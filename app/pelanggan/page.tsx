// app/pelanggan/page.tsx
// Halaman kelola pelanggan: Daftar, Tambah, Ubah, dan Soft Delete.

"use client"

import { useState } from "react"
import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ChevronLeft,
  Plus,
  Search,
  X,
  Users,
  Edit3,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
} from "lucide-react"
import { getCustomers, saveCustomer, deleteCustomer } from "@/lib/db/customers"
import { ensureGuestBusiness } from "@/lib/db/guest"
import type { LocalCustomer } from "@/lib/db/local"
import { customerSchema } from "@/lib/schema/customer"
import { getActiveOwnerId } from "@/lib/db/owner"
import { v7 as uuidv7 } from "uuid"
import { cn } from "@/lib/utils"

export default function PelangganPage() {
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<LocalCustomer | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Form State
  const [nama, setNama] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [email, setEmail] = useState("")
  const [catatan, setCatatan] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // Subscription Dexie live query untuk pelanggan aktif
  const customers = useLiveQuery(() => getCustomers(), [])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  function openAddModal() {
    setEditingCustomer(null)
    setNama("")
    setTelepon("")
    setAlamat("")
    setEmail("")
    setCatatan("")
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(c: LocalCustomer) {
    setEditingCustomer(c)
    setNama(c.nama)
    setTelepon(c.telepon ?? "")
    setAlamat(c.alamat ?? "")
    setEmail(c.email ?? "")
    setCatatan(c.catatan ?? "")
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    const trimmedNama = nama.trim()
    if (!trimmedNama) {
      setFormError("Nama pelanggan wajib diisi")
      return
    }

    try {
      const bizId = await ensureGuestBusiness()
      const ownerId = await getActiveOwnerId()
      const now = new Date().toISOString()
      const customerId = editingCustomer?.id || uuidv7()

      const payload = {
        id: customerId,
        ownerId,
        businessId: bizId,
        nama: trimmedNama,
        telepon: telepon.trim() || null,
        alamat: alamat.trim() || null,
        email: email.trim() || null,
        catatan: catatan.trim() || null,
        createdAt: editingCustomer?.createdAt || now,
        updatedAt: now,
        deletedAt: null,
      }

      const parseResult = customerSchema.safeParse(payload)
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0]
        setFormError(issue?.message || "Data tidak valid")
        return
      }

      await saveCustomer(payload)
      setIsModalOpen(false)
      showToast(
        editingCustomer
          ? "Pelanggan berhasil diperbarui"
          : "Pelanggan berhasil ditambahkan",
      )
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) return
    try {
      await deleteCustomer(id)
      showToast("Pelanggan berhasil dihapus")
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err))
    }
  }

  const filteredCustomers = (customers ?? []).filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const matchNama = c.nama.toLowerCase().includes(q)
    const matchTelepon = c.telepon?.toLowerCase().includes(q) ?? false
    const matchEmail = c.email?.toLowerCase().includes(q) ?? false
    const matchAlamat = c.alamat?.toLowerCase().includes(q) ?? false
    return matchNama || matchTelepon || matchEmail || matchAlamat
  })

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-4 text-fg">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg text-[13px] px-4 py-2 rounded-md shadow-md flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Utama */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center justify-center h-11 w-11 rounded-md hover:bg-bg-hover text-fg-secondary transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Kembali ke editor"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-fg tracking-tight">
              Pelanggan
            </h1>
            {customers && (
              <span className="text-[13px] text-fg-tertiary font-medium">
                ({filteredCustomers.length})
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-[13px] font-medium rounded-md hover:bg-brand-hover transition-colors min-h-[44px]"
        >
          <Plus className="size-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pelanggan berdasarkan nama, telepon, atau alamat..."
          className="w-full bg-bg-subtle pl-9 pr-9 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none min-h-[44px] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Konten Daftar Pelanggan */}
      {customers === undefined ? (
        <div className="py-16 text-center text-fg-tertiary text-[14px]">
          Memuat daftar pelanggan...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-line rounded-lg bg-bg-subtle/40 px-4">
          <Users className="size-8 text-fg-tertiary mb-2" />
          <p className="text-[14px] text-fg-secondary font-medium mb-1">
            Belum ada pelanggan.
          </p>
          <p className="text-[13px] text-fg-tertiary mb-5 max-w-[320px]">
            {search
              ? "Coba sesuaikan kata kunci pencarian Anda."
              : "Tambahkan data pelanggan agar otomatis muncul di editor dokumen."}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-fg text-bg hover:opacity-90 text-[13px] font-medium rounded-md min-h-[44px] flex items-center gap-1.5 transition-colors"
          >
            <Plus className="size-4" />
            <span>Tambah Pelanggan Pertama</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-4 bg-bg border border-line rounded-md hover:border-line-strong transition-all"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-3">
                <div className="text-[15px] font-bold text-fg truncate">
                  {c.nama}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-secondary">
                  {c.telepon && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3 text-fg-tertiary shrink-0" />
                      <span>{c.telepon}</span>
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3 text-fg-tertiary shrink-0" />
                      <span>{c.email}</span>
                    </span>
                  )}
                  {c.alamat && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="size-3 text-fg-tertiary shrink-0" />
                      <span className="truncate">{c.alamat}</span>
                    </span>
                  )}
                </div>
                {c.catatan && (
                  <div className="text-[12px] text-fg-tertiary flex items-start gap-1 mt-0.5">
                    <FileText className="size-3 shrink-0 mt-0.5" />
                    <span className="italic truncate">{c.catatan}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(c)}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-fg-secondary hover:bg-bg-hover hover:text-fg transition-colors"
                  title="Ubah pelanggan"
                >
                  <Edit3 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-danger hover:bg-danger-bg transition-colors"
                  title="Hapus pelanggan"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Pelanggan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[480px] bg-bg border border-line rounded-lg shadow-lg p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-[16px] font-bold text-fg">
                {editingCustomer ? "Ubah Pelanggan" : "Tambah Pelanggan Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-fg-tertiary hover:text-fg p-1 rounded-sm"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-danger-bg text-danger text-[13px] rounded-md border border-danger/30 font-medium">
                ⚠️ {formError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
                  Nama Pelanggan <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap atau usaha pelanggan"
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0812xxxxxxx"
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
                  Alamat
                </label>
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Alamat lengkap pelanggan"
                  rows={2}
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-fg-secondary mb-1 block">
                  Catatan
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-full bg-bg-subtle px-3 py-2 text-[14px] text-fg rounded-md border border-line focus:border-brand focus:bg-bg focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-fg-secondary hover:text-fg hover:bg-bg-hover rounded-md min-h-[44px] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-[13px] font-medium bg-brand text-white hover:bg-brand-hover rounded-md min-h-[44px] transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
