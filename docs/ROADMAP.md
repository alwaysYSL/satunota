# SATUNOTA — Fase Implementasi 7 Hari (AI-Assisted)

<aside>
🤖

Dokumen turunan dari SRS v1.1. Rencana ini ditulis untuk pengembangan dengan bantuan AI coding agent, bukan pengetikan manual. Asumsinya: satu orang, sesi kerja 4–6 jam per hari, tujuh hari sampai rilis. Setiap fase punya prompt pembuka, kriteria selesai, dan gerbang verifikasi yang harus lulus sebelum lanjut.

</aside>

## 1. Cara kerja yang diasumsikan

| Aspek | Ketentuan |
| --- | --- |
| Peran kamu | Arsitek dan penguji. Kamu menentukan kontrak dan memverifikasi hasil |
| Peran AI | Penulis kode. Mengerjakan satu fase per sesi, bukan seluruh aplikasi sekaligus |
| Sumber kebenaran | SRS v1.1 dan dokumen skema. AI tidak boleh mengarang nama kolom atau aturan hitung |
| Ukuran tugas | Satu fase = satu percakapan, satu cabang git, satu commit besar |
| Verifikasi | Test otomatis dulu, baru mata manusia |

### 1.1 Aturan emas anti-kekacauan

1. **Kontrak sebelum kode.** Tipe, skema Zod, dan `lib/calc.ts` ditulis di Hari 1 dan setelah itu diperlakukan sebagai beku. Sebagian besar kekacauan pada *vibe coding* berawal dari tipe yang ikut berubah setiap kali fitur baru ditambahkan.
2. **Satu fase, satu cabang.** Kalau hasil satu sesi berantakan, buang cabangnya dan ulangi promptnya. Jangan pernah menambal hasil yang sudah kusut.
3. **Commit di setiap gerbang hijau.** Hanya commit saat build, test, dan pemeriksaan manual lulus.
4. **Kunci berkas inti.** `lib/calc.ts`, `lib/schema/*`, dan `lib/db/local.ts` hanya boleh diubah lewat permintaan eksplisit. Sertakan aturan ini di `AGENTS.md` repo.
5. **Tolak scope creep.** Kalau AI menawarkan fitur di luar bagian 4.3 SRS, jawab tidak.
6. **Uji di HP sungguhan sejak Hari 2**, bukan hanya di mode responsif peramban.

### 1.2 File konteks yang wajib dibuat lebih dulu

```
/AGENTS.md          → aturan main untuk AI: stack, larangan, gaya kode
/docs/SRS.md        → salinan SRS v1.1
/docs/SCHEMA.md     → salinan dokumen skema
/docs/DESIGN.md     → token warna, tipografi, komponen
```

<aside>
📌

Empat berkas ini adalah investasi terpenting dalam alur AI-assisted. Tanpa berkas ini, kamu akan menjelaskan ulang konteks yang sama di setiap sesi, dan AI akan menghasilkan variasi nama kolom yang berbeda-beda setiap kali.

</aside>

---

## 2. Peta tujuh hari

| Hari | Fase | Keluaran yang bisa dilihat | Gerbang |
| --- | --- | --- | --- |
| 1 | Fondasi & kontrak | Proyek jalan, perhitungan lulus test | G1 |
| 2 | Editor tiga jenis dokumen | Dokumen bisa dibuat di HP | G2 |
| 3 | Keluaran: PDF, PNG, WhatsApp | Dokumen bisa dikirim ke pelanggan | G3 |
| 4 | Penyimpanan lokal, riwayat, offline | Aplikasi dipakai tanpa internet | G4 |
| 5 | Akun gratis, gating, cetak thermal | Struk keluar dari printer | G5 |
| 6 | Pelanggan, status bayar, ekspor, retensi | Fitur MVP lengkap | G6 |
| 7 | QA, performa, aksesibilitas, rilis | Live di produksi | G7 |

---

## 3. Hari 1 — Fondasi & kontrak

**Tujuan.** Menetapkan seluruh kontrak yang tidak boleh berubah lagi selama enam hari berikutnya.

### 3.1 Tugas

- [ ]  `create-next-app` dengan TypeScript strict, Tailwind, App Router
- [ ]  Pasang shadcn/ui, Zod, React Hook Form, Zustand, Dexie, Vitest
- [ ]  Tulis `AGENTS.md` dan salin SRS, skema, dan design system ke `/docs`
- [ ]  Implementasi `lib/calc.ts` persis seperti dokumen skema
- [ ]  Implementasi `lib/schema/document.ts` beserta aturan bersyarat per jenis dokumen
- [ ]  Implementasi `lib/format.ts`: rupiah, tanggal Indonesia, terbilang
- [ ]  Implementasi `lib/numbering.ts`: pola nomor dan urutan berikutnya
- [ ]  Tulis 10 kasus uji perhitungan dari dokumen skema
- [ ]  Deploy kosong ke Vercel agar jalur rilis sudah terbukti sejak awal

