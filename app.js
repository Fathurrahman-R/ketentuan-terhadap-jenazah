/* Logika antarmuka. State tunggal -> render per layar. */
(function () {
  "use strict";

  const TOTAL = QUIZ_DATA.soal.length;
  const MATERI_TOTAL = QUIZ_DATA.materi.length;
  const LETTERS = ["A", "B", "C", "D"];
  const MATERI_ICONS = ["i-book", "i-water", "i-cloth", "i-prayer", "i-earth", "i-heart", "i-shield", "i-star"];
  const STORAGE_KEY = "kuis-jenazah-draft-v1";
  const IS_MOCK = typeof USE_MOCK !== "undefined" && USE_MOCK;

  const state = {
    route: "landing",
    nama: "",
    kelas: "",
    nis: "",
    materiIndex: 0,
    quizIndex: 0,
    kartuIndex: 0,
    kartuRevealed: false,
    kartuPaham: {},
    jawaban: new Array(TOTAL).fill(null),
    startedAt: null,
    showSummary: false,
    submitting: false,
    submitError: null,
    result: null,
    submittedAt: null,
    lastDuration: 0
  };

  const els = {
    mulaiBtn: document.getElementById("mulai-btn"),
    who: document.getElementById("who"),
    form: document.getElementById("identity-form"),
    nama: document.getElementById("nama"),
    kelas: document.getElementById("kelas"),
    nis: document.getElementById("nis"),
    website: document.getElementById("website"),
    formStatus: document.getElementById("form-status"),

    materiStep: document.getElementById("materi-step"),
    materiPercent: document.getElementById("materi-percent"),
    materiProgress: document.getElementById("materi-progress"),
    materiBar: document.getElementById("materi-bar"),
    materiIndex: document.getElementById("materi-index"),
    materiJudul: document.getElementById("materi-judul"),
    materiMedia: document.getElementById("materi-media"),
    materiBody: document.getElementById("materi-body"),
    materiBack: document.getElementById("materi-back"),
    materiNext: document.getElementById("materi-next"),

    mascot: document.getElementById("mascot"),
    mascotSay: document.getElementById("mascot-say"),
    studyIcon: document.getElementById("study-icon"),
    studyProgress: document.getElementById("study-progress"),
    studyPrompt: document.getElementById("study-prompt"),
    studyReveal: document.getElementById("study-reveal"),
    studyAnswer: document.getElementById("study-answer"),
    studyAnswerText: document.getElementById("study-answer-text"),
    studyKnown: document.getElementById("study-known"),
    studyAgain: document.getElementById("study-again"),
    studyCount: document.getElementById("study-count"),
    studyNext: document.getElementById("study-next"),

    kuisStep: document.getElementById("kuis-step"),
    kuisPercent: document.getElementById("kuis-percent"),
    kuisProgress: document.getElementById("kuis-progress"),
    kuisBar: document.getElementById("kuis-bar"),
    kuisPertanyaan: document.getElementById("kuis-pertanyaan"),
    kuisOpsi: document.getElementById("kuis-opsi"),
    kuisBack: document.getElementById("kuis-back"),
    kuisNext: document.getElementById("kuis-next"),
    summary: document.getElementById("submit-summary"),
    summaryTitle: document.getElementById("summary-title"),
    summaryCount: document.getElementById("summary-count"),
    summaryWarning: document.getElementById("summary-warning"),
    submitError: document.getElementById("submit-error"),
    submitErrorText: document.getElementById("submit-error-text"),
    submitBtn: document.getElementById("submit-btn"),
    retryBtn: document.getElementById("retry-btn"),
    checkBtn: document.getElementById("check-btn"),
    submitStatus: document.getElementById("submit-status"),
    answerSheet: document.getElementById("answer-sheet"),
    answerSheetCount: document.getElementById("answer-sheet-count"),

    mockBanner: document.getElementById("mock-banner"),
    hasilSubtitle: document.getElementById("hasil-subtitle"),
    hasilSkor: document.getElementById("hasil-skor"),
    hasilBenar: document.getElementById("hasil-benar"),
    hasilTotal: document.getElementById("hasil-total"),
    hasilDurasi: document.getElementById("hasil-durasi"),
    scoreGuide: document.getElementById("score-guide"),
    reviewList: document.getElementById("review-list"),
    ulangBtn: document.getElementById("ulang-btn"),
    keMateriBtn: document.getElementById("ke-materi-btn"),
    csvBtn: document.getElementById("csv-btn"),
    downloadStatus: document.getElementById("download-status")
  };

  /* ---------- Pembantu umum ---------- */

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("icon");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + name);
    svg.append(use);
    return svg;
  }

  function sectionCards(index) {
    return QUIZ_DATA.materi[index].kartu || [];
  }

  function cardKey(sectionIndex, cardIndex) {
    return sectionIndex + "-" + cardIndex;
  }

  function totalCards() {
    return QUIZ_DATA.materi.reduce(function (total, item) {
      return total + (item.kartu ? item.kartu.length : 0);
    }, 0);
  }

  function masteredCount() {
    let count = 0;
    QUIZ_DATA.materi.forEach(function (item, sectionIndex) {
      (item.kartu || []).forEach(function (_, cardIndex) {
        if (state.kartuPaham[cardKey(sectionIndex, cardIndex)]) count += 1;
      });
    });
    return count;
  }

  function say(message, mood) {
    els.mascotSay.textContent = message;
    els.mascot.dataset.mood = mood || "";
  }

  function clean(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function identityComplete() {
    return clean(state.nama) !== "" && clean(state.kelas) !== "";
  }

  function answeredCount() {
    return state.jawaban.filter(function (answer) { return answer !== null; }).length;
  }

  function clampInt(value, min, max) {
    const number = Number(value);
    if (!Number.isInteger(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function saveDraft() {
    if (state.result) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        route: state.route === "hasil" ? "kuis" : state.route,
        nama: state.nama,
        kelas: state.kelas,
        nis: state.nis,
        materiIndex: state.materiIndex,
        quizIndex: state.quizIndex,
        kartuIndex: state.kartuIndex,
        kartuPaham: state.kartuPaham,
        jawaban: state.jawaban,
        startedAt: state.startedAt
      }));
    } catch (error) {
      /* localStorage bisa diblokir; aplikasi tetap berjalan tanpa draf. */
    }
  }

  function removeDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* abaikan */
    }
  }

  function loadDraft() {
    let draft;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      draft = JSON.parse(raw);
    } catch (error) {
      return;
    }
    if (!draft || typeof draft !== "object") return;

    state.nama = clean(draft.nama).slice(0, 60);
    state.kelas = clean(draft.kelas).slice(0, 60);
    state.nis = clean(draft.nis).slice(0, 60);
    state.materiIndex = clampInt(draft.materiIndex, 0, MATERI_TOTAL - 1);
    state.quizIndex = clampInt(draft.quizIndex, 0, TOTAL - 1);
    state.kartuIndex = clampInt(draft.kartuIndex, 0, Math.max(0, sectionCards(state.materiIndex).length - 1));

    state.kartuPaham = {};
    if (draft.kartuPaham && typeof draft.kartuPaham === "object" && !Array.isArray(draft.kartuPaham)) {
      Object.keys(draft.kartuPaham).forEach(function (key) {
        if (/^\d+-\d+$/.test(key) && draft.kartuPaham[key] === true) {
          state.kartuPaham[key] = true;
        }
      });
    }

    if (Array.isArray(draft.jawaban)) {
      state.jawaban = Array.from({ length: TOTAL }, function (_, index) {
        const answer = draft.jawaban[index];
        return Number.isInteger(answer) && answer >= 0 && answer < 4 ? answer : null;
      });
    }

    state.startedAt = typeof draft.startedAt === "number" && isFinite(draft.startedAt)
      ? draft.startedAt
      : null;

    if (["identitas", "materi", "kuis"].indexOf(draft.route) !== -1) {
      state.route = draft.route;
    }
    if (state.route !== "identitas" && !identityComplete()) {
      state.route = "identitas";
    }
    if (state.route === "kuis" && !state.startedAt) {
      state.startedAt = Date.now();
    }
  }

  function updateWho() {
    if (identityComplete()) {
      els.who.textContent = clean(state.nama) + " · " + clean(state.kelas);
      els.who.hidden = false;
    } else {
      els.who.hidden = true;
      els.who.textContent = "";
    }
  }

  function showScreen(route, focusHeading) {
    state.route = route;

    document.querySelectorAll(".screen").forEach(function (screen) {
      screen.hidden = screen.id !== "screen-" + route;
    });

    const screen = document.getElementById("screen-" + route);
    if (!screen) return;
    const heading = screen.querySelector("h1");
    window.scrollTo({ top: 0, behavior: "auto" });
    if (focusHeading !== false && heading) heading.focus({ preventScroll: true });
  }

  /* ---------- Identitas ---------- */

  function setFieldError(field, message) {
    const input = els[field];
    const error = document.getElementById("err-" + field);
    if (!input || !error) return;
    input.setAttribute("aria-invalid", "true");
    error.textContent = message;
    error.hidden = false;
  }

  function clearFieldError(field) {
    const input = els[field];
    const error = document.getElementById("err-" + field);
    if (!input || !error) return;
    input.removeAttribute("aria-invalid");
    error.textContent = "";
    error.hidden = true;
  }

  function validateIdentity() {
    ["nama", "kelas", "nis"].forEach(clearFieldError);
    els.formStatus.textContent = "";

    const nama = clean(els.nama.value);
    const kelas = clean(els.kelas.value);
    const nis = clean(els.nis.value);
    let firstInvalid = null;

    if (nama === "") {
      setFieldError("nama", "Nama wajib diisi.");
      firstInvalid = firstInvalid || els.nama;
    } else if (nama.length > 60) {
      setFieldError("nama", "Nama maksimal 60 karakter.");
      firstInvalid = firstInvalid || els.nama;
    }

    if (kelas === "") {
      setFieldError("kelas", "Kelas wajib diisi.");
      firstInvalid = firstInvalid || els.kelas;
    } else if (kelas.length > 60) {
      setFieldError("kelas", "Kelas maksimal 60 karakter.");
      firstInvalid = firstInvalid || els.kelas;
    }

    if (nis.length > 60) {
      setFieldError("nis", "NIS / nomor absen maksimal 60 karakter.");
      firstInvalid = firstInvalid || els.nis;
    }

    if (firstInvalid) {
      els.formStatus.textContent = "Periksa kembali isian yang ditandai.";
      firstInvalid.focus();
      return false;
    }

    state.nama = nama;
    state.kelas = kelas;
    state.nis = nis;
    updateWho();
    return true;
  }

  /* ---------- Materi ---------- */

  function buildMateriIndex() {
    const fragment = document.createDocumentFragment();
    QUIZ_DATA.materi.forEach(function (item, index) {
      const li = make("li");
      const button = make("button");
      button.type = "button";
      button.dataset.index = String(index);
      button.append(icon(MATERI_ICONS[index]), make("span", "", item.judul));
      button.addEventListener("click", function () {
        goMateri(index);
      });
      li.append(button);
      fragment.append(li);
    });
    els.materiIndex.replaceChildren(fragment);
  }

  function renderStudyDeck(message, mood) {
    const cards = sectionCards(state.materiIndex);
    state.kartuIndex = clampInt(state.kartuIndex, 0, Math.max(0, cards.length - 1));
    const card = cards[state.kartuIndex];
    if (!card) return;

    els.studyIcon.replaceChildren(icon(MATERI_ICONS[state.materiIndex]));
    els.studyProgress.textContent = "Kartu " + (state.kartuIndex + 1) + " dari " + cards.length;
    els.studyPrompt.textContent = card.tanya;
    els.studyReveal.setAttribute("aria-expanded", String(state.kartuRevealed));
    els.studyReveal.textContent = state.kartuRevealed ? "Sembunyikan jawaban" : "Buka jawaban";
    els.studyAnswer.hidden = !state.kartuRevealed;
    els.studyAnswerText.textContent = card.jawab;
    els.studyCount.textContent = masteredCount() + " dari " + totalCards() + " kartu dikuasai";

    const mastered = !!state.kartuPaham[cardKey(state.materiIndex, state.kartuIndex)];
    els.studyKnown.setAttribute("aria-pressed", String(mastered));
    els.studyKnown.classList.toggle("is-done", mastered);
    els.studyKnown.textContent = mastered ? "Sudah dikuasai" : "Sudah paham";
    els.studyAgain.setAttribute("aria-pressed", "false");
    els.studyNext.textContent = state.kartuIndex === cards.length - 1 ? "Kartu pertama" : "Kartu berikutnya";
    els.studyNext.hidden = cards.length < 2;
    els.studyNext.disabled = cards.length < 2;

    if (message) {
      say(message, mood);
      return;
    }

    const allMastered = cards.every(function (_, index) {
      return state.kartuPaham[cardKey(state.materiIndex, index)];
    });
    if (allMastered) {
      say("Semua kartu di bagian ini sudah dikuasai. Kamu siap lanjut.", "happy");
    } else if (state.kartuRevealed) {
      say("Cocokkan jawaban ini dengan ingatanmu, lalu tandai kartu.", "thinking");
    } else {
      say(card.petunjuk || "Coba jawab dari ingatan dulu, lalu buka kartunya.", "");
    }
  }

  function goMateri(index) {
    state.materiIndex = clampInt(index, 0, MATERI_TOTAL - 1);
    state.kartuIndex = 0;
    state.kartuRevealed = false;
    renderMateri(true);
    saveDraft();
  }

  function renderMateriMedia(item) {
    const data = item.gambar;
    if (!data) {
      els.materiMedia.hidden = true;
      els.materiMedia.replaceChildren();
      return;
    }

    const figure = make("figure", "materi-figure");
    const image = document.createElement("img");
    image.src = data.src;
    image.alt = data.alt;
    image.decoding = "async";
    figure.append(image);

    const caption = make("figcaption");
    caption.append(make("span", "materi-caption", data.caption));

    if (data.kredit) {
      const credit = make("span", "materi-credit");
      credit.append(document.createTextNode("Foto: " + data.kredit + " / Wikimedia Commons, "));
      if (data.sumber) {
        const link = make("a", "", data.lisensi || "sumber");
        link.href = data.sumber;
        link.target = "_blank";
        link.rel = "noopener";
        credit.append(link);
      } else {
        credit.append(document.createTextNode(data.lisensi || ""));
      }
      caption.append(credit);
    }

    figure.append(caption);
    els.materiMedia.replaceChildren(figure);
    els.materiMedia.hidden = false;
  }

  function renderMateri(focusHeading) {
    const item = QUIZ_DATA.materi[state.materiIndex];
    const number = state.materiIndex + 1;

    els.materiJudul.textContent = item.judul;
    renderMateriMedia(item);
    const body = document.createDocumentFragment();
    item.isi.forEach(function (paragraph) {
      body.append(make("p", "", paragraph));
    });
    if (Array.isArray(item.daftar) && item.daftar.length) {
      const list = make("ul");
      item.daftar.forEach(function (entry) {
        list.append(make("li", "", entry));
      });
      body.append(list);
    }
    els.materiBody.replaceChildren(body);

    Array.from(els.materiIndex.children).forEach(function (li, index) {
      const button = li.firstElementChild;
      if (!button) return;
      if (index === state.materiIndex) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const percent = Math.round((number / MATERI_TOTAL) * 100);
    els.materiStep.textContent = "Bagian " + number + " dari " + MATERI_TOTAL;
    els.materiPercent.textContent = percent + "%";
    els.materiBar.style.width = percent + "%";
    els.materiProgress.setAttribute("aria-valuenow", String(number));
    els.materiProgress.setAttribute("aria-valuetext", "Bagian " + number + " dari " + MATERI_TOTAL);
    els.materiBack.disabled = state.materiIndex === 0;
    els.materiNext.textContent = number === MATERI_TOTAL ? "Lanjut ke Kuis" : "Lanjut";
    renderStudyDeck();

    if (focusHeading) els.materiJudul.focus();
  }

  /* ---------- Kuis ---------- */

  function buildAnswerSheet() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < TOTAL; index += 1) {
      fragment.append(make("li", "", String(index + 1)));
    }
    els.answerSheet.replaceChildren(fragment);
  }

  function updateAnswerSheet() {
    Array.from(els.answerSheet.children).forEach(function (cell, index) {
      cell.classList.toggle("is-answered", state.jawaban[index] !== null);
      if (index === state.quizIndex) {
        cell.setAttribute("aria-current", "step");
      } else {
        cell.removeAttribute("aria-current");
      }
    });
    els.answerSheetCount.textContent = answeredCount() + " dari " + TOTAL + " terjawab";
  }

  function selectAnswer(optionIndex) {
    state.jawaban[state.quizIndex] = optionIndex;
    state.submitError = null;

    Array.from(els.kuisOpsi.children).forEach(function (button, index) {
      button.setAttribute("aria-pressed", String(index === optionIndex));
    });
    updateAnswerSheet();

    if (state.showSummary) renderSummary();
    saveDraft();
  }

  function renderQuiz(focusQuestion) {
    const question = QUIZ_DATA.soal[state.quizIndex];
    const number = state.quizIndex + 1;

    els.kuisPertanyaan.textContent = question.teks;

    const options = document.createDocumentFragment();
    question.opsi.forEach(function (text, index) {
      const button = make("button", "option");
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.jawaban[state.quizIndex] === index));
      button.append(
        make("span", "option-letter", LETTERS[index]),
        make("span", "option-text", text)
      );
      button.addEventListener("click", function () {
        selectAnswer(index);
      });
      options.append(button);
    });
    els.kuisOpsi.replaceChildren(options);

    const percent = Math.round((number / TOTAL) * 100);
    els.kuisStep.textContent = "Soal " + number + " dari " + TOTAL;
    els.kuisPercent.textContent = percent + "%";
    els.kuisBar.style.width = percent + "%";
    els.kuisProgress.setAttribute("aria-valuenow", String(number));
    els.kuisProgress.setAttribute("aria-valuetext", "Soal " + number + " dari " + TOTAL);
    els.kuisBack.disabled = state.quizIndex === 0;
    els.kuisNext.textContent = number === TOTAL ? "Kirim Jawaban" : "Lanjut";

    if (state.showSummary) {
      renderSummary();
      els.summary.hidden = false;
    } else {
      els.summary.hidden = true;
      els.submitError.hidden = true;
    }

    updateAnswerSheet();
    if (focusQuestion) els.kuisPertanyaan.focus();
  }

  function renderSummary() {
    const answered = answeredCount();
    const empty = TOTAL - answered;

    els.summary.hidden = false;
    els.summaryCount.textContent = answered + " dari " + TOTAL + " soal terjawab.";
    if (empty > 0) {
      els.summaryWarning.textContent = "Masih ada " + empty + " soal kosong. Kamu tetap boleh mengirim.";
      els.summaryWarning.hidden = false;
    } else {
      els.summaryWarning.hidden = true;
      els.summaryWarning.textContent = "";
    }

    els.submitStatus.textContent = "";
    els.submitBtn.hidden = false;
    els.retryBtn.hidden = true;
    els.submitBtn.textContent = "Kirim sekarang";
    els.submitBtn.disabled = false;
    els.checkBtn.disabled = false;

    if (state.submitError) {
      els.submitErrorText.textContent = state.submitError.message;
      els.submitError.hidden = false;
      els.submitBtn.hidden = true;
      els.retryBtn.hidden = false;
      els.retryBtn.disabled = false;
      els.retryBtn.textContent = "Coba Lagi";
      els.submitStatus.textContent = "Pengiriman gagal. Periksa pesan di atas.";
    } else {
      els.submitError.hidden = true;
      els.submitErrorText.textContent = "";
    }

    if (state.submitting) {
      els.submitStatus.textContent = "Mengirim jawaban...";
      els.submitBtn.disabled = true;
      els.submitBtn.textContent = "Mengirim...";
      els.retryBtn.disabled = true;
      els.retryBtn.textContent = "Mengirim...";
      els.checkBtn.disabled = true;
    }
  }

  function errorMessage(error) {
    const code = error && error.code ? error.code : "SERVER";
    const serverMessage = error && typeof error.message === "string" ? error.message.trim() : "";

    if (code === "VALIDASI") {
      return serverMessage || "Isian belum valid. Periksa kembali jawabanmu.";
    }
    if (code === "DUPLIKAT") return "Jawaban sudah terkirim, tunggu sebentar.";
    if (code === "TERLALU_BANYAK") return "Terlalu banyak percobaan, coba lagi nanti.";
    if (code === "NETWORK" || code === "TIMEOUT") return "Tidak dapat terhubung ke server.";
    return "Tidak dapat memproses jawaban. Coba lagi.";
  }

  async function handleSubmit() {
    if (state.submitting) return;
    if (!identityComplete()) {
      showScreen("identitas");
      els.formStatus.textContent = "Isi identitas dulu sebelum mengirim jawaban.";
      els.nama.focus();
      return;
    }

    if (!state.startedAt) state.startedAt = Date.now();
    const duration = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));

    const payload = {
      nama: clean(state.nama),
      kelas: clean(state.kelas),
      nis: clean(state.nis),
      jawaban: state.jawaban.slice(),
      durasi: duration,
      website: els.website.value
    };

    state.submitting = true;
    state.submitError = null;
    state.showSummary = true;
    state.lastDuration = duration;
    renderSummary();
    els.summaryTitle.focus();

    try {
      const data = await window.QuizApi.submitQuiz(payload);
      if (!data || data.ok !== true || !Array.isArray(data.review) ||
          !isFinite(Number(data.skor)) || !isFinite(Number(data.benar))) {
        throw { code: "SERVER", message: "" };
      }
      state.result = data;
      state.submittedAt = new Date().toISOString();
      state.submitting = false;
      state.showSummary = false;
      state.submitError = null;
      removeDraft();
      renderHasil();
      showScreen("hasil");
    } catch (error) {
      state.submitting = false;
      state.submitError = { code: error && error.code ? error.code : "SERVER", message: errorMessage(error) };
      renderSummary();
      els.submitError.focus();
    }
  }

  function startQuiz(forceNew) {
    if (!identityComplete()) {
      showScreen("identitas");
      els.formStatus.textContent = "Isi identitas dulu sebelum membuka kuis.";
      els.nama.focus();
      return;
    }
    if (state.result && !forceNew) {
      renderHasil();
      showScreen("hasil");
      return;
    }
    if (state.result && forceNew) {
      resetAttempt();
    }
    if (!state.startedAt) state.startedAt = Date.now();
    state.showSummary = false;
    state.submitError = null;
    showScreen("kuis");
    renderQuiz(false);
    saveDraft();
  }

  function resetAttempt() {
    state.result = null;
    state.jawaban = new Array(TOTAL).fill(null);
    state.quizIndex = 0;
    state.startedAt = Date.now();
    state.showSummary = false;
    state.submitting = false;
    state.submitError = null;
    state.submittedAt = null;
    state.lastDuration = 0;
  }

  /* ---------- Hasil ---------- */

  function formatAnswer(value, questionIndex) {
    if (value === null || value === undefined || value === "") return "Tidak dijawab";
    let optionIndex = null;
    if (Number.isInteger(value)) {
      optionIndex = value;
    } else if (typeof value === "string" && /^[0-3]$/.test(value.trim())) {
      optionIndex = Number(value.trim());
    }
    const question = QUIZ_DATA.soal[questionIndex];
    if (optionIndex !== null && question && question.opsi[optionIndex] !== undefined) {
      return LETTERS[optionIndex] + ". " + question.opsi[optionIndex];
    }
    return String(value);
  }

  function renderHasil() {
    const data = state.result;
    if (!data) return;

    els.mockBanner.hidden = !IS_MOCK;

    const score = Number(data.skor) || 0;
    const correct = Number(data.benar) || 0;
    const total = isFinite(Number(data.total)) ? Number(data.total) : TOTAL;
    const duration = state.lastDuration;

    els.hasilSkor.textContent = String(score);
    els.hasilBenar.textContent = String(correct);
    els.hasilTotal.textContent = "dari " + total + " soal";
    els.hasilDurasi.textContent = String(duration);
    els.hasilSubtitle.textContent = clean(state.nama) + " · " + clean(state.kelas) +
      " · selesai dalam " + duration + " detik";

    Array.from(els.scoreGuide.children).forEach(function (item) {
      const level = score >= 90 ? "high" : score >= 70 ? "mid" : "low";
      const active = item.dataset.level === level;
      item.classList.toggle("is-active", active);
      if (active) {
        item.setAttribute("aria-current", "true");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    const reviewFragment = document.createDocumentFragment();
    data.review.forEach(function (item, index) {
      const no = Number.isInteger(Number(item.no)) ? Number(item.no) : index + 1;
      const question = QUIZ_DATA.soal[no - 1];
      const row = make("li");

      const head = make("div", "review-head");
      head.append(make("span", "review-no", "Soal " + no));
      const pill = make("span", "pill " + (item.benar ? "pill-correct" : "pill-wrong"),
        item.benar ? "Benar" : "Salah");

      const questionText = make("h3", "review-question",
        question ? question.teks : "Soal " + no);
      const pair = make("dl", "answer-pair");
      pair.append(make("dt", "", "Jawabanmu"));
      pair.append(make("dd", "", formatAnswer(item.jawabanmu, no - 1)));
      pair.append(make("dt", "", "Jawaban benar"));
      pair.append(make("dd", "", formatAnswer(item.kunci, no - 1)));

      const explanation = make("p", "explanation");
      explanation.append(make("strong", "", "Pembahasan: "));
      explanation.append(document.createTextNode(
        typeof item.pembahasan === "string" && item.pembahasan.trim()
          ? item.pembahasan
          : "Belum ada pembahasan dari server."
      ));

      row.append(head, questionText, pair, explanation, pill);
      reviewFragment.append(row);
    });
    els.reviewList.replaceChildren(reviewFragment);
    els.downloadStatus.textContent = "";
  }

  function csvEscape(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function buildCsv() {
    const data = state.result || {};
    const nama = typeof data.nama === "string" && data.nama !== "" ? data.nama : state.nama;
    const kelas = typeof data.kelas === "string" && data.kelas !== "" ? data.kelas : state.kelas;
    const nis = typeof data.nis === "string" && data.nis !== "" ? data.nis : state.nis;
    const waktu = typeof data.waktu === "string" && data.waktu !== "" ? data.waktu : state.submittedAt;
    const durasi = isFinite(Number(data.durasi)) ? Number(data.durasi) : state.lastDuration;

    const rows = [
      ["Nama", "Kelas", "NIS", "Skor", "Benar", "Total", "Durasi (detik)", "Waktu"],
      [nama, kelas, nis, data.skor, data.benar, data.total || TOTAL, durasi, waktu]
    ];
    return rows.map(function (row) {
      return row.map(csvEscape).join(",");
    }).join("\r\n");
  }

  function downloadCsv() {
    if (!state.result) return;
    try {
      const blob = new Blob(["\uFEFF" + buildCsv()], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const slug = clean(state.nama).toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "siswa";
      anchor.href = url;
      anchor.download = "hasil-kuis-" + slug + ".csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      els.downloadStatus.textContent = "File hasil berhasil diunduh.";
    } catch (error) {
      els.downloadStatus.textContent = "Unduhan tidak tersedia di peramban ini.";
    }
  }

  /* ---------- Event ---------- */

  function bindEvents() {
    els.form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateIdentity()) return;
      state.materiIndex = 0;
      state.kartuIndex = 0;
      state.kartuRevealed = false;
      showScreen("materi");
      renderMateri(false);
      saveDraft();
    });

    ["nama", "kelas", "nis"].forEach(function (field) {
      els[field].addEventListener("input", function () {
        if (els[field].getAttribute("aria-invalid") === "true") {
          clearFieldError(field);
          els.formStatus.textContent = "";
        }
      });
    });

    els.mulaiBtn.addEventListener("click", function () {
      showScreen("identitas");
      saveDraft();
    });

    els.materiBack.addEventListener("click", function () {
      if (state.materiIndex === 0) return;
      goMateri(state.materiIndex - 1);
    });

    els.materiNext.addEventListener("click", function () {
      if (state.materiIndex < MATERI_TOTAL - 1) {
        goMateri(state.materiIndex + 1);
      } else {
        startQuiz(true);
      }
    });

    els.studyReveal.addEventListener("click", function () {
      state.kartuRevealed = !state.kartuRevealed;
      renderStudyDeck();
      if (state.kartuRevealed) els.studyAnswerText.focus();
    });

    els.studyKnown.addEventListener("click", function () {
      const cards = sectionCards(state.materiIndex);
      state.kartuPaham[cardKey(state.materiIndex, state.kartuIndex)] = true;
      state.kartuRevealed = true;
      const sectionDone = cards.every(function (_, index) {
        return state.kartuPaham[cardKey(state.materiIndex, index)];
      });
      const message = sectionDone
        ? "Semua kartu di bagian ini dikuasai. Kamu siap lanjut."
        : "Bagus! " + masteredCount() + " dari " + totalCards() + " kartu dikuasai.";
      renderStudyDeck(message, "happy");
      saveDraft();
    });

    els.studyAgain.addEventListener("click", function () {
      delete state.kartuPaham[cardKey(state.materiIndex, state.kartuIndex)];
      state.kartuRevealed = false;
      renderStudyDeck("Tidak apa-apa. Baca lagi bagian materi di atas, lalu buka kartu ini sekali lagi.", "");
      saveDraft();
    });

    els.studyNext.addEventListener("click", function () {
      const cards = sectionCards(state.materiIndex);
      if (cards.length < 2) return;
      state.kartuIndex = (state.kartuIndex + 1) % cards.length;
      state.kartuRevealed = false;
      renderStudyDeck();
      els.studyPrompt.focus();
      saveDraft();
    });

    els.kuisBack.addEventListener("click", function () {
      if (state.quizIndex === 0) return;
      state.quizIndex -= 1;
      state.showSummary = false;
      state.submitError = null;
      renderQuiz(true);
      saveDraft();
    });

    els.kuisNext.addEventListener("click", function () {
      if (state.quizIndex < TOTAL - 1) {
        state.quizIndex += 1;
        state.showSummary = false;
        state.submitError = null;
        renderQuiz(true);
        saveDraft();
      } else {
        state.showSummary = true;
        state.submitError = null;
        renderSummary();
        els.summaryTitle.focus();
      }
    });

    els.submitBtn.addEventListener("click", handleSubmit);
    els.retryBtn.addEventListener("click", handleSubmit);

    els.checkBtn.addEventListener("click", function () {
      state.showSummary = false;
      state.submitError = null;
      els.summary.hidden = true;
      els.kuisPertanyaan.focus();
    });

    els.ulangBtn.addEventListener("click", function () {
      resetAttempt();
      showScreen("kuis");
      renderQuiz(false);
      saveDraft();
    });

    els.keMateriBtn.addEventListener("click", function () {
      showScreen("materi");
      renderMateri(false);
    });

    els.csvBtn.addEventListener("click", downloadCsv);
  }

  /* ---------- Mulai ---------- */

  function init() {
    buildAnswerSheet();
    buildMateriIndex();
    bindEvents();
    loadDraft();

    els.nama.value = state.nama;
    els.kelas.value = state.kelas;
    els.nis.value = state.nis;
    updateWho();

    if (state.route === "materi") {
      showScreen("materi", false);
      renderMateri(false);
    } else if (state.route === "kuis") {
      if (!state.startedAt) state.startedAt = Date.now();
      showScreen("kuis", false);
      renderQuiz(false);
    } else if (state.route === "identitas") {
      showScreen("identitas", false);
    } else {
      showScreen("landing", false);
    }
  }

  init();
})();
