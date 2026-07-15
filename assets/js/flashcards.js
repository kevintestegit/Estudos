async function initFlashcards() {
  App.initShell("flashcards");
  try {
    const data = await App.loadJSON("data/flashcards.json");
    renderFlashcards(data.flashcards || []);
  } catch (e) {
    document.getElementById("app-root").innerHTML =
      `<div class="alert alert-danger">Erro ao carregar flashcards. ${App.esc(e.message)}</div>`;
  }
}

function renderFlashcards(all) {
  const root = document.getElementById("app-root");
  const today = todayISO();
  const p = Storage.get();
  const states = p.flashcards || {};

  let filter = "due";
  let cat = "todas";

  function list() {
    return all.filter((c) => {
      if (cat !== "todas" && c.categoria !== cat) return false;
      const st = states[c.id];
      if (filter === "due") {
        if (!st) return true;
        return !st.next || st.next <= today;
      }
      if (filter === "all") return true;
      if (filter === "new") return !st;
      return true;
    });
  }

  function paint() {
    const items = list();
    const dueCount = all.filter((c) => {
      const st = states[c.id];
      return !st || !st.next || st.next <= today;
    }).length;

    root.innerHTML = `
      <div class="card mb-1 hero-card">
        <p class="eyebrow">Repetição espaçada</p>
        <h2>Flashcards — lei seca</h2>
        <p class="muted">Novo → D+1 → D+7 → D+30. ${all.length} cards · ${dueCount} para hoje.</p>
        <div class="actions">
          <button type="button" class="btn btn-sm ${filter === "due" ? "" : "btn-secondary"} filter-f" data-f="due">Hoje</button>
          <button type="button" class="btn btn-sm ${filter === "new" ? "" : "btn-secondary"} filter-f" data-f="new">Novos</button>
          <button type="button" class="btn btn-sm ${filter === "all" ? "" : "btn-secondary"} filter-f" data-f="all">Todos</button>
        </div>
        <div class="actions mt-1">
          <button type="button" class="btn btn-sm ${cat === "todas" ? "" : "btn-secondary"} filter-c" data-c="todas">Todas</button>
          <button type="button" class="btn btn-sm ${cat === "inss" ? "" : "btn-secondary"} filter-c" data-c="inss">INSS</button>
          <button type="button" class="btn btn-sm ${cat === "prf" ? "" : "btn-secondary"} filter-c" data-c="prf">PRF</button>
          <button type="button" class="btn btn-sm ${cat === "comum" ? "" : "btn-secondary"} filter-c" data-c="comum">Comum</button>
        </div>
      </div>
      <div id="fc-area"></div>
      <div class="card mt-1">
        <h3>Fila (${items.length})</h3>
        <ul class="list fc-queue stagger">
          ${
            items
              .slice(0, 30)
              .map((c) => {
                const st = states[c.id];
                return `<li><strong>${App.esc(c.materia)}</strong> — ${App.esc(c.frente.slice(0, 80))}${c.frente.length > 80 ? "…" : ""}
              ${st ? `<span class="badge badge-muted">caixa ${st.box} · próximo ${App.formatDateBR(st.next)}</span>` : '<span class="badge badge-info">novo</span>'}
            </li>`;
              })
              .join("") || '<li class="muted">Nada nesta fila.</li>'
          }
        </ul>
      </div>`;

    root.querySelectorAll(".filter-f").forEach((b) => {
      b.onclick = () => {
        filter = b.dataset.f;
        paint();
      };
    });
    root.querySelectorAll(".filter-c").forEach((b) => {
      b.onclick = () => {
        cat = b.dataset.c;
        paint();
      };
    });

    const area = document.getElementById("fc-area");
    if (!items.length) {
      area.innerHTML =
        '<div class="alert alert-ok">Fila de hoje vazia. Volte amanhã ou veja Todos.</div>';
      return;
    }
    showCard(items, 0, area, () => paint());
  }

  paint();
}

function showCard(items, idx, area, onDone) {
  if (idx >= items.length) {
    area.innerHTML = `<div class="alert alert-ok">Sessão concluída (${items.length} cards).</div>
      <div class="actions"><button type="button" class="btn" id="fc-reload">Atualizar fila</button></div>`;
    document.getElementById("fc-reload").onclick = onDone;
    return;
  }

  const c = items[idx];
  const pct = Math.round((idx / items.length) * 100);

  area.innerHTML = `
    <div class="fc-stage">
      <div class="fc-meta">
        <span class="badge badge-info">${App.esc(c.categoria)}</span>
        <span class="badge badge-muted">${App.esc(c.materia)}</span>
        <span class="muted">Card ${idx + 1}/${items.length}</span>
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
        <button type="button" class="btn btn-accent hidden" id="fc-know">Sabia</button>
        <button type="button" class="btn btn-danger hidden" id="fc-fail">Errei</button>
      </div>
    </div>`;

  const flipEl = document.getElementById("fc-flip");
  const revealBtn = document.getElementById("fc-reveal");
  const knowBtn = document.getElementById("fc-know");
  const failBtn = document.getElementById("fc-fail");
  let flipped = false;

  function reveal() {
    if (flipped) return;
    flipped = true;
    flipEl.classList.add("is-flipped");
    revealBtn.classList.add("hidden");
    knowBtn.classList.remove("hidden");
    failBtn.classList.remove("hidden");
    knowBtn.focus();
  }

  flipEl.onclick = reveal;
  revealBtn.onclick = reveal;

  const onKey = (e) => {
    if (e.key === " " || e.key === "Enter") {
      if (document.activeElement === flipEl || document.activeElement === revealBtn) {
        e.preventDefault();
        reveal();
      } else if (!flipped && document.activeElement === document.body) {
        e.preventDefault();
        reveal();
      }
    }
    if (flipped && e.key === "1") {
      e.preventDefault();
      knowBtn.click();
    }
    if (flipped && e.key === "2") {
      e.preventDefault();
      failBtn.click();
    }
  };
  document.addEventListener("keydown", onKey);

  function next(result) {
    document.removeEventListener("keydown", onKey);
    Storage.reviewFlashcard(c.id, result);
    showCard(items, idx + 1, area, onDone);
  }

  knowBtn.onclick = () => next("know");
  failBtn.onclick = () => next("fail");
}

window.initFlashcards = initFlashcards;
