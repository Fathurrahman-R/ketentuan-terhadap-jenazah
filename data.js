/* Konten statis. Tidak ada kunci jawaban kuis di file ini.
   Jawaban pada kartu ingat hanya untuk latihan formatif, bukan penilaian.
   Gambar pendukung diambil dari Wikimedia Commons (lihat README untuk kredit). */
const QUIZ_DATA = {
  judul: "Ketentuan terhadap Jenazah",
  materi: [
    {
      judul: "Pengantar",
      gambar: {
        src: "assets/materi-pengantar.jpg",
        alt: "Interior Masjid Agung Al-Falah di Jambi dengan kubah hijau, tiang berukir, dan sajadah merah.",
        caption: "Masjid tempat umat berkumpul. Mengurus jenazah merupakan kewajiban bersama.",
        kredit: "Muhamad Izzul Fiqih",
        lisensi: "CC BY-SA 4.0",
        sumber: "https://commons.wikimedia.org/wiki/File:Lanskap_Masjid_Agung_Al-Falah.jpg"
      },
      isi: [
        "Mengurus jenazah muslim merupakan fardhu kifayah.",
        "Ada empat kewajiban terhadap jenazah:"
      ],
      daftar: [
        "Memandikan",
        "Mengkafani",
        "Menshalatkan",
        "Menguburkan"
      ],
      kartu: [
        {
          petunjuk: "Empat kewajiban itu berurutan. Ingat, dimulai dari memandikan.",
          tanya: "Apa hukum mengurus jenazah muslim?",
          jawab: "Fardhu kifayah."
        },
        {
          petunjuk: "Urutannya: memandikan, mengkafani, menshalatkan, menguburkan.",
          tanya: "Sebutkan empat kewajiban terhadap jenazah.",
          jawab: "Memandikan, mengkafani, menshalatkan, dan menguburkan."
        }
      ]
    },
    {
      judul: "Memandikan",
      gambar: {
        src: "assets/materi-memandikan.jpg",
        alt: "Riakan air jernih berwarna keemasan dengan tetesan di tengahnya.",
        caption: "Air bersih dan suci digunakan untuk memandikan jenazah.",
        kredit: "Koshy Koshy",
        lisensi: "CC BY 2.0",
        sumber: "https://commons.wikimedia.org/wiki/File:Water_Drop_(4527861344).jpg"
      },
      isi: [
        "Jenazah dimandikan oleh orang yang sejenis. Suami atau istri dan mahram boleh memandikan.",
        "Aurat jenazah ditutup. Air yang digunakan bersih dan suci.",
        "Urutan memandikan: bersihkan kotoran, wudhu, siram kepala, lalu badan kanan dan kiri.",
        "Siraman dilakukan ganjil (3, 5, atau 7 kali). Siraman terakhir dicampur kapur barus."
      ],
      kartu: [
        {
          petunjuk: "Perhatikan siapa yang boleh memandikan dan hubungan mahram.",
          tanya: "Siapa yang boleh memandikan jenazah?",
          jawab: "Orang yang sejenis. Suami atau istri dan mahram juga boleh memandikan."
        },
        {
          petunjuk: "Ingat urutan siraman dan jumlahnya yang ganjil.",
          tanya: "Bagaimana urutan memandikan jenazah?",
          jawab: "Bersihkan kotoran, wudhu, siram kepala, lalu badan kanan dan kiri. Siraman ganjil 3, 5, atau 7 kali; siraman terakhir dicampur kapur barus."
        }
      ]
    },
    {
      judul: "Mengkafani",
      gambar: {
        src: "assets/materi-mengkafani.jpg",
        alt: "Deretan gulungan benang kapas putih.",
        caption: "Kain kafan berwarna putih bersih dan menutup seluruh tubuh.",
        kredit: "Janko Ferlič",
        lisensi: "CC0",
        sumber: "https://commons.wikimedia.org/wiki/File:White_Cotton_Threads_Spools_(Unsplash).jpg"
      },
      isi: [
        "Kain kafan berupa kain putih bersih yang menutup seluruh tubuh.",
        "Kafan laki-laki 3 lembar; kafan perempuan 5 lembar (kain bawah, baju kurung, kerudung, dan 2 penutup).",
        "Kafan boleh diberi kapur barus.",
        "Minimal 1 lembar kain yang menutup seluruh tubuh."
      ],
      kartu: [
        {
          petunjuk: "Bedakan jumlah lembar untuk laki-laki dan perempuan.",
          tanya: "Berapa lembar kain kafan untuk laki-laki dan perempuan?",
          jawab: "Laki-laki 3 lembar; perempuan 5 lembar (kain bawah, baju kurung, kerudung, dan 2 penutup)."
        },
        {
          petunjuk: "Cari syarat minimal kain kafan.",
          tanya: "Apa syarat minimal kain kafan?",
          jawab: "Minimal 1 lembar kain yang menutup seluruh tubuh. Kainnya putih bersih."
        }
      ]
    },
    {
      judul: "Menshalatkan",
      gambar: {
        src: "assets/materi-menshalatkan.jpg",
        alt: "Saf sajadah berjajar di dalam Masjid Jama, Delhi.",
        caption: "Shalat jenazah dikerjakan berjamaah dengan empat takbir, tanpa rukuk dan sujud.",
        kredit: "Jon Connell",
        lisensi: "CC BY 2.0",
        sumber: "https://commons.wikimedia.org/wiki/File:Prayer_mats_inside_Jama_Masjid_(4570453247).jpg"
      },
      isi: [
        "Shalat jenazah dimulai dengan niat, berdiri bagi yang mampu, 4 takbir, dan salam.",
        "Takbir 1: Al-Fatihah. Takbir 2: shalawat. Takbir 3: doa untuk jenazah. Takbir 4: doa lalu salam.",
        "Shalat jenazah dikerjakan tanpa rukuk dan sujud.",
        "Imam sejajar kepala jenazah laki-laki atau tengah jenazah perempuan."
      ],
      kartu: [
        {
          petunjuk: "Ingat empat takbir dan bacaan di masing-masing takbir.",
          tanya: "Berapa takbir dalam shalat jenazah dan apa bacaan tiap takbir?",
          jawab: "4 takbir: takbir 1 Al-Fatihah, takbir 2 shalawat, takbir 3 doa untuk jenazah, takbir 4 doa lalu salam."
        },
        {
          petunjuk: "Apa yang tidak ada dalam shalat jenazah?",
          tanya: "Apa yang membedakan shalat jenazah dari shalat biasa?",
          jawab: "Shalat jenazah dikerjakan tanpa rukuk dan sujud."
        }
      ]
    },
    {
      judul: "Menguburkan",
      gambar: {
        src: "assets/materi-menguburkan.jpg",
        alt: "Deretan makam muslim dengan penanda putih di area pemakaman yang hijau.",
        caption: "Jenazah dikuburkan di liang lahad dan dimiringkan ke kanan menghadap kiblat.",
        kredit: "M. Adrian Jurhami",
        lisensi: "CC BY 4.0",
        sumber: "https://commons.wikimedia.org/wiki/File:Muslim_Cemetery,_Choa_Chu_Kang_05.jpg"
      },
      isi: [
        "Pengurusan jenazah disegerakan.",
        "Kubur menggunakan liang lahad; jenazah dimiringkan ke kanan menghadap kiblat.",
        "Tali kafan dilepas.",
        "Kuburan tidak ditinggikan berlebihan dan tidak diduduki atau diinjak."
      ],
      kartu: [
        {
          petunjuk: "Fokus pada posisi jenazah di liang lahad.",
          tanya: "Bagaimana posisi jenazah saat dikuburkan?",
          jawab: "Di liang lahad, jenazah dimiringkan ke kanan menghadap kiblat. Tali kafan dilepas."
        },
        {
          petunjuk: "Ingat adab yang harus dijaga di kuburan.",
          tanya: "Apa adab yang harus dijaga di kuburan?",
          jawab: "Kuburan tidak ditinggikan berlebihan dan tidak diduduki atau diinjak."
        }
      ]
    },
    {
      judul: "Adab ta'ziyah",
      gambar: {
        src: "assets/materi-taziyah.jpg",
        alt: "Semangkuk kurma sebagai hidangan sederhana untuk tamu.",
        caption: "Ta'ziyah mengutamakan doa, penghiburan, dan bantuan untuk keluarga duka.",
        kredit: "Lebron jay",
        lisensi: "CC BY-SA 4.0",
        sumber: "https://commons.wikimedia.org/wiki/File:Bowl_of_Dates.jpg"
      },
      isi: [
        "Saat ta'ziyah, doakan almarhum dan hiburlah keluarga.",
        "Jangan meratap berlebihan.",
        "Bantulah keluarga duka."
      ],
      kartu: [
        {
          petunjuk: "Ta'ziyah itu menghibur dan membantu, bukan meratap.",
          tanya: "Apa yang sebaiknya dilakukan saat ta'ziyah?",
          jawab: "Doakan almarhum, hiburlah keluarga, dan bantulah keluarga duka. Jangan meratap berlebihan."
        }
      ]
    },
    {
      judul: "Pengecualian",
      isi: [
        "Menurut jumhur ulama, orang yang syahid di medan perang tidak dimandikan dan tidak dishalatkan."
      ],
      kartu: [
        {
          petunjuk: "Ada pengecualian untuk syahid di medan perang.",
          tanya: "Bagaimana hukum jenazah syahid di medan perang menurut jumhur ulama?",
          jawab: "Tidak dimandikan dan tidak dishalatkan."
        }
      ]
    },
    {
      judul: "Rangkuman & hikmah",
      gambar: {
        src: "assets/materi-rangkuman.jpg",
        alt: "Bulan sabit tipis di langit malam yang gelap.",
        caption: "Merenungkan kematian membantu menumbuhkan empati dan hormat kepada sesama.",
        kredit: "Shivanianbukumar",
        lisensi: "CC0",
        sumber: "https://commons.wikimedia.org/wiki/File:Crescent_Moon_in_the_Night_Sky.jpg"
      },
      isi: [
        "Mengurus jenazah adalah fardhu kifayah.",
        "Hikmahnya: mengingat kematian, empati sosial, dan menghormati sesama muslim."
      ],
      kartu: [
        {
          petunjuk: "Hikmahnya ada tiga: mengingat kematian, empati, dan hormat.",
          tanya: "Apa tiga hikmah mengurus jenazah?",
          jawab: "Mengingat kematian, menumbuhkan empati sosial, dan menghormati sesama muslim."
        }
      ]
    }
  ],
  soal: [
    {
      teks: "Hukum mengurus jenazah muslim adalah...",
      opsi: ["Fardhu 'ain", "Fardhu kifayah", "Sunnah muakkad", "Mubah"]
    },
    {
      teks: "Kewajiban terhadap jenazah, kecuali...",
      opsi: ["Memandikan", "Mengkafani", "Menshalatkan", "Memasang tenda pesta"]
    },
    {
      teks: "Jumlah takbir shalat jenazah...",
      opsi: ["2", "3", "4", "5"]
    },
    {
      teks: "Kafan laki-laki yang disunnahkan...",
      opsi: ["1 lembar", "2 lembar", "3 lembar", "5 lembar"]
    },
    {
      teks: "Doa untuk jenazah dibaca setelah takbir ke-...",
      opsi: ["1", "2", "3", "4"]
    },
    {
      teks: "Posisi jenazah dikuburkan...",
      opsi: [
        "Telentang menghadap atas",
        "Miring ke kanan menghadap kiblat",
        "Miring ke kiri membelakangi kiblat",
        "Telungkup"
      ]
    },
    {
      teks: "Bacaan setelah takbir pertama...",
      opsi: ["Shalawat", "Doa jenazah", "Al-Fatihah", "Doa penutup"]
    },
    {
      teks: "Siraman terakhir memandikan jenazah dicampur...",
      opsi: ["Garam", "Kapur barus", "Minyak", "Gula"]
    },
    {
      teks: "Sikap benar saat ta'ziyah...",
      opsi: [
        "Meratap keras",
        "Mendoakan dan menghibur keluarga",
        "Bercanda agar suasana cair",
        "Pulang tanpa bicara"
      ]
    },
    {
      teks: "Orang wafat syahid di medan perang hukumnya...",
      opsi: [
        "Dimandikan dan dishalatkan",
        "Tidak dimandikan dan tidak dishalatkan",
        "Hanya dikafani",
        "Tidak dikubur"
      ]
    }
  ]
};
