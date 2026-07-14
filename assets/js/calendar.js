(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis, function () {
  function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function addDaysISO(iso, amount) {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function daysBetween(from, to) {
    return Math.round(
      (new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000,
    );
  }

  function weekdayISO(iso) {
    return new Date(`${iso}T12:00:00`).getDay();
  }

  function normalizeStartDate(startDate, studyDays) {
    const days = [...new Set((studyDays || []).map(Number))];
    if (!startDate || !days.length) return startDate;
    let date = startDate;
    while (!days.includes(weekdayISO(date))) date = addDaysISO(date, 1);
    return date;
  }

  function isStudyDate(date, progress) {
    const days = progress?.studyDays || [1, 2, 3, 4, 5, 6];
    return Boolean(
      progress?.startDate &&
        date >= progress.startDate &&
        days.includes(weekdayISO(date)),
    );
  }

  function countStudyDatesBefore(start, end, progress) {
    let count = 0;
    for (let date = start; date < end; date = addDaysISO(date, 1)) {
      if (isStudyDate(date, progress)) count++;
    }
    return count;
  }

  function plannedPastDates(progress, today = todayISO()) {
    if (!progress?.startDate) return [];
    const dates = [];
    for (
      let date = progress.startDate;
      date < today;
      date = addDaysISO(date, 1)
    ) {
      if (isStudyDate(date, progress)) dates.push(date);
    }
    return dates;
  }

  function previousStudyDate(date, progress) {
    let previous = addDaysISO(date, -1);
    while (previous >= progress.startDate && !isStudyDate(previous, progress))
      previous = addDaysISO(previous, -1);
    return previous;
  }

  function studyDateAt(start, index, progress) {
    let date = normalizeStartDate(start, progress.studyDays);
    let count = 0;
    while (count < index) {
      date = addDaysISO(date, 1);
      if (
        isStudyDate(date, {
          ...progress,
          startDate: normalizeStartDate(start, progress.studyDays),
        })
      )
        count++;
    }
    return date;
  }

  function getDayActivity(date, progress = {}) {
    const sessions = (progress.studySessions || []).filter(
      (session) => session.date === date || session.dayKey === date,
    );
    const summary = progress.dailySummaries?.[date] || {};
    const quiz = progress.dailyQuiz?.[date] || {};
    const taskEntries = Object.entries(progress.taskStatus || {}).filter(
      ([key]) => key.startsWith(`${date}_`),
    );
    const completedTasks = taskEntries.filter(([, status]) =>
      ["concluida", "dispensada"].includes(status),
    ).length;
    const reviews =
      Number(summary.reviews) ||
      (progress.erros || []).filter((error) =>
        Object.values(error.done || {}).includes(date),
      ).length;
    return {
      minutes: sessions.reduce(
        (total, session) => total + (Number(session.minutes) || 0),
        0,
      ),
      questions: Number(quiz.answered) || Number(summary.questions) || 0,
      reviews,
      completedTasks,
      summary: Boolean(progress.dailySummaries?.[date]),
      hasActivity: false,
    };
  }

  function getDayStatus(date, progress = {}, today = todayISO()) {
    const saved = progress.dayStatus?.[date];
    if (["concluido", "recuperado"].includes(saved)) return saved;
    const activity = getDayActivity(date, progress);
    activity.hasActivity =
      activity.minutes > 0 ||
      activity.questions > 0 ||
      activity.reviews > 0 ||
      activity.completedTasks > 0 ||
      activity.summary;
    if (date > today) return "pendente";
    if (date === today)
      return activity.hasActivity || saved === "em_andamento"
        ? "em_andamento"
        : "pendente";
    return activity.hasActivity ? "parcial" : "faltou";
  }

  return {
    addDaysISO,
    countStudyDatesBefore,
    daysBetween,
    getDayActivity,
    getDayStatus,
    isStudyDate,
    normalizeStartDate,
    plannedPastDates,
    previousStudyDate,
    studyDateAt,
    todayISO,
    weekdayISO,
  };
});
