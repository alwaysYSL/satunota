<aside>
🎨

Dokumen ini adalah sumber kebenaran tunggal untuk tampilan SATUNOTA. Salin isinya ke `/docs/DESIGN.md` di repo. AI coding agent wajib memakai token di sini dan **dilarang mengarang warna, ukuran, atau radius baru**.

</aside>

## 0. Filosofi: kenapa Notion cocok, dan di mana batasnya

Notion terasa tenang karena tiga hal, dan ketiganya sangat pas untuk aplikasi nota yang dipakai sambil melayani pembeli.

| Sifat Notion | Kenapa cocok untuk SATUNOTA |
| --- | --- |
| Latar putih, garis nyaris tak terlihat | Isi dokumen jadi bintangnya, bukan hiasan antarmuka |
| Hampir tanpa bayangan dan gradien | Ringan dirender, bagus untuk HP kelas bawah (N-01, N-03) |
| Satu warna aksen saja | Tombol utama selalu jelas, tidak ada kebingungan aksi |
| Radius kecil, bukan kapsul | Terkesan alat kerja serius, bukan mainan |
| Hover dan tekan berupa perubahan latar tipis | Umpan balik cukup terasa tanpa animasi mahal |

<aside>
⚠️

**Batas yang penting.** Gaya Notion dipakai untuk **antarmuka aplikasi**, bukan untuk **dokumen yang dicetak**. Nota, invoice, dan kwitansi yang keluar sebagai PDF harus terlihat formal dan konvensional agar dipercaya pelanggan dan pihak ketiga. Aturan lengkapnya ada di bagian 9. Jangan pernah menerapkan estetika Notion ke keluaran PDF atau struk thermal.

</aside>

---

## 1. Warna

Nilai di bawah mengikuti palet Notion. Jangan memakai warna di luar daftar ini.

### 1.1 Token dasar (mode terang)

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | Latar utama halaman |
| `--bg-subtle` | `#F7F7F5` | Panel samping, header tabel, area sekunder |
| `--bg-hover` | `rgba(55,53,47,0.06)` | Baris atau tombol saat disentuh |
| `--bg-active` | `rgba(55,53,47,0.11)` | Keadaan sedang ditekan |
| `--text` | `#37352F` | Teks utama. Bukan hitam murni, ini kunci rasa Notion |
| `--text-secondary` | `rgba(55,53,47,0.65)` | Label, keterangan, satuan |
| `--text-tertiary` | `rgba(55,53,47,0.45)` | Placeholder, teks nonaktif |
| `--border` | `rgba(55,53,47,0.09)` | Garis pemisah dan tepi kartu |
| `--border-strong` | `rgba(55,53,47,0.16)` | Tepi input dan tabel |
| `--accent` | `#2383E2` | Tombol utama, tautan, fokus |
| `--accent-hover` | `#1B6FC4` | Aksen saat disentuh |
| `--accent-subtle` | `#E7F3F8` | Latar terpilih, sorotan lembut |

### 1.2 Warna makna

Diambil dari palet teks dan latar Notion agar tetap satu keluarga.

| Makna | Teks | Latar | Dipakai untuk |
| --- | --- | --- | --- |
| Sukses / Lunas | `#448361` | `#DBEDDB` | Status lunas, notifikasi berhasil |
| Peringatan / Jatuh tempo | `#CB912F` | `#FDECC8` | Mendekati jatuh tempo, dibayar sebagian |
| Bahaya / Terlambat | `#D44C47` | `#FFE2DD` | Lewat jatuh tempo, galat, hapus |
| Informasi | `#337EA9` | `#D3E5EF` | Terkirim, catatan sistem |
| Netral / Draf | `#787774` | `#E3E2E0` | Draf, label tanpa makna khusus |
| Pro | `#9065B0` | `#EAE4F2` | Penanda fitur berbayar |

### 1.3 Mode gelap

