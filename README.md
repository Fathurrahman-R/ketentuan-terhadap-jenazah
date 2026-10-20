# Ketentuan terhadap Jenazah — Materi & Kuis PAI

Aplikasi statis dengan alur linear: **Pemuka (CTA Mulai) → data diri → 8 bagian materi + 13 kartu ingat bersama maskot Lentera → 10 soal pilihan ganda → skor dan pembahasan**. Tidak ada tombol navigasi bebas di header; siswa bergerak langsung dari materi ke kuis tanpa dapat melompat. Tidak ada build step, framework, CDN, atau library eksternal.

## Menjalankan secara lokal

Dari folder proyek:

```bash
python3 -m http.server 8000
```

Buka <http://localhost:8000>. Gunakan server HTTP (bukan `file://`) karena aplikasi memanggil `fetch` saat mode backend.

Untuk GitHub Pages, unggah isi folder ini ke branch/repository Pages. Semua path relatif, jadi tidak perlu konfigurasi tambahan.

## File

| File | Isi |
| --- | --- |
| `index.html` | Kerangka layar, navigasi, formulir, sprite ikon SVG, maskot, dan markup hasil. |
| `style.css` | Tampilan mobile-first, mode gelap, kartu ingat, animasi maskot, dan token warna. |
| `app.js` | State, render per layar, validasi, kartu ingat, draf, pengiriman, CSV. |
| `data.js` | 8 bagian materi, 13 kartu ingat, dan 10 soal. **Tidak berisi kunci jawaban kuis.** |
| `config.js` | URL Supabase, anon key, nama fungsi, dan `USE_MOCK`. |
| `api.js` | Satu-satunya lapisan yang berbicara ke backend. |
| `assets/` | 7 foto pendukung materi (Wikimedia Commons, berlisensi terbuka). |
| `README.md` | Dokumen ini. |

## Mode contoh (default)

`config.js` saat ini memakai:

```js
const USE_MOCK = true;
```

Pada mode ini tidak ada data yang dikirim ke server. Skor dan pembahasan dibuat acak di peramban, lalu layar hasil menampilkan spanduk **“MODE CONTOH: skor ini bukan nilai asli.”** Gunakan mode ini untuk mencoba alur tanpa backend.

## Kartu ingat dan maskot Lentera

Setiap bagian materi punya satu atau dua kartu tanya-jawab untuk latihan mengingat. Alurnya:

1. Baca inti materi.
2. Coba jawab pertanyaan dari ingatan sebelum menekan **Buka jawaban**.
3. Cocokkan jawaban, lalu tandai **Sudah paham** atau **Ulangi nanti**.
4. Gunakan **Kartu berikutnya** untuk berpindah kartu. Jumlah kartu yang dikuasai tampil di bawah kartu.

Maskot **Lentera** memberi petunjuk singkat, merespons saat kartu dibuka atau ditandai, dan berubah ekspresi saat ada kemajuan. Lentera adalah ilustrasi SVG orisinal yang digambar langsung di `index.html`; tidak ada gambar jenazah, aset eksternal, atau maskot berhak cipta dari internet. Ikon bagian dan kartu juga memakai sprite SVG inline di `index.html`.

Kemajuan kartu ikut tersimpan di draf `localStorage` yang sama. Draf dihapus setelah kuis berhasil dikirim, jadi kemajuan kartu dimulai lagi pada sesi berikutnya.

## Gambar pendukung materi

Tujuh dari delapan bagian materi menampilkan satu foto simbolis (masjid, air, benang kafan, sajadah, pemakaman, kurma, bulan sabit). Tidak ada foto jenazah atau orang meninggal. Foto tersimpan lokal di `assets/` (tidak ada hotlink/CDN saat dijalankan), dipangkas 16:9 (1400×788, kualitas 78), dan kredensi ditampilkan tepat di bawah setiap foto serta di sini. Bagian **Pengecualian** sengaja tanpa gambar.

