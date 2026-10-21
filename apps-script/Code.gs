// ==============================================================================
// Google Apps Script: Integrasi Supabase ke Google Sheets
// Kuis PAI "Ketentuan terhadap Jenazah"
// ==============================================================================

// ------------------------------------------------------------------------------
// KONSTANTA
// ------------------------------------------------------------------------------
const SHEET_HASIL = "Hasil";
const SHEET_REKAP = "Rekap";
const SHEET_LOG = "Log";
const UKURAN_HALAMAN = 500;
const INTERVAL_MENIT = 5;
const MAKS_BARIS_LOG = 500;

// ------------------------------------------------------------------------------
// MENU KUSTOM SPREADSHEET
// ------------------------------------------------------------------------------
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Hasil Kuis")
    .addItem("Atur koneksi", "aturKoneksi")
    .addItem("Sinkronkan sekarang", "sinkronkanManual")
    .addSeparator()
    .addItem("Pasang sinkronisasi otomatis", "pasangPemicuOtomatis")
    .addItem("Hapus sinkronisasi otomatis", "hapusPemicuOtomatis")
    .addToUi();
}

// ------------------------------------------------------------------------------
// PENGATURAN KONEKSI (SCRIPT PROPERTIES)
// ------------------------------------------------------------------------------
function aturKoneksi() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const currentUrl = props.getProperty("SUPABASE_URL") || "";

  const respUrl = ui.prompt(
    "Pengaturan Supabase URL",
    "Masukkan SUPABASE_URL proyek Anda (contoh: https://xxxx.supabase.co):",
    ui.ButtonSet.OK_CANCEL
  );

  if (respUrl.getSelectedButton() !== ui.Button.OK) return;
  const newUrl = respUrl.getResponseText().trim().replace(/\/+$/, "");
  if (!newUrl) {
    ui.alert("URL tidak boleh kosong.");
    return;
  }

  const respToken = ui.prompt(
    "Pengaturan EXPORT_TOKEN",
    "Masukkan EXPORT_TOKEN rahasia yang telah disetel di Supabase:\n(Token akan disimpan aman dan tidak ditampilkan kembali)",
    ui.ButtonSet.OK_CANCEL
  );

  if (respToken.getSelectedButton() !== ui.Button.OK) return;
  const newToken = respToken.getResponseText().trim();
  if (!newToken) {
    ui.alert("Token tidak boleh kosong.");
    return;
  }

  props.setProperties({
    SUPABASE_URL: newUrl,
    EXPORT_TOKEN: newToken
  });

  ui.alert("Koneksi Berhasil Disimpan", "Kredensial tersimpan aman di Script Properties.", ui.ButtonSet.OK);
}

// ------------------------------------------------------------------------------
// PENCEGAHAN FORMULA INJECTION
// ------------------------------------------------------------------------------
/**
 * Mencegah eksekusi formula injection pada teks yang bersumber dari siswa.
 * Jika teks diawali '=', '+', '-', '@', Tab, atau CR, tambahkan petik tunggal di depannya.
 */
function amankanTeks(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// ------------------------------------------------------------------------------
// INISIALISASI STRUKTUR SHEET
// ------------------------------------------------------------------------------
function inisialisasiSheetJikaBelum(ss) {
  // 1. Sheet Hasil
  let sheetHasil = ss.getSheetByName(SHEET_HASIL);
  if (!sheetHasil) {
    sheetHasil = ss.insertSheet(SHEET_HASIL);
    const headers = [
      "ID", "Waktu", "Nama", "Kelas", "NIS",
      "Skor", "Benar", "Durasi (detik)",
      "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10",
      "_created_at"
    ];
    sheetHasil.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheetHasil.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheetHasil.setFrozenRows(1);

    // Format kolom teks: ID, Waktu, Nama, Kelas, NIS
    sheetHasil.getRange("A:E").setNumberFormat("@");
    // Sembunyikan kolom _created_at (kolom 19 / S)
    sheetHasil.hideColumns(19);

    // Berikan proteksi peringatan pada sheet Hasil
    try {
      const protection = sheetHasil.protect().setDescription("Proteksi Sheet Hasil");
      protection.setWarningOnly(true);
    } catch (_e) {}
  }

  // 2. Sheet Rekap
  let sheetRekap = ss.getSheetByName(SHEET_REKAP);
  if (!sheetRekap) {
    sheetRekap = ss.insertSheet(SHEET_REKAP);
    bangunSheetRekap(sheetRekap);
  }

  // 3. Sheet Log
  let sheetLog = ss.getSheetByName(SHEET_LOG);
  if (!sheetLog) {
    sheetLog = ss.insertSheet(SHEET_LOG);
    const logHeaders = ["Waktu Eksekusi", "Baris Baru", "Status", "Keterangan"];
    sheetLog.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]);
    sheetLog.getRange(1, 1, 1, logHeaders.length).setFontWeight("bold");
    sheetLog.setFrozenRows(1);
  }

  return { sheetHasil, sheetRekap, sheetLog };
}

