// Portal Estudos — localStorage
const STORAGE_KEY = 'portal-estudos-v1';

function uid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_) { /* ignore */ }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

const DEFAULT_PROGRESS = {
  startDate: null,
  dayStatus: {},
  studySessions: [],
  quiz: { answered: 0, correct: 0, wrong: 0, bySubject: {} },
  erros: [],
  simulados: [],
  achievements: [],
  level: 1,
  xp: 0,
  lastVisit: null,
  manualStudies: [],
  materiaisEstudados: [],
  materiaisRevisao: [],
  provasFeitas: [],
  goals: { minutes: 90, questions: 20 },
  dailyQuiz: {},
  flashcards: {}
};

const Storage = {
  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_PROGRESS);
      return { ...structuredClone(DEFAULT_PROGRESS), ...JSON.parse(raw) };
    } catch {
      return structuredClone(DEFAULT_PROGRESS);
    }
  },

  set(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  update(fn) {
    const data = this.get();
    fn(data);
    this.set(data);
    return data;
  },

  ensureStartDate(startDate) {
    return this.update((d) => {
      if (!d.startDate) d.startDate = startDate || todayISO();
    });
  },

  setDayStatus(date, status) {
    return this.update((d) => { d.dayStatus[date] = status; });
  },

  getDayStatus(date) {
    return this.get().dayStatus[date] || 'pendente';
  },

  addStudySession({ date, minutes, dayKey, subject, topic }) {
    return this.update((d) => {
      d.studySessions.push({
        id: uid(),
        date: date || todayISO(),
        minutes: Number(minutes) || 0,
        dayKey: dayKey || null,
        subject: subject || '',
        topic: topic || '',
        at: new Date().toISOString()
      });
      d.xp += Math.max(1, Math.floor((Number(minutes) || 0) / 10));
      this._recalcLevel(d);
      this._checkAchievements(d);
    });
  },

  addManualStudy({ date, minutes, note }) {
    return this.update((d) => {
      d.manualStudies.push({
        id: uid(),
        date: date || todayISO(),
        minutes: Number(minutes) || 0,
        note: note || '',
        at: new Date().toISOString()
      });
      d.studySessions.push({
        id: uid(),
        date: date || todayISO(),
        minutes: Number(minutes) || 0,
        dayKey: null,
        subject: 'Manual',
        topic: note || 'Estudo manual',
        at: new Date().toISOString()
      });
      d.xp += Math.max(1, Math.floor((Number(minutes) || 0) / 10));
      this._recalcLevel(d);
    });
  },

  recordQuiz({ correct, wrong, subject, topic, date }) {
    return this.update((d) => {
      const c = Number(correct) || 0;
      const w = Number(wrong) || 0;
      d.quiz.answered += c + w;
      d.quiz.correct += c;
      d.quiz.wrong += w;
      const key = subject || 'Geral';
      if (!d.quiz.bySubject[key]) d.quiz.bySubject[key] = { answered: 0, correct: 0, wrong: 0 };
      d.quiz.bySubject[key].answered += c + w;
      d.quiz.bySubject[key].correct += c;
      d.quiz.bySubject[key].wrong += w;
      this._bumpDailyQuiz(d, date || todayISO(), c + w, c, w);
      d.xp += c * 2 + w;
      this._recalcLevel(d);
      this._checkAchievements(d);
    });
  },

  setGoals({ minutes, questions }) {
    return this.update((d) => {
      if (!d.goals) d.goals = { minutes: 90, questions: 20 };
      if (minutes != null) d.goals.minutes = Math.max(10, Number(minutes) || 90);
      if (questions != null) d.goals.questions = Math.max(1, Number(questions) || 20);
    });
  },

  getFlashState(id) {
    const d = this.get();
    return (d.flashcards || {})[id] || null;
  },

  // result: 'know' | 'fail'
  reviewFlashcard(id, result) {
    return this.update((d) => {
      if (!d.flashcards) d.flashcards = {};
      const today = todayISO();
      const cur = d.flashcards[id] || { box: 0, last: null, next: today, reviews: 0, fails: 0 };
      if (result === 'know') {
        cur.box = Math.min(3, (cur.box || 0) + 1);
      } else {
        cur.box = 0;
        cur.fails = (cur.fails || 0) + 1;
      }
      const days = [1, 1, 7, 30][cur.box] || 30;
      cur.last = today;
      cur.next = addDaysISO(today, days);
      cur.reviews = (cur.reviews || 0) + 1;
      d.flashcards[id] = cur;
      d.xp += result === 'know' ? 2 : 1;
      this._recalcLevel(d);
    });
  },

  _bumpDailyQuiz(d, date, answered, correct, wrong) {
    if (!d.dailyQuiz) d.dailyQuiz = {};
    if (!d.dailyQuiz[date]) d.dailyQuiz[date] = { answered: 0, correct: 0, wrong: 0 };
    d.dailyQuiz[date].answered += answered;
    d.dailyQuiz[date].correct += correct;
    d.dailyQuiz[date].wrong += wrong;
  },

  addErro(erro) {
    return this.update((d) => {
      const base = todayISO();
      d.erros.push({
        id: uid(),
        materia: erro.materia || '',
        assunto: erro.assunto || '',
        questao: erro.questao || '',
        motivo: erro.motivo || '',
        comentario: erro.comentario || '',
        tipo: erro.tipo || 'atencao',
        createdAt: base,
        reviews: {
          d1: addDaysISO(base, 1),
          d7: addDaysISO(base, 7),
          d30: addDaysISO(base, 30)
        },
        done: { d1: false, d7: false, d30: false }
      });
    });
  },

  markErroReview(id, key) {
    return this.update((d) => {
      const e = d.erros.find((x) => x.id === id);
      if (e && e.done) e.done[key] = true;
    });
  },

  removeErro(id) {
    return this.update((d) => {
      d.erros = d.erros.filter((x) => x.id !== id);
    });
  },

  addSimulado(result) {
    return this.update((d) => {
      const total = result.total || 0;
      const correct = result.correct || 0;
      const wrong = total - correct;
      d.simulados.push({
        id: uid(),
        tipo: result.tipo || 'misto',
        total,
        correct,
        minutes: result.minutes || 0,
        bySubject: result.bySubject || {},
        date: todayISO(),
        at: new Date().toISOString()
      });
      d.quiz.answered += total;
      d.quiz.correct += correct;
      d.quiz.wrong += wrong;
      this._bumpDailyQuiz(d, todayISO(), total, correct, wrong);
      d.xp += correct * 3;
      this._recalcLevel(d);
      this._checkAchievements(d);
    });
  },

  markMaterialStudied(item) {
    return this.update((d) => {
      if (!d.materiaisEstudados) d.materiaisEstudados = [];
      if (!d.provasFeitas) d.provasFeitas = [];
      const entry = {
        id: item.id,
        data: todayISO(),
        categoria: item.categoria || item.concurso || '',
        materia: item.materia || '',
        tipo: item.tipo || ''
      };
      d.materiaisEstudados = d.materiaisEstudados.filter((x) => x.id !== item.id);
      d.materiaisEstudados.push(entry);
      if (item.tipo === 'prova') {
        d.provasFeitas = d.provasFeitas.filter((x) => x.id !== item.id);
        d.provasFeitas.push({ id: item.id, data: entry.data, concurso: item.concurso || '' });
      }
      d.xp += 3;
      this._recalcLevel(d);
    });
  },

  isMaterialStudied(id) {
    return (this.get().materiaisEstudados || []).some((x) => x.id === id);
  },

  addMaterialRevisao(item) {
    return this.update((d) => {
      if (!d.materiaisRevisao) d.materiaisRevisao = [];
      if (d.materiaisRevisao.some((x) => x.id === item.id)) return;
      d.materiaisRevisao.push({
        id: item.id,
        titulo: item.titulo || '',
        materia: item.materia || '',
        categoria: item.categoria || '',
        tipo: item.tipo || '',
        url: item.url || '',
        addedAt: todayISO()
      });
    });
  },

  removeMaterialRevisao(id) {
    return this.update((d) => {
      d.materiaisRevisao = (d.materiaisRevisao || []).filter((x) => x.id !== id);
    });
  },

  isInRevisao(id) {
    return (this.get().materiaisRevisao || []).some((x) => x.id === id);
  },

  exportJSON() {
    return JSON.stringify(this.get(), null, 2);
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON inválido');
    const data = { ...structuredClone(DEFAULT_PROGRESS), ...parsed };
    this.set(data);
    return data;
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },

  _recalcLevel(d) {
    d.level = Math.max(1, Math.floor(d.xp / 50) + 1);
  },

  _checkAchievements(d) {
    const stats = computeStats(d);
    const list = [
      { id: 'first-day', label: 'Primeiro dia', cond: stats.diasEstudados >= 1 },
      { id: 'streak-3', label: '3 dias seguidos', cond: stats.sequenciaAtual >= 3 },
      { id: 'streak-7', label: '7 dias seguidos', cond: stats.sequenciaAtual >= 7 },
      { id: 'q50', label: '50 questões', cond: d.quiz.answered >= 50 },
      { id: 'q100', label: '100 questões', cond: d.quiz.answered >= 100 },
      { id: 'sim1', label: '1º simulado', cond: d.simulados.length >= 1 },
      { id: 'hours10', label: '10 horas', cond: stats.horasEstudadas >= 10 },
      { id: 'level5', label: 'Nível 5', cond: d.level >= 5 }
    ];
    list.forEach((a) => {
      if (a.cond && !d.achievements.includes(a.id)) d.achievements.push(a.id);
    });
  }
};

