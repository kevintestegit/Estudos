// Portal Estudos — localStorage
const STORAGE_KEY = "portal-estudos-v1";
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return (
      "id-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 9)
    );
  }
};
const SCHEMA_VERSION = 5;
const newUnitProgress = () => ({
  state: "nao_iniciada",
  updatedAt: null,
  reading: { startedAt: null, completedAt: null },
  video: { startedAt: null, completedAt: null },
  activeAttemptId: null,
});
const UNIT_TRANSITIONS = {
  nao_iniciada: { iniciar_leitura: "leitura_em_andamento" },
  leitura_em_andamento: { concluir_leitura: "leitura_concluida" },
  leitura_concluida: { iniciar_video: "video_em_andamento" },
  video_em_andamento: { concluir_video: "video_concluido" },
  video_concluido: { iniciar_checagem: "checagem_em_andamento" },
  checagem_em_andamento: { concluir_checagem: "checagem_concluida" },
  checagem_concluida: { iniciar_pratica: "pratica_em_andamento" },
  pratica_em_andamento: { concluir_pratica: "pratica_concluida" },
  pratica_concluida: { concluir_correcao: "correcao_concluida" },
  correcao_pendente: { concluir_correcao: "correcao_concluida" },
  correcao_concluida: { agendar_revisao: "revisao_agendada" },
  revisao_agendada: { concluir_unidade: "concluida" },
};
const DEFAULT_PROGRESS = {
  schemaVersion: SCHEMA_VERSION,
  startDate: null,
  studyDays: [1, 2, 3, 4, 5, 6],
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
  flashcards: {},
  timer: null,
  recoveryTarget: null,
  editalProgress: {},
  lastBackupAt: null,
  dailySummaries: {},
  questionFlags: {},
  cebraspeConfig: { acerto: 1, erro: 0, branco: 0 },
  taskStatus: {},
  unitProgress: {},
  unitAttempts: [],
  unitReviews: [],
};
const Storage = {
  get() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null,
        d = parsed
          ? { ...clone(DEFAULT_PROGRESS), ...parsed }
          : clone(DEFAULT_PROGRESS),
        before = d.schemaVersion,
        migrated = this.migrate(d);
      if (parsed && before !== migrated.schemaVersion) this.set(migrated);
      this.lastError = null;
      this.corruptRaw = null;
      return migrated;
    } catch (error) {
      this.lastError = error;
      this.corruptRaw = raw;
      return clone(DEFAULT_PROGRESS);
    }
  },
  set(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  },
  update(fn) {
    const d = this.get();
    fn(d);
    this.set(d);
    return d;
  },
  migrate(d) {
    if (!d.schemaVersion) d.schemaVersion = 1;
    if (!Array.isArray(d.studyDays) || !d.studyDays.length)
      d.studyDays = [1, 2, 3, 4, 5, 6];
    if (!d.dayStatus) d.dayStatus = {};
    if (!d.studySessions) d.studySessions = [];
    if (!d.quiz) d.quiz = { answered: 0, correct: 0, wrong: 0, bySubject: {} };
    if (!d.quiz.bySubject) d.quiz.bySubject = {};
    if (!d.dailyQuiz) d.dailyQuiz = {};
    if (!d.goals) d.goals = { minutes: 90, questions: 20 };
    if (!d.erros) d.erros = [];
    if (!d.flashcards) d.flashcards = {};
    if (!d.editalProgress) d.editalProgress = {};
    if (!d.dailySummaries) d.dailySummaries = {};
    if (!d.questionFlags) d.questionFlags = {};
    if (!d.cebraspeConfig) d.cebraspeConfig = { acerto: 1, erro: 0, branco: 0 };
    if (!d.taskStatus) d.taskStatus = {}; // normalize sessions
    if (!d.unitProgress || typeof d.unitProgress !== "object" || Array.isArray(d.unitProgress))
      d.unitProgress = {};
    if (!Array.isArray(d.unitAttempts)) d.unitAttempts = [];
    if (!Array.isArray(d.unitReviews)) d.unitReviews = [];
    d.studySessions = (d.studySessions || []).map((s) => ({
      id: s.id || uid(),
      date: s.date || todayISO(),
      minutes: Number(s.minutes) || 0,
      dayKey: s.dayKey || null,
      subject: s.subject || "",
      topic: s.topic || "",
      type: s.type || "estudo",
      concurso: s.concurso || "",
      origin: s.origin || "session",
      startedAt: s.startedAt || null,
      endedAt: s.endedAt || null,
      taskId: s.taskId || null,
      at: s.at || new Date().toISOString(),
    }));
    d.schemaVersion = SCHEMA_VERSION;
    return d;
  },
  startPlan({ startDate, studyDays }) {
    return this.update((d) => {
      d.studyDays = [...new Set(studyDays.map(Number))].sort();
      d.startDate = normalizeStartDate(startDate, d.studyDays);
      /* preserve history if already had sessions */ if (
        !(d.studySessions || []).length
      ) {
        d.dayStatus = {};
        d.manualStudies = [];
      }
      d.timer = null;
      d.recoveryTarget = null;
    });
  },
  ensureStartDate() {
    return this.get();
  },
  setDayStatus(date, status) {
    return this.update((d) => {
      d.dayStatus[date] = status;
    });
  },
  getDayStatus(date) {
    return this.get().dayStatus[date] || "pendente";
  },
  addStudySession({
    date,
    minutes,
    dayKey,
    subject,
    topic,
    type,
    concurso,
    origin,
    startedAt,
    endedAt,
    taskId,
  }) {
    const m = Math.max(0, Number(minutes) || 0);
    if (!m) return this.get();
    return this.update((d) => {
      const entry = {
        id: uid(),
        date: date || todayISO(),
        minutes: m,
        dayKey: dayKey || null,
        subject: subject || "",
        topic: topic || "",
        type: type || "estudo",
        concurso: concurso || "",
        origin: origin || "timer",
        startedAt: startedAt || null,
        endedAt: endedAt || null,
        taskId: taskId || null,
        at: new Date().toISOString(),
      }; // anti-duplicata: mesma data/minutos/assunto no mesmo minuto
      if (
        d.studySessions.some(
          (s) =>
            s.date === entry.date &&
            s.minutes === entry.minutes &&
            s.subject === entry.subject &&
            s.topic === entry.topic &&
            s.at &&
            entry.at &&
            Math.abs(new Date(s.at) - new Date(entry.at)) < 2000,
        )
      )
        return;
      d.studySessions.push(entry);
      d.xp += Math.max(1, Math.floor(m / 10));
      this._level(d);
      this._achievements(d);
    });
  },
  updateSession(id, patch) {
    return this.update((d) => {
      const s = d.studySessions.find((x) => x.id === id);
      if (!s) return;
      Object.assign(s, {
        ...patch,
        minutes: Math.max(0, Number(patch.minutes ?? s.minutes) || 0),
      });
    });
  },
  removeSession(id) {
    return this.update((d) => {
      d.studySessions = (d.studySessions || []).filter((x) => x.id !== id);
    });
  },
  addManualStudy({
    date,
    dayKey,
    minutes,
    note,
    subject,
    topic,
    questions,
    correct,
    type,
    origin,
  }) {
    const m = Math.max(0, Number(minutes) || 0),
      q = Math.max(0, Number(questions) || 0),
      c = Math.min(q, Math.max(0, Number(correct) || 0));
    return this.update((d) => {
      const entry = {
        id: uid(),
        date: date || todayISO(),
        dayKey: dayKey || date || todayISO(),
        minutes: m,
        note: note || "",
        subject: subject || "Manual",
        topic: topic || note || "Estudo manual",
        type: type || "estudo",
        origin: origin || "manual",
        questions: q,
        correct: c,
        at: new Date().toISOString(),
      };
      d.manualStudies.push(entry);
      if (m) d.studySessions.push({ ...entry });
      if (q) {
        d.quiz.answered += q;
        d.quiz.correct += c;
        d.quiz.wrong += q - c;
        const key = subject || "Manual";
        if (!d.quiz.bySubject[key])
          d.quiz.bySubject[key] = { answered: 0, correct: 0, wrong: 0 };
        d.quiz.bySubject[key].answered += q;
        d.quiz.bySubject[key].correct += c;
        d.quiz.bySubject[key].wrong += q - c;
        this._daily(d, entry.date, q, c, q - c);
      }
      d.xp += Math.max(1, Math.floor(m / 10)) + c * 2;
      this._level(d);
      this._achievements(d);
    });
  },
  recordQuiz({ correct, wrong, subject, date }) {
    return this.update((d) => {
      const c = Number(correct) || 0,
        w = Number(wrong) || 0;
      d.quiz.answered += c + w;
      d.quiz.correct += c;
      d.quiz.wrong += w;
      const k = subject || "Geral";
      if (!d.quiz.bySubject[k])
        d.quiz.bySubject[k] = { answered: 0, correct: 0, wrong: 0 };
      d.quiz.bySubject[k].answered += c + w;
      d.quiz.bySubject[k].correct += c;
      d.quiz.bySubject[k].wrong += w;
      this._daily(d, date || todayISO(), c + w, c, w);
      d.xp += c * 2 + w;
      this._level(d);
      this._achievements(d);
    });
  },
  setGoals({ minutes, questions }) {
    return this.update((d) => {
      d.goals = {
        minutes: Math.max(10, Number(minutes) || 90),
        questions: Math.max(1, Number(questions) || 20),
      };
    });
  },
  saveTimer(t) {
    return this.update((d) => {
      d.timer = t;
    });
  },
  clearTimer() {
    return this.update((d) => {
      d.timer = null;
    });
  },
  setRecoveryTarget(t) {
    return this.update((d) => {
      d.recoveryTarget = t;
    });
  },
  getFlashState(id) {
    return (this.get().flashcards || {})[id] || null;
  },
  reviewFlashcard(id, result) {
    return this.update((d) => {
      const t = todayISO(),
        cur = d.flashcards[id] || {
          box: 0,
          last: null,
          next: t,
          reviews: 0,
          fails: 0,
        };
      if (result === "know") cur.box = Math.min(3, (cur.box || 0) + 1);
      else {
        cur.box = 0;
        cur.fails = (cur.fails || 0) + 1;
      }
      cur.last = t;
      cur.next = addDaysISO(t, [1, 1, 7, 30][cur.box] || 30);
      cur.reviews = (cur.reviews || 0) + 1;
      d.flashcards[id] = cur;
      d.xp += result === "know" ? 2 : 1;
      this._level(d);
    });
  },
  addErro(e) {
    return this.update((d) => {
      const b = todayISO();
      const existing = e.questionId
        ? d.erros.find((item) => item.questionId === e.questionId)
        : null;
      if (existing) {
        existing.occurrences = (existing.occurrences || 1) + 1;
        existing.lastSeen = b;
        return;
      }
      d.erros.push({
        id: uid(),
        questionId: e.questionId || null,
        occurrences: 1,
        lastSeen: b,
        materia: e.materia || "",
        assunto: e.assunto || "",
        questao: e.questao || "",
        motivo: e.motivo || "",
        comentario: e.comentario || "",
        tipo: e.tipo || "atencao",
        createdAt: b,
        reviews: {
          d1: addDaysISO(b, 1),
          d7: addDaysISO(b, 7),
          d30: addDaysISO(b, 30),
        },
        done: { d1: false, d7: false, d30: false },
      });
    });
  },
  markErroReview(id, k) {
    return this.update((d) => {
      const e = d.erros.find((x) => x.id === id);
      if (e) e.done[k] = todayISO();
    });
  },
  removeErro(id) {
    return this.update((d) => {
      d.erros = d.erros.filter((x) => x.id !== id);
    });
  },
  addSimulado(r) {
    return this.update((d) => {
      const total = Number(r.total) || 0,
        correct = Number(r.correct) || 0,
        blank = Math.max(0, Number(r.blank) || 0),
        wrong = Math.max(
          0,
          Number.isFinite(Number(r.wrong))
            ? Number(r.wrong)
            : total - correct - blank,
        );
      d.simulados.push({
        id: uid(),
        tipo: r.tipo || "misto",
        total,
        correct,
        wrong,
        blank,
        minutes: r.minutes || 0,
        bySubject: r.bySubject || {},
        date: todayISO(),
        at: new Date().toISOString(),
      });
      d.quiz.answered += correct + wrong;
      d.quiz.correct += correct;
      d.quiz.wrong += wrong;
      this._daily(d, todayISO(), correct + wrong, correct, wrong);
      d.xp += correct * 3;
      this._level(d);
      this._achievements(d);
    });
  },
  markMaterialStudied(i) {
    return this.update((d) => {
      const e = {
        id: i.id,
        data: todayISO(),
        categoria: i.categoria || i.concurso || "",
        materia: i.materia || "",
        tipo: i.tipo || "",
      };
      d.materiaisEstudados = (d.materiaisEstudados || [])
        .filter((x) => x.id !== i.id)
        .concat(e);
      if (i.tipo === "prova")
        d.provasFeitas = (d.provasFeitas || [])
          .filter((x) => x.id !== i.id)
          .concat({ id: i.id, data: e.data, concurso: i.concurso || "" });
      d.xp += 3;
      this._level(d);
    });
  },
  isMaterialStudied(id) {
    return (this.get().materiaisEstudados || []).some((x) => x.id === id);
  },
  addMaterialRevisao(i) {
    return this.update((d) => {
      if (!(d.materiaisRevisao || []).some((x) => x.id === i.id))
        d.materiaisRevisao.push({
          id: i.id,
          titulo: i.titulo || "",
          materia: i.materia || "",
          categoria: i.categoria || "",
          tipo: i.tipo || "",
          url: i.url || "",
          addedAt: todayISO(),
        });
    });
  },
  removeMaterialRevisao(id) {
    return this.update((d) => {
      d.materiaisRevisao = (d.materiaisRevisao || []).filter(
        (x) => x.id !== id,
      );
    });
  },
  isInRevisao(id) {
    return (this.get().materiaisRevisao || []).some((x) => x.id === id);
  },
  closeDay(scheduleDate = todayISO(), studyDate = todayISO()) {
    return this.update((d) => {
      if (!d.dailySummaries) d.dailySummaries = {};
      const ss = (d.studySessions || []).filter(
          (s) => s.date === studyDate && (s.dayKey || s.date) === scheduleDate,
        ),
        ms = ss.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
        dq = d.dailyQuiz?.[studyDate],
        sj = [...new Set(ss.map((s) => s.subject).filter(Boolean))],
        tp = [...new Set(ss.map((s) => s.topic).filter(Boolean))],
        pi = Object.entries(d.taskStatus || {})
          .filter(
            ([k, v]) =>
              k.startsWith(`${scheduleDate}_`) &&
              !["concluida", "dispensada"].includes(v),
          )
          .map(([k]) => k);
      d.dailySummaries[scheduleDate] = {
        minutes: ms,
        questions: dq?.answered || 0,
        correct: dq?.correct || 0,
        reviews: (d.erros || []).filter((e) =>
          Object.values(e.done || {}).includes(studyDate),
        ).length,
        subjects: sj,
        topics: tp,
        pendingTasks: pi,
        studyDate,
        closedAt: new Date().toISOString(),
        partial: pi.length > 0,
      };
    });
  },
  getDailySummary(dc) {
    return (this.get().dailySummaries || {})[dc || todayISO()] || null;
  },
  getQuestionFlag(id) {
    const f = this.get().questionFlags || {};
    return f[id] || { favorite: false, doubt: false, updatedAt: null };
  },
  toggleQuestionFlag(id, k) {
    return this.update((d) => {
      if (!d.questionFlags) d.questionFlags = {};
      const c = d.questionFlags[id] || {
        favorite: false,
        doubt: false,
        updatedAt: null,
      };
      c[k] = !c[k];
      c.updatedAt = new Date().toISOString();
      d.questionFlags[id] = c;
    });
  },
  setCebraspeConfig(c) {
    return this.update((d) => {
      if (!d.cebraspeConfig)
        d.cebraspeConfig = { acerto: 1, erro: 0, branco: 0 };
      d.cebraspeConfig = { ...d.cebraspeConfig, ...c };
    });
  },
  getCebraspeScore(c, w, b) {
    const p = this.get(),
      cfg = p.cebraspeConfig || { acerto: 1, erro: 0, branco: 0 };
    const bruta = c * cfg.acerto,
      liq = bruta - w * cfg.erro + b * cfg.branco;
    return {
      bruta,
      liquida: liq,
      acertos: c,
      erros: w,
      brancos: b,
      config: cfg,
    };
  },
  setTaskStatus(tk, st) {
    return this.update((d) => {
      if (!d.taskStatus) d.taskStatus = {};
      d.taskStatus[tk] = st;
    });
  },
  getTaskStatus(tk) {
    return (this.get().taskStatus || {})[tk] || "pendente";
  },
  getUnitProgress(unitId) {
    const progress = this.get().unitProgress?.[unitId];
    return clone(progress || newUnitProgress());
  },
  transitionUnit(unitId, event) {
    if (!unitId || !event) return { ok: false, state: "nao_iniciada" };
    const data = this.get(),
      progress = data.unitProgress[unitId] || newUnitProgress(),
      attempt = data.unitAttempts.find((item) => item.id === progress.activeAttemptId),
      next = UNIT_TRANSITIONS[progress.state]?.[event];
    if (!next) return { ok: false, state: progress.state };
    if (
      (event === "concluir_checagem" || event === "concluir_pratica") &&
      (!attempt ||
        !attempt.finishedAt ||
        attempt.phase !==
          (event === "concluir_checagem" ? "checagem" : "pratica"))
    )
      return { ok: false, state: progress.state };
    if (
      event === "agendar_revisao" &&
      !data.unitReviews.some((review) => review.unitId === unitId)
    )
      return { ok: false, state: progress.state };
    if (
      event === "concluir_unidade" &&
      !data.unitReviews.some((review) => review.unitId === unitId)
    )
      return { ok: false, state: progress.state };

    const now = new Date().toISOString();
    progress.state =
      event === "concluir_pratica"
        ? attempt.result.wrong
          ? "correcao_pendente"
          : "pratica_concluida"
        : next;
    progress.updatedAt = now;
    if (event === "iniciar_leitura") progress.reading.startedAt = now;
    if (event === "concluir_leitura") progress.reading.completedAt = now;
    if (event === "iniciar_video") progress.video.startedAt = now;
    if (event === "concluir_video") progress.video.completedAt = now;
    data.unitProgress[unitId] = progress;
    try {
      this.set(data);
      return { ok: true, state: progress.state };
    } catch {
      return { ok: false, state: this.getUnitProgress(unitId).state };
    }
  },
  startUnitAttempt(unitId, phase, questionIds) {
    const data = this.get(),
      progress = data.unitProgress[unitId] || newUnitProgress(),
      activeAttempt = data.unitAttempts.find(
        (item) => item.id === progress.activeAttemptId,
      ),
      expectedState = `${phase}_em_andamento`;
    if (
      !unitId ||
      !["checagem", "pratica"].includes(phase) ||
      !Array.isArray(questionIds) ||
      !questionIds.length ||
      new Set(questionIds).size !== questionIds.length ||
      questionIds.some((id) => !id) ||
      progress.state !== expectedState ||
      (activeAttempt && !activeAttempt.finishedAt)
    )
      return { ok: false, state: progress.state };
    const attempt = {
      id: uid(),
      unitId,
      phase,
      number:
        data.unitAttempts.filter(
          (item) => item.unitId === unitId && item.phase === phase,
        ).length + 1,
      questionIds: [...questionIds],
      startedAt: new Date().toISOString(),
      finishedAt: null,
      answers: [],
      result: null,
      durationSeconds: null,
      performanceByObjective: {},
    };
    data.unitAttempts.push(attempt);
    progress.activeAttemptId = attempt.id;
    progress.updatedAt = attempt.startedAt;
    data.unitProgress[unitId] = progress;
    try {
      this.set(data);
      return { ok: true, state: progress.state, attemptId: attempt.id };
    } catch {
      return { ok: false, state: this.getUnitProgress(unitId).state };
    }
  },
  recordUnitAnswer(attemptId, answer) {
    const data = this.get(),
      attempt = data.unitAttempts.find((item) => item.id === attemptId),
      state = attempt
        ? data.unitProgress[attempt.unitId]?.state || "nao_iniciada"
        : "nao_iniciada";
    if (
      !attempt ||
      attempt.finishedAt ||
      !answer ||
      !attempt.questionIds.includes(answer.questionId) ||
      !Object.hasOwn(answer, "answer") ||
      typeof answer.correct !== "boolean" ||
      !Array.isArray(answer.objetivos) ||
      !answer.objetivos.length ||
      attempt.answers.some((item) => item.questionId === answer.questionId)
    )
      return { ok: false, state };
    attempt.answers.push({ ...clone(answer), answeredAt: new Date().toISOString() });
    try {
      this.set(data);
      return { ok: true, state };
    } catch {
      return { ok: false, state };
    }
  },
  finishUnitAttempt(attemptId) {
    const data = this.get(),
      attempt = data.unitAttempts.find((item) => item.id === attemptId),
      state = attempt
        ? data.unitProgress[attempt.unitId]?.state || "nao_iniciada"
        : "nao_iniciada";
    if (
      !attempt ||
      attempt.finishedAt ||
      attempt.questionIds.some(
        (questionId) =>
          !attempt.answers.some((answer) => answer.questionId === questionId),
      )
    )
      return { ok: false, state };
    const finishedAt = new Date().toISOString(),
      correct = attempt.answers.filter((answer) => answer.correct).length;
    attempt.finishedAt = finishedAt;
    attempt.result = {
      answered: attempt.answers.length,
      correct,
      wrong: attempt.answers.length - correct,
    };
    attempt.durationSeconds = Math.max(
      0,
      Math.round((new Date(finishedAt) - new Date(attempt.startedAt)) / 1000),
    );
    attempt.answers.forEach((answer) =>
      answer.objetivos.forEach((objetivo) => {
        const performance = attempt.performanceByObjective[objetivo] || {
          answered: 0,
          correct: 0,
          wrong: 0,
        };
        performance.answered++;
        performance[answer.correct ? "correct" : "wrong"]++;
        attempt.performanceByObjective[objetivo] = performance;
      }),
    );
    try {
      this.set(data);
      return { ok: true, state, result: clone(attempt.result) };
    } catch {
      return { ok: false, state };
    }
  },
  scheduleUnitReview(review) {
    const data = this.get(),
      progress = data.unitProgress[review?.unitId] || newUnitProgress();
    if (
      progress.state !== "correcao_concluida" ||
      !Array.isArray(review?.objetivos) ||
      !review.objetivos.length ||
      !/^\d{4}-\d{2}-\d{2}$/.test(review.scheduledDate || "") ||
      Number.isNaN(Date.parse(`${review.scheduledDate}T00:00:00Z`)) ||
      !review.reason
    )
      return { ok: false, state: progress.state };
    const createdAt = new Date().toISOString();
    data.unitReviews.push({
      id: uid(),
      unitId: review.unitId,
      objetivos: [...review.objetivos],
      scheduledDate: review.scheduledDate,
      reason: review.reason,
      status: "pendente",
      createdAt,
    });
    progress.state = "revisao_agendada";
    progress.updatedAt = createdAt;
    data.unitProgress[review.unitId] = progress;
    try {
      this.set(data);
      return { ok: true, state: progress.state };
    } catch {
      return { ok: false, state: this.getUnitProgress(review.unitId).state };
    }
  },
  exportJSON() {
    return JSON.stringify(this.get(), null, 2);
  },
  importJSON(t) {
    const p = JSON.parse(t);
    if (!p || typeof p !== "object" || Array.isArray(p))
      throw new Error("Backup deve ser um objeto JSON.");
    for (const key of ["studyDays", "studySessions", "erros", "simulados", "achievements", "manualStudies", "materiaisEstudados", "materiaisRevisao", "provasFeitas", "unitAttempts", "unitReviews"])
      if (p[key] != null && !Array.isArray(p[key]))
        throw new Error(`Coleção inválida: ${key}.`);
    for (const key of ["dayStatus", "quiz", "dailyQuiz", "goals", "flashcards", "editalProgress", "dailySummaries", "questionFlags", "cebraspeConfig", "taskStatus", "unitProgress"])
      if (p[key] != null && (!p[key] || typeof p[key] !== "object" || Array.isArray(p[key])))
        throw new Error(`Objeto inválido: ${key}.`);
    const d = this.migrate({ ...clone(DEFAULT_PROGRESS), ...p });
    this.set(d);
    return d;
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
  _daily(d, date, a, c, w) {
    if (!d.dailyQuiz) d.dailyQuiz = {};
    if (!d.dailyQuiz[date])
      d.dailyQuiz[date] = { answered: 0, correct: 0, wrong: 0 };
    d.dailyQuiz[date].answered += a;
    d.dailyQuiz[date].correct += c;
    d.dailyQuiz[date].wrong += w;
  },
  _level(d) {
    d.level = Math.max(1, Math.floor(d.xp / 50) + 1);
  },
  _achievements(d) {
    const s = computeStats(d),
      list = [
        ["first-day", s.diasEstudados >= 1],
        ["streak-3", s.sequenciaAtual >= 3],
        ["streak-7", s.sequenciaAtual >= 7],
        ["q50", d.quiz.answered >= 50],
        ["q100", d.quiz.answered >= 100],
        ["sim1", d.simulados.length >= 1],
        ["hours10", s.horasEstudadas >= 10],
        ["level5", d.level >= 5],
      ];
    list.forEach(([id, ok]) => {
      if (ok && !d.achievements.includes(id)) d.achievements.push(id);
    });
  },
  // aliases p/ código legado
  _bumpDailyQuiz(d, date, a, c, w) {
    return this._daily(d, date, a, c, w);
  },
  _recalcLevel(d) {
    return this._level(d);
  },
  _checkAchievements(d) {
    return this._achievements(d);
  },
};
function getWeakSubjects(p = Storage.get(), min = 3) {
  return Object.entries(p.quiz?.bySubject || {})
    .map(([materia, v]) => {
      const answered = v.answered || 0,
        correct = v.correct || 0;
      return {
        materia,
        answered,
        correct,
        wrong: v.wrong || 0,
        pct: answered ? Math.round((correct / answered) * 100) : 0,
      };
    })
    .filter((x) => x.answered >= min)
    .sort((a, b) => a.pct - b.pct || b.answered - a.answered);
}
function getDueErros(p = Storage.get(), date = todayISO()) {
  return (p.erros || [])
    .filter(
      (e) =>
        e.reviews &&
        e.done &&
        ((!e.done.d1 && e.reviews.d1 <= date) ||
          (!e.done.d7 && e.reviews.d7 <= date) ||
          (!e.done.d30 && e.reviews.d30 <= date)),
    )
    .map((e) => ({
      ...e,
      dueKeys: [
        !e.done.d1 && e.reviews.d1 <= date ? "D+1" : null,
        !e.done.d7 && e.reviews.d7 <= date ? "D+7" : null,
        !e.done.d30 && e.reviews.d30 <= date ? "D+30" : null,
      ].filter(Boolean),
    }));
}
function getTodayGoals(p = Storage.get()) {
  const t = todayISO(),
    g = p.goals || { minutes: 90, questions: 20 },
    minutesDone = (p.studySessions || [])
      .filter((s) => s.date === t)
      .reduce((a, s) => a + (Number(s.minutes) || 0), 0),
    q = (p.dailyQuiz || {})[t] || { answered: 0, correct: 0 };
  return {
    minutesGoal: g.minutes,
    questionsGoal: g.questions,
    minutesDone,
    questionsDone: q.answered || 0,
    questionsCorrect: q.correct || 0,
    minutesPct: Math.min(100, Math.round((minutesDone / g.minutes) * 100)),
    questionsPct: Math.min(
      100,
      Math.round(((q.answered || 0) / g.questions) * 100),
    ),
    minutesOk: minutesDone >= g.minutes,
    questionsOk: (q.answered || 0) >= g.questions,
    allOk: minutesDone >= g.minutes && (q.answered || 0) >= g.questions,
  };
}
function getWeeklyReport(p = Storage.get()) {
  const t = todayISO(),
    days = [];
  for (let i = 6; i >= 0; i--) days.push(addDaysISO(t, -i));
  const sessions = (p.studySessions || []).filter((s) => days.includes(s.date)),
    minutes = sessions.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
    studied = new Set(sessions.map((s) => s.date));
  let q = 0,
    c = 0,
    w = 0;
  days.forEach((d) => {
    const x = p.dailyQuiz?.[d];
    if (x) {
      q += x.answered || 0;
      c += x.correct || 0;
      w += x.wrong || 0;
      if (x.answered) studied.add(d);
    }
  });
  const faltas = days.filter(
      (d) =>
        d < t &&
        isStudyDate(d, p) &&
        !studied.has(d) &&
        ["faltou", "pendente", undefined].includes(p.dayStatus[d]),
    ).length,
    weak = getWeakSubjects(p, 2).slice(0, 3),
    due = getDueErros(p),
    actions = [];
  if (due.length) actions.push(`Revisar ${due.length} erro(s) vencido(s)`);
  if (weak[0])
    actions.push(`Treinar fraco: ${weak[0].materia} (${weak[0].pct}%)`);
  if (minutes < 300) actions.push("Aumentar gradualmente o volume de estudo");
  if (q < 50) actions.push("Fazer mais questões na próxima semana");
  if (!actions.length) actions.push("Manter o ritmo e fazer um simulado");
  return {
    from: days[0],
    to: t,
    minutes,
    hours: Math.round(minutes / 6) / 10,
    questions: q,
    correct: c,
    wrong: w,
    pct: q ? Math.round((c / q) * 100) : 0,
    daysStudied: studied.size,
    faltas,
    weak,
    dueCount: due.length,
    nextActions: actions,
    sessions: sessions.length,
  };
}
function computeStats(p = Storage.get()) {
  const sessions = p.studySessions || [],
    dates = [...new Set(sessions.map((s) => s.date))].sort(),
    minutes = sessions.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
    planned = dates.filter((d) => isStudyDate(d, p));
  let seq = 0,
    cursor =
      isStudyDate(todayISO(), p) && planned.includes(todayISO())
        ? todayISO()
        : previousStudyDate(todayISO(), p);
  while (planned.includes(cursor)) {
    seq++;
    cursor = previousStudyDate(cursor, p);
  }
  let best = 0,
    run = 0,
    prev = null;
  planned.forEach((d) => {
    run =
      prev && countStudyDatesBefore(addDaysISO(prev, 1), d, p) === 0
        ? run + 1
        : 1;
    best = Math.max(best, run);
    prev = d;
  });
  const past = plannedPastDates(p),
    statuses = past.map((d) => getDayStatus(d, p)),
    faltas = statuses.filter((s) => s === "faltou").length,
    atrasos = statuses.filter((s) => ["faltou", "parcial"].includes(s)).length,
    a = p.quiz.answered || 0,
    c = p.quiz.correct || 0;
  return {
    diasEstudados: dates.length,
    sequenciaAtual: seq,
    maiorSequencia: best,
    horasEstudadas: Math.round(minutes / 6) / 10,
    minutosEstudados: minutes,
    questoesResolvidas: a,
    acertos: c,
    erros: p.quiz.wrong || 0,
    percentualAcertos: a ? Math.round((c / a) * 100) : 0,
    diasFaltados: faltas,
    diasAtraso: atrasos,
    simuladosRealizados: (p.simulados || []).length,
    nivel: p.level || 1,
    xp: p.xp || 0,
    achievements: p.achievements || [],
  };
}
Object.assign(window, {
  Storage,
  computeStats,
  getWeakSubjects,
  getDueErros,
  getTodayGoals,
  getWeeklyReport,
});