function bangunSheetRekap(sheet) {
  sheet.clear();
  sheet.setFrozenRows(1);

  // Header Ringkasan
  sheet.getRange("A1:B1").setValues([["RINGKASAN KUIS PAI", "NILAI"]]).setFontWeight("bold");
  sheet.getRange("A2:B5").setValues([
    ["Jumlah Peserta", '=IF(COUNTA(Hasil!A2:A)=0, 0, COUNTA(Hasil!A2:A))'],
    ["Rata-rata Skor", '=IF(COUNTA(Hasil!A2:A)=0, 0, ROUND(AVERAGE(Hasil!F2:F), 1))'],
    ["Skor Tertinggi", '=IF(COUNTA(Hasil!A2:A)=0, 0, MAX(Hasil!F2:F))'],
    ["Skor Terendah", '=IF(COUNTA(Hasil!A2:A)=0, 0, MIN(Hasil!F2:F))']
  ]);

  // Distribusi Nilai
  sheet.getRange("A7:B7").setValues([["DISTRIBUSI NILAI", "JUMLAH SISWA"]]).setFontWeight("bold");
  sheet.getRange("A8:B10").setValues([
    ["Sangat Baik (90 - 100)", '=COUNTIFS(Hasil!F2:F, ">=90", Hasil!F2:F, "<=100")'],
    ["Baik (70 - 89)", '=COUNTIFS(Hasil!F2:F, ">=70", Hasil!F2:F, "<90")'],
    ["Perlu Bimbingan (< 70)", '=IF(COUNTA(Hasil!A2:A)=0, 0, COUNTIF(Hasil!F2:F, "<70"))']
  ]);

  // Persentase Ketercapaian per Soal (S1 - S10)
  sheet.getRange("D1:E1").setValues([["NOMOR SOAL", "% SISWA MENJAWAB BENAR"]]).setFontWeight("bold");
  const soalRows = [];
  const colLetters = ["I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"];
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    soalRows.push([
      "Soal " + (i + 1),
      '=IF(COUNTA(Hasil!A2:A)=0, "0.0%", TEXT(COUNTIF(Hasil!' + col + '2:' + col + ', 1) / COUNTA(Hasil!A2:A), "0.0%"))'
    ]);
  }
  sheet.getRange(2, 4, 10, 2).setValues(soalRows);

  try {
    const protection = sheet.protect().setDescription("Proteksi Sheet Rekap");
    protection.setWarningOnly(true);
  } catch (_e) {}
}

// ------------------------------------------------------------------------------
// PENCATATAN LOG SINKRONISASI
// ------------------------------------------------------------------------------
function catatLog(sheetLog, barisBaru, status, keterangan) {
  const waktuWib = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  sheetLog.appendRow([waktuWib, barisBaru, status, keterangan]);

  // Batasi log maksimal MAKS_BARIS_LOG baris (hapus baris tertua)
  const totalBaris = sheetLog.getLastRow();
  if (totalBaris > MAKS_BARIS_LOG + 1) {
    const barisDihapus = totalBaris - (MAKS_BARIS_LOG + 1);
    sheetLog.deleteRows(2, barisDihapus);
  }
}