### 3.2 Prompt pembuka

```
Baca /docs/SRS.md dan /docs/SCHEMA.md.

Implementasikan HANYA empat berkas berikut, tanpa UI sama sekali:
1. lib/calc.ts       — salin persis tanda tangan dan logika dari SCHEMA.md bagian 8
2. lib/schema/document.ts — skema Zod termasuk superRefine per jenis dokumen
3. lib/format.ts     — formatRupiah, formatTanggal, terbilang (Bahasa Indonesia)
4. lib/numbering.ts  — parsing pola {YYYY}{YY}{MM}{DD}{0001} dan urutan berikutnya

Lalu tulis lib/calc.test.ts yang mencakup 10 kasus uji di SCHEMA.md bagian 8.1.

Aturan keras:
- Uang selalu integer rupiah. Dilarang memakai float untuk uang.
- Fungsi murni. Tidak boleh menyentuh React, jaringan, atau penyimpanan.
- Jangan buat komponen, halaman, atau berkas lain di luar daftar ini.
```

### 3.3 Gerbang G1

- [ ]  `pnpm test` hijau untuk sepuluh kasus uji
- [ ]  Kasus pajak inklusif tidak menambahkan pajak dua kali
- [ ]  Terbilang benar untuk 0, 1.000, 15.500, 1.000.000, dan 1.250.750
- [ ]  `pnpm build` lulus dengan TypeScript strict tanpa `any`

<aside>
🚨

Jangan lanjut ke Hari 2 sebelum G1 hijau seluruhnya. Perhitungan yang salah di fondasi akan menyebar ke PDF, struk thermal, dan rekap, dan biaya perbaikannya berlipat setiap hari.

</aside>

---

## 4. Hari 2 — Editor tiga jenis dokumen

**Tujuan.** Layar utama yang bisa dipakai membuat ketiga jenis dokumen dengan nyaman di HP.

### 4.1 Tugas

- [ ]  Layout mobile-first dengan action bar bawah yang menempel
- [ ]  Pemilih jenis dokumen: Nota, Invoice, Kwitansi
- [ ]  Daftar line item: tambah, ubah, hapus, ubah urutan
- [ ]  Input angka dengan `inputmode="decimal"` dan format ribuan saat mengetik
- [ ]  Chip progressive disclosure: Diskon, Pajak, Ongkir, Catatan, Jatuh tempo
- [ ]  Field bersyarat sesuai matriks 5.6 SRS
- [ ]  Store Zustand terhubung ke `calc()` dengan pembaruan seketika
- [ ]  Halaman preview yang memakai komponen layout yang sama dengan PDF

### 4.2 Prompt pembuka

```
Bangun editor dokumen di app/(editor)/page.tsx dengan store Zustand.

Wajib:
- Mobile-first. Action bar bawah menampilkan total berjalan dan tombol Simpan/Bagikan.
- Pemilih jenis dokumen mengubah field yang tampil sesuai matriks 5.6 di SRS.md.
- Seluruh angka dihitung HANYA lewat calc() dari lib/calc.ts. Dilarang menghitung ulang di komponen.
- Validasi memakai documentSchema yang sudah ada. Jangan bikin skema baru.
- Komponen preview dibuat sebagai komponen bersama yang nanti dipakai ulang oleh PDF.

Larangan: jangan sentuh lib/calc.ts atau lib/schema/*. Jangan tambahkan penyimpanan atau autentikasi.
```

### 4.3 Gerbang G2

- [ ]  Ketiga jenis dokumen dapat dibuat dan menampilkan field yang benar
- [ ]  Total berubah seketika saat mengetik, tanpa jeda terasa
- [ ]  Invoice tanpa jatuh tempo tidak bisa disimpan; kwitansi tanpa "diterima dari" juga tidak
- [ ]  Diuji di HP Android sungguhan: seluruh alur bisa diselesaikan satu tangan

---

## 5. Hari 3 — Keluaran: PDF, PNG, WhatsApp

**Tujuan.** Dokumen bisa keluar dari aplikasi dan sampai ke pelanggan.

### 5.1 Tugas

- [ ]  `api/pdf/route.ts` memakai `@react-pdf/renderer`
- [ ]  Template PDF A4 dan A5 untuk ketiga jenis dokumen
- [ ]  Font Indonesia di-*embed* agar hasil dev dan prod identik
- [ ]  Header tabel berulang di setiap halaman, baris tidak boleh terpotong
- [ ]  Ekspor PNG lewat `html-to-image` untuk dikirim di chat
- [ ]  Tombol bagikan WhatsApp dengan template pesan Bahasa Indonesia
- [ ]  Web Share API bila tersedia, unduhan biasa sebagai cadangan