function todayISO() {
  const n = new Date();
  return n.toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db - da) / 86400000);
}

function getWeakSubjects(progress, minAnswered = 3) {
  const p = progress || Storage.get();
  return Object.entries(p.quiz?.bySubject || {})
    .map(([materia, v]) => {
      const answered = v.answered || 0;
      const correct = v.correct || 0;
      const pct = answered ? Math.round((correct / answered) * 100) : 0;
      return { materia, answered, correct, wrong: v.wrong || 0, pct };
    })
    .filter((x) => x.answered >= minAnswered)
    .sort((a, b) => a.pct - b.pct || b.answered - a.answered);
}

function getDueErros(progress, date) {
  const p = progress || Storage.get();
  const day = date || todayISO();
  return (p.erros || []).filter((e) => {
    if (!e.reviews || !e.done) return false;
    return (
      (!e.done.d1 && e.reviews.d1 <= day) ||
      (!e.done.d7 && e.reviews.d7 <= day) ||
      (!e.done.d30 && e.reviews.d30 <= day)
    );
  }).map((e) => {
    const due = [];
    if (!e.done.d1 && e.reviews.d1 <= day) due.push('D+1');
    if (!e.done.d7 && e.reviews.d7 <= day) due.push('D+7');
    if (!e.done.d30 && e.reviews.d30 <= day) due.push('D+30');
    return { ...e, dueKeys: due };
  });
}

