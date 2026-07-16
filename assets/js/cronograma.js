async function initCronograma() {
  App.initShell("cronograma");
  try {
    const cronograma = await App.loadJSON("data/cronograma.json");
    renderCronograma(cronograma);
  } catch (error) {
    document.getElementById("app-root").innerHTML =
      `<div class="alert alert-danger">Erro ao carregar cronograma. ${App.esc(error.message || error)}</div>`;
  }
}

function renderCronograma(cronograma) {
  const progress = Storage.get();
  const root = document.getElementById("app-root");
  if (!progress.startDate) {
    root.innerHTML = App.planSetupHtml("Configurar início do cronograma");
    App.bindPlanSetup(() => renderCronograma(cronograma));
    return;
  }

  const byWeek = {};
  (cronograma.days || []).forEach((day, index) =>
    (byWeek[day.semana] ||= []).push({ ...day, index }),
  );
  root.innerHTML = `
    <section class="card mb-1">
      <h2>${App.esc(cronograma.titulo)}</h2>
      <p class="muted">${App.esc(cronograma.descricao)}</p>
      <p>Início: <strong>${App.formatDateBR(progress.startDate)}</strong></p>
      <p class="alert alert-info">Clique em <strong>Estudar</strong> em qualquer dia para abrir vídeo, leitura e questões daquele conteúdo — sem depender só do dia de hoje.</p>
      <div class="grid grid-2">
        <div class="form-row"><label for="start-date">Redefinir data de início</label><input id="start-date" type="date" value="${progress.startDate}"><p class="alert alert-info hidden" id="start-date-adjustment"></p></div>
        <fieldset class="card"><legend><strong>Dias de estudo</strong></legend><div class="actions">${[0, 1, 2, 3, 4, 5, 6].map((day) => `<label class="check-label"><input type="checkbox" data-day value="${day}" ${progress.studyDays.includes(day) ? "checked" : ""}> ${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][day]}</label>`).join("")}</div></fieldset>
      </div>
      <button class="btn btn-secondary" type="button" id="save-plan">Salvar configuração</button>
    </section>
    <div id="weeks"></div>`;

  const startInput = document.getElementById("start-date");
  const dayInputs = [...document.querySelectorAll("[data-day]")];
  const notice = document.getElementById("start-date-adjustment");
  const selectedDays = () =>
    dayInputs
      .filter((input) => input.checked)
      .map((input) => Number(input.value));
  const paintNotice = () => {
    const normalized = normalizeStartDate(startInput.value, selectedDays());
    notice.classList.toggle(
      "hidden",
      !startInput.value || normalized === startInput.value,
    );
    notice.textContent =
      normalized !== startInput.value
        ? `A data escolhida não é um dia de estudo. O plano começará em ${App.formatDateBR(normalized)}.`
        : "";
  };
  startInput.onchange = paintNotice;
  dayInputs.forEach((input) => {
    input.onchange = paintNotice;
  });
  paintNotice();

  document.getElementById("save-plan").onclick = async () => {
    if (!startInput.value || !selectedDays().length)
      return alert("Informe data e ao menos um dia.");
    if (
      !(await Modal.waitConfirm(
        "Alterar o início pode mudar as datas do cronograma. Continuar?",
      ))
    )
      return;
    Storage.startPlan({
      startDate: startInput.value,
      studyDays: selectedDays(),
    });
    renderCronograma(cronograma);
  };

  document.getElementById("weeks").innerHTML = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b)
    .map(
      (week) => `
    <section class="week-block card"><h3 class="week-title">Semana ${week}</h3>${byWeek[
      week
    ]
      .map((day) => {
        const date = studyDateAt(progress.startDate, day.index, progress);
        const status = getDayStatus(date, progress);
        const badge = ["concluido", "recuperado"].includes(status)
          ? "badge-ok"
          : status === "faltou"
            ? "badge-danger"
            : ["parcial", "em_andamento"].includes(status)
              ? "badge-warn"
              : "badge-muted";
        return `<div class="day-row"><div class="day-date">${App.formatDateBR(date)}<br><span class="muted">Dia ${day.dia}</span></div><div><strong>${App.esc(day.titulo)}</strong><div class="task-meta mt-1">${(day.tasks || []).map((task) => `<span>${App.esc(task.materia)} (${task.tempo} min)</span>`).join("")}</div></div><div><span class="badge ${badge}">${App.statusLabel(status)}</span><div class="actions mt-1" style="flex-direction:column;align-items:stretch"><a class="btn btn-sm" href="hoje.html?dia=${date}">Estudar</a>${["faltou", "parcial"].includes(status) ? `<a class="btn btn-sm btn-secondary" href="hoje.html?recuperar=${date}">Retomar</a>` : ""}</div></div></div>`;
      })
      .join("")}</section>`,
    )
    .join("");
}

window.initCronograma = initCronograma;
