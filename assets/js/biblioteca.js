async function initBiblioteca() {
  App.initShell("biblioteca");
  const params = new URLSearchParams(location.search);
  try {
    const [materiaisData, provasData, aulasData, pdfsData] = await Promise.all([
      App.loadJSON("data/materiais.json"),
      App.loadJSON("data/provas.json"),
      App.loadJSON("data/aulas.json"),
      App.loadJSON("data/pdfs.json"),
    ]);
    const materiais = (materiaisData.materiais || []).map((item) => ({
      ...item,
      _origem: "material",
    }));
    const provas = (provasData.provas || []).map((item) => ({
      ...item,
      categoria: item.categoria || categoryFromContest(item.concurso),
      materia: item.materia || "Prova completa",
      prioridade: item.prioridade || "alta",
      _origem: "prova",
    }));
    const aulas = (aulasData.aulas || []).map((item) => ({
      ...item,
      titulo: item.titulo,
      tipo: "aula",
      categoria: "comum",
      fonte: "YouTube ou fonte indicada",
      _origem: "aula",
    }));
    const pdfs = (pdfsData.pdfs || []).map((item) => ({
      ...item,
      categoria: "comum",
      fonte: item.fonte || "Fonte indicada",
      _origem: "pdf",
    }));
    renderBiblioteca([...materiais, ...provas, ...aulas, ...pdfs], params);
  } catch (error) {
    document.getElementById("app-root").innerHTML =
      `<div class="alert alert-danger">Erro ao carregar biblioteca. ${App.esc(error.message)}</div>`;
  }
}

function categoryFromContest(contest) {
  const value = String(contest || "").toLowerCase();
  if (value.includes("prf")) return "prf";
  if (value.includes("inss")) return "inss";
  return "comum";
}

function normalizeLibraryFilter(params) {
  const type = params.get("tipo");
  if (type === "pdfs") return "pdf";
  if (type === "aulas") return "aula";
  if (type === "questoes" || type === "acertos") return type;
  if (
    [
      "pdf",
      "aula",
      "inss",
      "prf",
      "comum",
      "prova",
      "gabarito",
      "legislacao",
    ].includes(type)
  )
    return type;
  return params.get("materia") ? "materia" : "todos";
}

