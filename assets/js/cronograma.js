async function initCronograma() {
  App.initShell('cronograma');
  try {
    const { cronograma } = await App.loadAll();
    renderCronograma(cronograma);
  } catch (e) {
    document.getElementById('app-root').innerHTML =
      `<div class="alert alert-danger">Erro ao carregar cronograma. Use servidor local. ${App.esc(e.message)}</div>`;
  }
}

function renderCronograma(cronograma) {
  const progress = Storage.get();
  const plan = App.getTodayPlan(cronograma, progress);
  const byWeek = {};
  (cronograma.days || []).forEach((d, idx) => {
    if (!byWeek[d.semana]) byWeek[d.semana] = [];
    byWeek[d.semana].push({ ...d, index: idx });
  });

  const start = progress.startDate || todayISO();
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);

  document.getElementById('app-root').innerHTML = `
    <div class="card mb-1">
      <h2>${App.esc(cronograma.titulo)}</h2>
      <p class="muted">${App.esc(cronograma.descricao)}</p>
      <p>Início do plano: <strong>${App.formatDateBR(start)}</strong> · Hoje = semana ${plan.day?.semana || 1}, dia ${plan.day?.dia || 1}</p>
      <div class="form-row" style="max-width:280px">
        <label for="start-date">Redefinir data de início</label>
        <input type="date" id="start-date" value="${start}">
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-start-date">Salvar início</button>
    </div>
    <div id="weeks"></div>
  `;

  document.getElementById('btn-start-date').onclick = () => {
    const v = document.getElementById('start-date').value;
    if (!v) return;
    Storage.update((d) => { d.startDate = v; });
    renderCronograma(cronograma);
  };

  const container = document.getElementById('weeks');
  container.innerHTML = weeks.map((w) => {
    const days = byWeek[w];
    return `
      <div class="week-block card">
        <h3 class="week-title">Semana ${w}</h3>
        ${days.map((d) => {
          const date = addDaysISO(start, d.index);
          const st = progress.dayStatus[date] || (date < todayISO() ? 'faltou' : 'pendente');
          const badge =
            st === 'concluido' || st === 'recuperado' ? 'badge-ok' :
            st === 'faltou' || st === 'atrasada' ? 'badge-danger' :
            st === 'em_andamento' ? 'badge-warn' : 'badge-muted';
          const focoBadge = d.foco === 'inss' ? 'badge-info' : d.foco === 'prf' ? 'badge-warn' : 'badge-muted';
          return `
            <div class="day-row">
              <div class="day-date">${App.formatDateBR(date)}<br><span class="muted">D${d.dia}</span></div>
              <div>
                <strong>${App.esc(d.titulo)}</strong>
                <div class="task-meta mt-1">
                  <span class="badge ${focoBadge}">${App.esc(d.foco)}</span>
                  ${(d.tasks || []).map((t) => `<span>${App.esc(t.materia)} (${t.tempo}min)</span>`).join('')}
                </div>
              </div>
              <div>
                <span class="badge ${badge}">${App.statusLabel(st)}</span>
                <div class="actions">
                  <button class="btn btn-sm btn-secondary" data-date="${date}" data-st="em_andamento">Andamento</button>
                  <button class="btn btn-sm btn-accent" data-date="${date}" data-st="concluido">Concluir</button>
                  <button class="btn btn-sm btn-secondary" data-date="${date}" data-st="recuperado">Recuperar</button>
                  <button class="btn btn-sm btn-danger" data-date="${date}" data-st="faltou">Faltou</button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }).join('');

  container.querySelectorAll('button[data-date]').forEach((btn) => {
    btn.onclick = () => {
      Storage.setDayStatus(btn.dataset.date, btn.dataset.st);
      if (btn.dataset.st === 'concluido' || btn.dataset.st === 'recuperado') {
        const day = (cronograma.days || [])[daysBetween(start, btn.dataset.date)];
        Storage.addStudySession({
          date: btn.dataset.date,
          minutes: day?.tasks?.[0]?.tempo || 30,
          dayKey: btn.dataset.date,
          subject: day?.tasks?.[0]?.materia || 'Cronograma',
          topic: day?.titulo || ''
        });
      }
      renderCronograma(cronograma);
    };
  });
}

window.initCronograma = initCronograma;
