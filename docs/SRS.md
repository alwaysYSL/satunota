# Dokumen Requirement — Aplikasi Web Pembuat Nota (SATUNOTA, SRS v1.1)

<aside>
📌

**Ringkasan satu paragraf.** SATUNOTA adalah aplikasi web *mobile-first* untuk membuat **nota, invoice, dan kwitansi** dalam hitungan detik: isi form → lihat preview → kirim PDF/WhatsApp atau cetak ke printer thermal 58mm. Positioning-nya adalah lawan dari aplikasi invoice yang gemuk: **tanpa wajib daftar untuk membuat dan mengirim dokumen, tanpa iklan, tanpa watermark, jalan offline**. Satu-satunya fitur yang memerlukan pendaftaran adalah cetak thermal, dan pendaftarannya gratis. Tech stack: Next.js (App Router) + PWA offline-first.

</aside>

| Field | Isi |
| --- | --- |
| Nama dokumen | SRS — Aplikasi Web Pembuat Nota |
| Nama produk | SATUNOTA |
| Versi | v1.1 |
| Tanggal | 3 Agustus 2026 (revisi v1.1 pada hari yang sama) |
| Status | Disetujui — keputusan bagian 15 sudah ditutup |
| Perubahan v1.1 | Tiga jenis dokumen masuk MVP · cetak thermal butuh akun gratis · kebijakan retensi data tamu · multi-usaha ditunda · nama final |
| Kategori | Web app, mobile-first, sederhana |
| Tech stack | Next.js 15 (App Router), TypeScript, Tailwind, Postgres, PWA |

---

## 1. Pendahuluan

### 1.1 Tujuan dokumen

Dokumen ini mendefinisikan kebutuhan fungsional dan non-fungsional aplikasi web pembuat nota, lengkap dengan batas ruang lingkup rilis pertama (MVP). Dokumen dipakai sebagai acuan tunggal saat implementasi, review, dan pengujian.

### 1.2 Ruang lingkup produk

Aplikasi web yang memungkinkan pelaku usaha kecil (warung, toko online, jasa, freelancer, reseller) membuat **nota penjualan / invoice / kwitansi** dari HP, lalu membagikannya sebagai PDF atau gambar, atau mencetaknya ke printer thermal.

Aplikasi ini **bukan** aplikasi akuntansi, bukan POS penuh, dan bukan e-Faktur pajak resmi.

### 1.3 Definisi istilah

| Istilah | Arti dalam dokumen ini |
| --- | --- |
| Nota | Dokumen bukti transaksi sederhana yang diberikan penjual ke pembeli |
| Invoice | Nota tagihan dengan jatuh tempo dan status pembayaran |
| Kwitansi | Bukti penerimaan uang |
| Line item | Satu baris barang/jasa (nama, qty, harga satuan, subtotal) |
| Thermal 58mm | Printer struk portabel Bluetooth ukuran kertas 58mm |
| PWA | Progressive Web App — web yang bisa di-install & jalan offline |
| Tamu (guest) | Pengguna yang memakai aplikasi tanpa mendaftar akun |
| Akun gratis | Akun tanpa biaya (magic link/Google) yang membuka cetak thermal dan sinkron. Bukan paket berbayar |
| Dokumen | Istilah payung untuk ketiga jenis keluaran: nota, invoice, dan kwitansi |

---

## 2. Hasil riset pasar

### 2.1 Fitur yang dianggap standar di pasar