| Token | Nilai |
| --- | --- |
| `--bg` | `#191919` |
| `--bg-subtle` | `#202020` |
| `--bg-hover` | `rgba(255,255,255,0.055)` |
| `--bg-active` | `rgba(255,255,255,0.10)` |
| `--text` | `#D4D4D4` |
| `--text-secondary` | `rgba(255,255,255,0.62)` |
| `--text-tertiary` | `rgba(255,255,255,0.40)` |
| `--border` | `rgba(255,255,255,0.094)` |
| `--border-strong` | `rgba(255,255,255,0.18)` |
| `--accent` | `#2383E2` |

<aside>
🌙

Mode gelap adalah fitur pasca-rilis, **bukan bagian MVP**. Tetapi seluruh warna wajib ditulis sebagai variabel CSS sejak Hari 1, sehingga menambahkannya nanti hanya perlu satu blok `.dark`, bukan menyisir ulang seluruh komponen.

</aside>

---

## 2. Tipografi

Notion memakai satu keluarga huruf sans untuk hampir segalanya, dengan kontras ukuran yang kecil. Kesan tenangnya justru datang dari kontras yang rendah itu.

| Peran | Ukuran | Tebal | Tinggi baris | Catatan |
| --- | --- | --- | --- | --- |
| Judul halaman | 28 px | 700 | 1.2 | Jarak huruf -0.02em |
| Judul bagian | 18 px | 600 | 1.3 | Untuk kelompok field |
| Teks utama | 16 px | 400 | 1.5 | Jangan turun ke 14 px di HP, memicu zoom otomatis iOS |
| Label field | 13 px | 500 | 1.4 | Warna `--text-secondary` |
| Keterangan | 12 px | 400 | 1.4 | Warna `--text-tertiary` |
| Angka uang | 16 px | 500 | 1.4 | Wajib `font-variant-numeric: tabular-nums` |
| Total besar | 24 px | 700 | 1.2 | Tabular-nums, di action bar |

```css
--font-sans: "Inter", ui-sans-serif, -apple-system, BlinkMacSystemFont,
  "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

<aside>
🔢

**Aturan yang tidak boleh dilanggar.** Setiap angka rupiah di mana pun harus memakai `tabular-nums`. Tanpa ini, digit punya lebar berbeda dan kolom total akan bergoyang saat pengguna mengetik. Ini kesalahan paling sering di aplikasi nota dan paling merusak kesan rapi.

</aside>

---

## 3. Ruang, radius, dan garis

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--space-1` | 4 px | Jarak dalam label ke ikon |
| `--space-2` | 8 px | Jarak antar elemen berdekatan |
| `--space-3` | 12 px | Padding dalam input |
| `--space-4` | 16 px | Padding tepi layar di HP |
| `--space-6` | 24 px | Jarak antar kelompok field |
| `--space-8` | 32 px | Jarak antar bagian besar |
| `--radius-sm` | 4 px | Chip, badge, tombol kecil |
| `--radius-md` | 6 px | Input, tombol, kartu. Ini radius utama |
| `--radius-lg` | 10 px | Sheet bawah dan dialog |

<aside>
📐

**Dilarang memakai radius penuh (`rounded-full`) pada tombol.** Tombol kapsul membuat aplikasi terasa seperti aplikasi konsumen, bukan alat kerja. Radius penuh hanya boleh untuk avatar dan titik indikator.

</aside>

**Bayangan.** Hanya ada dua, dan keduanya sangat halus.

```css
--shadow-sm: 0 1px 2px rgba(15,15,15,0.06);   /* kartu terangkat */
--shadow-md: 0 4px 12px rgba(15,15,15,0.12);  /* sheet, dialog, dropdown */
```

Selain dua ini, **tidak ada bayangan.** Pemisahan antar area dikerjakan oleh garis `--border` dan latar `--bg-subtle`, bukan oleh bayangan.

---

## 4. Komponen

### 4.1 Tombol

