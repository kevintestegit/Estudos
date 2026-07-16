/** Ajustes do fluxo de estudo (carregado após dashboard.js) */
(function () {
  const RESUMO_BY_ASSUNTO = {
    "Seguridade Social — conceitos": "resumo-prev-seguridade",
    "Segurados e dependentes": "resumo-prev-segurados",
    "Filiação e inscrição": "resumo-prev-filiacao",
    "Carência e qualidade de segurado": "resumo-prev-carencia",
    "Aposentadorias": "resumo-prev-aposentadorias",
    "Auxílios e salário-maternidade": "resumo-prev-aposentadorias",
    "Pensão por morte e BPC/LOAS": "resumo-prev-pensao-bpc",
    "Mapa mental de benefícios": "resumo-prev-pensao-bpc",
    "Custeio da Seguridade Social": "resumo-prev-custeio",
    "Regras de transição": "resumo-prev-transicao",
    "Salário de contribuição": "resumo-prev-salario-contribuicao",
  };

  const TAG_BY_ASSUNTO = {
    "Seguridade Social — conceitos": "prev-seguridade",
    "Segurados e dependentes": "prev-segurados",
    "Filiação e inscrição": "prev-filiacao",
    "Carência e qualidade de segurado": "prev-carencia",
    "Aposentadorias": "prev-aposentadorias",
    "Auxílios e salário-maternidade": "prev-aposentadorias",
    "Pensão por morte e BPC/LOAS": "prev-pensao",
    "Custeio da Seguridade Social": "prev-custeio",
    "Lei 8.213 e 8.212 — pontos-chave": "prev-seguridade",
    "Questões comentadas INSS": "prev-",
    "20 questões comentadas": "prev-",
  };

  const RESUMOS = [
    {"id": "resumo-prev-seguridade", "titulo": "Resumo objetivo — Seguridade Social", "materia": "Direito Previdenciário", "topico": "Seguridade Social", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-seguridade.html", "tipo": "resumo"},
    {"id": "resumo-prev-segurados", "titulo": "Resumo objetivo — Segurados e dependentes", "materia": "Direito Previdenciário", "topico": "Segurados", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-segurados.html", "tipo": "resumo"},
    {"id": "resumo-prev-carencia", "titulo": "Resumo objetivo — Carência e qualidade de segurado", "materia": "Direito Previdenciário", "topico": "Carência", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-carencia.html", "tipo": "resumo"},
    {"id": "resumo-prev-aposentadorias", "titulo": "Resumo objetivo — Aposentadorias e incapacidade", "materia": "Direito Previdenciário", "topico": "Aposentadorias", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-aposentadorias.html", "tipo": "resumo"},
    {"id": "resumo-prev-pensao-bpc", "titulo": "Resumo objetivo — Pensão por morte e BPC", "materia": "Direito Previdenciário", "topico": "Pensão por morte", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-pensao-bpc.html", "tipo": "resumo"},
    {"id": "resumo-prev-custeio", "titulo": "Resumo objetivo — Custeio da Seguridade", "materia": "Direito Previdenciário", "topico": "Custeio", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-custeio.html", "tipo": "resumo"},
    {"id": "resumo-prev-transicao", "titulo": "Resumo objetivo — Regras de transição (EC 103)", "materia": "Direito Previdenciário", "topico": "EC 103/2019", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-transicao.html", "tipo": "resumo"},
    {"id": "resumo-prev-salario-contribuicao", "titulo": "Resumo objetivo — Salário de contribuição", "materia": "Direito Previdenciário", "topico": "Salário de contribuição", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-salario-contribuicao.html", "tipo": "resumo"},
    {"id": "resumo-prev-dependentes", "titulo": "Resumo objetivo — Dependentes", "materia": "Direito Previdenciário", "topico": "Dependentes", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-dependentes.html", "tipo": "resumo"},
    {"id": "resumo-prev-filiacao", "titulo": "Resumo objetivo — Filiação e inscrição", "materia": "Direito Previdenciário", "topico": "Filiação e inscrição", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/prev-filiacao.html", "tipo": "resumo"},
    {"id": "resumo-etica-1171", "titulo": "Resumo objetivo — Código de Ética (Dec. 1.171)", "materia": "Ética no Serviço Público", "topico": "Dec. 1.171", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/etica-1171.html", "tipo": "resumo"},
    {"id": "resumo-const-art5", "titulo": "Resumo objetivo — Direitos fundamentais (art. 5º)", "materia": "Direito Constitucional", "topico": "Direitos fundamentais", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/const-art5.html", "tipo": "resumo"},
    {"id": "resumo-const-adm", "titulo": "Resumo objetivo — Administração Pública na CF", "materia": "Direito Constitucional", "topico": "Administração Pública", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/const-adm.html", "tipo": "resumo"},
    {"id": "resumo-adm-atos", "titulo": "Resumo objetivo — Atos administrativos", "materia": "Direito Administrativo", "topico": "Atos", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/adm-atos.html", "tipo": "resumo"},
    {"id": "resumo-adm-8112", "titulo": "Resumo objetivo — Servidores (Lei 8.112)", "materia": "Direito Administrativo", "topico": "Agentes", "prioridade": "alta", "paginas": null, "url": "materiais/resumos/adm-8112.html", "tipo": "resumo"},
  ];

  function injectResumos(data) {
    if (!data?.pdfs) return data;
    if (!Array.isArray(data.pdfs.pdfs)) data.pdfs.pdfs = [];
    const ids = new Set(data.pdfs.pdfs.map((p) => p.id));
    RESUMOS.forEach((r) => {
      if (!ids.has(r.id)) data.pdfs.pdfs.push(r);
    });
    return data;
  }

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
    return ["pretest", "learn", "read", "practice"];
  }

  const _renderHoje = window.renderHoje;
  window.renderHoje = function renderHoje(data) {
    data = injectResumos(data);
    window.__studyData = data;
    const progress = Storage.get();
    const plan = App.getTodayPlan(data.cronograma, progress);
    const studyDate = todayISO();
    const target = progress.recoveryTarget;
    const recovery = target
      ? plan.recovery.find((item) => item.date === target.date)
      : null;
    const todayTasks = typeof taskEntries === "function"
      ? taskEntries(plan.day, studyDate, "today")
      : [];
    const recoveryTasks =
      recovery && typeof taskEntries === "function"
        ? taskEntries(recovery.day, recovery.date, "recovery")
        : [];
    const tasks = recovery
      ? target.merge
        ? [...todayTasks, ...recoveryTasks]
        : recoveryTasks
      : todayTasks;
    return _renderHoje(data);
  };

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
    const tag = task.questoesTag || TAG_BY_ASSUNTO[task.assunto] || "";
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
      <a class="btn ${learnDone ? "btn-secondary" : ""}" ${App.linkAttrs(lessonAction.url)} data-step-key="${base}_learn">${lessonAction.label}</a>
      <button class="btn btn-secondary" type="button" data-complete-step="${base}_learn" ${learnDone ? "disabled" : ""}>${learnDone ? "Concluído" : "Marcar etapa como concluída"}</button>
    </div>`;
    } else {
      learnControl = `<span class="alert alert-info" data-lesson-unavailable>${lessonAction.label}</span>
      <div class="actions mt-1">
        <button class="btn btn-secondary" type="button" data-complete-step="${base}_learn" ${learnDone ? "disabled" : ""}>${learnDone ? "Concluído" : "Marcar etapa como concluída"}</button>
      </div>`;
    }

    const learnHtml = `
    <div class="roadmap-step ${learnDone ? "is-done" : ""} ${firstPending === `${base}_learn` ? "is-next" : ""}" data-step="${base}_learn">
      <span class="step-number">${learnDone ? "✓" : "1"}</span>
      <div><h4>Aprender o conteúdo</h4>${learnControl}</div>
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
        <p class="muted" style="margin:0 0 0.5rem">Classifique cada erro (teoria, interpretação, atenção ou memorização).</p>
        <div class="actions">
          <a class="btn ${practiceDone ? "btn-secondary" : ""}" href="${App.esc(questionUrl)}" data-step-key="${practiceKey}">Responder 10 questões</a>
        </div>
      </div>
    </div>`;

    return `<article class="card study-task">
    <div class="task-title"><div><p class="eyebrow">${entry.origin === "recovery" ? `Recuperação de ${App.formatDateBR(entry.scheduleDate)}` : "Estudo de hoje"}</p><h3>${App.esc(task.materia)} — ${App.esc(task.assunto)}</h3></div><span>${App.formatMinutes(task.tempo)}</span></div>
    ${pretestHtml}${learnHtml}${readHtml}${practiceHtml}
    <button class="link-button" type="button" data-dismiss="${base}">Dispensar esta tarefa</button>
  </article>`;
  };

  const _label = App.materialActionLabel.bind(App);
  App.materialActionLabel = function (item) {
    if (item?.tipo === "resumo") return "Abrir resumo objetivo";
    return _label(item);
  };
})();
