/** Escolha livre de dia do cronograma + atalhos de conteúdo */
(function () {
  function listPlanDays(cronograma, progress) {
    if (!progress.startDate) return [];
    const days = cronograma.days || [];
    const out = [];
    for (let i = 0; i < days.length; i++) {
      const date = typeof studyDateAt === "function"
        ? studyDateAt(progress.startDate, i, progress)
        : null;
      if (!date) continue;
      out.push({
        date,
        index: i,
        day: days[i],
        status: typeof getDayStatus === "function" ? getDayStatus(date, progress) : "pendente",
      });
    }
    return out;
  }

  function selectedDate() {
    const p = new URLSearchParams(location.search);
    return p.get("dia") || p.get("recuperar") || "";
  }

  function goToDay(date) {
    if (!date) {
      location.href = "hoje.html";
      return;
    }
    location.href = `hoje.html?dia=${encodeURIComponent(date)}`;
  }

  function dayPickerHtml(items, focusDate, today) {
    if (!items.length) return "";
    const options = items
      .map((item) => {
        const label = `${App.formatDateBR(item.date)} · ${item.day.titulo || `Dia ${item.day.dia || item.index + 1}`}`;
        const selected = item.date === focusDate ? "selected" : "";
        return `<option value="${App.esc(item.date)}" ${selected}>${App.esc(label)}</option>`;
      })
      .join("");
    const isCustom = focusDate && focusDate !== today;
    return `
      <section class="card mb-1" id="day-picker-box">
        <p class="eyebrow">Escolha o que estudar</p>
        <h3 style="margin:0 0 0.5rem">Dia do plano</h3>
        <p class="muted" style="margin:0 0 0.75rem">Você não fica preso ao dia de hoje. Escolha qualquer dia do cronograma — com vídeo, leitura e questões.</p>
        <div class="grid grid-2">
          <div class="form-row">
            <label for="pick-day">Dia programado</label>
            <select id="pick-day">
              <option value="">Hoje (${App.formatDateBR(today)})</option>
              ${options}
            </select>
          </div>
          <div class="form-row">
            <label for="pick-date">Ou data específica</label>
            <input id="pick-date" type="date" value="${App.esc(focusDate || today)}">
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn" id="btn-open-day">Abrir este dia</button>
          ${isCustom ? `<button type="button" class="btn btn-secondary" id="btn-back-today">Voltar para hoje</button>` : ""}
        </div>
        <div class="actions mt-1">
          <a class="btn btn-secondary btn-sm" href="materias.html">Escolher matéria</a>
          <a class="btn btn-secondary btn-sm" href="biblioteca.html?tipo=aulas">Ver videoaulas</a>
          <a class="btn btn-secondary btn-sm" href="biblioteca.html">Biblioteca</a>
          <a class="btn btn-secondary btn-sm" href="questoes.html">Questões livres</a>
          <a class="btn btn-secondary btn-sm" href="cronograma.html">Cronograma completo</a>
        </div>
      </section>`;
  }

  function bindPicker() {
    const select = document.getElementById("pick-day");
    const dateInput = document.getElementById("pick-date");
    const openBtn = document.getElementById("btn-open-day");
    const backBtn = document.getElementById("btn-back-today");
    if (select && dateInput) {
      select.onchange = () => {
        if (select.value) dateInput.value = select.value;
      };
      dateInput.onchange = () => {
        if (!dateInput.value) return;
        const opt = [...select.options].find((o) => o.value === dateInput.value);
        select.value = opt ? dateInput.value : "";
      };
    }
    if (openBtn) {
      openBtn.onclick = () => {
        const date = (dateInput && dateInput.value) || (select && select.value) || "";
        goToDay(date);
      };
    }
    if (backBtn) backBtn.onclick = () => goToDay("");
  }

  function resolveDay(cronograma, progress, focusDate) {
    if (!progress.startDate) return { type: "setup" };
    if (focusDate < progress.startDate)
      return { type: "before", focusDate };
    if (!isStudyDate(focusDate, progress))
      return { type: "rest", focusDate };
    const index = countStudyDatesBefore(progress.startDate, focusDate, progress);
    const day = (cronograma.days || [])[index] || null;
    if (!day) return { type: "empty", focusDate };
    return { type: "study", focusDate, index, day };
  }

  function renderFreeDay(data, focus, items, today) {
    const progress = Storage.get();
    const root = document.getElementById("app-root");
    const focusDate = focus.focusDate;
    const tasks = taskEntries(focus.day, focusDate, focusDate === today ? "today" : "chosen");
    const firstPending =
      typeof findFirstPendingStep === "function"
        ? findFirstPendingStep(tasks, data)
        : "finish";
    const due = typeof getDueErros === "function" ? getDueErros(progress, today) : [];
    const statusLabel = App.statusLabel(
      typeof getDayStatus === "function" ? getDayStatus(focusDate, progress) : "pendente",
    );

    root.innerHTML = `
      ${dayPickerHtml(items, focusDate, today)}
      <header class="today-header mb-1">
        <p class="eyebrow">${focusDate === today ? "Estudo de hoje" : "Dia escolhido"}</p>
        <h2>${App.esc(focus.day.titulo || "Plano do dia")}</h2>
        <p><strong>${App.formatDateBR(focusDate)}</strong> · <span class="badge badge-muted">${App.esc(statusLabel)}</span></p>
        <p class="muted">Vídeo, leitura e questões deste dia — no seu ritmo.</p>
      </header>
      ${typeof renderDueErrorsBlock === "function" ? renderDueErrorsBlock(due) : ""}
      <section class="study-roadmap" aria-label="Roteiro de estudo">
        ${tasks.length ? tasks.map((entry) => renderStudyTask(entry, data, firstPending)).join("") : '<div class="card"><p>Nenhuma tarefa neste dia.</p></div>'}
        ${typeof renderFinishCards === "function" ? renderFinishCards(tasks, today, focusDate, firstPending) : ""}
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
          ${typeof manualStudyForm === "function" ? manualStudyForm(tasks[0]?.task) : ""}
        </div>
      </details>`;

    bindPicker();
    if (typeof bindTodayActions === "function") {
      bindTodayActions({ data, tasks, studyDate: today, primaryDate: focusDate });
    }
  }

  function renderMessageDay(data, focus, items, today, messageHtml) {
    const root = document.getElementById("app-root");
    root.innerHTML = `
      ${dayPickerHtml(items, focus.focusDate || today, today)}
      <div class="alert alert-info">${messageHtml}</div>
      <div class="actions">
        <a class="btn" href="materias.html">Escolher matéria</a>
        <a class="btn btn-secondary" href="biblioteca.html?tipo=aulas">Videoaulas</a>
        <a class="btn btn-secondary" href="questoes.html">Questões</a>
      </div>`;
    bindPicker();
  }

  const _renderHoje = window.renderHoje;
  window.renderHoje = function renderHojeWithPicker(data) {
    const progress = Storage.get();
    const today = todayISO();
    const requested = selectedDate();
    const focusDate = requested || today;
    const items = listPlanDays(data.cronograma, progress);

    // Sem plano configurado: fluxo original
    if (!progress.startDate) {
      return _renderHoje(data);
    }

    // Dia livre escolhido (ou hoje com seletor sempre visível via nosso render)
    const focus = resolveDay(data.cronograma, progress, focusDate);

    if (requested) {
      if (focus.type === "before") {
        return renderMessageDay(
          data,
          focus,
          items,
          today,
          `Essa data é anterior ao início do plano (<strong>${App.formatDateBR(progress.startDate)}</strong>). Escolha outro dia.`,
        );
      }
      if (focus.type === "rest") {
        return renderMessageDay(
          data,
          focus,
          items,
          today,
          `<strong>${App.formatDateBR(focusDate)}</strong> é dia de descanso no seu plano. Escolha um dia de estudo na lista acima, ou estude livremente por matéria/vídeo/questões.`,
        );
      }
      if (focus.type === "empty") {
        return renderMessageDay(
          data,
          focus,
          items,
          today,
          "Não há conteúdo mapeado para essa data no cronograma.",
        );
      }
      if (focus.type === "study") {
        return renderFreeDay(data, focus, items, today);
      }
    }

    // Fluxo padrão de hoje — depois injeta o seletor no topo
    const result = _renderHoje(data);
    injectPickerIntoRendered(data, items, today);
    return result;
  };

  function injectPickerIntoRendered(data, items, today) {
    const root = document.getElementById("app-root");
    if (!root || !items.length) return;
    if (document.getElementById("day-picker-box")) return;
    const html = dayPickerHtml(items, today, today);
    root.insertAdjacentHTML("afterbegin", html);
    bindPicker();
  }
})();
