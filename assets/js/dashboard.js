// Dashboard + páginas de progresso / hoje / matérias / erros
async function initDashboard() {
  App.initShell('dashboard');
  try {
    const [cronograma, dicas] = await Promise.all([
      App.loadJSON('data/cronograma.json'),
      App.loadJSON('data/dicas.json').catch(() => ({ dicas: [] }))
    ]);
    renderDashboard(cronograma, dicas);
  } catch (e) {
    showLoadError(e);
  }
}

function showLoadError(e) {
  const root = document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os dados. Sirva a pasta com um servidor local (ex.: <code>python -m http.server 8080</code>). ${App.esc(e.message)}</div>`;
}

function renderDashboard(cronograma, dicasData) {
  const progress = Storage.get();
  const stats = computeStats(progress);
  const plan = App.getTodayPlan(cronograma, progress);
  const status = App.studyStatus(progress, cronograma);
  const week = plan.day ? plan.day.semana : 1;
  const day = plan.day ? plan.day.dia : 1;
  const todayTasks = (plan.day?.tasks || []).map((t) => `${t.materia}: ${t.assunto}`).join(' · ') || 'Sem tarefas';
  const badgeClass = status.code === 'em_dia' ? 'badge-ok' : status.code === 'faltou_ontem' ? 'badge-danger' : 'badge-warn';
  const dicas = dicasData?.dicas || [];
  const dica = dicas.length ? dicas[new Date().getDate() % dicas.length] : '';
  const matEst = (progress.materiaisEstudados || []).length;
  const provasFeitas = (progress.provasFeitas || []).length;
  const goals = getTodayGoals(progress);
  const weak = getWeakSubjects(progress, 3).slice(0, 5);
  const due = getDueErros(progress);

  document.getElementById('app-root').innerHTML = `
    <div class="alert ${status.code === 'em_dia' ? 'alert-ok' : status.code === 'faltou_ontem' ? 'alert-danger' : 'alert-warn'}">
      ${App.esc(status.message)}${status.recoveryCount ? ` · ${status.recoveryCount} dia(s) para recuperar` : ''}
    </div>
    ${dica ? `<div class="alert alert-info">Dica do dia: ${App.esc(dica)}</div>` : ''}

    <div class="card mb-1">
      <h2>Meta de hoje ${goals.allOk ? '<span class="badge badge-ok">Batida</span>' : '<span class="badge badge-warn">Em andamento</span>'}</h2>
      <div class="grid grid-2">
        <div>
          <p><strong>Minutos:</strong> ${goals.minutesDone}/${goals.minutesGoal}</p>
          <div class="progress-bar"><span style="width:${goals.minutesPct}%"></span></div>
        </div>
        <div>
          <p><strong>Questões:</strong> ${goals.questionsDone}/${goals.questionsGoal}</p>
          <div class="progress-bar"><span style="width:${goals.questionsPct}%"></span></div>
        </div>
      </div>
      <p class="muted mt-1">Ajuste a meta em Progresso.</p>
    </div>

    <div class="grid grid-2 mb-1">
      <div class="card">
        <h2>Hoje</h2>
        <p><strong>Data:</strong> ${App.formatDateBR(todayISO())}</p>
        <p><strong>Cronograma:</strong> Semana ${week}, dia ${day} de 16</p>
        <p><strong>O que estudar:</strong> ${App.esc(plan.day?.titulo || '—')}</p>
        <p class="muted">${App.esc(todayTasks)}</p>
        <p><strong>Próxima ação:</strong> ${App.esc(App.nextAction(progress, cronograma))}</p>
        <p><span class="badge ${badgeClass}">${App.esc(status.message)}</span></p>
        ${due.length ? `<p class="mt-1"><span class="badge badge-warn">${due.length} erro(s) para revisar hoje</span></p>` : ''}
        <div class="actions">
          <a class="btn" href="hoje.html">Ir para Hoje</a>
          <a class="btn btn-secondary" href="questoes.html">Questões</a>
          <a class="btn btn-secondary" href="biblioteca.html">Biblioteca</a>
          <a class="btn btn-secondary" href="simulados.html">Simulados</a>
        </div>
      </div>
      <div class="card">
        <h2>Motivação</h2>
        <p><strong>Nível ${stats.nivel}</strong> · ${stats.xp} XP</p>
        <div class="progress-bar mb-1"><span style="width:${Math.min(100, (stats.xp % 50) * 2)}%"></span></div>
        <p>${App.esc(App.motivationMessage(stats))}</p>
        <p class="mt-1"><strong>Conquistas:</strong> ${
          stats.achievements.length
            ? stats.achievements.map((id) => App.ACHIEVEMENTS[id] || id).join(', ')
            : 'Nenhuma ainda'
        }</p>
        <p class="muted mt-1">Biblioteca: ${matEst} materiais · ${provasFeitas} provas reais</p>
      </div>
    </div>

    <div class="card mb-1">
      <h2>Foco no fraco</h2>
      ${weak.length ? `
        <table>
          <thead><tr><th>Matéria</th><th>Resp.</th><th>%</th><th></th></tr></thead>
          <tbody>
            ${weak.map((w) => `
              <tr>
                <td>${App.esc(w.materia)}</td>
                <td>${w.answered}</td>
                <td><span class="badge ${w.pct < 60 ? 'badge-danger' : w.pct < 75 ? 'badge-warn' : 'badge-ok'}">${w.pct}%</span></td>
                <td><a class="btn btn-sm btn-accent" href="questoes.html?materia=${encodeURIComponent(w.materia)}&n=10&auto=1">Estudar só isso</a></td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="muted">Responda pelo menos 3 questões por matéria para aparecer o ranking.</p>'}
    </div>

    <div class="grid grid-4">
      ${statCard(stats.diasEstudados, 'Dias estudados')}
      ${statCard(stats.sequenciaAtual, 'Sequência atual')}
      ${statCard(stats.maiorSequencia, 'Maior sequência')}
      ${statCard(stats.horasEstudadas + 'h', 'Horas estudadas')}
      ${statCard(stats.questoesResolvidas, 'Questões resolvidas')}
      ${statCard(stats.percentualAcertos + '%', 'Acertos')}
      ${statCard(stats.diasFaltados, 'Dias faltados')}
      ${statCard(stats.diasAtraso, 'Dias de atraso')}
      ${statCard(stats.simuladosRealizados, 'Simulados')}
      ${statCard(progress.erros.length, 'Erros no caderno')}
      ${statCard(plan.recovery.length, 'Pendências')}
      ${statCard(week + '/16', 'Semana do plano')}
    </div>
  `;
}

function statCard(value, label) {
  return `<div class="card stat"><span class="value">${App.esc(value)}</span><span class="label">${App.esc(label)}</span></div>`;
}

async function initHoje() {
  App.initShell('hoje');
  try {
    const data = await App.loadAll();
    renderHoje(data);
  } catch (e) {
    showLoadError(e);
  }
}

function renderHoje(data) {
  const { cronograma, aulas, pdfs } = data;
  const progress = Storage.get();
  const plan = App.getTodayPlan(cronograma, progress);
  const status = App.studyStatus(progress, cronograma);
  const today = todayISO();
  const dayStatus = progress.dayStatus[today] || 'pendente';
  const root = document.getElementById('app-root');

  const recoveryHtml = plan.recovery.length
    ? `<div class="alert alert-warn">
        ${status.code === 'faltou_ontem' ? 'Você faltou ontem. ' : ''}
        Há <strong>${plan.recovery.length}</strong> dia(s) em atraso.
        <div class="actions">
          <button class="btn btn-secondary" id="btn-recover-first">Recuperar dia mais antigo</button>
          <button class="btn btn-accent" id="btn-merge-recovery">Mesclar recuperação com hoje</button>
        </div>
      </div>`
    : '';

  const goals = getTodayGoals(progress);
  const due = getDueErros(progress, today);
  const weak = getWeakSubjects(progress, 3).slice(0, 3);
  const dayTasks = plan.day?.tasks || [];
  const mainMateria = dayTasks[0]?.materia || '';
  const mainTag = dayTasks[0]?.questoesTag || '';

  const metaHtml = `
    <div class="card mb-1">
      <h2>Meta de hoje ${goals.allOk ? '<span class="badge badge-ok">Batida</span>' : ''}</h2>
      <div class="grid grid-2">
        <div>
          <p><strong>Minutos:</strong> ${goals.minutesDone}/${goals.minutesGoal}
            ${goals.minutesOk ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-warn">Falta</span>'}</p>
          <div class="progress-bar"><span style="width:${goals.minutesPct}%"></span></div>
        </div>
        <div>
          <p><strong>Questões:</strong> ${goals.questionsDone}/${goals.questionsGoal}
            ${goals.questionsOk ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-warn">Falta</span>'}</p>
          <div class="progress-bar"><span style="width:${goals.questionsPct}%"></span></div>
        </div>
      </div>
    </div>`;

  const reviewHtml = `
    <div class="card mb-1">
      <h2>Revisão diária automática</h2>
      <p class="muted">Erros agendados + bloco rápido da matéria de hoje.</p>
      ${due.length ? `
        <p><strong>${due.length} erro(s) para revisar:</strong></p>
        <ul class="list">
          ${due.slice(0, 8).map((e) => `
            <li>
              <strong>${App.esc(e.materia)}</strong> · ${App.esc(e.assunto)}
              <span class="badge badge-warn">${e.dueKeys.join(', ')}</span>
              <p class="muted">${App.esc((e.questao || '').slice(0, 120))}${(e.questao || '').length > 120 ? '…' : ''}</p>
              <div class="actions">
                ${e.dueKeys.map((k) => {
                  const key = k === 'D+1' ? 'd1' : k === 'D+7' ? 'd7' : 'd30';
                  return `<button type="button" class="btn btn-sm btn-secondary" data-rev-done="${App.esc(e.id)}" data-rev-key="${key}">Feito ${k}</button>`;
                }).join('')}
              </div>
            </li>`).join('')}
        </ul>
        ${due.length > 8 ? `<p class="muted">+${due.length - 8} no caderno de erros.</p>` : ''}
        <a class="btn btn-secondary btn-sm" href="caderno-erros.html">Abrir caderno completo</a>
      ` : '<p class="muted">Nenhum erro com revisão vencida hoje.</p>'}
      <div class="actions mt-1">
        ${mainTag
          ? `<a class="btn btn-accent" href="questoes.html?tag=${encodeURIComponent(mainTag)}&n=10&auto=1">10 questões do dia (${App.esc(mainTag)})</a>`
          : mainMateria
            ? `<a class="btn btn-accent" href="questoes.html?materia=${encodeURIComponent(mainMateria)}&n=10&auto=1">10 questões: ${App.esc(mainMateria)}</a>`
            : `<a class="btn btn-accent" href="questoes.html?n=10&auto=1">10 questões mistas</a>`}
        ${weak[0] ? `<a class="btn btn-secondary" href="questoes.html?materia=${encodeURIComponent(weak[0].materia)}&n=10&auto=1">Fraco: ${App.esc(weak[0].materia)} (${weak[0].pct}%)</a>` : ''}
        <a class="btn btn-secondary" href="flashcards.html">Flashcards lei seca</a>
        <a class="btn btn-secondary" href="questoes.html?n=15&auto=1&modo=prova">Modo prova 15q</a>
      </div>
    </div>`;

  const tasks = plan.day?.tasks || [];
  const cards = tasks.map((t, i) => {
    const aula = (aulas.aulas || []).find((a) => a.id === t.aulaId);
    const pdf = (pdfs.pdfs || []).find((p) => p.id === t.pdfId);
    const aulaUrl = App.resolveUrl(aula?.url, t.materia);
    const pdfUrl = App.resolveUrl(pdf?.url, t.materia);
    const bibUrl = `biblioteca.html`;
    return `
      <div class="card task-card" data-task="${i}">
        <h3>${App.esc(t.materia)}</h3>
        <p><strong>${App.esc(t.assunto)}</strong></p>
        <div class="task-meta">
          <span class="badge badge-info">${App.esc(t.tipo)}</span>
          <span>${App.formatMinutes(t.tempo)}</span>
          ${aula ? `<span>Aula: ${App.esc(aula.titulo)}</span>` : '<span>Material base</span>'}
          ${pdf ? `<span>PDF: ${App.esc(pdf.titulo)}</span>` : '<span>Ver biblioteca</span>'}
          ${t.questoesTag ? `<span>Questões: ${App.esc(t.questoesTag)}</span>` : ''}
        </div>
        <div class="actions">
          <a class="btn btn-secondary btn-sm" ${App.linkAttrs(aulaUrl)}>Abrir material</a>
          <a class="btn btn-secondary btn-sm" ${App.linkAttrs(pdfUrl)}>Abrir PDF / lei</a>
          <a class="btn btn-secondary btn-sm" href="${bibUrl}">Biblioteca</a>
          ${t.questoesTag ? `<a class="btn btn-secondary btn-sm" href="questoes.html?tag=${encodeURIComponent(t.questoesTag)}">Questões</a>` : `<a class="btn btn-secondary btn-sm" href="questoes.html?materia=${encodeURIComponent(t.materia)}">Questões</a>`}
          ${App.youtubeUrl(t.materia) ? `<a class="btn btn-secondary btn-sm" href="${App.esc(App.youtubeUrl(t.materia))}" target="_blank" rel="noopener">Videoaula</a>` : ""}
        </div>
      </div>`;
  }).join('') || '<div class="card"><p>Nenhuma tarefa para hoje.</p></div>';

  root.innerHTML = `
    ${recoveryHtml}
    ${metaHtml}
    ${reviewHtml}
    <div class="card mb-1">
      <h2>${App.esc(plan.day?.titulo || 'Plano do dia')}</h2>
      <p>Semana ${plan.day?.semana || '—'} · Dia ${plan.day?.dia || '—'} · Status: <strong>${App.statusLabel(dayStatus)}</strong></p>
      <p class="muted">Foque nestes blocos. Marque concluído ao terminar.</p>
      <div class="actions">
        <button class="btn" id="btn-start">Começar estudo</button>
        <button class="btn btn-accent" id="btn-done">Marcar como concluído</button>
        <button class="btn btn-secondary" id="btn-manual">Registrar estudo manual</button>
      </div>
    </div>

    <div class="card mb-1 hidden" id="timer-box">
      <h3>Cronômetro</h3>
      <div class="timer" id="timer-display">00:00:00</div>
      <div class="actions">
        <button class="btn btn-secondary" id="btn-pause">Pausar</button>
        <button class="btn btn-secondary" id="btn-resume">Retomar</button>
        <button class="btn" id="btn-save-timer">Salvar sessão</button>
      </div>
    </div>

    <div class="grid grid-2">${cards}</div>

    <div class="card mt-2 hidden" id="manual-box">
      <h3>Estudo manual</h3>
      <div class="form-row">
        <label for="manual-min">Minutos</label>
        <input id="manual-min" type="number" min="1" value="30">
      </div>
      <div class="form-row">
        <label for="manual-note">O que estudou</label>
        <input id="manual-note" type="text" placeholder="Ex.: revisão carência INSS">
      </div>
      <button class="btn" id="btn-save-manual">Salvar</button>
    </div>
  `;

  let seconds = 0;
  let timerId = null;
  let running = false;
  const display = document.getElementById('timer-display');

  function tick() {
    seconds++;
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    display.textContent = `${h}:${m}:${s}`;
  }

  document.getElementById('btn-start').onclick = () => {
    document.getElementById('timer-box').classList.remove('hidden');
    Storage.setDayStatus(today, 'em_andamento');
    if (!running) {
      running = true;
      timerId = setInterval(tick, 1000);
    }
  };
  document.getElementById('btn-pause').onclick = () => {
    running = false;
    clearInterval(timerId);
  };
  document.getElementById('btn-resume').onclick = () => {
    if (!running) {
      running = true;
      timerId = setInterval(tick, 1000);
    }
  };
  document.getElementById('btn-save-timer').onclick = () => {
    const minutes = Math.max(1, Math.round(seconds / 60));
    Storage.addStudySession({
      date: today,
      minutes,
      dayKey: `${plan.day?.semana}-${plan.day?.dia}`,
      subject: plan.day?.tasks?.[0]?.materia || 'Estudo',
      topic: plan.day?.titulo || ''
    });
    alert(`Sessão salva: ${minutes} min`);
  };
  document.getElementById('btn-done').onclick = () => {
    const minutes = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : (plan.day?.tasks?.[0]?.tempo || 30);
    if (seconds > 0) {
      Storage.addStudySession({
        date: today,
        minutes,
        dayKey: `${plan.day?.semana}-${plan.day?.dia}`,
        subject: plan.day?.tasks?.[0]?.materia || 'Estudo',
        topic: plan.day?.titulo || ''
      });
    } else {
      Storage.addStudySession({
        date: today,
        minutes,
        dayKey: `${plan.day?.semana}-${plan.day?.dia}`,
        subject: plan.day?.tasks?.[0]?.materia || 'Estudo',
        topic: plan.day?.titulo || ''
      });
    }
    Storage.setDayStatus(today, 'concluido');
    clearInterval(timerId);
    alert('Dia marcado como concluído.');
    renderHoje(data);
  };
  document.getElementById('btn-manual').onclick = () => {
    document.getElementById('manual-box').classList.toggle('hidden');
  };
  document.getElementById('btn-save-manual').onclick = () => {
    const minutes = Number(document.getElementById('manual-min').value) || 0;
    const note = document.getElementById('manual-note').value.trim();
    if (minutes <= 0) return alert('Informe minutos.');
    Storage.addManualStudy({ date: today, minutes, note });
    alert('Estudo manual registrado.');
    renderHoje(data);
  };

  const recBtn = document.getElementById('btn-recover-first');
  if (recBtn) {
    recBtn.onclick = () => {
      const item = plan.recovery[0];
      if (!item) return;
      Storage.setDayStatus(item.date, 'recuperado');
      Storage.addStudySession({
        date: today,
        minutes: item.day.tasks?.[0]?.tempo || 60,
        dayKey: `recover-${item.dayIndex}`,
        subject: item.day.tasks?.[0]?.materia || 'Recuperação',
        topic: `Recuperação: ${item.day.titulo}`
      });
      alert(`Recuperado: ${item.day.titulo} (${App.formatDateBR(item.date)})`);
      renderHoje(data);
    };
  }
  const mergeBtn = document.getElementById('btn-merge-recovery');
  if (mergeBtn) {
    mergeBtn.onclick = () => {
      const item = plan.recovery[0];
      if (!item) return;
      Storage.setDayStatus(item.date, 'recuperado');
      Storage.setDayStatus(today, 'em_andamento');
      Storage.addStudySession({
        date: today,
        minutes: Math.round(((item.day.tasks?.[0]?.tempo || 60) + (plan.day?.tasks?.[0]?.tempo || 60)) / 2),
        dayKey: `merge-${item.dayIndex}`,
        subject: 'Recuperação + hoje',
        topic: `${item.day.titulo} + ${plan.day?.titulo || 'hoje'}`
      });
      alert('Recuperação mesclada com o estudo de hoje. Conclua o dia ao terminar.');
      renderHoje(data);
    };
  }

  root.querySelectorAll('[data-rev-done]').forEach((btn) => {
    btn.onclick = () => {
      Storage.markErroReview(btn.dataset.revDone, btn.dataset.revKey);
      renderHoje(data);
    };
  });
}

async function initProgresso() {
  App.initShell('progresso');
  const stats = computeStats();
  const p = Storage.get();
  const goals = getTodayGoals(p);
  const weak = getWeakSubjects(p, 1);
  const g = p.goals || { minutes: 90, questions: 20 };

  document.getElementById('app-root').innerHTML = `
    <div class="grid grid-3 mb-1">
      ${statCard('Nv. ' + stats.nivel, 'Nível')}
      ${statCard(stats.xp, 'XP')}
      ${statCard(stats.sequenciaAtual + ' dias', 'Sequência')}
    </div>

    <div class="card mb-1">
      <h2>Meta diária</h2>
      <p>Hoje: <strong>${goals.minutesDone}/${goals.minutesGoal} min</strong> · <strong>${goals.questionsDone}/${goals.questionsGoal} questões</strong>
        ${goals.allOk ? '<span class="badge badge-ok">Meta batida</span>' : ''}</p>
      <div class="grid grid-2">
        <div class="form-row">
          <label for="goal-min">Meta de minutos</label>
          <input id="goal-min" type="number" min="10" value="${g.minutes}">
        </div>
        <div class="form-row">
          <label for="goal-q">Meta de questões</label>
          <input id="goal-q" type="number" min="1" value="${g.questions}">
        </div>
      </div>
      <button type="button" class="btn btn-sm" id="btn-save-goals">Salvar meta</button>
    </div>

    <div class="card mb-1">
      <h2>Foco no fraco</h2>
      ${weak.length ? `
        <table>
          <thead><tr><th>Matéria</th><th>Resp.</th><th>Acertos</th><th>%</th><th></th></tr></thead>
          <tbody>
            ${weak.map((w) => `
              <tr>
                <td>${App.esc(w.materia)}</td>
                <td>${w.answered}</td>
                <td>${w.correct}</td>
                <td><span class="badge ${w.pct < 60 ? 'badge-danger' : w.pct < 75 ? 'badge-warn' : 'badge-ok'}">${w.pct}%</span></td>
                <td><a class="btn btn-sm btn-accent" href="questoes.html?materia=${encodeURIComponent(w.materia)}&n=10&auto=1">Estudar só isso</a></td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="muted">Sem dados de questões ainda.</p>'}
    </div>

    <div class="card mb-1">
      <h2>Desempenho em questões</h2>
      <p>Respondidas: <strong>${stats.questoesResolvidas}</strong> · Acertos: <strong>${stats.acertos}</strong> · Erros: <strong>${stats.erros}</strong> · Aproveitamento: <strong>${stats.percentualAcertos}%</strong></p>
      <div class="progress-bar"><span style="width:${stats.percentualAcertos}%"></span></div>
      <h3 class="mt-2">Por matéria</h3>
      <table>
        <thead><tr><th>Matéria</th><th>Resp.</th><th>Acertos</th><th>%</th></tr></thead>
        <tbody>
          ${Object.entries(p.quiz.bySubject || {}).map(([k, v]) => {
            const pct = v.answered ? Math.round((v.correct / v.answered) * 100) : 0;
            return `<tr><td>${App.esc(k)}</td><td>${v.answered}</td><td>${v.correct}</td><td>${pct}%</td></tr>`;
          }).join('') || '<tr><td colspan="4">Sem dados ainda</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="card mb-1">
      <h2>Simulados</h2>
      <ul class="list">
        ${(p.simulados || []).slice().reverse().map((s) => `
          <li><strong>${App.esc(s.tipo.toUpperCase())}</strong> — ${App.formatDateBR(s.date)} · ${s.correct}/${s.total} · ${s.minutes} min</li>
        `).join('') || '<li>Nenhum simulado ainda</li>'}
      </ul>
    </div>
    <div class="card">
      <h2>Conquistas</h2>
      <p>${Object.entries(App.ACHIEVEMENTS).map(([id, label]) =>
        `<span class="badge ${p.achievements.includes(id) ? 'badge-ok' : 'badge-muted'}" style="margin:0.2rem">${App.esc(label)}</span>`
      ).join('')}</p>
      <p class="mt-1 muted">${App.esc(App.motivationMessage(stats))}</p>
    </div>
  `;

  const week = getWeeklyReport(p);
  const weekCard = document.createElement('div');
  weekCard.className = 'card mb-1';
  weekCard.innerHTML = `
    <h2>Relatório semanal</h2>
    <p class="muted">${App.formatDateBR(week.from)} → ${App.formatDateBR(week.to)}</p>
    <div class="grid grid-4">
      ${statCard(week.hours + 'h', 'Horas')}
      ${statCard(week.questions, 'Questões')}
      ${statCard(week.pct + '%', 'Acertos')}
      ${statCard(week.daysStudied, 'Dias ativos')}
      ${statCard(week.faltas, 'Faltas (7d)')}

      ${statCard(week.dueCount, 'Erros a revisar')}
      ${statCard(week.sessions, 'Sessões')}
      ${statCard(week.wrong, 'Erros na semana')}
    </div>
    <h3 class="mt-2">Pontos fracos</h3>
    <ul class="list">
      ${week.weak.map((w) => `<li>${App.esc(w.materia)} — ${w.pct}% (${w.answered} q)
        <a class="btn btn-sm btn-accent" href="questoes.html?materia=${encodeURIComponent(w.materia)}&n=10&auto=1">Treinar</a>
      </li>`).join('') || '<li class="muted">Sem dados suficientes</li>'}
    </ul>
    <h3 class="mt-1">O que fazer na próxima semana</h3>
    <ul class="list">
      ${week.nextActions.map((a) => `<li>${App.esc(a)}</li>`).join('')}
    </ul>
    <div class="actions">
      <a class="btn btn-secondary" href="flashcards.html">Flashcards</a>
      <a class="btn btn-secondary" href="questoes.html?modo=prova&n=20&auto=1">Modo prova 20q</a>
      <a class="btn btn-secondary" href="simulados.html">Simulado</a>
    </div>`;
  const root = document.getElementById('app-root');
  root.insertBefore(weekCard, root.children[1] || null);

  document.getElementById('btn-save-goals').onclick = () => {
    Storage.setGoals({
      minutes: Number(document.getElementById('goal-min').value),
      questions: Number(document.getElementById('goal-q').value)
    });
    alert('Meta salva.');
    initProgresso();
  };
}

async function initMaterias() {
  App.initShell('materias');
  try {
    const { materias, aulas, pdfs } = await App.loadAll();
    const blocks = [
      ['Comum (INSS + PRF)', materias.comum],
      ['Específico INSS', materias.inss],
      ['Específico PRF Administrativo', materias.prf]
    ];
    document.getElementById('app-root').innerHTML = blocks.map(([title, list]) => `
      <div class="card mb-1">
        <h2>${App.esc(title)}</h2>
        <div class="grid grid-2">
          ${(list || []).map((m) => `
            <div class="card" style="border-left:4px solid ${m.cor}">
              <h3>${App.esc(m.nome)}</h3>
              <p class="muted">${(m.assuntos || []).map(App.esc).join(' · ')}</p>
              <p><strong>Aulas:</strong> ${(aulas.aulas || []).filter((a) => a.materia === m.nome).length}</p>
              <p><strong>PDFs:</strong> ${(pdfs.pdfs || []).filter((p) => p.materia === m.nome).length}</p>
              <div class="actions">
                <a class="btn btn-secondary btn-sm" ${App.linkAttrs(App.resolveUrl(null, m.nome))}>Abrir material</a>
                <a class="btn btn-secondary btn-sm" href="biblioteca.html">Biblioteca</a>
                <a class="btn btn-secondary btn-sm" href="questoes.html?materia=${encodeURIComponent(m.nome)}">Praticar questões</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (e) {
    showLoadError(e);
  }
}

async function initCadernoErros() {
  App.initShell('erros');
  const root = document.getElementById('app-root');
  const p = Storage.get();
  const today = todayISO();

  root.innerHTML = `
    <div class="card mb-1">
      <h2>Novo erro</h2>
      <div class="form-row"><label>Matéria</label><input id="er-mat" type="text"></div>
      <div class="form-row"><label>Assunto</label><input id="er-ass" type="text"></div>
      <div class="form-row"><label>Questão / enunciado curto</label><textarea id="er-q"></textarea></div>
      <div class="form-row"><label>Motivo do erro</label><input id="er-mot" type="text"></div>
      <div class="form-row"><label>Comentário</label><textarea id="er-com"></textarea></div>
      <div class="form-row"><label>Classificação</label>
        <select id="er-tipo">
          <option value="teoria">Falta de teoria</option>
          <option value="interpretacao">Interpretação</option>
          <option value="atencao">Atenção</option>
          <option value="memorizacao">Memorização</option>
          <option value="pegadinha">Pegadinha de banca</option>
        </select>
      </div>
      <button class="btn" id="er-save">Salvar no caderno</button>
    </div>
    <div class="card">
      <h2>Erros registrados (${p.erros.length})</h2>
      <div id="er-list"></div>
    </div>
  `;

  function paint() {
    const data = Storage.get();
    const list = document.getElementById('er-list');
    if (!data.erros.length) {
      list.innerHTML = '<p class="muted">Nenhum erro ainda. Erros de questionários entram aqui automaticamente.</p>';
      return;
    }
    list.innerHTML = data.erros.slice().reverse().map((e) => {
      const due = [];
      if (!e.done.d1 && e.reviews.d1 <= today) due.push('D+1');
      if (!e.done.d7 && e.reviews.d7 <= today) due.push('D+7');
      if (!e.done.d30 && e.reviews.d30 <= today) due.push('D+30');
      return `
        <div class="card mb-1">
          <p><strong>${App.esc(e.materia)}</strong> · ${App.esc(e.assunto)} · <span class="badge badge-muted">${App.esc(e.tipo)}</span>
          ${due.length ? `<span class="badge badge-warn">Revisar: ${due.join(', ')}</span>` : ''}</p>
          <p>${App.esc(e.questao)}</p>
          <p class="muted">${App.esc(e.motivo)} ${e.comentario ? '— ' + App.esc(e.comentario) : ''}</p>
          <p class="muted">D+1: ${App.formatDateBR(e.reviews.d1)} ${e.done.d1 ? '✓' : ''} ·
             D+7: ${App.formatDateBR(e.reviews.d7)} ${e.done.d7 ? '✓' : ''} ·
             D+30: ${App.formatDateBR(e.reviews.d30)} ${e.done.d30 ? '✓' : ''}</p>
          <div class="actions">
            <button class="btn btn-sm btn-secondary" data-rev="d1" data-id="${e.id}">Feito D+1</button>
            <button class="btn btn-sm btn-secondary" data-rev="d7" data-id="${e.id}">Feito D+7</button>
            <button class="btn btn-sm btn-secondary" data-rev="d30" data-id="${e.id}">Feito D+30</button>
            <button class="btn btn-sm btn-danger" data-del="${e.id}">Excluir</button>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-rev]').forEach((btn) => {
      btn.onclick = () => { Storage.markErroReview(btn.dataset.id, btn.dataset.rev); paint(); };
    });
    list.querySelectorAll('[data-del]').forEach((btn) => {
      btn.onclick = () => { if (confirm('Excluir erro?')) { Storage.removeErro(btn.dataset.del); paint(); } };
    });
  }

  document.getElementById('er-save').onclick = () => {
    Storage.addErro({
      materia: document.getElementById('er-mat').value.trim(),
      assunto: document.getElementById('er-ass').value.trim(),
      questao: document.getElementById('er-q').value.trim(),
      motivo: document.getElementById('er-mot').value.trim(),
      comentario: document.getElementById('er-com').value.trim(),
      tipo: document.getElementById('er-tipo').value
    });
    paint();
  };
  paint();
}

window.initDashboard = initDashboard;
window.initHoje = initHoje;
window.initProgresso = initProgresso;
window.initMaterias = initMaterias;
window.initCadernoErros = initCadernoErros;