| Varian | Latar | Teks | Tepi | Dipakai untuk |
| --- | --- | --- | --- | --- |
| Primary | `--accent` | Putih | Tidak ada | Satu per layar saja: Simpan, Bagikan, Cetak |
| Secondary | Transparan | `--text` | `--border-strong` | Aksi pendamping |
| Ghost | Transparan | `--text-secondary` | Tidak ada | Ikon, aksi dalam baris item |
| Danger | Transparan | `#D44C47` | Tidak ada | Hapus baris, hapus dokumen |

Tinggi tombol **40 px** di desktop dan **44 px** di HP, memenuhi N-06. Transisi hanya `background-color 20ms ease-in`, meniru respons instan Notion.

### 4.2 Input

Ini bagian paling khas Notion dan paling menentukan rasa aplikasinya.

- Keadaan diam: **tanpa tepi**, hanya teks di atas latar transparan.
- Saat disentuh: latar berubah ke `--bg-hover`.
- Saat aktif: tepi 1 px `--accent`, tanpa cincin fokus tebal, tanpa bayangan.
- Placeholder memakai `--text-tertiary` dan berbunyi seperti contoh isi, misalnya `Nasi goreng`, bukan `Masukkan nama barang`.
- Input angka: `inputmode="decimal"`, rata kanan, `tabular-nums`, format ribuan otomatis saat mengetik.

<aside>
⌨️

Ukuran teks input **wajib minimal 16 px**. Safari iOS otomatis melakukan zoom saat pengguna menyentuh input yang ukurannya di bawah 16 px, dan zoom itu tidak kembali sendiri. Bug ini terasa sangat murah bagi pengguna dan sering luput sampai pengujian akhir.

</aside>

### 4.3 Baris item

Modelnya meniru baris blok di Notion.

- Padding vertikal 8 px, garis pemisah `--border` sangat tipis.
- Pegangan geser dan tombol hapus **tersembunyi** sampai baris disentuh atau difokus.
- Geser ke kiri untuk menghapus di HP, dengan konfirmasi urung selama 5 detik, bukan dialog.
- Baris kosong terakhir selalu tersedia sebagai baris siap isi, sehingga pengguna tidak perlu menekan tombol tambah untuk item berikutnya.

### 4.4 Chip progressive disclosure

Dipakai untuk Diskon, Pajak, Ongkir, Catatan, Jatuh tempo sesuai SRS 9.1.

- Bentuk: `--radius-sm`, tinggi 32 px, tepi `--border-strong`, teks 13 px.
- Belum aktif: latar transparan, teks `--text-secondary`, diawali tanda tambah.
- Sudah aktif: latar `--accent-subtle`, teks `--accent`, menampilkan nilainya, misalnya `Diskon Rp 5.000`.
- Menyentuh chip aktif membuka sheet bawah untuk mengubah nilainya.

### 4.5 Badge status

Memakai gaya tag Notion: latar lembut, teks warna senada, radius kecil, huruf 12 px, padding 2 px 8 px.

| Status | Teks | Latar |
| --- | --- | --- |
| Draf | `#787774` | `#E3E2E0` |
| Terkirim | `#337EA9` | `#D3E5EF` |
| Sebagian | `#CB912F` | `#FDECC8` |
| Lunas | `#448361` | `#DBEDDB` |
| Jatuh tempo | `#D44C47` | `#FFE2DD` |

### 4.6 Action bar bawah

Satu-satunya elemen yang menetap di layar.

- Menempel di bawah, latar `--bg`, garis atas `--border`, aman terhadap `env(safe-area-inset-bottom)`.
- Kiri: label Total kecil dan angka total besar dengan `tabular-nums`.
- Kanan: satu tombol Primary. Aksi lain masuk menu titik tiga.
- Tinggi 64 px, padding 12 px 16 px, tanpa bayangan.

### 4.7 Sheet bawah

Semua pengaturan tambahan memakai sheet bawah, bukan halaman baru.

- Radius atas `--radius-lg`, `--shadow-md`, ada pegangan geser di atas.
- Tinggi maksimal 85% layar, isi bisa digulir.
- Menutup dengan menggeser ke bawah atau menyentuh latar gelap `rgba(15,15,15,0.4)`.