### 5.2 Prompt pembuka

```
Implementasikan render PDF di app/api/pdf/route.ts memakai @react-pdf/renderer.

Wajib:
- Satu komponen dokumen yang menerima jenis (nota/invoice/kwitansi) dan menyesuaikan judul serta field.
- Angka diambil dari hasil calc(), jangan dihitung ulang di dalam komponen PDF.
- Header tabel berulang di setiap halaman. Baris item tidak boleh terpotong antar halaman.
- Embed font (Inter atau Noto Sans) supaya rendering konsisten di serverless.
- Ukuran A4 dan A5 lewat query parameter.

Buat juga test snapshot untuk dokumen berisi 1, 10, dan 50 baris item.
```

### 5.3 Gerbang G3

- [ ]  PDF 50 baris rapi, tanpa baris terpotong, header berulang
- [ ]  PDF terlihat identik dengan preview di layar
- [ ]  Tidak ada watermark atau branding aplikasi di keluaran mana pun
- [ ]  Waktu render PDF di bawah 2 detik pada produksi
- [ ]  Berbagi ke WhatsApp berhasil dari HP Android sungguhan

<aside>
🎯

Hari 3 adalah titik ketika aplikasi mulai berguna secara nyata. Kalau jadwal mundur, semua yang setelah ini bisa digeser, tetapi Hari 1 sampai 3 tidak boleh dikompromikan.

</aside>

---

## 6. Hari 4 — Penyimpanan lokal, riwayat, offline

**Tujuan.** Aplikasi berguna tanpa internet dan tidak pernah kehilangan pekerjaan pengguna.

### 6.1 Tugas

- [ ]  Skema Dexie persis seperti dokumen skema bagian 6
- [ ]  Simpan otomatis saat mengetik, dengan `debounce` sekitar 500 ms
- [ ]  Halaman riwayat dengan pencarian dan filter jenis serta status
- [ ]  Duplikat dokumen menjadi dokumen baru
- [ ]  Konversi invoice lunas menjadi kwitansi tertaut
- [ ]  Service worker: app shell cache, halaman offline, prompt pemasangan
- [ ]  `navigator.storage.persist()` diminta setelah dokumen pertama tersimpan
- [ ]  Penomoran memakai `meta.nextSeq:<tipe>` dengan reset bulanan

### 6.2 Gerbang G4

- [ ]  Mode pesawat: buat, simpan, buka riwayat, unduh PDF, semuanya jalan
- [ ]  Tutup paksa peramban di tengah pengetikan; draf tetap utuh saat dibuka lagi
- [ ]  Penomoran tidak pernah bertabrakan setelah 30 dokumen berturut-turut
- [ ]  Lighthouse menyatakan aplikasi dapat dipasang sebagai PWA

---

## 7. Hari 5 — Akun gratis, gating, cetak thermal

**Tujuan.** Menegakkan keputusan gating dari SRS 4.4 dan membuat struk benar-benar keluar dari printer.

### 7.1 Tugas

- [ ]  Supabase Auth: magic link dan Google
- [ ]  Seluruh tabel dan kebijakan RLS dari dokumen skema
- [ ]  Migrasi data tamu ke akun tanpa kehilangan draf yang sedang dibuka
- [ ]  Gating: tombol Cetak thermal memunculkan ajakan daftar bagi tamu
- [ ]  Web Bluetooth: pemindaian perangkat, koneksi, ingat perangkat terakhir
- [ ]  Pembuat perintah ESC/POS untuk lebar 58mm dan 80mm
- [ ]  Cadangan cetak: render struk sebagai gambar
- [ ]  Halaman pengaturan printer dengan tombol tes cetak

### 7.2 Prompt pembuka

```
Implementasikan cetak thermal via Web Bluetooth di lib/printer/escpos.ts.

Wajib:
- Layanan Bluetooth printer serial umum (00001101-0000-1000-8000-00805f9b34fb dan varian yang biasa dipakai printer 58mm).
- Bangun perintah ESC/POS: inisialisasi, rata tengah, teks tebal, lebar kertas 32 karakter untuk 58mm dan 48 karakter untuk 80mm, potong kertas.
- Angka diambil dari hasil calc(), jangan dihitung ulang.
- Kirim per potongan maksimal 512 byte dengan jeda kecil; banyak printer murah kehilangan data kalau dikirim sekaligus.
- Deteksi peramban yang tidak mendukung Web Bluetooth dan alihkan ke cetak gambar.

Gating: fungsi ini hanya boleh dipanggil oleh pengguna yang sudah login. Tamu diarahkan ke dialog daftar tanpa kehilangan draf.
```