function renderBiblioteca(all, params) {
  const root = document.getElementById("app-root");
  let filter = normalizeLibraryFilter(params);
  let subject = params.get("materia") || "";
  let query = "";

  root.innerHTML = `
    <div id="active-filter"></div>
    <div class="grid grid-3 mb-1" id="library-stats"></div>
    <section class="card mb-1" aria-labelledby="filter-title">
      <h2 id="filter-title">Encontrar material</h2>
      <div class="actions" id="filters">
        ${[
          ["todos", "Todos"],
          ["inss", "INSS"],
          ["prf", "PRF Administrativo"],
          ["comum", "Conteúdo comum"],
          ["aula", "Aulas"],
          ["pdf", "PDFs"],
          ["questoes", "Questões"],
          ["acertos", "Meu desempenho"],
          ["legislacao", "Legislação"],
          ["prova", "Provas"],
          ["gabarito", "Gabaritos"],
        ]
          .map(
            ([value, label]) =>
              `<button class="btn btn-sm btn-secondary filter-btn" type="button" data-filter="${value}">${label}</button>`,
          )
          .join("")}
      </div>
      <div class="form-row mt-1 library-search">
        <label for="bib-search">Buscar por título, matéria ou fonte</label>
        <input id="bib-search" type="search" placeholder="Ex.: Português ou Lei 14.133">
      </div>
    </section>
    <div id="bib-list" class="grid grid-2"></div>
    <section class="card mt-2">
      <h2>Fila de revisão</h2>
      <div id="bib-revisao"></div>
    </section>`;

  function matches(item) {
    if (
      subject &&
      String(item.materia || "").toLowerCase() !== subject.toLowerCase()
    )
      return false;
    if (["inss", "prf", "comum"].includes(filter) && item.categoria !== filter)
      return false;
    if (filter === "aula" && item._origem !== "aula") return false;
    if (filter === "pdf" && item.tipo !== "pdf") return false;
    if (
      ["prova", "gabarito", "legislacao"].includes(filter) &&
      item.tipo !== filter
    )
      return false;
    if (!query) return true;
    return [item.titulo, item.materia, item.concurso, item.banca, item.fonte]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  function paintActiveFilter() {
    const box = document.getElementById("active-filter");
    const typeLabel = {
      aula: "Aulas",
      pdf: "PDFs",
      questoes: "Questões",
      acertos: "Meu desempenho",
    }[filter];
    const label = [typeLabel, subject].filter(Boolean).join(" · ");
    box.innerHTML = label
      ? `<div class="alert alert-info">Filtro ativo: <strong>${App.esc(label)}</strong> <button class="btn btn-sm btn-secondary" type="button" id="clear-filter">Limpar filtro</button></div>`
      : "";
    document.getElementById("clear-filter")?.addEventListener("click", () => {
      filter = "todos";
      subject = "";
      history.replaceState(null, "", "biblioteca.html");
      paint();
    });
  }

  function paintStats() {
    const progress = Storage.get();
    document.getElementById("library-stats").innerHTML = `
      ${libraryStat((progress.materiaisEstudados || []).length, "Materiais estudados")}
      ${libraryStat((progress.provasFeitas || []).length, "Provas feitas")}
      ${libraryStat((progress.materiaisRevisao || []).length, "Na fila de revisão")}`;
  }

  function paintList() {
    const list = document.getElementById("bib-list");
    if (filter === "questoes" || filter === "acertos") {
      const progress = Storage.get();
      const stats = subject
        ? progress.quiz?.bySubject?.[subject] || {}
        : progress.quiz || {};
      const answered = Number(stats.answered) || 0;
      const correct = Number(stats.correct) || 0;
      const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
      const questionUrl = `questoes.html${subject ? `?materia=${encodeURIComponent(subject)}` : ""}`;
      list.innerHTML = filter === "questoes"
        ? `<article class="card task-card"><h3>Praticar${subject ? ` — ${App.esc(subject)}` : " questões"}</h3><p>Abra o questionário para responder questões e receber a resolução.</p><a class="btn btn-accent" href="${questionUrl}">Fazer questões</a></article>`
        : `<article class="card task-card"><h3>Seu desempenho${subject ? ` — ${App.esc(subject)}` : ""}</h3><p><strong>${answered}</strong> questões respondidas · <strong>${accuracy}%</strong> de acertos.</p><div class="actions"><a class="btn btn-accent" href="${questionUrl}">Continuar praticando</a><a class="btn btn-secondary" href="progresso.html">Ver meu progresso</a></div></article>`;
      return;
    }
    const items = all.filter(matches);
    if (!items.length) {
      list.innerHTML =
        '<div class="card empty-state"><h3>Nenhum resultado</h3><p>Tente limpar o filtro ou buscar outro termo.</p></div>';
      return;
    }
    list.innerHTML = items
      .map((item) => {
        const studied = Storage.isMaterialStudied(item.id);
        const reviewing = Storage.isInRevisao(item.id);
        const url = App.resolveUrl(item.url, item.materia);
        return `<article class="card task-card">
        <h3>${App.esc(item.titulo)}</h3>
        <div class="task-meta">
          <span class="badge badge-info">${App.esc(item.materia || item.concurso || "Geral")}</span>
          <span class="badge badge-muted">${App.esc(item.tipo || "fonte")}</span>
          ${studied ? '<span class="badge badge-ok">Estudado</span>' : ""}
        </div>
        <p class="muted">Fonte: ${App.esc(item.fonte || "Fonte indicada no endereço")}</p>
        <div class="actions">
          <a class="btn btn-sm" ${App.linkAttrs(url)}>${App.materialActionLabel(item)}</a>
          <button class="btn btn-sm btn-accent" type="button" data-study="${App.esc(item.id)}">${studied ? "Já estudado" : "Marcar como estudado"}</button>
          <button class="btn btn-sm btn-secondary" type="button" data-review="${App.esc(item.id)}">${reviewing ? "Remover da revisão" : "Revisar depois"}</button>
        </div>
      </article>`;
      })
      .join("");

    list.querySelectorAll("[data-study]").forEach((button) => {
      button.onclick = () => {
        const item = all.find(
          (candidate) => candidate.id === button.dataset.study,
        );
        if (item) Storage.markMaterialStudied(item);
        paint();
      };
    });
    list.querySelectorAll("[data-review]").forEach((button) => {
      button.onclick = () => {
        const item = all.find(
          (candidate) => candidate.id === button.dataset.review,
        );
        if (!item) return;
        if (Storage.isInRevisao(item.id))
          Storage.removeMaterialRevisao(item.id);
        else Storage.addMaterialRevisao(item);
        paint();
      };
    });
  }

  function paintReview() {
    const box = document.getElementById("bib-revisao");
    const items = Storage.get().materiaisRevisao || [];
    box.innerHTML = items.length
      ? `<ul class="list">${items.map((item) => `<li><strong>${App.esc(item.titulo)}</strong><button class="btn btn-sm btn-danger" type="button" data-remove-review="${App.esc(item.id)}">Remover</button></li>`).join("")}</ul>`
      : '<p class="muted">Nada na fila de revisão.</p>';
    box.querySelectorAll("[data-remove-review]").forEach((button) => {
      button.onclick = () => {
        Storage.removeMaterialRevisao(button.dataset.removeReview);
        paint();
      };
    });
  }

  function paintButtons() {
    document.querySelectorAll(".filter-btn").forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("btn-secondary", !active);
      button.classList.toggle("active", active);
    });
  }

  function paint() {
    paintActiveFilter();
    paintStats();
    paintList();
    paintReview();
    paintButtons();
    App.renderStatusBar();
  }

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.onclick = () => {
      filter = button.dataset.filter;
      subject = "";
      paint();
    };
  });
  document.getElementById("bib-search").oninput = (event) => {
    query = event.target.value.trim().toLowerCase();
    paintList();
  };
  paint();
}

function libraryStat(value, label) {
  return `<div class="card stat"><span class="value">${value}</span><span class="label">${label}</span></div>`;
}

window.initBiblioteca = initBiblioteca;