### 4.8 Keadaan kosong

Mengikuti nada Notion: tenang, singkat, dan selalu menawarkan satu aksi.

- Ikon garis tipis warna `--text-tertiary`, ukuran 32 px. Tanpa ilustrasi berwarna.
- Satu kalimat, misalnya `Belum ada nota di sini.`
- Satu tombol Secondary.

### 4.9 Indikator offline dan sinkronisasi

SATUNOTA adalah aplikasi offline-first (§7.3, F-22 sampai F-29), jadi keadaan offline adalah **keadaan normal, bukan galat**. Visualnya harus tenang, tidak boleh memakai warna bahaya.

| Keadaan | Tampilan | Warna | Letak |
| --- | --- | --- | --- |
| Tersimpan lokal, belum sinkron | Teks 12 px `Tersimpan di perangkat` | `--text-tertiary` | Bawah judul dokumen |
| Sedang menyinkronkan | Teks 12 px `Menyinkronkan` dengan titik berdenyut 6 px | `--text-tertiary` | Sama |
| Sudah tersinkron | Teks 12 px `Tersimpan` selama 2 detik lalu memudar | `--text-tertiary` | Sama |
| Gagal sinkron | Teks 12 px `Belum tersimpan ke server` dan tautan `Coba lagi` | `--warning` | Sama |
| Perangkat offline | Bilah tipis 24 px `Kamu sedang offline. Nota tetap bisa dibuat` | Latar `--bg-subtle`, teks `--text-secondary` | Menempel di atas layar |

<aside>
📶

**Jangan pernah memakai merah untuk keadaan offline.** Merah dicadangkan untuk kehilangan data dan aksi merusak. Membuat pengguna panik saat sinyal hilang justru merusak kepercayaan pada janji utama aplikasi ini, yaitu tetap bisa dipakai tanpa internet.

</aside>

### 4.10 Fitur terkunci untuk paket Pro

Mengikuti dokumen Paket: ajakan upgrade hanya muncul saat pengguna benar-benar menyentuh fiturnya, bukan dipajang di mana-mana.

- Tombol fitur Pro **tetap terlihat penuh dan tetap bisa ditekan**. Jangan diredupkan, jangan dinonaktifkan. Membuat pengguna menyangka aplikasinya rusak lebih buruk daripada menawarkan upgrade.
- Penanda berupa label teks kecil `Pro` 11 px, tebal 500, warna `--pro`, latar `--pro-bg`, radius `--radius-sm`, padding 1 px 6 px. Diletakkan di kanan label tombol.
- Menekannya membuka sheet bawah: satu kalimat manfaat, harga, satu tombol Primary, dan tautan ghost `Nanti saja`.
- Maksimal **satu** penanda Pro terlihat dalam satu layar. Bila ada beberapa, tandai yang paling relevan saja.

<aside>
💜

Warna ungu `#9065B0` di sini diambil dari palet tag Notion dan **hanya boleh dipakai sebagai teks label kecil**. Ungu dilarang menjadi latar tombol, latar kartu, apalagi gradien. Alasannya ada di bagian 12.

</aside>

### 4.11 Banner retensi data tamu

Keputusan §15 baris 3 menetapkan tiga ambang. Ketiganya butuh bobot visual yang berbeda, dari paling halus ke paling tegas.

| Ambang | Bentuk | Warna | Bisa ditutup |
| --- | --- | --- | --- |
| 7 hari atau 10 dokumen | Baris teks 13 px di atas daftar riwayat, dengan tautan `Amankan data` | Latar `--bg-subtle`, teks `--text-secondary` | Ya, tidak muncul lagi 7 hari |
| 30 hari atau 50 dokumen | Dialog sekali saja, dua tombol: `Daftar gratis` dan `Unduh cadangan` | Netral, ikon garis 32 px `--warning` | Ya, satu kali saja |
| 90 hari tidak dibuka | Banner menetap di atas riwayat | Latar `--warning-bg`, teks `--warning` | Tidak |