### 7.3 Gerbang G5

- [ ]  Struk tercetak rapi pada printer 58mm sungguhan, angka tidak melenceng
- [ ]  Tamu yang menekan Cetak thermal melihat ajakan daftar, dan setelah daftar langsung kembali ke dokumen yang sama
- [ ]  Data tamu ikut pindah ke akun tanpa ada yang hilang
- [ ]  RLS terbukti: akun A tidak bisa membaca data akun B

<aside>
🖨️

Beli printer thermal 58mm murah sebelum Hari 5. Fase ini tidak bisa diverifikasi lewat simulasi, dan perilaku printer murah sangat bervariasi antar merek.

</aside>

---

## 8. Hari 6 — Pelanggan, status bayar, ekspor, retensi

**Tujuan.** Menutup seluruh butir Wajib pada SRS.

### 8.1 Tugas

- [ ]  Data pelanggan dengan autofill di editor
- [ ]  Pencatatan pembayaran dan status: draf, terkirim, sebagian, lunas
- [ ]  Jatuh tempo dihitung saat tampil, bukan disimpan
- [ ]  Ekspor CSV dan JSON sesuai format di dokumen skema
- [ ]  Pengingat retensi tamu: ambang 7 hari, 30 hari, 90 hari
- [ ]  Cadangan JSON otomatis mingguan yang bisa diunduh dari Pengaturan
- [ ]  Halaman pengaturan: profil usaha, logo, pola nomor, pajak default
- [ ]  Halaman Tentang dengan penafian Faktur Pajak
- [ ]  Sinkronisasi outbox bila sempat, kalau tidak digeser ke pasca-rilis

### 8.2 Gerbang G6

- [ ]  Seluruh butir Wajib di SRS bagian 5 sudah ada
- [ ]  CSV terbuka rapi di Excel, karakter Indonesia tidak rusak, angka tidak jadi teks
- [ ]  Pengingat retensi muncul tepat di ambangnya, diuji dengan tanggal palsu
- [ ]  Penafian pajak tampil di halaman Tentang dan di pengaturan pajak

---

## 9. Hari 7 — QA, performa, rilis

### 9.1 Tugas

- [ ]  Jalankan seluruh delapan kriteria penerimaan SRS bagian 14
- [ ]  Lighthouse mobile, target Performance minimal 90
- [ ]  Periksa ukuran bundel rute editor, target di bawah 200 KB gzip
- [ ]  Uji di Safari iOS: pastikan cadangan cetak gambar berfungsi
- [ ]  Uji di HP Android kelas bawah dengan jaringan 4G lambat
- [ ]  Pemeriksaan aksesibilitas: kontras, target sentuh 44 piksel, label
- [ ]  Pasang analitik tanpa cookie dan pelaporan galat
- [ ]  Siapkan domain, metadata, ikon, dan gambar berbagi
- [ ]  Rilis ke produksi

### 9.2 Gerbang G7 — daftar periksa rilis

- [ ]  Delapan kriteria penerimaan SRS bagian 14 lulus semua
- [ ]  Tidak ada galat konsol pada alur utama
- [ ]  Tidak ada watermark, iklan, atau pelacak pihak ketiga
- [ ]  Ekspor data berfungsi bagi tamu maupun pemilik akun
- [ ]  Penghapusan akun benar-benar menghapus seluruh data
- [ ]  Cetak thermal terverifikasi pada dua model printer berbeda

---

## 10. Penyangga & manajemen risiko jadwal

| Risiko jadwal | Tanda awal | Tindakan |
| --- | --- | --- |
| PDF memakan waktu lebih dari sehari | Masih memperbaiki layout di sore Hari 3 | Turunkan ke A4 saja, A5 digeser ke pasca-rilis |
| Web Bluetooth tidak stabil | Printer terputus berulang di Hari 5 | Rilis dengan cetak gambar sebagai jalur utama, Bluetooth menyusul |
| Sinkronisasi lebih rumit dari perkiraan | Belum jalan di siang Hari 6 | Geser seluruhnya ke pasca-rilis; akun tetap dipakai untuk gating |
| AI menghasilkan kode berputar-putar | Dua sesi berturut tanpa kemajuan | Buang cabang, pecah tugas jadi lebih kecil, tulis ulang prompt |

<aside>
🧠

**Yang boleh dikorbankan bila waktu habis:** sinkronisasi cloud, ukuran A5, impor CSV, tanda tangan, dan multi-template. **Yang tidak boleh dikorbankan:** ketepatan perhitungan, kualitas PDF, kemampuan offline, dan ekspor data.

</aside>