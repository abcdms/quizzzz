/*
  GANTI URL_APPS_SCRIPT di bawah dengan URL deployment Web App Apps Script kamu.
*/
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLbLaILjKD9wYjOvPA327gh62wghDJ9DHHN5KLFmVHpFNIF5HK9EbCjQe3IOqhfPucig/exec";

const $ = (id) => document.getElementById(id);
const loginPanel = $("login-panel"), quizPanel = $("quiz-panel"), resultPanel = $("result-panel");
let questions = [], participant = {}, current = 0, answers = [], locked = false;

$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  participant = {
    nama: $("nama").value.trim(),
    kelas: $("kelas").value.trim(),
    npm: $("npm").value.trim()
  };
  if (!participant.nama || !participant.kelas || !participant.npm) return;
  $("participant-mini").textContent = participant.nama;
  $("login-panel").classList.add("hidden");
  quizPanel.classList.remove("hidden");
  loadQuestions();
});

function loadQuestions(){
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "URL_APPS_SCRIPT") {
    showError("URL Apps Script belum dipasang. Hubungi penyelenggara.");
    return;
  }
  const callback = "quizQuestions_" + Date.now();
  window[callback] = (data) => {
    delete window[callback];
    if (!data || !data.questions) { showError("Soal tidak berhasil dimuat."); return; }
    questions = data.questions;
    answers = Array(questions.length).fill(null);
    renderQuestion();
  };
  const script = document.createElement("script");
  script.src = APPS_SCRIPT_URL + "?action=questions&callback=" + callback;
  script.onerror = () => showError("Gagal memuat soal. Periksa koneksi internet.");
  document.head.appendChild(script);
}

function showError(message){
  quizPanel.innerHTML = `<div class="eyebrow">GAGAL MEMUAT</div><h2>${message}</h2><p class="sub">Silakan muat ulang halaman atau hubungi penyelenggara.</p>`;
}

function renderQuestion(){
  locked = false;
  const q = questions[current];
  $("counter").textContent = `SOAL ${current+1} / ${questions.length}`;
  $("question-number").textContent = String(current+1).padStart(2,"0");
  $("question-text").textContent = q.question;
  $("progress-fill").style.width = `${(current/questions.length)*100}%`;
  const options = $("options");
  options.innerHTML = "";
  q.options.forEach((text, idx) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.innerHTML = `<span class="letter">${"ABCD"[idx]}</span><span></span>`;
    button.querySelector("span:last-child").textContent = text;
    button.addEventListener("click", () => chooseAnswer(idx, button));
    options.appendChild(button);
  });
}

function chooseAnswer(idx, button){
  if (locked) return;
  locked = true;
  answers[current] = idx;
  document.querySelectorAll(".option").forEach(b => b.disabled = true);
  button.classList.add("selected");
  $("progress-fill").style.width = `${((current+1)/questions.length)*100}%`;
  setTimeout(() => {
    current++;
    if (current < questions.length) renderQuestion();
    else finishQuiz();
  }, 450);
}

function finishQuiz(){
  quizPanel.classList.add("hidden");
  resultPanel.classList.remove("hidden");
  $("result-name").textContent = `${participant.nama} · ${participant.kelas}`;
  $("save-status").textContent = "Sedang mengirim hasil ke penyelenggara…";
  submitResult();
}

function submitResult(){
  // Submit via hidden iframe/form: server validates and calculates score; answer key is not sent to browser.
  const frame = document.createElement("iframe");
  frame.name = "quizSubmitFrame";
  frame.style.display = "none";
  document.body.appendChild(frame);
  const form = document.createElement("form");
  form.method = "POST";
  form.action = APPS_SCRIPT_URL;
  form.target = frame.name;
  form.style.display = "none";
  const fields = {
    action: "submit",
    nama: participant.nama,
    kelas: participant.kelas,
    npm: participant.npm,
    answers: JSON.stringify(answers)
  };
  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = key; input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);

  const expectedNpm = participant.npm;
  window.addEventListener("message", function onMessage(event){
    // Apps Script dapat mengirim payload langsung atau dalam pembungkus.
    const payload = event.data && event.data.type === "QUIZ_RESULT"
      ? event.data.data
      : event.data;
    if (!payload || payload.npm !== expectedNpm) return;
    window.removeEventListener("message", onMessage);
    if (payload.ok) {
      const score = Number(payload.score);
      $("score").innerHTML = `${score}<span>/100</span>`;
      $("correct-count").textContent = payload.correct;
      $("wrong-count").textContent = payload.wrong;
      $("score-caption").textContent = score === 100 ? "Sempurna! Semua jawaban benar." : score >= 70 ? "Bagus, terus pertahankan!" : "Terima kasih sudah menyelesaikan kuis.";
      $("save-status").textContent = "Hasil berhasil tersimpan.";
    } else {
      $("score").innerHTML = `—<span>/100</span>`;
      $("save-status").textContent = payload.message || "Hasil tidak tersimpan. Hubungi penyelenggara.";
    }
  });
  form.submit();
  // Fallback notice if the server response/message is blocked.
  setTimeout(() => {
    if ($("save-status").textContent.includes("Sedang mengirim")) {
      $("save-status").textContent = "Pengiriman sedang diproses. Jika nilai belum muncul, hubungi penyelenggara.";
    }
  }, 12000);
}