Nada tulisannya menjaga, bukan mengancam. Tulis `Data kamu hanya ada di perangkat ini`, jangan `Data kamu akan hilang`. Data tamu memang tidak dihapus otomatis, jadi kalimat yang menakut-nakuti akan menjadi kebohongan.

---

## 5. Gerak

Notion terasa cepat karena animasinya nyaris tidak ada.

| Interaksi | Durasi | Kurva |
| --- | --- | --- |
| Hover dan tekan | 20 ms | `ease-in` |
| Sheet muncul | 200 ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Dialog muncul | 150 ms | `ease-out` |
| Notifikasi ringkas | 150 ms | `ease-out` |
| Perubahan angka total | 0 ms | Tanpa animasi, harus terasa seketika |

Hormati `prefers-reduced-motion` dengan menonaktifkan seluruh transisi.

---

## 6. Ikon

- Pustaka: **Lucide** (bawaan shadcn/ui), gaya garis, ketebalan 1.5 px.
- Ukuran 16 px di dalam baris, 20 px untuk tombol ikon berdiri sendiri.
- Warna mengikuti `currentColor`, jangan diberi warna sendiri.
- Tidak ada ikon berwarna atau emoji di dalam antarmuka, kecuali logo usaha milik pengguna.

---

## 7. Tata letak

| Layar | Aturan |
| --- | --- |
| HP, di bawah 640 px | Satu kolom, padding tepi 16 px, action bar menempel bawah |
| Tablet, 640 sampai 1024 px | Satu kolom, lebar isi maksimal 640 px, ditengahkan |
| Desktop, di atas 1024 px | Tetap satu kolom, lebar isi maksimal 720 px, ditengahkan |

Lebar isi maksimal **720 px**, meniru lebar halaman Notion. Melebihi ini, baris jadi terlalu panjang dan sulit dipindai.

<aside>
🖥️

**Tidak ada tata letak dua kolom dengan pratinjau berdampingan di MVP.** SRS tidak pernah memintanya, dan membangunnya berarti memelihara dua susunan layar sekaligus dalam jadwal tujuh hari. Desktop cukup memakai susunan HP yang ditengahkan.

</aside>

### 7.1 Peta layar ke komponen

Agar AI tidak menebak susunan tiap halaman.

| Rute | Komponen yang dipakai | Catatan tata letak |
| --- | --- | --- |
| `/` Editor | 4.2 input, 4.3 baris item, 4.4 chip, 4.6 action bar, 4.9 indikator | Identitas usaha di atas, daftar item di tengah, chip di bawah daftar, action bar menempel |
| `dokumen/[id]` | 4.5 badge status, 4.6 action bar, 4.7 sheet, 4.10 penanda Pro | Pratinjau dokumen menggulir, action bar berisi tombol Bagikan |
| `dokumen/riwayat` | 4.3 baris, 4.5 badge, 4.8 keadaan kosong, 4.11 banner retensi | Daftar rata kiri, nominal rata kanan dengan `tnum`, dikelompokkan per bulan |
| `pengaturan` | 4.1 tombol, 4.2 input, 4.7 sheet, 4.10 penanda Pro | Kelompok field dipisah jarak 24 px dan judul bagian 18 px, tanpa kartu |
| `n/[token]` Halaman publik | Gaya dokumen, bukan gaya aplikasi | Ikuti bagian 9. Tanpa navigasi, tanpa action bar, hanya dokumen dan tombol unduh |
| Sheet cetak thermal | 4.7 sheet, 4.1 tombol, 4.10 penanda Pro | Pratinjau teks monospace 32 karakter, bukan pratinjau bergaya aplikasi |

---

## 8. Nada tulisan

Mengikuti gaya Notion: langsung, hangat, tanpa jargon dan tanpa berlebihan.