// ------------------------------------------------------------------------------
// PROSES SINKRONISASI UTAMA
// ------------------------------------------------------------------------------
function sinkronkanData(isManual) {
  const lock = LockService.getScriptLock();
  // Kunci eksekusi singkat; bila bentrok, batalkan run ini secara damai
  if (!lock.tryLock(5000)) {
    if (isManual) {
      SpreadsheetApp.getActiveSpreadsheet().toast("Sinkronisasi lain sedang berjalan. Silakan tunggu.", "Info", 4);
    }
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { sheetHasil, sheetLog } = inisialisasiSheetJikaBelum(ss);

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const exportToken = props.getProperty("EXPORT_TOKEN");

  if (!supabaseUrl || !exportToken) {
    const msg = "Koneksi belum diatur. Buka menu Hasil Kuis > Atur koneksi.";
    catatLog(sheetLog, 0, "GAGAL", "Konfigurasi SUPABASE_URL atau EXPORT_TOKEN belum disetel.");
    lock.releaseLock();
    if (isManual) {
      SpreadsheetApp.getUi().alert("Perhatian", msg, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    return;
  }

  try {
    // 1. Tentukan Kursor Terakhir dari baris paling bawah
    const lastRow = sheetHasil.getLastRow();
    let afterCreatedAt = "";
    let afterId = "";

    // Kumpulan ID yang sudah tercatat untuk mencegah duplikasi jika ada overlapping
    const existingIds = new Set();

    if (lastRow > 1) {
      // Ambil seluruh ID pada kolom A untuk deduplikasi instan
      const idValues = sheetHasil.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idValues.length; i++) {
        const idVal = idValues[i][0];
        if (idVal) existingIds.add(String(idVal));
      }

      // Ambil ID dan _created_at dari baris terakhir
      const lastRowId = sheetHasil.getRange(lastRow, 1).getValue();
      const lastRowRawCreated = sheetHasil.getRange(lastRow, 19).getValue();

      if (lastRowId && lastRowRawCreated) {
        afterId = String(lastRowId);
        afterCreatedAt = String(lastRowRawCreated);
      }
    }

    let totalBarisBaru = 0;
    let hasMore = true;
    const startTime = Date.now();

    // 2. Loop Paginasi Keyset sampai has_more false atau mendekati batas eksekusi Apps Script (4.5 menit)
    while (hasMore && (Date.now() - startTime < 270000)) {
      let endpoint = supabaseUrl + "/functions/v1/export-hasil?limit=" + UKURAN_HALAMAN;
      if (afterCreatedAt && afterId) {
        endpoint += "&after_created_at=" + encodeURIComponent(afterCreatedAt) +
                    "&after_id=" + encodeURIComponent(afterId);
      }

      const options = {
        method: "get",
        headers: {
          "x-export-token": exportToken
        },
        muteHttpExceptions: true
      };

      let response;
      try {
        response = UrlFetchApp.fetch(endpoint, options);
      } catch (netErr) {
        catatLog(sheetLog, totalBarisBaru, "GAGAL_JARINGAN", "Tidak dapat menghubungi Supabase Edge Function.");
        throw new Error("Gagal menghubungi server Supabase.");
      }

      const statusCode = response.getResponseCode();
      if (statusCode === 401) {
        catatLog(sheetLog, totalBarisBaru, "GAGAL_AUTH", "EXPORT_TOKEN ditolak oleh Supabase.");
        throw new Error("Autentikasi gagal (EXPORT_TOKEN salah atau belum disetel).");
      }

      if (statusCode !== 200) {
        catatLog(sheetLog, totalBarisBaru, "GAGAL_SERVER", "HTTP Error dari Edge Function: " + statusCode);
        throw new Error("Server mengembalikan status: " + statusCode);
      }

      let payload;
      try {
        payload = JSON.parse(response.getContentText());
      } catch (_jsonErr) {
        catatLog(sheetLog, totalBarisBaru, "GAGAL_FORMAT", "Respon bukan format JSON valid.");
        throw new Error("Respon server bukan JSON valid.");
      }

      if (!payload || payload.ok !== true || !Array.isArray(payload.rows)) {
        catatLog(sheetLog, totalBarisBaru, "GAGAL_KONTRAK", "Format payload respons tidak sesuai kontrak.");
        throw new Error("Respon dari backend tidak valid.");
      }

      const rows = payload.rows;
      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      // Siapkan baris untuk penulisan massal (batch write)
      const batchValues = [];

      for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        const rowId = String(item.id);

        // Deduplikasi di sisi Spreadsheet
        if (existingIds.has(rowId)) {
          continue;
        }

        existingIds.add(rowId);

        // Format waktu lokal Asia/Jakarta (WIB)
        const dateObj = new Date(item.created_at);
        const waktuJakarta = Utilities.formatDate(dateObj, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

        // Evaluasi penanda benar/salah b (10 nomor)
        const bArray = Array.isArray(item.b) ? item.b : [];
        const s = [];
        for (let q = 0; q < 10; q++) {
          s.push(bArray[q] === 1 ? 1 : 0);
        }

        // Susun baris (kolom 1 s/d 19) dengan sanitasi teks formula injection
        const rowData = [
          rowId,
          waktuJakarta,
          amankanTeks(item.nama),
          amankanTeks(item.kelas),
          amankanTeks(item.nis),
          Number(item.skor) || 0,
          Number(item.benar) || 0,
          Number(item.durasi) || 0,
          s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9],
          String(item.created_at) // Kolom 19: _created_at ISO UTC untuk kursor berikutnya
        ];

        batchValues.push(rowData);
      }

      // Tulis massal jika ada baris baru pada halaman ini
      if (batchValues.length > 0) {
        const targetRow = sheetHasil.getLastRow() + 1;
        sheetHasil.getRange(targetRow, 1, batchValues.length, batchValues[0].length)
                  .setValues(batchValues);
        totalBarisBaru += batchValues.length;
      }

      // Perbarui kursor keyset ke baris terakhir yang diterima dari server
      const lastItem = rows[rows.length - 1];
      afterCreatedAt = lastItem.created_at;
      afterId = String(lastItem.id);

      hasMore = payload.has_more === true;
    }

    catatLog(sheetLog, totalBarisBaru, "SUKSES", "Sinkronisasi selesai.");

    if (isManual) {
      const infoMsg = totalBarisBaru > 0
        ? totalBarisBaru + " baris data kuis baru berhasil ditambahkan."
        : "Tidak ada data baru (spreadsheet sudah mutakhir).";
      ss.toast(infoMsg, "Sinkronisasi Berhasil", 5);
    }
  } catch (err) {
    if (isManual) {
      SpreadsheetApp.getUi().alert("Gagal Sinkronisasi", err.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------------------
// TRIGGER ENTRY POINTS
// ------------------------------------------------------------------------------
function sinkronkanManual() {
  sinkronkanData(true);
}

function sinkronkanOtomatis() {
  sinkronkanData(false);
}

// ------------------------------------------------------------------------------
// MANAJEMEN TRIGGER WAKTU OTOMATIS
// ------------------------------------------------------------------------------
function pasangPemicuOtomatis() {
  const ui = SpreadsheetApp.getUi();
  hapusPemicuOtomatisInternal();

  ScriptApp.newTrigger("sinkronkanOtomatis")
    .timeBased()
    .everyMinutes(INTERVAL_MENIT)
    .create();

  ui.alert(
    "Pemicu Otomatis Aktif",
    "Sinkronisasi otomatis berhasil dipasang setiap " + INTERVAL_MENIT + " menit.",
    ui.ButtonSet.OK
  );
}

function hapusPemicuOtomatis() {
  const ui = SpreadsheetApp.getUi();
  const count = hapusPemicuOtomatisInternal();
  ui.alert("Pemicu Otomatis Dihapus", "Sebanyak " + count + " pemicu sinkronisasi telah dinonaktifkan.", ui.ButtonSet.OK);
}

function hapusPemicuOtomatisInternal() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sinkronkanOtomatis") {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  return count;
}
