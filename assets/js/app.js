// Portal Estudos — shell compartilhado
const App = {
  cache: {},
  async loadJSON(path) {
    if (this.cache[path]) return this.cache[path];
    const r = await fetch(path);
    if (!r.ok) throw new Error("Falha ao carregar " + path);
    let d = await r.json();
    if (path.includes("questoes-")) d = this.cleanQuestions(d);
    this.cache[path] = d;
    return d;
  },
  cleanQuestions(d) {
    if (!d || !Array.isArray(d.questoes)) return d;
    const c = (v) =>
      String(v ?? "")
        .split(/===\s*PAGE\s*\d+\s*===/i)[0]
        .replace(/\u0000/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    return {
      ...d,
      questoes: d.questoes.map((q) => ({
        ...q,
        enunciado: c(q.enunciado),
        trechoContexto: c(q.trechoContexto),
        alternativas: Array.isArray(q.alternativas)
          ? q.alternativas.map(c)
          : q.alternativas,
        comentario: c(q.comentario),
      })),
    };
  },
  initShell(active) {
    const p = Storage.get();
    if (p.startDate) this.markMissedDays();
    const nav = document.querySelector(".nav");
    if (nav) nav.innerHTML = this.navigationHtml();
    document
      .querySelectorAll("[data-nav]")
      .forEach((e) => {
        if (e.getAttribute("data-nav") !== active) return;
        e.classList.add("active");
        e.setAttribute("aria-current", "page");
        const group = e.closest("details.nav-group");
        if (group) group.classList.add("has-active");
      });
    if (nav) this.bindNavDropdowns(nav);
    const root = document.getElementById("app-root");
    if (root && !document.querySelector(".skip-link")) {
      root.tabIndex = -1;
      document.body.insertAdjacentHTML(
        "afterbegin",
        '<a class="skip-link" href="#app-root">Ir para o conteúdo</a>',
      );
    }
    const b = document.getElementById("menu-toggle"),
      s = document.getElementById("sidebar");
    if (b && s) {
      b.setAttribute("aria-controls", "sidebar");
      b.setAttribute("aria-expanded", "false");
      b.onclick = () => {
        const open = s.classList.toggle("open");
        b.setAttribute("aria-expanded", String(open));
      };
      s.querySelectorAll("a").forEach(
        (link) =>
          (link.onclick = () => {
            s.classList.remove("open");
            b.setAttribute("aria-expanded", "false");
          }),
      );
    }
    this.renderStatusBar();
  },
  bindNavDropdowns(nav) {
    const groups = [...nav.querySelectorAll("details.nav-group")];
    const closeAll = (except) => {
      groups.forEach((g) => {
        if (g !== except) g.open = false;
      });
    };
    groups.forEach((group) => {
      group.addEventListener("toggle", () => {
        if (group.open) closeAll(group);
      });
    });
    if (!this._navDropdownOutsideBound) {
      this._navDropdownOutsideBound = true;
      document.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.closest && t.closest("details.nav-group")) return;
        document
          .querySelectorAll("details.nav-group[open]")
          .forEach((g) => {
            g.open = false;
          });
      });
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        document
          .querySelectorAll("details.nav-group[open]")
          .forEach((g) => {
            g.open = false;
          });
      });
    }
  },
  navigationHtml() {
    return [
      `<a class="nav-today" href="hoje.html" data-nav="hoje">Hoje</a>`,
      `<details class="nav-group"><summary>Meu plano</summary><div class="nav-dropdown" role="menu"><a href="cronograma.html" data-nav="cronograma" role="menuitem">Cronograma</a><a href="materias.html" data-nav="materias" role="menuitem">Matérias</a><a href="edital.html" data-nav="edital" role="menuitem">Edital</a></div></details>`,
      `<details class="nav-group"><summary>Questões</summary><div class="nav-dropdown" role="menu"><a href="questoes.html" data-nav="questoes" role="menuitem">Questionários</a><a href="simulados.html" data-nav="simulados" role="menuitem">Simulados</a><a href="provas.html" data-nav="provas" role="menuitem">Provas</a><a href="flashcards.html" data-nav="flashcards" role="menuitem">Flashcards</a><a href="caderno-erros.html" data-nav="erros" role="menuitem">Caderno de erros</a></div></details>`,
      `<a href="progresso.html" data-nav="progresso">Meu progresso</a>`,
      `<details class="nav-group"><summary>Mais</summary><div class="nav-dropdown" role="menu"><a href="index.html" data-nav="dashboard" role="menuitem">Dashboard</a><a href="biblioteca.html" data-nav="biblioteca" role="menuitem">Biblioteca</a><a href="backup.html" data-nav="backup" role="menuitem">Backup</a></div></details>`,
    ].join("");
  },
  markMissedDays() {
    const p = Storage.get();
    if (!p.startDate) return;
    plannedPastDates(p).forEach((date) => {
      const status = getDayStatus(date, p);
      if (p.dayStatus[date] !== status) Storage.setDayStatus(date, status);
    });
  },
  getScheduleDayIndex(p, c, date = todayISO()) {
    if (!p.startDate) return 0;
    const before = countStudyDatesBefore(p.startDate, date, p),
      study = isStudyDate(date, p);
    return Math.max(
      0,
      Math.min(
        (c.days || []).length - 1,
        study ? before : Math.max(0, before - 1),
      ),
    );
  },
  getTodayPlan(c, p) {
    const days = c.days || [];
    if (!p.startDate)
      return {
        index: 0,
        day: null,
        nextDay: days[0] || null,
        recovery: [],
        notStarted: true,
        isRestDay: false,
      };
    const today = todayISO(),
      before = countStudyDatesBefore(p.startDate, today, p),
      rest = !isStudyDate(today, p),
      index = this.getScheduleDayIndex(p, c, today),
      day = rest || today < p.startDate ? null : days[index] || null,
      nextIndex = today < p.startDate ? 0 : rest ? before : index + 1;
    return {
      index,
      day,
      nextDay: days[Math.min(nextIndex, days.length - 1)] || null,
      recovery: this.getRecoveryQueue(p, c),
      notStarted: false,
      isRestDay: rest,
      beforeStart: today < p.startDate,
    };
  },
  getRecoveryQueue(p, c) {
    if (!p.startDate) return [];
    const q = [];
    plannedPastDates(p).forEach((date) => {
      const st = getDayStatus(date, p);
      if (["faltou", "parcial", "atrasada", "pendente"].includes(st)) {
        const i = countStudyDatesBefore(p.startDate, date, p),
          day = (c.days || [])[i];
        if (day) q.push({ date, dayIndex: i, day, status: st });
      }
    });
    return q;
  },
  statusLabel(s) {
    return (
      {
        pendente: "Pendente",
        em_andamento: "Em andamento",
        parcial: "Parcial",
        concluido: "Concluído",
        faltou: "Faltou",
        recuperado: "Recuperado",
        atrasada: "Atrasada",
      }[s] || s
    );
  },
  studyStatus(p, c) {
    if (!p.startDate)
      return {
        code: "nao_iniciado",
        message: "Plano ainda não iniciado",
        recoveryCount: 0,
      };
    const t = todayISO();
    if (t < p.startDate)
      return {
        code: "aguardando",
        message: `O plano começa em ${this.formatDateBR(p.startDate)}`,
        recoveryCount: 0,
      };
    const rec = this.getRecoveryQueue(p, c),
      prev = previousStudyDate(t, p),
      ps = getDayStatus(prev, p, t),
      ts = getDayStatus(t, p, t);
    if (ps === "parcial") {
      const a = getDayActivity(prev, p);
      return {
        code: "parcial",
        message: `Você estudou ${a.minutes} minutos no último dia de estudo, mas não concluiu todas as tarefas.`,
        recoveryCount: rec.length,
      };
    }
    if (ps === "faltou")
      return {
        code: "faltou_ontem",
        message:
          daysBetween(prev, t) === 1
            ? "Você faltou ontem"
            : "Você faltou no último dia de estudo",
        recoveryCount: rec.length,
      };
    if (rec.length)
      return {
        code: "atrasada",
        message: `Há ${rec.length} dia(s) para retomar`,
        recoveryCount: rec.length,
      };
    if (!isStudyDate(t, p))
      return {
        code: "descanso",
        message: "Dia de descanso — revisão opcional",
        recoveryCount: 0,
      };
    if (ts === "concluido")
      return {
        code: "em_dia",
        message: "Em dia — hoje concluído",
        recoveryCount: 0,
      };
    return {
      code: "em_dia",
      message: ts === "em_andamento" ? "Estudo de hoje em andamento" : "Em dia",
      recoveryCount: 0,
    };
  },
  nextAction(p, c) {
    if (!p.startDate) return "Definir a data de início do plano";
    const due = typeof getDueErros === "function" ? getDueErros(p) : [];
    if (due.length)
      return `Revisar ${due.length} erro(s) vencido(s) no Caderno de erros`;
    const s = this.studyStatus(p, c);
    if (s.code === "aguardando")
      return `Aguardar o início em ${this.formatDateBR(p.startDate)}`;
    if (s.code === "faltou_ontem")
      return "Recuperar o último dia perdido ou mesclar as tarefas com hoje";
    if (s.recoveryCount) return `Recuperar ${s.recoveryCount} dia(s) em atraso`;
    if (s.code === "descanso") return "Descansar ou fazer uma revisão leve";
    const plan = this.getTodayPlan(c, p);
    if (!plan.day) return "Revisar o caderno de erros e fazer questões";
    if (p.dayStatus[todayISO()] === "concluido")
      return "Revisar erros ou fazer um simulado curto";
    return `Estudar: ${plan.day.titulo || plan.day.tasks?.[0]?.assunto || "plano do dia"}`;
  },
  motivationMessage(s) {
    if (s.sequenciaAtual >= 7) return "Sequência sólida. Mantenha o ritmo.";
    if (s.percentualAcertos >= 70 && s.questoesResolvidas >= 20)
      return "Bom aproveitamento. Priorize os assuntos mais fracos.";
    if (s.diasFaltados > 0)
      return "Recupere um bloco por vez sem abandonar o plano de hoje.";
    if (!s.diasEstudados)
      return "Comece pela primeira tarefa e registre o tempo real.";
    return "Foque no plano de hoje. Depois, faça questões.";
  },
  ACHIEVEMENTS: {
    "first-day": "Primeiro dia",
    "streak-3": "3 dias seguidos",
    "streak-7": "7 dias seguidos",
    q50: "50 questões",
    q100: "100 questões",
    sim1: "1º simulado",
    hours10: "10 horas",
    level5: "Nível 5",
  },
  renderStatusBar() {
    const e = document.getElementById("status-bar");
    if (!e) return;
    e.setAttribute("role", "status");
    e.setAttribute("aria-live", "polite");
    const p = Storage.get(),
      s = computeStats(p);
    e.innerHTML = p.startDate
      ? `<span>Nível ${s.nivel}</span><span>${s.sequenciaAtual} dias seguidos</span><span>${s.percentualAcertos}% de acertos</span>`
      : "<span>Plano não iniciado</span>";
  },
  planSetupHtml(title = "Iniciar plano de estudos") {
    const labels = [
      [0, "Dom"],
      [1, "Seg"],
      [2, "Ter"],
      [3, "Qua"],
      [4, "Qui"],
      [5, "Sex"],
      [6, "Sáb"],
    ];
    return `<div class="card mb-1" id="plan-setup"><h2>${this.esc(title)}</h2><p class="muted">Faltas só começam a contar depois do início. Dias não selecionados são descanso.</p><div class="form-row plan-date"><label for="plan-start-date">Data de início</label><input id="plan-start-date" type="date" value="${todayISO()}"><p class="alert alert-info hidden" id="start-date-adjustment"></p></div><fieldset class="card"><legend><strong>Dias de estudo</strong></legend><div class="actions">${labels.map(([v, l]) => `<label class="check-label"><input type="checkbox" data-study-day value="${v}" ${v >= 1 ? "checked" : ""}> ${l}</label>`).join("")}</div></fieldset><button class="btn mt-1" id="btn-start-plan">Iniciar meu plano de estudos</button></div>`;
  },
  bindPlanSetup(done) {
    const b = document.getElementById("btn-start-plan"),
      input = document.getElementById("plan-start-date"),
      checks = [...document.querySelectorAll("[data-study-day]")],
      notice = document.getElementById("start-date-adjustment");
    if (!b) return;
    const values = () =>
        checks.filter((e) => e.checked).map((e) => Number(e.value)),
      paint = () => {
        const chosen = input?.value,
          normalized = normalizeStartDate(chosen, values());
        if (!notice) return;
        notice.classList.toggle("hidden", !chosen || chosen === normalized);
        notice.textContent =
          chosen && chosen !== normalized
            ? `A data escolhida não é um dia de estudo. O plano começará em ${this.formatDateBR(normalized)}.`
            : "";
      };
    input?.addEventListener("change", paint);
    checks.forEach((e) => e.addEventListener("change", paint));
    paint();
    b.onclick = () => {
      const startDate = input?.value,
        studyDays = values();
      if (!startDate) return alert("Informe a data de início.");
      if (!studyDays.length) return alert("Selecione ao menos um dia.");
      Storage.startPlan({ startDate, studyDays });
      done ? done() : location.reload();
    };
  },
  formatDateBR(i) {
    if (!i) return "—";
    const [y, m, d] = i.split("-");
    return `${d}/${m}/${y}`;
  },
  formatMinutes(min) {
    const m = Number(min) || 0,
      h = Math.floor(m / 60),
      r = m % 60;
    return h ? `${h}h ${r}min` : `${r} min`;
  },
  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  },
  MATERIA_URL: {
    Português:
      "https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf",
    "Língua Portuguesa":
      "https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf",
    "Redação Oficial":
      "https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf",
    Ética: "https://www.planalto.gov.br/ccivil_03/decreto/d1171.htm",
    "Ética no Serviço Público":
      "https://www.planalto.gov.br/ccivil_03/decreto/d1171.htm",
    "Direito Constitucional":
      "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
    "Direito Administrativo":
      "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm",
    "Direito Previdenciário":
      "https://www.planalto.gov.br/ccivil_03/leis/l8213compilado.htm",
    "Assistência Social / BPC":
      "https://www.planalto.gov.br/ccivil_03/leis/l8742.htm",
    "Legislação PRF": "https://www.planalto.gov.br/ccivil_03/decreto/d1655.htm",
    "Legislação institucional da PRF":
      "https://www.planalto.gov.br/ccivil_03/decreto/d1655.htm",
    Arquivologia:
      "https://www.gov.br/arquivonacional/pt-br/servicos/publicacoes/Guiadegestaodedocumentos.pdf",
    "Noções de Administração":
      "https://repositorio.enap.gov.br/bitstream/1/2260/1/1.%20Apostila%20-%20M%C3%B3dulo%201%20-%20Administra%C3%A7%C3%A3o%20P%C3%BAblica.pdf",
    Informática: "https://www.gov.br/governodigital/pt-br",
    "Raciocínio Lógico": "questoes.html?materia=Racioc%C3%ADnio%20L%C3%B3gico",
    Revisão: "caderno-erros.html",
    Simulado: "simulados.html",
    Questões: "questoes.html",
    Prova: "provas.html",
    "Caderno de erros": "caderno-erros.html",
    Preparação: "hoje.html",
  },
  lessonAction(lesson) {
    if (lesson?.tipo === "video" && lesson.url)
      return { available: true, label: "Assistir videoaula", url: lesson.url };
    if (lesson?.tipo === "playlist" && lesson.url)
      return { available: true, label: "Abrir playlist", url: lesson.url };
    return { available: false, label: "Videoaula ainda não disponível", url: null };
  },
  lessonActionHtml(lesson, attributes = "") {
    const action = this.lessonAction(lesson);
    return action.available
      ? `<a class="btn btn-sm" ${this.linkAttrs(action.url)} ${attributes}>${action.label}</a>`
      : `<span class="alert alert-info" data-lesson-unavailable>${action.label}</span>`;
  },
  /**
   * Resolve URL de material de estudo.
   * - Se o item existe e tem URL útil (não biblioteca genérica / indisponível), usa essa URL.
   * - Caso contrário, cai na fonte oficial da matéria (MATERIA_URL).
   */
  resolveMaterialUrl(material, materia) {
    const url = material?.url || "";
    const tipo = material?.tipo || "";
    const isLibraryFallback =
      !url ||
      url === "#" ||
      tipo === "indisponivel" ||
      /^biblioteca\.html/i.test(url);
    if (!isLibraryFallback) return url;
    return this.MATERIA_URL[materia] || this.MATERIA_URL[material?.materia] || "questoes.html";
  },
  resolveUrl(u, m) {
    return u && u !== "#" && !/^biblioteca\.html/i.test(u)
      ? u
      : this.MATERIA_URL[m] || "questoes.html";
  },
  isExternal(u) {
    return /^https?:\/\//i.test(u || "");
  },
  linkAttrs(u) {
    return this.isExternal(u)
      ? `href="${this.esc(u)}" target="_blank" rel="noopener noreferrer"`
      : `href="${this.esc(u)}"`;
  },
  materialActionLabel(item) {
    const type = item?.tipo || "";
    if (type === "aula") return "Assistir aula";
    if (type === "pdf") return "Abrir PDF";
    if (type === "legislacao") return "Consultar legislação";
    if (type === "questoes") return "Fazer questões";
    if (type === "indisponivel") return "Consultar fonte oficial";
    return "Consultar fonte oficial";
  },
};
window.Modal = (() => {
  const m = {};
  m.init = () => {
    if (document.getElementById("modal-overlay")) return;
    const el = document.createElement("div");
    el.id = "modal-overlay";
    el.className = "modal-overlay hidden";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "modal-title");
    el.onclick = (e) => {
      if (e.target === el) m.dismiss();
    };
    el.innerHTML =
      '<div class="modal-box"><h3 id="modal-title"></h3><div id="modal-body"></div><div class="modal-actions" id="modal-actions"></div></div>';
    document.body.appendChild(el);
    m.title = document.getElementById("modal-title");
    m.body = document.getElementById("modal-body");
    m.actions = document.getElementById("modal-actions");
    m.el = el;
    document.addEventListener("keydown", (e) => {
      if (m.el?.classList.contains("hidden")) return;
      if (e.key === "Escape") {
        m.dismiss();
        return;
      }
      if (e.key === "Tab") {
        const focusable = [
            ...m.el.querySelectorAll(
              'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
            ),
          ],
          first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  };
  m.show = (title, bodyHTML, buttons) => {
    m.init();
    m.previousFocus = document.activeElement;
    m.title.textContent = title;
    m.body.innerHTML = bodyHTML;
    m.actions.innerHTML = buttons
      .map(
        (b, i) =>
          `<button type="button" class="btn btn-sm ${b.accent || "btn-secondary"}" data-mb="${i}">${App.esc(b.label)}</button>`,
      )
      .join("");
    void m.el.offsetWidth;
    m.el.classList.remove("hidden");
    m.actions.querySelector("button")?.focus();
    return new Promise((resolve) => {
      m.resolve = resolve;
      m.actions.querySelectorAll("[data-mb]").forEach((b) => {
        b.onclick = () => {
          resolve(Number(b.dataset.mb));
          m.resolve = null;
          m.hide();
        };
      });
    });
  };
  m.alert = (msg) =>
    m
      .show("Aviso", `<p>${App.esc(msg)}</p>`, [
        { label: "OK", accent: "btn-accent" },
      ])
      .then(() => {});
  m.confirm = (msg) =>
    m
      .show("Confirmação", `<p>${App.esc(msg)}</p>`, [
        { label: "Cancelar" },
        { label: "Confirmar", accent: "btn-primary" },
      ])
      .then((r) => r === 1);
  m.dismiss = () => {
    m.resolve?.(0);
    m.resolve = null;
    m.hide();
  };
  m.hide = () => {
    if (!m.el || m.el.classList.contains("hidden")) return;
    if (m.el.classList.contains("is-leaving")) return;
    const finish = () => {
      m.el.classList.add("hidden");
      m.el.classList.remove("is-leaving");
      m.previousFocus?.focus?.();
    };
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      finish();
      return;
    }
    m.el.classList.add("is-leaving");
    const onEnd = (e) => {
      if (e.target !== m.el) return;
      m.el.removeEventListener("animationend", onEnd);
      clearTimeout(fallback);
      finish();
    };
    m.el.addEventListener("animationend", onEnd);
    const fallback = setTimeout(() => {
      m.el.removeEventListener("animationend", onEnd);
      finish();
    }, 220);
  };
  return m;
})();
window.alert = (...a) => window.Modal.alert(...a);
window.Modal.waitConfirm = (msg) => window.Modal.confirm(msg);
window.App = App;
if ("serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./service-worker.js").catch(console.warn),
  );
window.App = App;