| Situasi | Tulis begini | Jangan begini |
| --- | --- | --- |
| Tombol simpan | Simpan | Simpan Sekarang! |
| Berhasil | Nota tersimpan | Selamat! Nota Anda berhasil disimpan |
| Galat | Nomor nota ini sudah dipakai. Coba nomor lain | Terjadi kesalahan (ERR_DUP_001) |
| Kosong | Belum ada nota di sini | Ups, sepertinya kamu belum punya nota |
| Ajakan daftar | Daftar gratis untuk mencetak ke printer thermal | Buka semua fitur premium sekarang |

Gunakan sapaan **kamu**, bukan Anda. Hindari tanda seru.

---

## 9. Batas tegas: dokumen keluaran bukan Notion

<aside>
🚨

Bagian ini yang paling sering salah dikerjakan oleh AI. Ketika diberi design system bergaya Notion, AI cenderung ikut membuat PDF nota yang bergaya Notion juga. **Itu keliru.** Nota adalah dokumen komersial yang dilihat pelanggan, akuntan, dan kadang pihak pajak, sehingga harus terlihat konvensional dan formal.

</aside>

| Aspek | Antarmuka aplikasi | PDF nota | Struk thermal |
| --- | --- | --- | --- |
| Gaya | Notion: tenang, lapang | Formal, padat, konvensional | Monospace, teks polos |
| Warna | Aksen biru `#2383E2` | Hitam di atas putih, aksen hanya pada garis judul | Hanya hitam putih |
| Tepi tabel | Nyaris tak terlihat | Terlihat jelas, wajib ada | Garis titik-titik ASCII |
| Huruf | Inter 16 px | Inter 10 pt, di-*embed* | Bawaan printer, 32 karakter untuk 58mm |
| Radius | 4 sampai 10 px | Nol. Semua sudut siku | Tidak berlaku |
| Ruang kosong | Lapang | Rapat, hemat kertas | Serapat mungkin |
| Rasa yang dituju | Enak dipakai | Sah dan bisa dipercaya | Terbaca jelas |

---

## 10. Token siap tempel

### 10.1 `app/globals.css`

```css
@layer base {
  :root {
    --bg: #FFFFFF;
    --bg-subtle: #F7F7F5;
    --bg-hover: rgba(55, 53, 47, 0.06);
    --bg-active: rgba(55, 53, 47, 0.11);

    --text: #37352F;
    --text-secondary: rgba(55, 53, 47, 0.65);
    --text-tertiary: rgba(55, 53, 47, 0.45);

    --border: rgba(55, 53, 47, 0.09);
    --border-strong: rgba(55, 53, 47, 0.16);

    --accent: #2383E2;
    --accent-hover: #1B6FC4;
    --accent-subtle: #E7F3F8;

    --success: #448361;
    --success-bg: #DBEDDB;
    --warning: #CB912F;
    --warning-bg: #FDECC8;
    --danger: #D44C47;
    --danger-bg: #FFE2DD;
    --info: #337EA9;
    --info-bg: #D3E5EF;
    --neutral: #787774;
    --neutral-bg: #E3E2E0;
    --pro: #9065B0;
    --pro-bg: #EAE4F2;

    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 10px;

    --shadow-sm: 0 1px 2px rgba(15, 15, 15, 0.06);
    --shadow-md: 0 4px 12px rgba(15, 15, 15, 0.12);
  }

  .dark {
    --bg: #191919;
    --bg-subtle: #202020;
    --bg-hover: rgba(255, 255, 255, 0.055);
    --bg-active: rgba(255, 255, 255, 0.10);
    --text: #D4D4D4;
    --text-secondary: rgba(255, 255, 255, 0.62);
    --text-tertiary: rgba(255, 255, 255, 0.40);
    --border: rgba(255, 255, 255, 0.094);
    --border-strong: rgba(255, 255, 255, 0.18);
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .tnum {
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
}
```

### 10.2 `tailwind.config.ts`