function getWeeklyReport(progress) {
  const p = progress || Storage.get();
  const today = todayISO();
  // last 7 days including today
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDaysISO(today, -i));
  const sessions = (p.studySessions || []).filter((s) => days.includes(s.date));
  const minutes = sessions.reduce((a, s) => a + (Number(s.minutes) || 0), 0);
  let qAns = 0, qOk = 0, qBad = 0;
  days.forEach((d) => {
    const dq = (p.dailyQuiz || {})[d];
    if (dq) {
      qAns += dq.answered || 0;
      qOk += dq.correct || 0;
      qBad += dq.wrong || 0;
    }
  });
  const studiedDays = new Set(sessions.map((s) => s.date));
  days.forEach((d) => {
    if ((p.dailyQuiz || {})[d]?.answered) studiedDays.add(d);
  });
  const faltas = days.filter((d) => d < today && !studiedDays.has(d) && (p.dayStatus[d] === 'faltou' || !p.dayStatus[d] || p.dayStatus[d] === 'pendente')).length;
  const weak = getWeakSubjects(p, 2).slice(0, 3);
  const due = getDueErros(p, today);
  const pct = qAns ? Math.round((qOk / qAns) * 100) : 0;
  const nextActions = [];
  if (due.length) nextActions.push(`Revisar ${due.length} erro(s) vencido(s)`);
  if (weak[0]) nextActions.push(`Treinar fraco: ${weak[0].materia} (${weak[0].pct}%)`);
  if (minutes < 300) nextActions.push('Aumentar volume de horas na próxima semana');
  if (qAns < 50) nextActions.push('Fazer mais questões (meta: 50+/semana)');
  if (!nextActions.length) nextActions.push('Manter ritmo e 1 simulado cronometrado');
  return {
    from: days[0],
    to: today,
    minutes,
    hours: Math.round((minutes / 60) * 10) / 10,
    questions: qAns,
    correct: qOk,
    wrong: qBad,
    pct,
    daysStudied: studiedDays.size,
    faltas,
    weak,
    dueCount: due.length,
    nextActions,
    sessions: sessions.length
  };
}

