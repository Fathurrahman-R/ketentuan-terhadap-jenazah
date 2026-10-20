# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Siswa SMP/MTs pada mata pelajaran Pendidikan Agama Islam (contoh kelas pada pengujian: VIII-A). Mereka membuka aplikasi di ponsel, di kelas atau di rumah, untuk membaca materi fiqh jenazah lalu mengerjakan kuis. Hasil kuis disimpan lewat backend opsional dan dapat diunduh sebagai CSV.

## Product Purpose

Satu modul belajar mandiri tentang ketentuan terhadap jenazah: 8 bagian materi, 13 kartu ingat, dan 10 soal pilihan ganda dengan pembahasan. Berhasil bila siswa menyelesaikan alur tanpa kebingungan, memahami urutan pengurusan jenazah, dan melihat skor beserta alasannya.

## Positioning

Alur linear tanpa navigasi bebas: siswa membaca bagian demi bagian, membuka kartu ingat di tiap bagian, lalu langsung masuk kuis. Maskot Lentera memberi petunjuk pada kartu, bukan hiasan belaka.

## Operating Context

Dipasang sebagai situs statis di GitHub Pages. Tanpa build step, framework, CDN, atau pustaka eksternal saat dijalankan. Backend Supabase bersifat opsional; mode contoh (`USE_MOCK`) menjadi bawaan untuk mencoba alur tanpa server.

## Capabilities and Constraints

- 8 bagian materi + 13 kartu ingat + 10 soal, semua konten fiqh sudah dibakukan dan tidak boleh diubah.
- Draf tersimpan di `localStorage`; skor dan pembahasan datang dari backend atau mode contoh.
- Basis teks >= 16px, target sentuh >= 48px, mobile-first hingga 320px.
- Tidak ada foto jenazah atau orang meninggal; foto pendukung berlisensi terbuka dan dikreditkan.
- Satu skema warna terang (keputusan pemilik produk, Juli 2026); tidak ada mode gelap.
- Palet yang dipertahankan: hijau tua, hijau lembut, kertas krem, aksen emas.

## Brand Commitments

- Nama: **Ketentuan terhadap Jenazah**; subjudul PAI · Fikih.
- Maskot **Lentera**: pemandu kartu ingat, digambar ulang sebagai etsa garis pada redesign 2026.
- Nada bahasa: tenang, hormat, tanpa menakut-nakuti; bahasa Indonesia.
- Palet hijau–krem–emas dipertahankan; ornamen latar berupa anyaman wajik dan siluet masjid/lentera, kini di bawah lapisan blur agar teks tetap kontras.

## Evidence on Hand

- `data.js`: 8 bagian materi, 13 kartu, 10 soal (tanpa kunci di sisi klien).
- `assets/`: 7 foto Wikimedia Commons (CC0/CC BY/CC BY-SA) dengan kredit di `figure` dan README.
- `README.md`, `README-backend.md`, `supabase/`, `scripts/`: dokumentasi alur dan backend.
- Tidak ada testimoni, jumlah pengguna, atau klaim hasil belajar; jangan mengarang.

## Product Principles

1. Satu alur, tanpa jalan pintas: materi dulu, kuis kemudian.
2. Kejelasan mengalahkan hiasan; ornamen tidak boleh mengganggu teks.
3. Hormat pada topik: tidak ada gambar jenazah, tidak ada nada bercanda.
4. Siswa harus tahu di mana ia berada dan apa langkah berikutnya.
5. Konten fiqh adalah kebenaran produk; desain tidak mengubahnya.

## Accessibility & Inclusion

Target WCAG AA: kontras teks >= 4.5:1, fokus keyboard terlihat, target sentuh >= 48px, `prefers-reduced-motion` dihormati, teks alternatif pada setiap gambar, dan formulir berlabel.
