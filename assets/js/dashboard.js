function showLoadError(error) {
  window.UnitFlow?.cleanup();
  clearTodayTimerInterval();
  const root = document.getElementById("app-root");
  if (root)
    root.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os dados. ${App.esc(error.message || error)}</div>`;
}

let todayTimerInterval = null;

function clearTodayTimerInterval() {
  if (todayTimerInterval === null) return;
  clearInterval(todayTimerInterval);
  todayTimerInterval = null;
}

function statCard(value, label) {
  return `<div class="card stat"><span class="value">${App.esc(value)}</span><span class="label">${App.esc(label)}</span></div>`;
}

async function initDashboard() {
  App.initShell("dashboard");
  try {
    renderDashboard(await App.loadJSON("data/cronograma.json"));
  } catch (error) {
    showLoadError(error);
  }
}

function renderDashboard(cronograma) {
  const progress = Storage.get();
  const root = document.getElementById("app-root");
  if (!progress.startDate) {
    root.innerHTML = App.planSetupHtml(
      "Começar preparação INSS + PRF Administrativo",
    );
    App.bindPlanSetup(() => renderDashboard(cronograma));
    return;
  }

  const stats = computeStats(progress);
  const week = getWeeklyReport(progress);
  const plan = App.getTodayPlan(cronograma, progress);
  const weak = getWeakSubjects(progress, 3)[0];
  const due = getDueErros(progress);
  root.innerHTML = `
    <section class="hero-card card mb-1">
      <p class="eyebrow">Próximo passo</p>
      <h2>${App.esc(App.nextAction(progress, cronograma))}</h2>
      <a class="btn" href="hoje.html">Abrir meu estudo de hoje</a>
    </section>
    <section class="grid grid-4 mb-1" aria-label="Resumo principal">
      ${statCard(stats.diasEstudados, "Dias estudados")}
      ${statCard(`${week.hours}h`, "Horas nesta semana")}
      ${statCard(stats.questoesResolvidas, "Questões respondidas")}
      ${statCard(`${stats.percentualAcertos}%`, "Percentual de acertos")}
    </section>
    <section class="grid grid-3 mb-1">
      <div class="card"><h2>Próxima ação</h2><p>${App.esc(App.nextAction(progress, cronograma))}</p></div>
      <div class="card"><h2>Maior dificuldade</h2><p>${weak ? `${App.esc(weak.materia)} — ${weak.pct}% de acertos` : "Responda questões para identificar."}</p></div>
      <div class="card"><h2>Pendências reais</h2><p>${plan.recovery.length} dia(s) para retomar · ${due.length} revisão(ões)</p></div>
    </section>
    <details class="card">
      <summary>Ver detalhes do progresso</summary>
      <div class="grid grid-4 mt-1">
        ${statCard(`Nível ${stats.nivel}`, "Nível")}
        ${statCard(stats.xp, "XP")}
        ${statCard(`${stats.sequenciaAtual} dias seguidos`, "Sequência atual")}
        ${statCard(`${stats.maiorSequencia} dias`, "Maior sequência")}
        ${statCard((progress.materiaisEstudados || []).length, "Materiais")}
        ${statCard((progress.provasFeitas || []).length, "Provas")}
        ${statCard(stats.erros, "Total de erros")}
        ${statCard(`${plan.day?.semana || plan.nextDay?.semana || 1}/16`, "Semana do plano")}
      </div>
    </details>`;
}

async function initHoje() {
  App.initShell("hoje");
  try {
    const recoveryDate = new URLSearchParams(location.search).get("recuperar");
    if (recoveryDate) Storage.setRecoveryTarget({ date: recoveryDate });
    const [cronograma, aulas, pdfs] = await Promise.all([
      App.loadJSON("data/cronograma.json"),
      App.loadJSON("data/aulas.json"),
      App.loadJSON("data/pdfs.json"),
    ]);
    const unitIds = [...new Set(cronograma.days.flatMap((day) =>
      (day.tasks || []).map((task) => task.unitId).filter(Boolean),
    ))];
    const units = {};
    const unitErrors = {};
    await Promise.all(unitIds.map(async (id) => {
      try {
        const unit = await UnitFlow.load(id);
        if (unit) units[unit.id] = unit;
        else unitErrors[id] = "Unidade não encontrada.";
      } catch {
        unitErrors[id] = "Não foi possível carregar esta unidade.";
      }
    }));
    renderHoje({ cronograma, aulas, pdfs, units, unitErrors });
  } catch (error) {
    showLoadError(error);
  }
}

function renderHoje(data) {
  const progress = Storage.get();
  const root = document.getElementById("app-root");
  UnitFlow.cleanup();
  clearTodayTimerInterval();
  if (!progress.startDate) {
    root.innerHTML = App.planSetupHtml();
    App.bindPlanSetup(() => renderHoje(data));
    return;
  }

  const studyDate = todayISO();
  const plan = App.getTodayPlan(data.cronograma, progress);
  if (plan.beforeStart) {
    root.innerHTML = `<div class="alert alert-info">O plano começa em <strong>${App.formatDateBR(progress.startDate)}</strong>.</div><a class="btn btn-secondary" href="cronograma.html">Ver cronograma</a>`;
    return;
  }
  if (plan.isRestDay && !plan.recovery.length) {
    root.innerHTML = `<div class="alert alert-info">Hoje é dia de descanso. O próximo conteúdo é <strong>${App.esc(plan.nextDay?.titulo || "—")}</strong>.</div><a class="btn btn-secondary" href="cronograma.html">Ver meu plano</a>`;
    return;
  }

  const target = progress.recoveryTarget;
  const recovery = target
    ? plan.recovery.find((item) => item.date === target.date)
    : null;
  const todayTasks = taskEntries(plan.day, studyDate, "today");
  const recoveryTasks = recovery
    ? taskEntries(recovery.day, recovery.date, "recovery")
    : [];
  const tasks = recovery
    ? target.merge
      ? [...todayTasks, ...recoveryTasks]
      : recoveryTasks
    : todayTasks;
  const primaryDate = recovery && !target.merge ? recovery.date : studyDate;
  const primaryDay = recovery && !target.merge ? recovery.day : plan.day;
  const goals = getTodayGoals(progress);
  const status = App.studyStatus(progress, data.cronograma);
  const firstPending = findFirstPendingStep(tasks);
  const due = getDueErros(progress, studyDate);
  const weak = getWeakSubjects(progress, 3)[0];

  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const studentName = "Eliana";

  root.innerHTML = `
    <header class="today-header mb-1">
      <p class="eyebrow">${greet}, ${App.esc(studentName)}</p>
      <h2>Seu estudo de hoje</h2>
      <p><strong>${App.esc(primaryDay?.titulo || "Plano do dia")}</strong></p>
      <p class="muted">Meta: ${App.formatMinutes(goals.minutesGoal)} · ${goals.questionsGoal} questões</p>
    </header>

    <div class="alert ${status.code === "parcial" ? "alert-warn" : "alert-info"}">${App.esc(status.message)}</div>

    ${renderDueErrorsBlock(due)}

    ${renderPriorityHint(due, weak)}

    ${renderRecoveryChoices(plan.recovery, recovery)}

    <section class="study-roadmap" aria-label="Roteiro de estudo">
      ${tasks.length ? tasks.map((entry) => renderStudyTask(entry, data, firstPending)).join("") : '<div class="card"><p>Nenhuma tarefa programada.</p></div>'}
      ${renderFinishCards(tasks, studyDate, primaryDate, firstPending)}
    </section>

    <details class="card mt-1" id="timer-panel">
      <summary>Cronômetro e registro</summary>
      <div class="timer" id="timer-display">00:00:00</div>
      <div class="actions">
        <button class="btn" type="button" id="btn-start">Começar</button>
        <button class="btn btn-secondary" type="button" id="btn-pause">Pausar</button>
        <button class="btn btn-secondary" type="button" id="btn-save">Salvar sessão</button>
      </div>
    </details>

    <details class="card mt-1" id="more-options">
      <summary>Mais opções</summary>
      <button class="btn btn-secondary mt-1" type="button" id="btn-manual">Registrar estudo manual</button>
      <div class="hidden mt-1" id="manual-box">
        ${manualStudyForm(tasks[0]?.task)}
      </div>
    </details>`;

  bindTodayActions({ data, tasks, studyDate, primaryDate });
}

function renderDueErrorsBlock(due) {
  if (!due.length) return "";

  const items = due
    .slice(0, 5)
    .map((e) => {
      const keys = (e.dueKeys || []).join(", ");
      const tipo = e.tipo
        ? `<span class="badge badge-muted">${App.esc(e.tipo)}</span>`
        : "";
      return `<li>
        <strong>${App.esc(e.materia || "Sem matéria")}</strong>
        ${tipo}
        <span class="badge badge-warn">${App.esc(keys)}</span>
        <br><span class="muted">${App.esc((e.motivo || e.questao || "").slice(0, 90))}${(e.motivo || e.questao || "").length > 90 ? "…" : ""}</span>
      </li>`;
    })
    .join("");

  return `
    <section class="card mb-1" style="border-left: 4px solid var(--warn, #d97706)">
      <p class="eyebrow">Prioridade máxima</p>
      <h3 style="margin:0 0 0.35rem">Revisões vencidas (${due.length})</h3>
      <p class="muted" style="margin:0 0 0.75rem">Faça essas revisões antes do conteúdo novo. É o que mais aumenta retenção.</p>
      <ul class="list" style="margin:0 0 1rem">${items}</ul>
      <a class="btn btn-accent" href="caderno-erros.html">Abrir Caderno de erros e revisar</a>
    </section>`;
}

function renderPriorityHint(due, weak) {
  if (due.length) {
    return `<div class="alert alert-warn mb-1"><strong>Ordem recomendada hoje:</strong> 1) Revisar erros vencidos → 2) Pré-teste + plano do dia → 3) Treinar matéria fraca se sobrar tempo.</div>`;
  }
  if (weak) {
    return `<div class="alert alert-info mb-1"><strong>Dica:</strong> sua maior dificuldade atual é <strong>${App.esc(weak.materia)}</strong> (${weak.pct}% de acertos). Considere intercalá-la no final da sessão.</div>`;
  }
  return "";
}

function taskEntries(day, scheduleDate, origin) {
  return (day?.tasks || []).map((task, index) => ({
    task,
    index,
    scheduleDate,
    origin,
    day,
  }));
}

function taskBaseKey(entry) {
  return `${entry.scheduleDate}_${entry.index}`;
}

function stepDone(key) {
  const progress = Storage.get();
  if (["concluida", "dispensada"].includes(progress.taskStatus?.[key]))
    return true;
  // fallback da chave base só para learn/read/practice (não para pretest)
  if (/_(learn|read|practice)$/.test(key)) {
    const base = key.replace(/_(learn|read|practice)$/, "");
    return ["concluida", "dispensada"].includes(progress.taskStatus?.[base]);
  }
  return false;
}

function findFirstPendingStep(tasks) {
  for (const entry of tasks) {
    if (entry.task.unitId) {
      if (Storage.getUnitProgress(entry.task.unitId).state !== "concluida")
        return `unit:${taskBaseKey(entry)}`;
      continue;
    }
    const base = taskBaseKey(entry);
    if (!stepDone(`${base}_pretest`)) return `${base}_pretest`;
    for (const step of ["learn", "read", "practice"]) {
      const key = `${base}_${step}`;
      if (!stepDone(key)) return key;
    }
  }
  return "finish";
}

function renderStudyTask(entry, data, firstPending) {
  const task = entry.task;
  if (task.unitId) {
    const unit = data.units?.[task.unitId];
    return unit
      ? UnitFlow.render({ unit, task, entry, data, firstPending })
      : `<article class="card study-task unit-flow" data-unit-id="${App.esc(task.unitId)}"><div class="alert alert-danger" role="alert">${App.esc(data.unitErrors?.[task.unitId] || "Unidade não encontrada.")}</div></article>`;
  }
  const lesson = (data.aulas.aulas || []).find(
    (item) => item.id === task.aulaId,
  );
  const material = (data.pdfs.pdfs || []).find(
    (item) => item.id === task.pdfId,
  );
  const lessonAction = App.lessonAction(lesson);
  // Se não há PDF/resumo próprio, abre a fonte oficial da matéria (não a biblioteca vazia)
  const materialUrl = App.resolveMaterialUrl
    ? App.resolveMaterialUrl(material, task.materia)
    : App.resolveUrl(material?.url, task.materia);
  const base = taskBaseKey(entry);
  const pretestKey = `${base}_pretest`;
  const practiceKey = `${base}_practice`;
  const pretestDone = stepDone(pretestKey);
  const filterQs = task.questoesTag
    ? `tag=${encodeURIComponent(task.questoesTag)}`
    : `materia=${encodeURIComponent(task.materia)}`;
  const pretestUrl = `questoes.html?${filterQs}&n=3&auto=1&taskKey=${encodeURIComponent(pretestKey)}`;
  const questionUrl = `questoes.html?${filterQs}&n=10&taskKey=${encodeURIComponent(practiceKey)}`;

  const learnDone = stepDone(`${base}_learn`);
  const readDone = stepDone(`${base}_read`);
  const practiceDone = stepDone(`${base}_practice`);

  // 0. Pré-teste
  const pretestHtml = `
    <div class="roadmap-step ${pretestDone ? "is-done" : ""} ${firstPending === pretestKey ? "is-next" : ""}" data-step="${pretestKey}">
      <span class="step-number">${pretestDone ? "✓" : "0"}</span>
      <div>
        <h4>Pré-teste (obrigatório)</h4>
        <p class="muted" style="margin:0 0 0.5rem">3 questões antes da teoria — mostra o que você ainda não sabe.</p>
        <div class="actions">
          ${pretestDone
            ? '<span class="badge badge-ok">Pré-teste concluído</span>'
            : `<a class="btn" href="${App.esc(pretestUrl)}">Fazer pré-teste (3 questões)</a>`}
        </div>
      </div>
    </div>`;

  // 1. Aprender
  let learnControl;
  if (!pretestDone) {
    learnControl = `<p class="muted">Libere esta etapa concluindo o pré-teste.</p>`;
  } else if (lessonAction.available) {
    learnControl = `<div class="actions">
      <a class="btn ${learnDone ? "btn-secondary" : ""}" ${App.linkAttrs(lessonAction.url)}>${lessonAction.label}</a>
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

  // 2. Ler
  const readLabel = App.materialActionLabel(material || { tipo: "fonte" });
  const materialTitle = material?.titulo
    ? `<p class="muted" style="margin:0 0 0.5rem">${App.esc(material.titulo)}</p>`
    : "";
  const readHtml = `
    <div class="roadmap-step ${readDone ? "is-done" : ""} ${firstPending === `${base}_read` ? "is-next" : ""}" data-step="${base}_read">
      <span class="step-number">${readDone ? "✓" : "2"}</span>
      <div>
        <h4>Ler ou revisar</h4>
        ${materialTitle}
        <div class="actions">
          <a class="btn ${readDone ? "btn-secondary" : ""}" ${App.linkAttrs(materialUrl)}>${readLabel}</a>
          <button class="btn btn-secondary" type="button" data-complete-step="${base}_read" ${readDone ? "disabled" : ""}>${readDone ? "Concluído" : "Marcar etapa como concluída"}</button>
        </div>
      </div>
    </div>`;

  // 3. Praticar
  const practiceHtml = `
    <div class="roadmap-step ${practiceDone ? "is-done" : ""} ${firstPending === practiceKey ? "is-next" : ""}" data-step="${practiceKey}">
      <span class="step-number">${practiceDone ? "✓" : "3"}</span>
      <div>
        <h4>Praticar</h4>
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
}

function renderFinishCards(tasks, studyDate, primaryDate, firstPending) {
  const dates = [...new Set(tasks.map((entry) => entry.scheduleDate))];
  if (!dates.length) dates.push(primaryDate);
  return dates
    .map((scheduleDate) => {
      const unitPending = tasks.some(
        (entry) =>
          entry.scheduleDate === scheduleDate &&
          entry.task.unitId &&
          Storage.getUnitProgress(entry.task.unitId).state !== "concluida",
      );
      const recovery = scheduleDate !== studyDate;
      const label = recovery
        ? `Concluir recuperação de ${App.formatDateBR(scheduleDate)}`
        : "Concluir estudo de hoje";
      return `<section class="card roadmap-step finish-step ${firstPending === "finish" ? "is-next" : ""}"><span class="step-number">4</span><div><h3>Finalizar</h3><button class="btn btn-accent" type="button" data-finish-date="${scheduleDate}" ${unitPending ? "disabled" : ""} ${scheduleDate === primaryDate ? 'id="btn-done"' : ""}>${unitPending ? "Conclua a unidade primeiro" : label}</button></div></section>`;
    })
    .join("");
}

function renderRecoveryChoices(queue, active) {
  if (!queue.length) return "";
  return `<section class="card recovery-box mb-1"><h3>Dias para retomar</h3><p class="muted">Faça um por vez. Seu estudo de hoje não será apagado.</p><div class="actions">${queue
    .map((item) => {
      const activity = getDayActivity(item.date, Storage.get());
      const detail =
        item.status === "parcial"
          ? ` — ${activity.minutes} minutos já estudados`
          : "";
      return `<button class="btn btn-secondary" type="button" data-recover="${item.date}">Recuperar ${App.formatDateBR(item.date)}${detail}</button>${!active ? `<button class="link-button" type="button" data-merge="${item.date}">Mesclar com hoje</button>` : ""}`;
    })
    .join("")}</div></section>`;
}

function manualStudyForm(task = {}) {
  return `<div class="grid grid-2">
    <div class="form-row"><label for="manual-subject">Matéria</label><input id="manual-subject" value="${App.esc(task.materia || "")}"></div>
    <div class="form-row"><label for="manual-topic">Assunto</label><input id="manual-topic" value="${App.esc(task.assunto || "")}"></div>
    <div class="form-row"><label for="manual-min">Minutos</label><input id="manual-min" type="number" min="1" value="30"></div>
    <div class="form-row"><label for="manual-q">Questões feitas</label><input id="manual-q" type="number" min="0" value="0"></div>
    <div class="form-row"><label for="manual-ok">Acertos</label><input id="manual-ok" type="number" min="0" value="0"></div>
    <div class="form-row"><label for="manual-note">Observação</label><input id="manual-note"></div>
  </div><button class="btn" type="button" id="btn-save-manual">Salvar estudo</button>`;
}

function bindTodayActions(context) {
  const { data, tasks, studyDate, primaryDate } = context;
  const elapsed = () => {
    const timer = Storage.get().timer;
    return timer
      ? (timer.elapsed || 0) +
          (timer.running
            ? Math.floor((Date.now() - timer.startedAt) / 1000)
            : 0)
      : 0;
  };
  const paintTimer = () => {
    const seconds = elapsed();
    const display = document.getElementById("timer-display");
    if (display)
      display.textContent = [
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60,
      ]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
  };
  const saveTimer = () => {
    const timer = Storage.get().timer;
    if (!timer) return 0;
    const total = elapsed();
    const minutes = Math.floor(
      Math.max(0, total - (timer.savedSeconds || 0)) / 60,
    );
    if (minutes < 1) return 0;
    const first =
      tasks.find((entry) => entry.scheduleDate === timer.contextDate) ||
      tasks[0];
    Storage.addStudySession({
      date: studyDate,
      dayKey: timer.contextDate,
      minutes,
      subject: first?.task.materia || "Estudo",
      topic: first?.task.assunto || "",
      origin: timer.contextDate === studyDate ? "timer" : "recovery",
    });
    Storage.saveTimer({
      ...timer,
      elapsed: total,
      running: false,
      savedSeconds: (timer.savedSeconds || 0) + minutes * 60,
    });
    clearTodayTimerInterval();
    return minutes;
  };

  paintTimer();
  if (Storage.get().timer?.running)
    todayTimerInterval = setInterval(paintTimer, 1000);
  document.getElementById("btn-start").onclick = () => {
    const timer = Storage.get().timer;
    if (!timer || timer.contextDate !== primaryDate)
      Storage.saveTimer({
        contextDate: primaryDate,
        startedAt: Date.now(),
        elapsed: 0,
        running: true,
        savedSeconds: 0,
      });
    else if (!timer.running)
      Storage.saveTimer({ ...timer, startedAt: Date.now(), running: true });
    Storage.setDayStatus(primaryDate, "em_andamento");
    clearTodayTimerInterval();
    todayTimerInterval = setInterval(paintTimer, 1000);
    paintTimer();
  };
  document.getElementById("btn-pause").onclick = () => {
    const timer = Storage.get().timer;
    if (!timer) return;
    Storage.saveTimer({ ...timer, elapsed: elapsed(), running: false });
    clearTodayTimerInterval();
    paintTimer();
  };
  document.getElementById("btn-save").onclick = () => {
    const minutes = saveTimer();
    alert(
      minutes
        ? `Sessão salva: ${minutes} min`
        : "Estude pelo menos 1 minuto antes de salvar.",
    );
  };

  document.querySelectorAll("[data-complete-step]").forEach((button) => {
    button.onclick = () => {
      Storage.setTaskStatus(button.dataset.completeStep, "concluida");
      renderHoje(data);
    };
  });
  tasks.filter(({ task }) => task.unitId).forEach((entry) => {
    const { task } = entry;
    const unit = data.units?.[task.unitId];
    if (unit)
      UnitFlow.bind({
        unit,
        task,
        entry,
        firstPending: findFirstPendingStep(tasks),
        data,
        rerender: () => renderHoje(data),
      });
  });
  document.querySelectorAll("[data-dismiss]").forEach((button) => {
    button.onclick = () => {
      Storage.setTaskStatus(button.dataset.dismiss, "dispensada");
      // também dispensa pretest/learn/read/practice dessa tarefa
      const base = button.dataset.dismiss;
      ["pretest", "learn", "read", "practice"].forEach((s) =>
        Storage.setTaskStatus(`${base}_${s}`, "dispensada"),
      );
      renderHoje(data);
    };
  });
  document.querySelectorAll("[data-recover]").forEach((button) => {
    button.onclick = () => {
      Storage.setRecoveryTarget({ date: button.dataset.recover });
      renderHoje(data);
    };
  });
  document.querySelectorAll("[data-merge]").forEach((button) => {
    button.onclick = () => {
      Storage.setRecoveryTarget({ date: button.dataset.merge, merge: true });
      renderHoje(data);
    };
  });

  document.getElementById("btn-manual").onclick = () =>
    document.getElementById("manual-box").classList.toggle("hidden");
  document.getElementById("btn-save-manual").onclick = () => {
    const minutes = Number(document.getElementById("manual-min").value) || 0;
    if (minutes < 1) return alert("Informe os minutos reais.");
    Storage.addManualStudy({
      date: studyDate,
      dayKey: primaryDate,
      minutes,
      questions: document.getElementById("manual-q").value,
      correct: document.getElementById("manual-ok").value,
      subject: document.getElementById("manual-subject").value.trim(),
      topic: document.getElementById("manual-topic").value.trim(),
      note: document.getElementById("manual-note").value.trim(),
      origin: primaryDate === studyDate ? "manual" : "recovery",
    });
    alert(
      primaryDate === studyDate
        ? "Estudo registrado."
        : `Recuperação registrada para ${App.formatDateBR(primaryDate)}.`,
    );
    renderHoje(data);
  };

  document.querySelectorAll("[data-finish-date]").forEach((button) => {
    button.onclick = async () => {
      const scheduleDate = button.dataset.finishDate;
      if (Storage.get().timer?.contextDate === scheduleDate) saveTimer();
      const progress = Storage.get();
      const realSession = (progress.studySessions || []).some(
        (session) =>
          session.date === studyDate &&
          (session.dayKey || session.date) === scheduleDate &&
          session.minutes > 0,
      );
      const questions = progress.dailyQuiz?.[studyDate]?.answered > 0;
      if (!realSession && !questions)
        return alert(
          "Registre ao menos uma sessão real ou responda questões antes de concluir.",
        );

      const pending = tasks
        .filter((entry) => entry.scheduleDate === scheduleDate)
        .flatMap((entry) => {
          if (entry.task.unitId)
            return Storage.getUnitProgress(entry.task.unitId).state === "concluida"
              ? []
              : [`unit:${entry.task.unitId}`];
          const base = taskBaseKey(entry);
          return ["pretest", "learn", "read", "practice"]
            .map((step) => `${base}_${step}`)
            .filter((key) => !stepDone(key));
        });
      if (pending.length)
        return alert(
          `Conclua as etapas pendentes antes de finalizar (${pending.length}). Inclui pré-teste, teoria, leitura e prática.`,
        );
      Storage.update((data) => {
        tasks
          .filter((entry) =>
            entry.scheduleDate === scheduleDate &&
            entry.task.unitId &&
            data.unitProgress[entry.task.unitId]?.state === "concluida")
          .forEach((entry) => ["learn", "read", "practice"].forEach((step) => {
            data.taskStatus[`${taskBaseKey(entry)}_${step}`] = "concluida";
          }));
      });

      const dueNow = getDueErros(progress, studyDate);
      if (dueNow.length) {
        const ok = await Modal.waitConfirm(
          `Há ${dueNow.length} revisão(ões) vencida(s). É fortemente recomendado revisá-las antes de concluir o dia. Concluir mesmo assim?`,
        );
        if (!ok) return;
      }
      Storage.closeDay(scheduleDate, studyDate);
      Storage.setDayStatus(
        scheduleDate,
        scheduleDate === studyDate ? "concluido" : "recuperado",
      );
      if (scheduleDate !== studyDate) Storage.setRecoveryTarget(null);
      Storage.clearTimer();
      clearTodayTimerInterval();
      alert(
        scheduleDate === studyDate
          ? "Estudo de hoje concluído."
          : `Dia ${App.formatDateBR(scheduleDate)} recuperado.`,
      );
      renderHoje(data);
    };
  });
}

async function initProgresso() {
  App.initShell("progresso");
  const progress = Storage.get();
  const stats = computeStats(progress);
  const goals = progress.goals || { minutes: 90, questions: 20 };
  const week = getWeeklyReport(progress);
  const sessions = (progress.studySessions || []).slice().reverse();
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="grid grid-4 mb-1">${statCard(stats.diasEstudados, "Dias estudados")}${statCard(`${week.hours}h`, "Horas nesta semana")}${statCard(stats.questoesResolvidas, "Questões")}${statCard(`${stats.percentualAcertos}%`, "Acertos")}</div>
    <div class="card mb-1"><h2>Segurança do progresso</h2><p>Último backup: <strong>${progress.lastBackupAt ? App.formatDateBR(progress.lastBackupAt.slice(0, 10)) : "nunca"}</strong></p><a class="btn" href="backup.html">Baixar cópia do meu progresso</a></div>
    <div class="card mb-1"><h2>Meta diária</h2><div class="grid grid-2"><div class="form-row"><label for="goal-min">Minutos</label><input id="goal-min" type="number" value="${goals.minutes}"></div><div class="form-row"><label for="goal-q">Questões</label><input id="goal-q" type="number" value="${goals.questions}"></div></div><button class="btn" id="btn-save-goals">Salvar meta</button></div>
    <div class="card mb-1"><h2>Histórico de sessões</h2>${sessions.length ? `<div class="table-scroll" role="region" aria-label="Histórico de sessões" tabindex="0"><table><thead><tr><th>Data</th><th>Min</th><th>Matéria</th><th>Assunto</th><th>Origem</th><th>Ações</th></tr></thead><tbody>${sessions.map((session) => `<tr data-sid="${session.id}"><td>${App.formatDateBR(session.date)}</td><td><input aria-label="Minutos" class="sess-min" type="number" min="0" value="${session.minutes}"></td><td><input aria-label="Matéria" class="sess-sub" value="${App.esc(session.subject || "")}"></td><td><input aria-label="Assunto" class="sess-top" value="${App.esc(session.topic || "")}"></td><td>${session.dayKey && session.dayKey !== session.date ? `Recuperação de ${App.formatDateBR(session.dayKey)}` : App.esc(session.origin || "estudo")}</td><td><button class="btn btn-sm btn-secondary sess-save">Salvar</button> <button class="btn btn-sm btn-danger sess-del">Excluir</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Nenhuma sessão registrada.</p>'}</div>
    <div class="card"><h2>Últimos 7 dias</h2><p>${week.questions} questões · ${week.pct}% de acertos · ${week.daysStudied} dias ativos</p><ul class="list">${week.nextActions.map((action) => `<li>${App.esc(action)}</li>`).join("")}</ul></div>`;

  document.getElementById("btn-save-goals").onclick = () => {
    Storage.setGoals({
      minutes: document.getElementById("goal-min").value,
      questions: document.getElementById("goal-q").value,
    });
    alert("Meta salva.");
    initProgresso();
  };
  root.querySelectorAll(".sess-save").forEach((button) => {
    button.onclick = () => {
      const row = button.closest("tr");
      Storage.updateSession(row.dataset.sid, {
        minutes: row.querySelector(".sess-min").value,
        subject: row.querySelector(".sess-sub").value,
        topic: row.querySelector(".sess-top").value,
      });
      alert("Sessão atualizada.");
    };
  });
  root.querySelectorAll(".sess-del").forEach((button) => {
    button.onclick = async () => {
      if (
        !(await Modal.waitConfirm(
          "Excluir esta sessão? Os minutos deixarão de contar.",
        ))
      )
        return;
      Storage.removeSession(button.closest("tr").dataset.sid);
      initProgresso();
    };
  });
}

async function initMaterias() {
  App.initShell("materias");
  try {
    const [materias, aulas, pdfs] = await Promise.all([
      App.loadJSON("data/materias.json"),
      App.loadJSON("data/aulas.json"),
      App.loadJSON("data/pdfs.json"),
    ]);
    renderPainelMaterias({ materias, aulas, pdfs });
  } catch (error) {
    showLoadError(error);
  }
}

function renderPainelMaterias(data) {
  const groups = [
    ["Conteúdo comum", data.materias.comum || []],
    ["INSS", data.materias.inss || []],
    ["PRF Administrativo", data.materias.prf || []],
  ];
  const progress = Storage.get();
  const root = document.getElementById("app-root");
  root.innerHTML = `<header class="section-heading"><div><p class="eyebrow">Meu plano</p><h2>Painel de matérias</h2></div><p class="muted">Veja o conteúdo disponível e continue pela matéria que precisa de atenção.</p></header>${groups.map(([groupName, subjects]) => `<section class="subject-group card"><h2>${App.esc(groupName)}</h2><div class="subject-grid">${subjects.map((subject) => renderSubjectCard(subject, groupName, data.aulas.aulas || [], data.pdfs.pdfs || [], progress)).join("")}</div></section>`).join("")}`;
}

function renderSubjectCard(subject, group, lessons, materials, progress) {
  const subjectLessons = lessons.filter(
    (item) => item.materia === subject.nome,
  );
  const subjectMaterials = materials.filter(
    (item) => item.materia === subject.nome,
  );
  const realPdfs = subjectMaterials.filter(
    (item) => item.tipo === "pdf",
  ).length;
  const quiz = progress.quiz?.bySubject?.[subject.nome] || {
    answered: 0,
    correct: 0,
  };
  const accuracy = quiz.answered
    ? Math.round(((quiz.correct || 0) / quiz.answered) * 100)
    : 0;
  const lastSession = (progress.studySessions || [])
    .filter(
      (session) => session.subject === subject.nome && session.minutes > 0,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const materialUrl = `biblioteca.html?materia=${encodeURIComponent(subject.nome)}`;
  const questionUrl = `questoes.html?materia=${encodeURIComponent(subject.nome)}`;
  const availableLessons = subjectLessons.filter((lesson) => App.lessonAction(lesson).available).length;
  const topics = subject.assuntos || [];
  const topicLimit = 6;
  const topicHtml =
    topics
      .slice(0, topicLimit)
      .map((topic) => `<span class="badge badge-muted">${App.esc(topic)}</span>`)
      .join("") +
    (topics.length > topicLimit
      ? `<span class="badge badge-muted">+${topics.length - topicLimit}</span>`
      : "");
  return `<article class="subject-card">
    <p class="subject-group-label">${App.esc(group)}</p>
    <h3 class="subject-title" title="${App.esc(subject.nome)}">${App.esc(subject.nome)}</h3>
    <div class="topic-list">${topicHtml || '<span class="muted">Sem tópicos listados</span>'}</div>
    <div class="subject-stats">${statCardMini(availableLessons, "videoaulas", `biblioteca.html?tipo=aulas&materia=${encodeURIComponent(subject.nome)}`)}${statCardMini(subjectMaterials.length, `fontes (${realPdfs} PDF)`, materialUrl)}${statCardMini(quiz.answered || 0, "questões", questionUrl)}${statCardMini(`${accuracy}%`, "acertos", questionUrl)}</div>
    <div class="subject-foot">
      <div class="subject-status">${availableLessons ? "" : '<p class="alert alert-info" data-lesson-unavailable>Videoaula ainda não disponível</p>'}</div>
      <p class="muted subject-last">Último estudo: <strong>${lastSession ? App.formatDateBR(lastSession.date) : "ainda não estudada"}</strong></p>
      <div class="actions"><a class="btn btn-sm" href="${materialUrl}">Ver materiais</a><a class="btn btn-sm btn-accent" href="${questionUrl}">Fazer questões</a></div>
    </div>
  </article>`;
}

function statCardMini(value, label, href) {
  return `<a class="subject-stat" href="${href}"><strong>${App.esc(value)}</strong><span>${App.esc(label)}</span></a>`;
}

async function initCadernoErros() {
  App.initShell("erros");
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <section class="card mb-1">
      <h2>Registrar um erro</h2>
      <div class="grid grid-2">
        <div class="form-row"><label for="er-mat">Matéria</label><input id="er-mat"></div>
        <div class="form-row"><label for="er-ass">Assunto</label><input id="er-ass"></div>
      </div>
      <div class="form-row"><label for="er-q">Questão</label><textarea id="er-q"></textarea></div>
      <div class="form-row"><label for="er-com">Comentário</label><textarea id="er-com"></textarea></div>
      <div class="form-row"><label for="er-tipo">Classificação</label><select id="er-tipo"><option value="teoria">Falta de teoria</option><option value="interpretacao">Interpretação</option><option value="atencao">Atenção</option><option value="memorizacao">Memorização</option><option value="pegadinha">Pegadinha de banca</option></select></div>
      <button class="btn" type="button" id="er-save">Salvar erro</button>
    </section>
    <section class="card"><h2>Erros registrados</h2><div id="er-list"></div></section>`;

  const paint = () => {
    const progress = Storage.get();
    const today = todayISO();
    const list = document.getElementById("er-list");
    list.innerHTML = (progress.erros || []).length
      ? progress.erros
          .slice()
          .reverse()
          .map((error) => renderErrorCard(error, today))
          .join("")
      : '<p class="muted">Nenhum erro registrado.</p>';
    list.querySelectorAll("[data-review]").forEach((button) => {
      button.onclick = () => {
        Storage.markErroReview(button.dataset.id, button.dataset.review);
        paint();
      };
    });
    list.querySelectorAll("[data-delete-error]").forEach((button) => {
      button.onclick = async () => {
        if (!await Modal.waitConfirm("Excluir este erro?")) return;
        Storage.removeErro(button.dataset.deleteError);
        paint();
      };
    });
  };

  document.getElementById("er-save").onclick = () => {
    Storage.addErro({
      materia: document.getElementById("er-mat").value.trim(),
      assunto: document.getElementById("er-ass").value.trim(),
      questao: document.getElementById("er-q").value.trim(),
      comentario: document.getElementById("er-com").value.trim(),
      tipo: document.getElementById("er-tipo").value,
    });
    paint();
  };
  paint();
}

function renderErrorCard(error, today) {
  const reviews = error.reviews || {};
  const done = error.done || {};
  const due = ["d1", "d7", "d30"].filter((key) => !done[key] && reviews[key] && reviews[key] <= today);
  return `<article class="card mb-1"><p><strong>${App.esc(error.materia || "Sem matéria")}</strong> · ${App.esc(error.assunto || "")}${due.length ? ` <span class="badge badge-warn">Revisar ${due.map((key) => key.toUpperCase()).join(", ")}</span>` : ""}</p><p>${App.esc(error.questao || "")}</p><p class="muted">${App.esc(error.comentario || error.motivo || "Sem comentário")}</p><div class="actions">${["d1", "d7", "d30"].map((key) => `<button class="btn btn-sm btn-secondary" type="button" data-review="${key}" data-id="${App.esc(error.id)}" ${done[key] ? "disabled" : ""}>${done[key] ? `${key.toUpperCase()} concluído` : `Concluir ${key.toUpperCase()}`}</button>`).join("")}<button class="btn btn-sm btn-danger" type="button" data-delete-error="${App.esc(error.id)}">Excluir</button></div></article>`;
}