Dari penelusuran aplikasi nota/invoice yang dipakai di Indonesia (Mekari Jurnal, Kasir Pintar, Qasir, [Paper.id](http://Paper.id), BukuKas) dan aplikasi global (Invoice Simple, Zoho Invoice, Invoice Maker/Tofu, Bookipi, Wave), fitur berikut muncul hampir di semua produk dan wajib ada agar aplikasi dianggap layak pakai:

| # | Fitur standar pasar | Catatan |
| --- | --- | --- |
| 1 | Template nota profesional + logo usaha | Identitas merek pada dokumen |
| 2 | Line item dengan qty, harga, subtotal otomatis | Inti dari semua aplikasi |
| 3 | Pajak, diskon, ongkos kirim | Tiga penambah/pengurang paling umum |
| 4 | Nomor nota otomatis berurutan | Anti-duplikat |
| 5 | Simpan data pelanggan & katalog produk | Agar tidak mengetik ulang |
| 6 | Ekspor PDF & kirim (WhatsApp/email/link) | Jalur distribusi utama di Indonesia |
| 7 | Status pembayaran (lunas / belum / sebagian) | Fitur "Balance Due" jadi update besar di banyak app |
| 8 | Riwayat & pencarian nota | Rekap harian/bulanan |
| 9 | Duplikat nota & ubah jadi nota baru | Pelanggan berulang |
| 10 | Multi-mata uang & format angka lokal | Rp dengan pemisah ribuan |
| 11 | Cetak nota ke printer thermal | Kebutuhan khas UMKM offline |
| 12 | Rekap penjualan sederhana (harian/bulanan) | Laporan ringan, bukan akuntansi |

### 2.2 Keluhan pengguna terhadap aplikasi sejenis

Dikumpulkan dari ulasan Play Store/App Store, Trustpilot, dan diskusi Reddit (r/smallbusiness, r/SaaS, r/freelance, r/ProductivityApps) serta forum Invoice Ninja:

| # | Keluhan | Bukti / pola yang terlihat |
| --- | --- | --- |
| K-01 | **Paywall menipu** — bayar tahunan "unlimited", tetap diminta bayar lagi untuk bikin nota | Keluhan spesifik terhadap Invoice Simple di r/smallbusiness |
| K-02 | **Langganan mahal untuk sekadar kirim PDF** | "Bayar Invoice2go $25/bulan cuma buat kirim PDF" |
| K-03 | **Batas versi gratis terlalu ketat** | Tiny Invoice: gratis hanya 5 dokumen & 3 pelanggan |
| K-04 | **Watermark & branding aplikasi di nota** | Permintaan berulang: "no watermark, no branding slapped on it" |
| K-05 | **Iklan mengganggu saat melayani pembeli** | Keluhan khas aplikasi kasir gratis di Indonesia |
| K-06 | **Wajib daftar akun sebelum bisa coba** | Banyak pengguna cari "no signup, no email collection" |
| K-07 | **Aplikasi berat & lambat** | Antrian kasir memanjang karena aplikasi loading |
| K-08 | **Terlalu banyak fitur (bloated)** | Zoho dinilai "bloated" kalau hanya butuh invoicing |
| K-09 | **Tidak jalan tanpa internet** | Pemicu lahirnya banyak app "100% offline" |
| K-10 | **Tidak ada bahasa Indonesia & pajak lokal** | Kelemahan eksplisit Tiny Invoice untuk pasar Indonesia |
| K-11 | **PDF berantakan** — tabel patah antar halaman, header hilang, font beda | Keluhan teknis paling sering di r/nextjs soal PDF |
| K-12 | **Data hilang / tidak bisa diekspor** | Ketakutan vendor lock-in |
| K-13 | **Printer thermal ribet** — harus lewat aplikasi pihak ketiga | Pola pemakaian RawBT/Thermer sebagai perantara |

### 2.3 Peluang diferensiasi untuk SATUNOTA

<aside>
💡

Setiap keluhan di atas diterjemahkan jadi keputusan produk, bukan sekadar catatan.

</aside>

| Keluhan | Keputusan produk SATUNOTA |
| --- | --- |
| K-01, K-02, K-03 | Nota **tanpa batas jumlah** di paket gratis. Yang dibatasi adalah fitur nyaman (multi-template, cloud sync, rekap), bukan hak membuat nota |
| K-04 | **Tidak ada watermark** di semua paket, termasuk gratis |
| K-05 | **Nol iklan**, selamanya. Ini jadi janji tertulis di halaman harga |
| K-06 | **Mode tamu**: buka aplikasi → langsung bisa bikin, unduh, dan kirim dokumen tanpa akun. Pendaftaran (gratis) hanya diminta untuk cetak thermal dan sinkron antar perangkat |
| K-07 | Target **Time-to-first-nota < 60 detik** dan LCP < 2,5 detik di 4G lambat |
| K-08 | Satu layar utama saja. Fitur lanjutan (pajak, diskon, ongkir, catatan) disembunyikan di balik tombol "+ Tambah baris" |
| K-09 | **Offline-first PWA**: buat, simpan, dan cetak nota tanpa internet; sinkron saat online |
| K-10 | Bahasa Indonesia sebagai default, format Rupiah, terbilang, PPN & PPh sesuai praktik lokal |
| K-11 | Template PDF diuji khusus untuk nota panjang (>25 baris): header berulang, tidak ada baris terpotong, font di-*embed* |
| K-12 | **Ekspor CSV/JSON penuh** sekali klik, tanpa syarat berlangganan |
| K-13 | Cetak thermal langsung dari browser via Web Bluetooth (ESC/POS), plus fallback "cetak gambar struk". Fitur ini di balik akun gratis — lihat aturan gating di 4.4 |

---

## 3. Pengguna & kebutuhan

### 3.1 Persona

| Persona | Profil | Kebutuhan utama |
| --- | --- | --- |
| **P1 — Bu Tuti, warung & katering** | 45 th, HP Android murah, sinyal kadang hilang | Nota cepat, cetak thermal, tidak ribet, tidak berbayar |
| **P2 — Dika, olshop** | 24 th, jualan lewat WhatsApp & Instagram | Nota rapi berlogo, kirim ke WA pelanggan, rekap harian |
| **P3 — Rani, freelancer desain** | 28 th, klien perusahaan | Invoice profesional PDF, jatuh tempo, status lunas, nomor rapi |
| **P4 — Pak Andi, jasa servis** | 38 th, kerja di lapangan | Buat nota di lokasi, sering offline, butuh kwitansi tanda terima |

### 3.2 User story utama

1. Sebagai **P1**, saya ingin membuat nota dan langsung mencetaknya ke printer Bluetooth, dengan sekali daftar akun gratis di awal, agar pembeli tidak menunggu pada transaksi berikutnya.
2. Sebagai **P2**, saya ingin memilih produk dari katalog yang tersimpan, agar tidak mengetik nama dan harga berulang kali.
3. Sebagai **P3**, saya ingin menandai invoice "belum lunas" dengan jatuh tempo, agar bisa menagih ulang.
4. Sebagai **P4**, saya ingin aplikasi tetap bisa dipakai saat tidak ada sinyal, dan datanya tersinkron sendiri saat online.
5. Sebagai semua persona, saya ingin mengekspor seluruh data saya kapan pun, agar tidak terkunci di satu aplikasi.

---

## 4. Ruang lingkup berlapis

### 4.1 Wajib ada di MVP (rilis pertama)

**Tiga jenis dokumen: nota, invoice, dan kwitansi.** Editor dokumen, line item, hitung otomatis, diskon/pajak/ongkir, profil usaha + logo, penomoran otomatis per jenis dokumen, preview live, terbilang, ekspor PDF & PNG, bagikan WhatsApp, riwayat lokal + pencarian, data pelanggan dasar, status pembayaran & jatuh tempo, mode tamu, akun gratis, PWA offline, cetak thermal 58mm.

### 4.2 Tambahan jika waktu memungkinkan

Sinkron cloud multi-perangkat, katalog produk, rekap penjualan, multi-template, QRIS statis di dokumen, tanda tangan & stempel, impor CSV.

Khusus **link dokumen publik (F-20)**: bukan sekadar ditunda, melainkan sengaja ditempatkan sebagai fitur berbayar di paket Pro karena memerlukan akun, penyimpanan cloud, dan halaman publik yang aman.

### 4.3 Di luar ruang lingkup

Akuntansi & jurnal umum, manajemen stok/gudang, e-Faktur & integrasi Coretax DJP, payroll, **multi-usaha (satu akun beberapa toko) — ditunda ke versi berikutnya**, multi-cabang & hak akses karyawan, payment gateway langsung, aplikasi native iOS/Android, surat jalan.

### 4.4 Aturan gating akun (keputusan v1.1)

| Kemampuan | Tamu | Akun gratis |
| --- | --- | --- |
| Buat & simpan ketiga jenis dokumen | Ya | Ya |
| Preview, unduh PDF & PNG | Ya | Ya |
| Bagikan ke WhatsApp | Ya | Ya |
| Riwayat & pencarian di perangkat | Ya | Ya |
| Ekspor CSV/JSON | Ya | Ya |
| **Cetak thermal Bluetooth** | **Tidak** | **Ya** |
| Sinkron antar perangkat | Tidak | Ya |

<aside>
🔐

**Kenapa cetak thermal yang dipilih sebagai pemicu registrasi.** Pengguna yang punya printer thermal adalah pengguna dengan niat serius dan pemakaian harian, jadi biaya satu kali mendaftar terasa wajar bagi mereka. Sebaliknya, pengguna coba-coba tetap bisa menyelesaikan seluruh alur pertama tanpa hambatan, sehingga keluhan K-06 tidak kembali muncul. Aturan pelaksanaannya: pendaftaran **gratis selamanya**, ditawarkan tepat saat pengguna menekan tombol Cetak thermal (bukan di layar pembuka), dan draf yang sedang dikerjakan tidak boleh hilang saat proses daftar berlangsung.

</aside>

### 4.5 Retensi data tamu (keputusan v1.1)

| Aturan | Ketentuan |
| --- | --- |
| Penghapusan otomatis | **Tidak ada.** Aplikasi tidak pernah menghapus data tamu sendiri. Data hilang hanya jika pengguna membersihkan penyimpanan browser |
| Retensi di server | Nol. Data tamu tidak pernah dikirim ke server |
| Perlindungan penyimpanan | Minta izin `navigator.storage.persist()` setelah dokumen pertama tersimpan |
| Pengingat tahap 1 | Setelah **7 hari** pemakaian atau **10 dokumen**: banner halus "Data hanya tersimpan di HP ini" + tombol Cadangkan |
| Pengingat tahap 2 | Setelah **30 hari** atau **50 dokumen**: dialog sekali jalan dengan dua pilihan, Unduh cadangan atau Buat akun gratis |
| Setelah lama tidak dibuka | Jika sesi tamu tidak dibuka **90 hari**, saat dibuka lagi tampilkan pengingat cadangkan sebelum melanjutkan |
| Cadangan otomatis | File JSON cadangan disiapkan di latar tiap 7 hari dan bisa diunduh kapan saja dari Pengaturan |

<aside>
⚠️

**Batas legal.** SATUNOTA menghasilkan nota komersial, **bukan Faktur Pajak resmi**. Faktur Pajak PKP wajib dibuat lewat e-Faktur/Coretax DJP. Pernyataan ini harus tampil di halaman "Tentang" dan di pengaturan pajak.

</aside>

---

## 5. Kebutuhan fungsional

### 5.1 Editor nota (inti)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-01 | Membuat nota baru dari satu layar tanpa navigasi bertingkat | Wajib |
| F-02 | Menambah, mengubah, menghapus, dan mengurutkan line item | Wajib |
| F-03 | Kolom per baris: nama, qty, satuan, harga satuan, diskon baris, subtotal otomatis | Wajib |
| F-04 | Diskon nota (nominal atau persen), ongkos kirim, biaya lain | Wajib |
| F-05 | Pajak per nota (persen bebas, preset 11% dan 0%), opsi harga sudah termasuk pajak | Wajib |
| F-06 | Pembulatan otomatis ke rupiah terdekat (opsional, dapat dimatikan) | Wajib |
| F-07 | Field pembayaran: metode, jumlah dibayar, kembalian, sisa tagihan | Wajib |
| F-08 | Catatan kaki & syarat pembayaran yang bisa disimpan sebagai default | Tambahan |
| F-09 | Terbilang otomatis dalam Bahasa Indonesia (wajib tampil pada kwitansi) | Wajib |
| F-10 | Preview nota real-time yang persis sama dengan hasil PDF | Wajib |

### 5.2 Identitas usaha & penomoran

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-11 | Profil usaha: nama, logo, alamat, telepon, email, NPWP (opsional) | Wajib |
| F-12 | Nomor otomatis dengan pola yang bisa diatur, terpisah per jenis dokumen, mis. `NT/{YY}{MM}/{0001}` dan `INV/{YY}{MM}/{0001}` | Wajib |
| F-13 | Deteksi nomor duplikat sebelum simpan | Wajib |
| F-14 | Tanda tangan & stempel (unggah gambar atau gores di layar) | Tambahan |

### 5.3 Keluaran & distribusi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-15 | Ekspor PDF ukuran A4 dan A5 | Wajib |
| F-16 | Ekspor PNG/JPG (untuk dikirim di chat) | Wajib |
| F-17 | Tombol bagikan ke WhatsApp dengan pesan template siap kirim | Wajib |
| F-18 | Cetak ke printer thermal 58mm/80mm via Web Bluetooth (ESC/POS) — memerlukan akun gratis (lihat 4.4) | Wajib |
| F-19 | Fallback cetak: struk sebagai gambar untuk aplikasi printer pihak ketiga | Wajib |
| F-20 | Link dokumen publik yang bisa dibuka pelanggan (read-only, bisa dicabut) — **fitur Pro, di luar MVP** | Pro |
| F-21 | Tidak ada watermark atau branding aplikasi pada semua keluaran | Wajib |

### 5.4 Data tersimpan

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-22 | Riwayat dokumen dengan pencarian (nomor, pelanggan, tanggal) | Wajib |
| F-23 | Duplikat dokumen jadi dokumen baru | Wajib |
| F-24 | Katalog produk/jasa dengan harga tersimpan + pencarian cepat | Tambahan |
| F-25 | Daftar pelanggan dengan autofill | Wajib |
| F-26 | Status dokumen: draf, terkirim, lunas, sebagian, jatuh tempo | Wajib |
| F-27 | Rekap penjualan harian/bulanan (total, jumlah nota, produk terlaris) | Tambahan |
| F-28 | Ekspor seluruh data ke CSV & JSON, tanpa batasan paket | Wajib |
| F-29 | Impor katalog produk dari CSV | Tambahan |

### 5.5 Akun & sinkronisasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-30 | Mode tamu: buat, simpan, preview, PDF/PNG, bagikan, dan ekspor tanpa akun; data di perangkat | Wajib |
| F-31 | Daftar/masuk gratis (magic link atau Google), dipicu saat menekan Cetak thermal atau ingin sinkron | Wajib |
| F-32 | Migrasi data tamu ke akun saat pertama kali mendaftar, tanpa kehilangan data dan tanpa membuang draf yang sedang dibuka | Wajib |
| F-33 | Sinkron dua arah dengan resolusi konflik *last-write-wins* per nota | Tambahan |
| F-34 | Hapus akun beserta seluruh data dalam 1 alur | Wajib |

### 5.6 Tiga jenis dokumen

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-35 | Pemilih jenis dokumen di editor: **Nota**, **Invoice**, **Kwitansi**. Default Nota | Wajib |
| F-36 | Penomoran terpisah per jenis dengan prefiks berbeda, mis. `NT/`, `INV/`, `KW/` | Wajib |
| F-37 | Konversi satu arah: Invoice yang sudah dibayar dapat menghasilkan Kwitansi tertaut, tanpa mengetik ulang | Wajib |
| F-38 | Field yang muncul menyesuaikan jenis dokumen (lihat matriks di bawah) | Wajib |
| F-39 | Satu mesin perhitungan dan satu komponen layout dipakai ketiga jenis; yang berbeda hanya judul, field tampil, dan penomoran | Wajib |

**Matriks perbedaan tiga jenis dokumen**

| Aspek | Nota | Invoice | Kwitansi |
| --- | --- | --- | --- |
| Judul di dokumen | NOTA PENJUALAN | INVOICE | KWITANSI |
| Tujuan | Bukti transaksi saat itu juga | Tagihan yang harus dibayar | Bukti uang telah diterima |
| Line item | Wajib | Wajib | Opsional (boleh satu baris keterangan) |
| Jatuh tempo | Tidak ada | Wajib | Tidak ada |
| Status pembayaran | Lunas atau belum | Draf, terkirim, sebagian, lunas, jatuh tempo | Selalu lunas |
| Terbilang | Opsional | Opsional | Wajib |
| Field "Telah diterima dari" | Tidak | Tidak | Wajib |
| Tanda tangan | Opsional | Opsional | Dianjurkan |
| Cetak thermal | Utama | Jarang, tetap didukung | Didukung |

---

## 6. Kebutuhan non-fungsional

| ID | Kategori | Target terukur |
| --- | --- | --- |
| N-01 | Kecepatan | LCP < 2,5 dtk pada koneksi 4G lambat, HP Android kelas menengah-bawah |
| N-02 | Kecepatan | Time-to-first-nota (buka app → PDF jadi) < 60 detik untuk pengguna baru |
| N-03 | Ukuran | Bundle JS rute editor < 200 KB gzip |
| N-04 | Offline | Seluruh fitur inti (buat, simpan, PDF, cetak) berfungsi tanpa jaringan |
| N-05 | Keandalan | Draf tersimpan otomatis tiap perubahan; tidak ada kehilangan data saat browser tertutup mendadak |
| N-06 | Mobile-first | Semua alur utama selesai dengan satu tangan; target sentuh minimal 44×44 px |
| N-07 | Aksesibilitas | Kontras teks minimal WCAG AA; input angka memunculkan keyboard numerik |
| N-08 | Bahasa | Bahasa Indonesia default, arsitektur siap i18n untuk Inggris |
| N-09 | Keamanan | HTTPS wajib, data akun terisolasi per pengguna (RLS), rate limit pada endpoint publik |
| N-10 | Privasi | Tidak ada pelacak pihak ketiga di halaman editor; analitik tanpa cookie |
| N-11 | Kompatibilitas | Chrome/Edge Android (termasuk Web Bluetooth), Safari iOS 16+ (dengan fallback cetak gambar) |
| N-12 | Ketersediaan | Uptime target 99,5% untuk layanan sinkron; mode tamu tidak terpengaruh downtime |

---

## 7. Arsitektur & tech stack

### 7.1 Tumpukan teknologi

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Framework | **Next.js 15, App Router** | Server Components untuk halaman ringan, Route Handlers untuk API, satu repo |
| Bahasa | TypeScript (strict) | Aman untuk logika uang dan pajak |
| UI | Tailwind CSS + shadcn/ui | Cepat, konsisten, mudah dibuat mobile-first |
| Form & validasi | React Hook Form + Zod | Skema Zod dipakai ulang di klien dan server |
| State editor | Zustand | Ringan, cocok untuk draf nota |
| Penyimpanan lokal | IndexedDB via Dexie | Data terstruktur, kapasitas jauh di atas localStorage |
| PWA | Service Worker (Serwist/next-pwa) | App shell cache + offline |
| Database | Postgres (Supabase/Neon) | RLS bawaan, gratis di tahap awal |
| Auth | Supabase Auth (magic link + Google) | Tanpa password, cocok untuk pengguna non-teknis |
| PDF | **@react-pdf/renderer** di Route Handler | Deterministik, ringan, tanpa Chromium di serverless |
| Gambar struk | Render DOM → canvas (html-to-image) | Untuk fallback cetak & berbagi di chat |
| Cetak thermal | Web Bluetooth + perintah ESC/POS | Cetak langsung dari browser tanpa aplikasi perantara |
| Hosting | Vercel | Integrasi Next.js, edge cache |

<aside>
🧪

**Catatan keputusan PDF.** Puppeteer/Chromium headless memberi kesetiaan HTML tertinggi tetapi berat di serverless (cold start, memori, masalah font antara dev dan prod). Karena layout nota sederhana dan seragam, `@react-pdf/renderer` dipilih untuk MVP. Puppeteer disiapkan sebagai jalur cadangan jika kelak dibutuhkan template HTML bebas.

</aside>

### 7.2 Struktur rute

```
app/
  (editor)/page.tsx          → layar utama, buat nota
  dokumen/[id]/page.tsx      → detail & edit dokumen tersimpan
  dokumen/riwayat/page.tsx   → daftar & pencarian
  pengaturan/page.tsx        → profil usaha, pajak, penomoran
  n/[token]/page.tsx         → link dokumen publik (read-only)
  api/pdf/route.ts           → render PDF
  api/sync/route.ts          → sinkronisasi data akun
```

### 7.3 Alur offline-first

1. Semua tulis masuk ke IndexedDB lebih dulu, UI langsung memperbarui (*optimistic*).
2. Setiap perubahan masuk antrean `outbox` berisi operasi dan `updatedAt`.
3. Saat online dan pengguna punya akun, `outbox` dikirim ke `/api/sync`.
4. Konflik diselesaikan per nota dengan *last-write-wins* berbasis `updatedAt`; versi kalah disimpan sebagai salinan agar tidak hilang.
5. Nota yang sudah berstatus final bersifat *immutable*; perubahan menghasilkan revisi baru.

---

## 8. Model data

| Entitas | Field inti |
| --- | --- |
| `businesses` | id, userId, nama, logoUrl, alamat, telepon, email, npwp, polaNota, polaInvoice, polaKwitansi, defaultPajak, defaultCatatan |
| `documents` | id, businessId, tipe (nota/invoice/kwitansi), nomor, tanggal, dueDate, customerId, customerNama, diterimaDari, status, diskonTipe, diskonNilai, pajakPersen, pajakInklusif, ongkir, biayaLain, pembulatanAktif, subtotal, diskonNominal, pajakNominal, total, dibayar, sisa, catatan, syarat, sourceDocumentId, createdAt, updatedAt, deletedAt |
| `document_items` | id, documentId, urutan, nama, qty, satuan, hargaSatuan, diskonBaris, subtotal |
| `customers` | id, businessId, nama, telepon, alamat, email, catatan |
| `products` | id, businessId, nama, satuan, harga, kategori |
| `payments` | id, documentId, tanggal, metode, jumlah, catatan |

<aside>
💰

**Aturan uang.** Seluruh nilai uang disimpan sebagai bilangan bulat dalam satuan rupiah (bukan float). Perhitungan dilakukan di satu modul murni `lib/calc.ts` yang dipakai bersama oleh klien, server, dan PDF, sehingga angka di layar, di PDF, dan di struk thermal tidak pernah berbeda.

</aside>

### 8.1 Urutan perhitungan (mengikat)

1. `subtotalBaris = qty × hargaSatuan − diskonBaris`
2. `subtotal = Σ subtotalBaris`
3. `setelahDiskon = subtotal − diskonNota`
4. `dasarPajak = setelahDiskon` (ongkir tidak dikenai pajak secara default)
5. `pajak = dasarPajak × persen`, atau jika harga inklusif: `pajak = dasarPajak × persen / (1 + persen)`
6. `total = setelahDiskon + pajak + ongkir + biayaLain`, lalu dibulatkan bila opsi aktif. **Jika harga inklusif pajak, `pajak` tidak ditambahkan lagi** karena sudah termasuk di dalam `setelahDiskon`; nilainya hanya ditampilkan sebagai rincian
7. `sisa = total − dibayar`

Aturan ini identik untuk ketiga jenis dokumen. Untuk Kwitansi, `dibayar` selalu sama dengan `total`, sehingga `sisa` selalu nol.

### 8.2 Catatan tambahan model data v1.1

- Nama entitas memakai bentuk jamak (`documents`, `document_items`, dan seterusnya) agar identik dengan nama tabel di sub-halaman skema.
- `documents.tipe` bersifat wajib dan hanya menerima `nota`, `invoice`, atau `kwitansi`.
- `documents.sourceDocumentId` menautkan Kwitansi ke Invoice asalnya (F-37).
- `documents.diterimaDari` khusus untuk Kwitansi.
- `business` tetap satu baris per pengguna pada v1 karena multi-usaha ditunda, tetapi relasi `businessId` tetap disimpan agar penambahan multi-usaha kelak tidak memerlukan migrasi besar.
- Detail lengkap kolom, tipe, indeks, dan kebijakan RLS ada di sub-halaman skema.

---

## 9. Desain & UX mobile-first

### 9.1 Prinsip

1. **Satu layar, satu tujuan.** Layar pembuka langsung berupa editor nota kosong yang siap diisi, bukan dashboard.
2. **Progressive disclosure.** Pajak, diskon, ongkir, catatan, jatuh tempo disembunyikan di balik chip "+ Tambah" dan hanya muncul saat dipakai.
3. **Jempol dulu.** Tombol aksi utama (Simpan, Bagikan, Cetak) menempel di bawah layar sebagai action bar.
4. **Keyboard yang benar.** `inputmode="decimal"` untuk harga dan qty; format ribuan otomatis saat mengetik.
5. **Tidak ada dead end.** Setiap kondisi kosong menyertakan satu tombol aksi jelas.
6. **Umpan balik instan.** Total di action bar berubah seketika saat mengetik.

### 9.2 Alur utama (target ≤ 5 ketukan)

```
Buka app → ketik nama barang + harga → (opsional +baris) →
ketuk "Bagikan" → pilih PDF / WhatsApp / Cetak → selesai
```

### 9.3 Layar yang dibutuhkan

| Layar | Isi |
| --- | --- |
| Editor | Header usaha ringkas, daftar item, chip tambahan, action bar total |
| Preview | Render nota persis PDF, tombol unduh/bagikan/cetak |
| Riwayat | Daftar nota + pencarian + filter status |
| Pengaturan | Profil usaha, logo, pola nomor, pajak default, tema nota |
| Cetak thermal | Pilih perangkat Bluetooth, tes cetak, atur lebar kertas. Bagi pengguna tamu, layar ini didahului ajakan daftar akun gratis yang tidak menghapus draf |
| Onboarding tipis | Tiga field: nama usaha, telepon, logo — semuanya bisa dilewati |

---

## 10. Konteks lokal Indonesia

| Aspek | Ketentuan |
| --- | --- |
| Format angka | `Rp 1.250.000` — pemisah ribuan titik, tanpa desimal secara default |
| Tanggal | `3 Agustus 2026` atau `03/08/2026`, zona waktu perangkat |
| Pajak | Preset 0% dan 11%; persen bebas untuk kasus lain. Aplikasi tidak menghitung skema DPP nilai lain 11/12 milik e-Faktur |
| Kepatuhan | Label jelas: dokumen ini nota komersial, bukan Faktur Pajak. PKP tetap wajib memakai e-Faktur/Coretax |
| Pembayaran | Kolom QRIS statis (unggah gambar QR) dan rekening bank pada footer nota |
| Distribusi | WhatsApp adalah kanal kirim utama, bukan email |
| Perangkat | Optimasi untuk Android kelas menengah-bawah dan koneksi tidak stabil |

---

## 11. Monetisasi (usulan)

<aside>
🧭

Prinsipnya: **jangan pernah membatasi hak membuat nota**. Yang berbayar adalah kenyamanan, bukan kebutuhan dasar. Ini langsung menjawab keluhan K-01 sampai K-05.

</aside>

| Paket | Harga | Isi |
| --- | --- | --- |
| Gratis | Rp 0 | Dokumen tanpa batas (nota, invoice, kwitansi), 1 template, tanpa watermark, tanpa iklan, PDF & PNG, bagikan WhatsApp, data lokal, ekspor CSV/JSON. **Cetak thermal termasuk gratis**, hanya perlu mendaftar akun |
| Pro | Rp 25–35 rb/bulan atau Rp 249 rb/tahun | Sinkron multi-perangkat, katalog & pelanggan, multi-template, rekap penjualan, link nota publik, pengingat jatuh tempo |
| Lifetime | Rp 499–699 rb | Semua fitur Pro, sekali bayar — untuk pengguna yang alergi langganan |

Pembayaran lewat QRIS/e-wallet melalui payment link (Mayar) di tahap awal, bukan integrasi gateway sendiri.

---

## 12. Rencana rilis (7 hari, AI-assisted)

Rincian tugas harian, prompt siap pakai, dan gerbang verifikasi ada di sub-halaman fase implementasi.

| Tahap | Fokus | Keluaran |
| --- | --- | --- |
| Hari 1 | Fondasi, skema, mesin perhitungan | Proyek jalan, `lib/calc.ts` lulus test |
| Hari 2 | Editor tiga jenis dokumen + preview | Dokumen bisa dibuat dan dilihat |
| Hari 3 | PDF, PNG, bagikan WhatsApp | Dokumen bisa keluar dari aplikasi |
| Hari 4 | Penyimpanan lokal, riwayat, PWA offline | Aplikasi dipakai tanpa internet |
| Hari 5 | Akun gratis, gating, cetak thermal | Siap dipakai UMKM offline |
| Hari 6 | Pelanggan, status bayar, ekspor, pengingat retensi | Fitur MVP lengkap |
| Hari 7 | QA, performa, aksesibilitas, rilis | Live di produksi |

---

## 13. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Web Bluetooth tidak didukung di Safari iOS | Pengguna iPhone tidak bisa cetak langsung | Fallback cetak gambar struk + panduan aplikasi printer |
| PDF berbeda antara preview dan hasil unduh | Kepercayaan hilang | Satu sumber komponen layout; uji snapshot PDF untuk nota 1, 10, 50 baris |
| Kesalahan pembulatan uang | Selisih kas | Integer rupiah + unit test perhitungan |
| Data lokal terhapus saat pengguna bersihkan browser | Kehilangan riwayat | Minta izin *persistent storage*, ekspor otomatis berkala, ajakan aktifkan sinkron |
| Scope creep menuju POS/akuntansi | Produk jadi berat seperti pesaing | Bagian 4.3 diperlakukan sebagai kontrak, perubahan harus lewat revisi dokumen |
| Salah paham soal Faktur Pajak | Risiko kepatuhan bagi pengguna | Disclaimer eksplisit di aplikasi dan materi pemasaran |

---

## 14. Kriteria penerimaan MVP

- [ ]  Pengguna baru tanpa akun dapat menghasilkan PDF nota berlogo dalam waktu di bawah 60 detik
- [ ]  Ketiga jenis dokumen (nota, invoice, kwitansi) dapat dibuat, memakai penomoran terpisah, dan menampilkan field yang sesuai matriks 5.6
- [ ]  Invoice lunas dapat dikonversi menjadi kwitansi tertaut tanpa mengetik ulang
- [ ]  Perhitungan diskon, pajak, ongkir, dan pembulatan lolos seluruh unit test skenario
- [ ]  PDF 50 baris tidak memotong baris dan mengulang header di setiap halaman
- [ ]  Mode pesawat: nota tetap dapat dibuat, disimpan, dan dicetak
- [ ]  Cetak thermal 58mm berhasil pada minimal dua model printer Bluetooth berbeda, dan tombolnya memunculkan ajakan daftar bagi pengguna tamu tanpa menghilangkan draf
- [ ]  Tidak ada watermark, iklan, atau pelacak pihak ketiga di seluruh alur
- [ ]  Ekspor CSV berisi seluruh nota dan item dapat dibuka rapi di spreadsheet
- [ ]  Lighthouse mobile: Performance ≥ 90, PWA installable

---

## 15. Keputusan yang sudah diambil

| # | Pertanyaan | Keputusan | Dampak di dokumen |
| --- | --- | --- | --- |
| 1 | Berapa jenis dokumen di MVP? | Tiga: nota, invoice, kwitansi | 4.1, 5.6, matriks jenis dokumen, 8.2 |
| 2 | Cetak thermal untuk tamu? | Tidak. Cetak thermal memerlukan akun gratis | 4.4, F-18, F-30–F-32, 11, 14 |
| 3 | Berapa lama data tamu disimpan? | Tidak dihapus otomatis; pengingat bertahap 7 hari / 30 hari / 90 hari | 4.5 |
| 4 | Multi-usaha di v1? | Ditunda, tetapi `businessId` tetap disimpan agar aman untuk nanti | 4.3, 8.2 |
| 5 | Nama produk final | SATUNOTA | Seluruh dokumen |
| 6 | Prefiks penomoran | Tetap `NT/`, `INV/`, `KW/` sebagai bawaan, dan pengguna boleh mengubah polanya di Pengaturan | F-12, F-36, sub-halaman skema |
| 7 | Nama domain & merek | Sudah dicek dan aman, tidak ada perubahan nama | Seluruh dokumen |
| 8 | Link dokumen publik di MVP? | Tidak. Ditetapkan sebagai fitur Pro, di luar MVP | 4.2, F-20, 11 |

### 15.1 Pertanyaan tersisa

Tidak ada. Seluruh pertanyaan terbuka sudah dijawab dan dokumen siap dipakai sebagai acuan implementasi.

---

## 16. Sumber riset

**Lanskap fitur & pasar Indonesia**

- [Jurnal.id](http://Jurnal.id) — 8 Aplikasi Nota Online Terbaik
- [Paper.id](http://Paper.id) — 10 Aplikasi Invoice Online Gratis
- Kasir Pintar — Aplikasi dagang dan cetak nota untuk UMKM
- IDCloudHost — Rekomendasi aplikasi invoice untuk UMKM

**Fitur wajib & pembanding global**

- Bookipi — 10 Best Invoicing Software for Small Business
- Forbes Advisor — Best Invoicing and Billing Software
- WorkQuote — 10 Must-Have Features in Small Business Invoicing Software

**Keluhan pengguna**

- r/smallbusiness — "Invoice Simple admitted that you cannot trust them"
- r/smallbusiness — "Invoice generator with no account, no ads, no subscription"
- r/SaaS — "What's the best free invoice generator?"
- r/ProductivityApps — "I made a completely free invoice generator"
- Play Store & App Store — ulasan Invoice Maker, Tiny Invoice, aplikasi kasir UMKM
- Forum Invoice Ninja — Performance issues after update

**Teknis**

- r/nextjs — "PDF Generation is such a pain" & "Anyone generating PDFs server-side in Next.js?"
- [web.dev](http://web.dev) — Offline data (Cache Storage vs IndexedDB)
- Nutrient — JavaScript PDF generation: methods and best practices

**Pajak & regulasi**

- OnlinePajak — PPN 12% dan PMK 131/2024
- Klikpajak — Panduan e-Faktur PKP Pedagang Eceran

[SATUNOTA — Skema Data (v1.1)](SATUNOTA%20%E2%80%94%20Skema%20Data%20(v1%201)%20c0bafb0fa4484c29a1da89cdc0b47b5b.md)

[SATUNOTA — Fase Implementasi 7 Hari (AI-Assisted)](SATUNOTA%20%E2%80%94%20Fase%20Implementasi%207%20Hari%20(AI-Assisted)%209afa059abad3467bb85672361b4f48ce.md)

[SATUNOTA — Pembagian Fitur Paket Gratis & Pro (v1.1)](SATUNOTA%20%E2%80%94%20Pembagian%20Fitur%20Paket%20Gratis%20&%20Pro%20(v1%20%208a775157c65f4ebdb533a51fece96cf0.md)

[SATUNOTA — Design System gaya Notion (docs/DESIGN)](SATUNOTA%20%E2%80%94%20Design%20System%20gaya%20Notion%20(docs%20DESIGN)%20dad431fdda364abbb073537f0ae8b3f9.md)