```tsx
import type { Config } from "tailwindcss"

export default {
	content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				bg: {
					DEFAULT: "var(--bg)",
					subtle: "var(--bg-subtle)",
					hover: "var(--bg-hover)",
					active: "var(--bg-active)",
				},
				fg: {
					DEFAULT: "var(--text)",
					secondary: "var(--text-secondary)",
					tertiary: "var(--text-tertiary)",
				},
				line: {
					DEFAULT: "var(--border)",
					strong: "var(--border-strong)",
				},
				accent: {
					DEFAULT: "var(--accent)",
					hover: "var(--accent-hover)",
					subtle: "var(--accent-subtle)",
				},
				success: { DEFAULT: "var(--success)", bg: "var(--success-bg)" },
				warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)" },
				danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)" },
				info: { DEFAULT: "var(--info)", bg: "var(--info-bg)" },
				neutral: { DEFAULT: "var(--neutral)", bg: "var(--neutral-bg)" },
				pro: { DEFAULT: "var(--pro)", bg: "var(--pro-bg)" },
			},
			borderRadius: {
				sm: "var(--radius-sm)",
				md: "var(--radius-md)",
				lg: "var(--radius-lg)",
			},
			boxShadow: {
				sm: "var(--shadow-sm)",
				md: "var(--shadow-md)",
			},
			maxWidth: {
				content: "720px",
			},
		},
	},
} satisfies Config
```

---

## 11. Daftar periksa untuk AI

Salin daftar ini ke `AGENTS.md` sebagai aturan tampilan.

- [ ]  Tidak ada nilai warna heksadesimal yang ditulis langsung di komponen. Semua lewat token Tailwind
- [ ]  Tidak ada `rounded-full` pada tombol
- [ ]  Tidak ada bayangan selain `shadow-sm` dan `shadow-md`
- [ ]  Tidak ada gradien di mana pun
- [ ]  Setiap angka rupiah memakai kelas `tnum`
- [ ]  Setiap input berukuran minimal 16 px
- [ ]  Setiap target sentuh minimal 44 × 44 px
- [ ]  Hanya ada satu tombol Primary per layar
- [ ]  Semua teks antarmuka Bahasa Indonesia, memakai sapaan kamu, tanpa tanda seru
- [ ]  Template PDF dan struk thermal **tidak** memakai token ini, melainkan mengikuti bagian 9
- [ ]  Tidak ada warna neon, ungu sebagai warna utama, atau efek kaca buram
- [ ]  Tidak ada emoji di dalam komponen antarmuka
- [ ]  Tidak ada ilustrasi generik atau label kecil di atas judul
- [ ]  Setiap kartu punya alasan untuk ada. Bila hanya berisi satu baris teks, hapus kartunya

---

## 12. Larangan AI slop

Bagian ini ada karena SATUNOTA akan dibangun dengan bantuan AI, dan AI punya kecenderungan visual bawaan yang mudah dikenali. Tanpa larangan tertulis, hasilnya akan langsung terbaca sebagai aplikasi buatan AI, dan itu merusak kepercayaan pada aplikasi yang mengurus uang orang.

### 12.1 Kenapa AI selalu membuat tampilan yang sama

Penyebabnya bukan selera, melainkan data latih. Ketika Tailwind CSS meluncurkan pustaka komponennya, warna contoh yang dipilih adalah `indigo-500`. Ribuan tutorial dan proyek menyalinnya, lalu model bahasa belajar aturan tersirat bahwa desain web modern berarti tombol ungu. Hasilnya berulang: siklus di mana keluaran AI menjadi data latih AI berikutnya, dan gradien biru-ungu berubah menjadi tanda tangan konten buatan mesin.

Masalahnya bukan sekadar jelek. Masalahnya **mudah dikenali**, dan pengguna kini bisa mencium aplikasi yang dikerjakan tanpa pertimbangan.

### 12.2 Daftar larangan