function getTodayGoals(progress) {
  const p = progress || Storage.get();
  const today = todayISO();
  const goals = p.goals || { minutes: 90, questions: 20 };
  const minutesDone = (p.studySessions || [])
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const dq = (p.dailyQuiz || {})[today] || { answered: 0, correct: 0, wrong: 0 };
  const minGoal = goals.minutes || 90;
  const qGoal = goals.questions || 20;
  return {
    minutesGoal: minGoal,
    questionsGoal: qGoal,
    minutesDone,
    questionsDone: dq.answered || 0,
    questionsCorrect: dq.correct || 0,
    minutesPct: Math.min(100, Math.round((minutesDone / minGoal) * 100)),
    questionsPct: Math.min(100, Math.round(((dq.answered || 0) / qGoal) * 100)),
    minutesOk: minutesDone >= minGoal,
    questionsOk: (dq.answered || 0) >= qGoal,
    allOk: minutesDone >= minGoal && (dq.answered || 0) >= qGoal
  };
}

function computeStats(progress) {
  const p = progress || Storage.get();
  const today = todayISO();
  const sessions = p.studySessions || [];
  const studiedDates = [...new Set(sessions.map((s) => s.date))].sort();
  const minutes = sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);

  let sequenciaAtual = 0;
  let cursor = today;
  if (!studiedDates.includes(today)) cursor = addDaysISO(today, -1);
  while (studiedDates.includes(cursor)) {
    sequenciaAtual++;
    cursor = addDaysISO(cursor, -1);
  }

  let maiorSequencia = 0;
  let run = 0;
  let prev = null;
  studiedDates.forEach((date) => {
    if (prev && daysBetween(prev, date) === 1) run++;
    else run = 1;
    if (run > maiorSequencia) maiorSequencia = run;
    prev = date;
  });

  const start = p.startDate || today;
  const totalDays = Math.max(0, daysBetween(start, today));
  let diasFaltados = 0;
  let diasAtraso = 0;
  for (let i = 0; i < totalDays; i++) {
    const date = addDaysISO(start, i);
    const st = p.dayStatus[date];
    if (st === 'faltou' || !st || st === 'pendente' || st === 'em_andamento') {
      diasFaltados++;
      diasAtraso++;
    } else if (st === 'atrasada') {
      diasAtraso++;
    }
  }

  const answered = p.quiz.answered || 0;
  const correct = p.quiz.correct || 0;
  const pct = answered ? Math.round((correct / answered) * 100) : 0;

  return {
    diasEstudados: studiedDates.length,
    sequenciaAtual,
    maiorSequencia,
    horasEstudadas: Math.round((minutes / 60) * 10) / 10,
    minutosEstudados: minutes,
    questoesResolvidas: answered,
    acertos: correct,
    erros: p.quiz.wrong || 0,
    percentualAcertos: pct,
    diasFaltados,
    diasAtraso,
    simuladosRealizados: (p.simulados || []).length,
    nivel: p.level || 1,
    xp: p.xp || 0,
    achievements: p.achievements || []
  };
}

window.Storage = Storage;
window.todayISO = todayISO;
window.addDaysISO = addDaysISO;
window.daysBetween = daysBetween;
window.computeStats = computeStats;
window.getWeakSubjects = getWeakSubjects;
window.getDueErros = getDueErros;
window.getTodayGoals = getTodayGoals;
window.getWeeklyReport = getWeeklyReport;
