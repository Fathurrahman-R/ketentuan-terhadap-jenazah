/* Lapisan API. Satu-satunya tempat yang berbicara ke backend. */
(function () {
  "use strict";

  const TIMEOUT_MS = 15000;

  function apiError(code, message) {
    return { code: code, message: message || "" };
  }

  function mockResponse(payload) {
    const jawaban = Array.isArray(payload.jawaban) ? payload.jawaban : [];
    const review = jawaban.map(function (answer, index) {
      const kunci = Math.floor(Math.random() * 4);
      return {
        no: index + 1,
        jawabanmu: answer,
        kunci: kunci,
        benar: answer === kunci,
        pembahasan: "(data contoh)"
      };
    });
    const benar = review.filter(function (item) { return item.benar; }).length;
    return {
      ok: true,
      skor: benar * 10,
      benar: benar,
      total: review.length,
      review: review
    };
  }

  async function submitQuiz(payload) {
    if (USE_MOCK) {
      await new Promise(function (resolve) { setTimeout(resolve, 800); });
      return mockResponse(payload);
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw apiError("NETWORK");
    }

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    let response;

    try {
      response = await fetch(SUPABASE_URL + "/functions/v1/" + FUNCTION_NAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw apiError("TIMEOUT");
      }
      throw apiError("NETWORK");
    } finally {
      clearTimeout(timer);
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw apiError("SERVER");
    }

    const codes = ["VALIDASI", "DUPLIKAT", "TERLALU_BANYAK", "SERVER"];
    if (!response.ok) {
      throw apiError(
        data && codes.indexOf(data.code) !== -1 ? data.code : "SERVER",
        data && typeof data.error === "string" ? data.error : ""
      );
    }
    if (!data || data.ok !== true) {
      throw apiError(
        data && codes.indexOf(data.code) !== -1 ? data.code : "SERVER",
        data && typeof data.error === "string" ? data.error : ""
      );
    }
    return data;
  }

  window.QuizApi = { submitQuiz: submitQuiz };
})();
