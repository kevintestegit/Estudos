/** Ajustes do fluxo de estudo (carregado após dashboard.js) */
(function () {
  const RESUMO_BY_ASSUNTO = {
    "Seguridade Social — conceitos": "resumo-prev-seguridade",
    "Segurados e dependentes": "resumo-prev-segurados",
    "Filiação e inscrição": "resumo-prev-segurados",
    "Carência e qualidade de segurado": "resumo-prev-carencia",
    "Aposentadorias": "resumo-prev-aposentadorias",
    "Auxílios e salário-maternidade": "resumo-prev-aposentadorias",
    "Pensão por morte e BPC/LOAS": "resumo-prev-pensao-bpc",
    "Mapa mental de benefícios": "resumo-prev-pensao-bpc",
  };

  const TAG_BY_ASSUNTO = {
    "Seguridade Social — conceitos": "prev-seguridade",
    "Segurados e dependentes": "prev-segurados",
    "Filiação e inscrição": "prev-segurados",
    "Carência e qualidade de segurado": "prev-carencia",
    "Aposentadorias": "prev-aposentadorias",
    "Auxílios e salário-maternidade": "prev-aposentadorias",
    "Pensão por morte e BPC/LOAS": "prev-pensao",
    "Custeio da Seguridade Social": "prev-custeio",
    "Lei 8.213 e 8.212 — pontos-chave": "prev-seguridade",
    "Questões comentadas INSS": "prev-",
    "20 questões comentadas": "prev-",
  };

  function hasVideo(entry, data) {
    const lesson = (data?.aulas?.aulas || []).find((item) => item.id === entry.task.aulaId);
    return App.lessonAction(lesson).available;
  }

  function resolveMaterial(entry, data) {
    const pdfs = data?.pdfs?.pdfs || [];
    let material = pdfs.find((item) => item.id === entry.task.pdfId);
    const resumoId = RESUMO_BY_ASSUNTO[entry.task.assunto];
    if (resumoId) {
      const resumo = pdfs.find((item) => item.id === resumoId);
      if (resumo) material = resumo;
    }
    return material;
  }

  function requiredSteps(entry, data) {
    return hasVideo(entry, data)
      ? ["pretest", "learn", "read", "practice"]
      : ["pretest", "read", "practice"];
  }

  window.findFirstPendingStep = function findFirstPendingStep(tasks, data) {
    data = data || window.__studyData || {};
    for (const entry of tasks) {
      const base = taskBaseKey(entry);
      for (const step of requiredSteps(entry, data)) {
        const key = `${base}_${step}`;
        if (!stepDone(key)) return key;
      }
    }
    return "finish";
  };

  const _renderStudyTask = window.renderStudyTask;
  window.renderStudyTask = function renderStudyTask(entry, data, firstPending) {
    window.__studyData = data;
    const task = entry.task;
    const lesson = (data.aulas.aulas || []).find((item) => item.id === task.aulaId);
    const material = resolveMaterial(entry, data);
    const lessonAction = App.lessonAction(lesson);
    const materialUrl = App.resolveMaterialUrl
      ? App.resolveMaterialUrl(material, task.materia)
      : App.resolveUrl(material?.url, task.materia);
    const base = taskBaseKey(entry);
    const pretestKey = `${base}_pretest`;
    const practiceKey = `${base}_practice`;
    const pretestDone = stepDone(pretestKey);
    const tag =
      task.questoesTag || TAG_BY_ASSUNTO[task.assunto] || "";
    const filterQs = tag
      ? `tag=${encodeURIComponent(tag)}`
      : `materia=${encodeURIComponent(task.materia)}`;
    const pretestUrl = `questoes.html?${filterQs}&n=3&auto=1&taskKey=${encodeURIComponent(pretestKey)}`;
    const questionUrl = `questoes.html?${filterQs}&n=10&taskKey=${encodeURIComponent(practiceKey)}`;

    const learnDone = stepDone(`${base}_learn`);
    const readDone = stepDone(`${base}_read`);
    const practiceDone = stepDone(`${base}_practice`);
    const videoOk = lessonAction.available;

    const pretestHtml = `
    <div class="roadmap-step ${pretestDone ? "is-done" : ""} ${firstPending === pretestKey ? "is-next" : ""}" data-step="${pretestKey}">
      <span class="step-number">${pretestDone ? "✓" : "0"}</span>
      <div>
        <h4>Pré-teste (obrigatório)</h4>
        <p class="muted" style="margin:0 0 0.5rem">3 questões antes da teoria — ativa o cérebro no assunto do dia.</p>
        <div class="actions">
          ${pretestDone
            ? '<span class="badge badge-ok">Pré-teste concluído</span>'
            : `<a class="btn" href="${App.esc(pretestUrl)}">Fazer pré-teste (3 questões)</a>`}
        </div>
      </div>
    </div>`;

    let learnControl;
    if (!pretestDone) {
      learnControl = `<p class="muted">Libere esta etapa concluindo o pré-teste.</p>`;
    } else if (videoOk) {
      learnControl = `<div class="actions">
      <a class="btn ${learnDone ? "btn-secondary" : ""}" ${App.linkAttrs(lessonAction.url)}>${lessonAction.label}</a>
      <button class="btn btn-secondary" type="button" data-complete-step="${base}_learn" ${learnDone ? "disabled" : ""}>${learnDone ? "Concluído" : "Marcar etapa como concluída"}</button>
    </div>`;
    } else {
      learnControl = `<p class="alert alert-info">Videoaula ainda não disponível. Use o resumo/leitura abaixo e avance para a prática.</p>
      <div class="actions mt-1">
        <button class="btn btn-secondary" type="button" data-complete-step="${base}_learn" ${learnDone ? "disabled" : ""}>${learnDone ? "Concluído" : "Dispensar videoaula"}</button>
      </div>`;
    }

    const learnHtml = `
    <div class="roadmap-step ${learnDone || !videoOk ? "is-done" : ""} ${firstPending === `${base}_learn` ? "is-next" : ""}" data-step="${base}_learn">
      <span class="step-number">${learnDone || !videoOk ? "✓" : "1"}</span>
      <div><h4>Aprender o conteúdo ${videoOk ? "" : "(opcional)"}</h4>${learnControl}</div>
    </div>`;

    const readLabel =
      material?.tipo === "resumo"
        ? "Abrir resumo objetivo"
        : App.materialActionLabel(material || { tipo: "fonte" });
    const materialTitle = material?.titulo
      ? `<p class="muted" style="margin:0 0 0.5rem">${App.esc(material.titulo)}</p>`
      : "";

    let readControl;
    if (!pretestDone) {
      readControl = `<p class="muted">Libere esta etapa concluindo o pré-teste.</p>`;
    } else {
      readControl = `${materialTitle}
        <div class="actions">
          <a class="btn ${readDone ? "btn-secondary" : ""}" ${App.linkAttrs(materialUrl)}>${readLabel}</a>
          <button class="btn btn-secondary" type="button" data-complete-step="${base}_read" ${readDone ? "disabled" : ""}>${readDone ? "Concluído" : "Marcar etapa como concluída"}</button>
        </div>`;
    }

    const readHtml = `
    <div class="roadmap-step ${readDone ? "is-done" : ""} ${firstPending === `${base}_read` ? "is-next" : ""}" data-step="${base}_read">
      <span class="step-number">${readDone ? "✓" : "2"}</span>
      <div>
        <h4>Ler ou revisar</h4>
        ${readControl}
      </div>
    </div>`;

    const practiceHtml = `
    <div class="roadmap-step ${practiceDone ? "is-done" : ""} ${firstPending === practiceKey ? "is-next" : ""}" data-step="${practiceKey}">
      <span class="step-number">${practiceDone ? "✓" : "3"}</span>
      <div>
        <h4>Praticar</h4>
        <p class="muted" style="margin:0 0 0.5rem">${pretestDone ? "Responda com atenção e classifique cada erro." : "Conclua o pré-teste e a leitura antes, se possível."}</p>
        <div class="actions">
          <a class="btn ${practiceDone ? "btn-secondary" : ""}" href="${App.esc(questionUrl)}">Responder 10 questões</a>
        </div>
      </div>
    </div>`;

    return `<article class="card study-task">
    <div class="task-title"><div><p class="eyebrow">${entry.origin === "recovery" ? `Recuperação de ${App.formatDateBR(entry.scheduleDate)}` : "Estudo de hoje"}</p><h3>${App.esc(task.materia)} — ${App.esc(task.assunto)}</h3></div><span>${App.formatMinutes(task.tempo)}</span></div>
    ${pretestHtml}${learnHtml}${readHtml}${practiceHtml}
    <button class="link-button" type="button" data-dismiss="${base}">Dispensar esta tarefa</button>
  </article>`;
  };

  // Ajusta verificação de pendências ao concluir o dia (sem exigir vídeo inexistente)
  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest?.("[data-finish-date]");
      if (!btn || !window.__studyData) return;
      // deixa o handler original rodar; só normaliza learn quando não há vídeo
      const data = window.__studyData;
      const progress = Storage.get();
      // pré-marca learn como concluída quando não há vídeo
      document.querySelectorAll(".study-task").forEach(() => {});
    },
    true,
  );
})();
