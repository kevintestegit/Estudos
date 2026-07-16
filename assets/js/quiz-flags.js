/** Injeta favorito/dúvida no card da questão (carregado após quiz.js) */
(function () {
  if (typeof startQuiz !== "function") return;

  const _startQuiz = startQuiz;
  window.startQuiz = function startQuizWithFlags(questions, meta) {
    // Marca o pool atual para o observer resolver o id pela ordem
    window.__quizPool = questions || [];
    window.__quizMeta = meta || {};
    return _startQuiz(questions, meta);
  };

  function paint(btn, active, onText, offText) {
    if (!btn) return;
    btn.textContent = active ? onText : offText;
    btn.className = "btn btn-sm " + (active ? "btn-accent" : "btn-secondary");
    btn.setAttribute("aria-pressed", String(!!active));
  }

  function currentIndex(card) {
    const muted = card.querySelector("p.muted");
    if (!muted) return -1;
    const m = muted.textContent.match(/Questão\s+(\d+)\s+de\s+(\d+)/i);
    return m ? Number(m[1]) - 1 : -1;
  }

  function ensureFlags(card) {
    if (!card || card.dataset.flagsReady === "1") return;
    const pool = window.__quizPool || [];
    const idx = currentIndex(card);
    const q = idx >= 0 ? pool[idx] : null;
    if (!q || !q.id) return;

    const host = document.createElement("div");
    host.className = "actions";
    host.style.margin = "0.35rem 0 0.75rem";
    host.innerHTML =
      '<button type="button" class="btn btn-sm btn-secondary" id="q-fav">Favoritar</button> ' +
      '<button type="button" class="btn btn-sm btn-secondary" id="q-doubt">Marcar dúvida</button>';

    const h3 = card.querySelector("h3");
    if (h3) card.insertBefore(host, h3);
    else card.insertBefore(host, card.firstChild);

    const fav = host.querySelector("#q-fav");
    const doub = host.querySelector("#q-doubt");

    const refresh = () => {
      const f = Storage.getQuestionFlag(q.id);
      paint(fav, f.favorite, "★ Favorita", "☆ Favoritar");
      paint(doub, f.doubt, "? Em dúvida", "? Marcar dúvida");
    };
    refresh();

    fav.addEventListener("click", () => {
      Storage.toggleQuestionFlag(q.id, "favorite");
      refresh();
    });
    doub.addEventListener("click", () => {
      Storage.toggleQuestionFlag(q.id, "doubt");
      refresh();
    });

    card.dataset.flagsReady = "1";
    card.dataset.qid = q.id;
  }

  const obs = new MutationObserver(() => {
    const card = document.getElementById("quiz-card");
    if (card) ensureFlags(card);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
