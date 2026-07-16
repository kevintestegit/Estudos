/** SM-2 — sobrescreve Storage.reviewFlashcard e melhora a UI de resposta */
(function () {
  function addDays(iso, n) {
    return typeof addDaysISO === "function"
      ? addDaysISO(iso, n)
      : iso;
  }

  /**
   * quality: 0=again, 3=hard, 4=good, 5=easy
   * Mantém compatibilidade com "know" / "fail".
   */
  Storage.reviewFlashcard = function (id, result) {
    return this.update((d) => {
      const t = todayISO();
      let q = 4;
      if (result === "fail" || result === "again" || result === 0) q = 0;
      else if (result === "hard" || result === 3) q = 3;
      else if (result === "good" || result === "know" || result === 4) q = 4;
      else if (result === "easy" || result === 5) q = 5;
      else if (typeof result === "number") q = result;

      const cur = d.flashcards[id] || {
        box: 0,
        ef: 2.5,
        interval: 0,
        repetitions: 0,
        last: null,
        next: t,
        reviews: 0,
        fails: 0,
      };
      if (cur.ef == null) cur.ef = 2.5;
      if (cur.interval == null) cur.interval = 0;
      if (cur.repetitions == null) cur.repetitions = cur.box || 0;

      if (q < 3) {
        cur.repetitions = 0;
        cur.interval = 1;
        cur.box = 0;
        cur.fails = (cur.fails || 0) + 1;
      } else {
        if (cur.repetitions === 0) cur.interval = 1;
        else if (cur.repetitions === 1) cur.interval = 6;
        else cur.interval = Math.max(1, Math.round(cur.interval * cur.ef));
        if (q === 3) cur.interval = Math.max(1, Math.round(cur.interval * 0.8));
        if (q === 5) cur.interval = Math.max(1, Math.round(cur.interval * 1.3));
        cur.repetitions += 1;
        cur.box = Math.min(3, cur.repetitions);
      }

      // Fórmula SM-2 do fator de facilidade
      cur.ef = Math.max(
        1.3,
        cur.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
      );
      cur.last = t;
      cur.next = addDays(t, cur.interval);
      cur.reviews = (cur.reviews || 0) + 1;
      d.flashcards[id] = cur;
      d.xp += q >= 4 ? 2 : 1;
      this._level(d);
    });
  };

  // Melhora botões: Again / Hard / Good / Easy
  const _show = window.showCard;
  if (typeof _show !== "function") return;

  window.showCard = function (items, idx, area, onDone) {
    if (idx >= items.length) {
      area.innerHTML = `<div class="alert alert-ok">Sessão concluída (${items.length} cards) — SM-2.</div>
        <div class="actions"><button type="button" class="btn" id="fc-reload">Atualizar fila</button></div>`;
      document.getElementById("fc-reload").onclick = onDone;
      return;
    }

    const c = items[idx];
    const pct = Math.round((idx / items.length) * 100);
    const st = Storage.getFlashState(c.id);

    area.innerHTML = `
      <div class="fc-stage">
        <div class="fc-meta">
          <span class="badge badge-info">${App.esc(c.categoria)}</span>
          <span class="badge badge-muted">${App.esc(c.materia)}</span>
          <span class="muted">Card ${idx + 1}/${items.length}</span>
          ${st ? `<span class="badge badge-muted">EF ${Number(st.ef || 2.5).toFixed(2)} · ${st.interval || 0}d</span>` : ""}
        </div>
        <div class="fc-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <button type="button" class="fc-card" id="fc-flip" aria-label="Virar flashcard">
          <div class="fc-inner">
            <div class="fc-face fc-front">
              <p class="eyebrow">Frente</p>
              <h3>${App.esc(c.frente)}</h3>
              <p class="fc-hint">Clique ou Espaço para revelar</p>
            </div>
            <div class="fc-face fc-back">
              <p class="eyebrow">Verso</p>
              <p class="fc-answer">${App.esc(c.verso)}</p>
            </div>
          </div>
        </button>
        <div class="fc-actions">
          <button type="button" class="btn btn-secondary" id="fc-reveal">Mostrar resposta</button>
          <button type="button" class="btn btn-danger hidden" id="fc-again" title="1">Errei</button>
          <button type="button" class="btn btn-secondary hidden" id="fc-hard" title="2">Difícil</button>
          <button type="button" class="btn hidden" id="fc-good" title="3">Bom</button>
          <button type="button" class="btn btn-accent hidden" id="fc-easy" title="4">Fácil</button>
        </div>
        <p class="muted" style="margin-top:0.5rem;font-size:0.85rem">Teclas: Espaço revela · 1 Errei · 2 Difícil · 3 Bom · 4 Fácil</p>
      </div>`;

    const flipEl = document.getElementById("fc-flip");
    const revealBtn = document.getElementById("fc-reveal");
    const buttons = {
      again: document.getElementById("fc-again"),
      hard: document.getElementById("fc-hard"),
      good: document.getElementById("fc-good"),
      easy: document.getElementById("fc-easy"),
    };
    let flipped = false;

    function reveal() {
      if (flipped) return;
      flipped = true;
      flipEl.classList.add("is-flipped");
      revealBtn.classList.add("hidden");
      Object.values(buttons).forEach((b) => b.classList.remove("hidden"));
      buttons.good.focus();
    }

    flipEl.onclick = reveal;
    revealBtn.onclick = reveal;

    const onKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        if (!flipped) {
          e.preventDefault();
          reveal();
        }
      }
      if (!flipped) return;
      if (e.key === "1") {
        e.preventDefault();
        buttons.again.click();
      }
      if (e.key === "2") {
        e.preventDefault();
        buttons.hard.click();
      }
      if (e.key === "3") {
        e.preventDefault();
        buttons.good.click();
      }
      if (e.key === "4") {
        e.preventDefault();
        buttons.easy.click();
      }
    };
    document.addEventListener("keydown", onKey);

    function next(result) {
      document.removeEventListener("keydown", onKey);
      Storage.reviewFlashcard(c.id, result);
      showCard(items, idx + 1, area, onDone);
    }

    buttons.again.onclick = () => next("again");
    buttons.hard.onclick = () => next("hard");
    buttons.good.onclick = () => next("good");
    buttons.easy.onclick = () => next("easy");
  };
})();