| File | Bagian | Foto | Pembuat | Lisensi |
| --- | --- | --- | --- | --- |
| `materi-pengantar.jpg` | Pengantar | [Lanskap Masjid Agung Al-Falah](https://commons.wikimedia.org/wiki/File:Lanskap_Masjid_Agung_Al-Falah.jpg) | Muhamad Izzul Fiqih | CC BY-SA 4.0 |
| `materi-memandikan.jpg` | Memandikan | [Water Drop (4527861344)](https://commons.wikimedia.org/wiki/File:Water_Drop_(4527861344).jpg) | Koshy Koshy | CC BY 2.0 |
| `materi-mengkafani.jpg` | Mengkafani | [White Cotton Threads Spools (Unsplash)](https://commons.wikimedia.org/wiki/File:White_Cotton_Threads_Spools_(Unsplash).jpg) | Janko Ferlič | CC0 |
| `materi-menshalatkan.jpg` | Menshalatkan | [Prayer mats inside Jama Masjid](https://commons.wikimedia.org/wiki/File:Prayer_mats_inside_Jama_Masjid_(4570453247).jpg) | Jon Connell | CC BY 2.0 |
| `materi-menguburkan.jpg` | Menguburkan | [Muslim Cemetery, Choa Chu Kang 05](https://commons.wikimedia.org/wiki/File:Muslim_Cemetery,_Choa_Chu_Kang_05.jpg) | M. Adrian Jurhami | CC BY 4.0 |
| `materi-taziyah.jpg` | Adab ta'ziyah | [Bowl of Dates](https://commons.wikimedia.org/wiki/File:Bowl_of_Dates.jpg) | Lebron jay | CC BY-SA 4.0 |
| `materi-rangkuman.jpg` | Rangkuman & hikmah | [Crescent Moon in the Night Sky](https://commons.wikimedia.org/wiki/File:Crescent_Moon_in_the_Night_Sky.jpg) | Shivanianbukumar | CC0 |

Semua gambar berasal dari Wikimedia Commons dengan lisensi terbuka (CC0, CC BY, atau CC BY-SA versi 2.0/4.0). Foto yang dipangkas (crop/resize) dari lisensi CC BY-SA tetap didistribusikan di bawah lisensi yang sama sesuai ketentuan share-alike. Jika mengganti foto, perbarui tabel di atas dan atribusi pada `figcaption` di `data.js`.

Foto masjid yang sama juga menghias halaman pembuka; halaman pembuka memakai ulang `materi-pengantar.jpg` dengan kredensi tersendiri di bawah gambar. Di belakang semua layar terdapat ornamen SVG inline (polanyah wajik dan lentera/kubah melayang) yang bersifat dekoratif (`aria-hidden`, `pointer-events: none`) dan ikut menyesuaikan mode gelap; animasinya dimatikan pada `prefers-reduced-motion`.

## Beralih ke backend sungguhan

1. Deploy Edge Function `submit-quiz` pada proyek Supabase. Fungsi ini harus:
   - menerima `POST` JSON dengan kontrak di bawah;
   - memvalidasi nama, kelas, NIS, jawaban, durasi, dan honeypot `website`;
   - menyimpan jawaban dan menghitung skor **di server**;
   - mengembalikan kunci jawaban dan pembahasan hanya lewat respons fungsi;
   - menangani CORS untuk domain GitHub Pages;
   - membatasi percobaan (rate limit) dan mendeteksi pengiriman ganda.
2. Isi `config.js`:

```js
const SUPABASE_URL = "https://PROYEK.supabase.co";
const SUPABASE_ANON_KEY = "ANON_KEY_PUBLIK";
const FUNCTION_NAME = "submit-quiz";
const USE_MOCK = false;
```

3. Buka ulang halaman. Spanduk mode contoh akan hilang dan hasil berasal dari server.

### Kontrak permintaan

```json
{
  "nama": "Nabila Putri",
  "kelas": "XI-IPA-2",
  "nis": "14",
  "jawaban": [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
  "durasi": 425,
  "website": ""
}
```

- `jawaban`: tepat 10 item; setiap item `0`–`3` atau `null` untuk soal kosong.
- `durasi`: detik, dihitung dari soal pertama sampai tombol kirim ditekan.
- `website`: honeypot. Harus kosong; jika terisi, server sebaiknya menolak atau mengabaikan pengiriman.

### Kontrak respons sukses

```json
{
  "ok": true,
  "skor": 80,
  "benar": 8,
  "total": 10,
  "nama": "Nabila Putri",
  "kelas": "XI-IPA-2",
  "nis": "14",
  "durasi": 425,
  "waktu": "2026-10-20T08:00:00.000Z",
  "review": [
    {
      "no": 1,
      "jawabanmu": 0,
      "kunci": 2,
      "benar": false,
      "pembahasan": "Penjelasan singkat."
    }
  ]
}
```

`nama`, `kelas`, `nis`, `durasi`, dan `waktu` bersifat opsional. Jika tidak dikirim server, CSV memakai data identitas dan waktu pengiriman dari peramban. `review` wajib berisi 10 item agar layar hasil lengkap.

### Kode galat yang dikenali

| Kode | Perilaku antarmuka |
| --- | --- |
| `VALIDASI` | Menampilkan pesan validasi dari server, atau pesan umum. |
| `DUPLIKAT` | “Jawaban sudah terkirim, tunggu sebentar.” |
| `TERLALU_BANYAK` | “Terlalu banyak percobaan, coba lagi nanti.” |
| `SERVER` / lainnya | “Tidak dapat memproses jawaban. Coba lagi.” |

Galat jaringan, CORS, dan batas waktu 15 detik memakai pesan “Tidak dapat terhubung ke server.” Detail teknis tidak ditampilkan. Jawaban tetap tersimpan dan tombol **Coba Lagi** tersedia.

## Keamanan

- **Anon key memang publik.** Anon/publishable key aman berada di frontend selama Row Level Security (RLS) dan Edge Function membatasi akses. Jangan pernah memakai `service_role` di file ini.
- **Kunci jawaban tidak ada di frontend.** `data.js` hanya memuat soal dan opsi. Kunci serta pembahasan baru dikirim server setelah pengiriman.
- **Skor dihitung server.** Jangan memercayai nilai dari peramban; validasi panjang, tipe, dan rentang semua field di Edge Function.
- **Honeypot** (`#website`) disembunyikan secara visual dan dilewati dari urutan tab, tetapi nilainya tetap dikirim agar server dapat memeriksanya.
- **RLS**: tabel jawaban/hasil sebaiknya tidak dapat dibaca atau ditulis langsung oleh anon key; hanya Edge Function dengan hak yang sesuai yang boleh mengaksesnya.

## Draf dan data lokal

- Draf disimpan di `localStorage` dengan kunci `kuis-jenazah-draft-v1` agar isian, jawaban, posisi soal, posisi kartu, dan kartu yang sudah dikuasai pulih setelah muat ulang.
- Draf dihapus setelah pengiriman berhasil.
- Jika `localStorage` diblokir, aplikasi tetap berjalan tanpa draf.
- Tidak ada data siswa yang dikirim ke pihak lain selain backend kuis saat mode nyata.

## Unduh CSV

Tombol **Unduh hasil saya (.csv)** membuat satu baris hasil berisi nama, kelas, NIS, skor, jumlah benar, total, durasi, dan waktu. Semua nilai dibungkus tanda kutip; tanda kutip di dalam nilai digandakan. Nilai yang diawali `=`, `+`, `-`, atau `@` diberi awalan apostrof untuk mencegah injeksi formula spreadsheet. File memakai BOM UTF-8 dan akhir baris CRLF agar aman dibuka di Excel.

## Aksesibilitas dan tampilan

- Bahasa halaman `id`, label formulir, fokus yang terlihat, dan `aria-live` untuk galat/status.
- Fokus dipindahkan ke judul layar saat berpindah layar; tautan “Lewati ke konten” tersedia.
- Kartu ingat memakai `aria-expanded` pada tombol jawaban dan `aria-pressed` pada penanda pemahaman. Ikon dekoratif memakai `aria-hidden`, sedangkan pesan Lentera diumumkan lewat `role="status"`.
- Target tombol minimal 48 px dan ukuran teks dasar minimal 16 px.
- Tata letak diuji pada lebar 320 px, 375 px, dan 1440 px; mode gelap mengikuti `prefers-color-scheme`.
- Gambar hanya memakai `alt` deskriptif, `loading="eager"` (satu foto per bagian, menjadi konten utama yang sedang dibaca), dan kredensi teks biasa dengan tautan lisensi `rel="noopener"`.
- Tidak ada foto jenazah; ilustrasi dari internet pun hanya simbolis (masjid, air, sajadah, pemakaman, makanan, bulan sabit), sedangkan maskot lentera dan ikon tetap SVG inline.

## Catatan dan penyimpangan

- Font memakai system serif/sans (Iowan Old Style/Palatino/Georgia dan system sans) karena aturan proyek melarang CDN dan file font tambahan. Ini disengaja; pemeriksa desain dijalankan dengan pengecualian `font-not-dealt`.
- Ada elemen tambahan yang tidak diminta eksplisit: kartu ingat beserta maskot Lentera, strip lembar jawaban pada kuis, dan daftar isi materi pada layar lebar. Semuanya hanya membantu belajar/navigasi dan tidak mengubah alur wajib.
- Kartu ingat adalah latihan formatif, bukan bagian penilaian. Jawabannya tidak dikirim ke backend dan tidak menambah skor kuis.
- Maskot Lentera dibuat orisinal sebagai SVG inline. Tidak ada maskot atau gambar berhak cipta yang diunduh dari internet.
- Folder `assets/` ditambahkan atas permintaan pengguna untuk foto pendukung materi; brief awal melarang aset eksternal, dan ini tetap dipenuhi karena semua foto diunduh dan dihosting lokal di `assets/` (tidak ada CDN/hotlink saat dijalankan). Foto berasal dari Wikimedia Commons dengan lisensi CC0/CC BY/CC BY-SA; daftar kredensi ada di bagian “Gambar pendukung materi”.
- Hasil tetap tersimpan selama sesi sampai **Ulangi Kuis** atau **Mulai Kuis** dari bagian materi terakhir ditekan.
- Backend Supabase belum disediakan dalam paket ini; mode contoh adalah jalur yang teruji end-to-end. Kontrak di atas perlu diterapkan pada Edge Function sebelum digunakan untuk penilaian nyata.
