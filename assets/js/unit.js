// Jornada pedagógica das unidades publicadas em Hoje.
(function () {
  const AFTER_VIDEO = new Set([
    "video_concluido",
    "checagem_em_andamento",
    "checagem_concluida",
    "pratica_em_andamento",
    "pratica_concluida",
    "correcao_pendente",
    "correcao_concluida",
    "revisao_agendada",
    "concluida",
  ]);

  const verifiedVideo = (unit, data) => {
    const video = unit.video || {};
    const lesson = (data.aulas?.aulas || []).find(
      (item) => item.id === video.aulaId,
    );
    const objectives = new Set(video.objetivosCobertos || []);
    const duration = video.duracaoTotalSegundos ?? lesson?.duracaoTotalSegundos;
    let canonicalId = null;
    try {
      const url = new URL(lesson?.url || "");
      if (/^(www\.)?youtube\.com$/.test(url.hostname) && url.pathname === "/watch")
        canonicalId = url.searchParams.get("v");
    } catch {}
    return lesson &&
      lesson.tipo === "video" &&
      /^[\w-]{11}$/.test(lesson.videoId || "") &&
      canonicalId === lesson.videoId &&
      lesson.canal && lesson.tituloYoutube && lesson.verificadoEm &&
      video.fonteVerificada === true &&
      video.coberturaPedagogicaVerificada === true &&
      video.statusVerificacao === "aprovado" &&
      video.motivoSelecao && video.fonte && video.fonteUrl && video.verificadoEm &&
      Number.isFinite(video.inicioSegundos) &&
      Number.isFinite(video.fimSegundos) &&
      Number.isFinite(duration) &&
      video.inicioSegundos >= 0 &&
      video.fimSegundos > video.inicioSegundos &&
      video.fimSegundos <= duration &&
      (unit.objetivos || []).every((objective) => objectives.has(objective))
      ? { ...video, videoId: lesson.videoId }
      : null;
  };

  const locked = (title, message) => `<section class="unit-step is-locked">
    <span class="unit-lock-icon" aria-hidden="true">🔒</span><div><h4>${App.esc(title)}</h4><p data-lock-message>${App.esc(message)}</p></div>
  </section>`;

  const cleanupTasks = new Set();
  const restoredReadings = new Set();

  const UnitFlow = {
    async load(unitId) {
      this.dataPromise ||= App.loadJSON("data/unidades.json");
      const data = await this.dataPromise;
      return (data.unidades || []).find((unit) => unit.id === unitId) || null;
    },

    cleanup() {
      cleanupTasks.forEach((cleanup) => cleanup());
      cleanupTasks.clear();
    },

    render({ unit, task, entry, data, firstPending }) {
      const progress = Storage.getUnitProgress(unit.id);
      const state = progress.state;
      const entryKey = `${entry?.scheduleDate || "unit"}_${entry?.index ?? 0}`;
      const active = firstPending == null || firstPending === `unit:${entryKey}` || state === "concluida";
      const header = `<div class="task-title"><div><p class="eyebrow">Unidade piloto</p><h3>${App.esc(task.materia)} — ${App.esc(task.assunto)}</h3></div><span>${App.esc(unit.leitura?.tempoMinutos || 0)} min de leitura</span></div>`;
      if (!active)
        return `<article class="card study-task unit-flow" data-unit-id="${App.esc(unit.id)}" data-unit-entry="${App.esc(entryKey)}">${header}
          ${locked("Leitura guiada", "Conclua a unidade anterior para desbloquear.")}
          ${locked("Videoaula", "Conclua a unidade anterior para desbloquear.")}
          ${locked("Checagem rápida", "Conclua a unidade anterior para desbloquear.")}
          ${locked("Questões reais", "Conclua a unidade anterior para desbloquear.")}
          ${locked("Correção e revisão", "Conclua a unidade anterior para desbloquear.")}
        </article>`;
      const video = verifiedVideo(unit, data);
      const readingStarted = state !== "nao_iniciada";
      const readingDone = !["nao_iniciada", "leitura_em_andamento"].includes(state);
      const videoStarted = state === "video_em_andamento" || AFTER_VIDEO.has(state);
      const videoDone = AFTER_VIDEO.has(state);
      const readingSections = readingStarted
        ? `<p class="unit-resume">${state === "leitura_em_andamento" ? "Continue a leitura de onde parou." : "Leitura concluída."}</p>
          ${progress.reading.sectionId ? `<p class="muted">Retomada: ${App.esc((unit.leitura?.secoes || []).find(({ id }) => id === progress.reading.sectionId)?.titulo || progress.reading.sectionId)}</p>` : ""}
          ${(unit.leitura?.secoes || []).map((section) => `<section class="unit-reading-section" id="${App.esc(section.id)}" data-reading-section tabindex="0"><h4>${App.esc(section.titulo)}</h4><p>${App.esc(section.conteudo)}</p></section>`).join("")}
          ${this.readingSupport(unit.leitura)}`
        : `<p>${App.esc(unit.leitura?.tempoMinutos || 0)} minutos de leitura guiada dentro do portal.</p>`;
      const readingAction = state === "nao_iniciada"
        ? '<button class="btn" type="button" data-primary-action data-unit-event="iniciar_leitura">Começar leitura</button>'
        : state === "leitura_em_andamento"
          ? '<button class="btn" type="button" data-primary-action data-unit-event="concluir_leitura">Concluir leitura</button>'
          : "";

      let videoHtml;
      if (!readingDone)
        videoHtml = locked("Videoaula", "Conclua a leitura para desbloquear a videoaula.");
      else if (!video)
        videoHtml = `<section class="unit-step is-pending"><h4>Videoaula</h4><p class="alert alert-info">Videoaula pendente de validação</p><p class="muted" data-lesson-unavailable>Videoaula ainda não disponível</p><p class="muted">Nenhum vídeo será aberto até a cobertura pedagógica e o trecho serem confirmados.</p></section>`;
      else if (!videoStarted)
        videoHtml = `<section class="unit-step"><h4>Videoaula</h4><p>Trecho verificado e alinhado aos objetivos da unidade.</p><button class="btn" type="button" data-primary-action data-unit-event="iniciar_video">Assistir videoaula</button></section>`;
      else
        videoHtml = `<section class="unit-step"><h4>Videoaula</h4><div class="unit-video"><iframe src="https://www.youtube.com/embed/${video.videoId}?start=${video.inicioSegundos}&end=${video.fimSegundos}&rel=0" title="Videoaula: ${App.esc(unit.titulo)}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${state === "video_em_andamento" ? '<button class="btn" type="button" data-primary-action data-unit-event="concluir_video">Concluir videoaula</button>' : '<p class="unit-resume">Videoaula concluída.</p>'}</section>`;

      const nextRequirement = videoDone
        ? "A integração desta etapa será apresentada na sequência."
        : video
          ? "Conclua a videoaula para desbloquear."
          : "Aguarde a validação da videoaula para desbloquear.";
      return `<article class="card study-task unit-flow" data-unit-id="${App.esc(unit.id)}" data-unit-entry="${App.esc(entryKey)}">
        ${header}
        <section class="unit-step ${readingDone ? "is-done" : ""}"><h4>Leitura guiada</h4>${readingSections}${readingAction}</section>
        ${videoHtml}
        ${locked("Checagem rápida", nextRequirement)}
        ${locked("Questões reais", nextRequirement)}
        ${locked("Correção e revisão", "Conclua as etapas anteriores para desbloquear.")}
      </article>`;
    },

    readingSupport(reading = {}) {
      const list = (title, label, items) => items?.length
        ? `<section><h4>${title}</h4><ul aria-label="${label}">${items.map((item) => `<li>${App.esc(item)}</li>`).join("")}</ul></section>`
        : "";
      const sources = (reading.fontes || []).filter(({ verificada, url }) => verificada === true && App.isExternal(url));
      return `${list("Pontos-chave", "Pontos-chave", reading.pontosChave)}${list("Armadilhas de banca", "Armadilhas de banca", reading.armadilhasDeBanca)}${sources.length ? `<section><h4>Fontes</h4><ul aria-label="Fontes da leitura">${sources.map((source) => `<li><a ${App.linkAttrs(source.url)}>${App.esc(source.titulo)}</a></li>`).join("")}</ul></section>` : ""}`;
    },

    bind({ unit, entry, rerender }) {
      const entryKey = `${entry?.scheduleDate || "unit"}_${entry?.index ?? 0}`;
      const root = document.querySelector(`[data-unit-id="${CSS.escape(unit.id)}"][data-unit-entry="${CSS.escape(entryKey)}"]`);
      root?.querySelectorAll("[data-reading-section]").forEach((section) => {
        const saveSection = () => Storage.setUnitReadingSection(unit.id, section.id);
        section.addEventListener("focus", saveSection);
        cleanupTasks.add(() => section.removeEventListener("focus", saveSection));
      });
      const sections = [...(root?.querySelectorAll("[data-reading-section]") || [])];
      if (sections.length && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
          if (!entries.some(({ isIntersecting }) => isIntersecting)) return;
          const visible = sections.filter((section) => {
            const box = section.getBoundingClientRect();
            return box.bottom > 0 && box.top < innerHeight;
          }).sort((a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top))[0];
          if (visible) Storage.setUnitReadingSection(unit.id, visible.id);
        }, { threshold: [0.25, 0.6] });
        sections.forEach((section) => observer.observe(section));
        cleanupTasks.add(() => observer.disconnect());
      } else if (sections.length) {
        const track = () => {
          if (!root.isConnected) return window.removeEventListener("scroll", track);
          const visible = sections.filter((section) => {
            const box = section.getBoundingClientRect();
            return box.bottom > 0 && box.top < innerHeight;
          }).sort((a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top))[0];
          if (visible) Storage.setUnitReadingSection(unit.id, visible.id);
        };
        window.addEventListener("scroll", track, { passive: true });
        cleanupTasks.add(() => window.removeEventListener("scroll", track));
      }
      const progress = Storage.getUnitProgress(unit.id);
      const savedSection = progress.reading.sectionId;
      const restoreKey = `${unit.id}:${entryKey}`;
      if (progress.state === "leitura_em_andamento" && savedSection && !restoredReadings.has(restoreKey)) {
        restoredReadings.add(restoreKey);
        requestAnimationFrame(() => root?.querySelector(`#${CSS.escape(savedSection)}`)?.scrollIntoView());
      }
      const button = root?.querySelector("[data-unit-event]");
      if (!button) return;
      button.onclick = () => {
        const result = Storage.transitionUnit(unit.id, button.dataset.unitEvent);
        if (result.ok) {
          UnitFlow.cleanup();
          rerender();
        }
      };
    },
  };

  window.UnitFlow = UnitFlow;
})();