| Tanda AI slop | Aturan SATUNOTA |
| --- | --- |
| Gradien ungu ke biru, teks judul bergradien | Dilarang mutlak. Tidak ada satu pun gradien di seluruh aplikasi. Latar selalu warna padat |
| Warna neon, warna jenuh, warna berpendar | Hanya token bagian 1 yang boleh dipakai. Semuanya diambil dari palet Notion |
| Efek kaca buram, `backdrop-blur` | Dilarang. Berat dirender di HP kelas bawah dan merusak kontras teks |
| Cahaya berpendar di belakang kartu atau tombol | Dilarang. Hanya ada dua bayangan halus di bagian 3 |
| Sudut sangat membulat seperti kapsul | Radius maksimal 10 px, hanya untuk sheet dan dialog |
| Emoji di dalam chip, tombol, dan judul bagian | Dilarang di antarmuka. Ikon garis Lucide saja |
| Garis tepi mengelilingi hampir setiap elemen | Garis hanya untuk memisahkan yang benar-benar perlu dipisah |
| Label kecil di atas judul, misalnya `✨ FITUR BARU` | Dilarang. Langsung ke judulnya |
| Pil status yang tidak berarti apa-apa | Badge hanya untuk lima nilai `doc_status` dan penanda Pro |
| Ilustrasi generik pada keadaan kosong | Ikon garis 32 px satu warna, sesuai 4.8 |
| Kartu besar berisi sedikit isi | Kepadatan informasi diutamakan. Kartu yang isinya satu baris harus dihapus |
| Tombol cantik tapi terlalu kecil untuk jempol | Target sentuh 44 × 44 px, tanpa pengecualian |
| Kombinasi warna yang gagal uji kontras | Wajib WCAG AA. Seluruh pasangan warna di bagian 1 sudah memenuhinya |
| Animasi berlebihan saat memuat | Ikuti bagian 5. Perubahan angka total tanpa animasi sama sekali |

### 12.3 Uji akhir

Sebelum sebuah layar dianggap selesai, jawab tiga pertanyaan ini.

1. Kalau tangkapan layar ini diunggah ke internet, apakah orang bisa menebak bahwa ini dibuat dengan AI dalam tiga detik? Jika ya, cari elemen mana yang menjadi penyebabnya dan hapus.
2. Adakah elemen visual di layar ini yang tidak menyampaikan informasi dan tidak memicu aksi? Jika ada, hapus.
3. Apakah elemen paling mencolok di layar ini juga merupakan hal terpenting bagi tujuan pengguna di layar itu? Jika tidak, hierarkinya salah.

<aside>
🧭

Aturan induk yang menyelesaikan semua perdebatan: **kalau ragu, tiru Notion.** Notion nyaris tidak punya gradien, tidak punya warna neon, tidak punya efek kaca, dan tetap terasa mahal. Kemahalan itu datang dari penahanan diri, bukan dari penambahan.

</aside>

### 12.4 Sumber

- [Why Your AI Keeps Building the Same Purple Gradient Website](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
- NN/g — [Prompt to Design Interfaces: Why Vague Prompts Fail](https://www.nngroup.com/articles/vague-prototyping/)
- [Looks Good, But Is It Usable? Evaluating Usability in AI-Generated Mobile UIs (CHI 2026)](https://dl.acm.org/doi/10.1145/3772363.3799002)
- [AI-generated UI proves people value design, but not designers](https://www.reddit.com/r/UXDesign/comments/1tvt03p/aigenerated_ui_proves_people_value_design_but_not/)
- [What's the most common UX mistake in AI-generated interfaces](https://www.reddit.com/r/UserExperienceDesign/comments/1pxbr2s/whats_the_most_common_ux_mistake_you_see_in/)
- [How to Avoid AI Slop in Vibe-Coded Landing Pages](https://www.youtube.com/watch?v=M4DNgmI7MIM)
- [Why Your AI-Generated UI Looks Like Everyone Else's](https://medium.com/@Rythmuxdesigner/why-your-ai-generated-ui-looks-like-everyone-elses-and-how-to-break-the-pattern-7a3bf6b070be)