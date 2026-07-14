#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let calendar = {};
try {
  calendar = require("../assets/js/calendar.js");
} catch {}

const {
  addDaysISO,
  countStudyDatesBefore,
  getDayActivity,
  getDayStatus,
  isStudyDate,
  normalizeStartDate,
  plannedPastDates,
  studyDateAt,
} = calendar;

let fails = 0;
function assert(condition, message) {
  console.log(`${condition ? "OK" : "FAIL"}  ${message}`);
  if (!condition) fails++;
}

assert(
  typeof normalizeStartDate === "function",
  "usa módulo compartilhado de calendário",
);

if (typeof normalizeStartDate === "function") {
  assert(
    normalizeStartDate("2026-07-13", [1, 2, 3, 4, 5]) === "2026-07-13",
    "segunda habilitada permanece igual",
  );
  assert(
    normalizeStartDate("2026-07-12", [1, 2, 3, 4, 5, 6]) === "2026-07-13",
    "domingo desabilitado avança para segunda",
  );
  assert(
    normalizeStartDate("2026-07-11", [1, 2, 3, 4, 5]) === "2026-07-13",
    "sábado com plano útil avança para segunda",
  );
  assert(
    normalizeStartDate("2026-08-02", [1, 2, 3, 4, 5]) === "2026-08-03",
    "data futura também é normalizada",
  );
  assert(
    normalizeStartDate("2024-02-29", [4]) === "2024-02-29",
    "preserva dia bissexto habilitado",
  );
  assert(
    normalizeStartDate("2026-07-31", [1]) === "2026-08-03",
    "normaliza na virada do mês",
  );
  assert(
    normalizeStartDate("2027-12-31", [1]) === "2028-01-03",
    "normaliza na virada do ano",
  );

  const weekdays = { startDate: "2026-07-13", studyDays: [1, 2, 3, 4, 5] };
  const sixDays = { startDate: "2026-07-13", studyDays: [1, 2, 3, 4, 5, 6] };
  const sunday = { startDate: "2026-07-12", studyDays: [0] };
  assert(isStudyDate("2026-07-13", weekdays), "segunda é dia de estudo");
  assert(
    !isStudyDate("2026-07-18", weekdays),
    "sábado é descanso no plano útil",
  );
  assert(
    isStudyDate("2026-07-18", sixDays),
    "sábado é estudo no plano de segunda a sábado",
  );
  assert(isStudyDate("2026-07-12", sunday), "domingo habilitado é estudo");
  assert(
    studyDateAt("2026-07-13", 5, weekdays) === "2026-07-20",
    "Dia 6 cai na segunda seguinte",
  );
  assert(
    countStudyDatesBefore("2026-07-13", "2026-07-20", weekdays) === 5,
    "conta cinco dias úteis",
  );
  assert(
    plannedPastDates(
      { startDate: "2026-08-03", studyDays: [1, 2, 3, 4, 5] },
      "2026-07-13",
    ).length === 0,
    "início futuro não cria faltas",
  );
  assert(addDaysISO("2024-02-28", 1) === "2024-02-29", "ano bissexto");
  assert(addDaysISO("2026-12-31", 1) === "2027-01-01", "virada de ano");

  const base = {
    dayStatus: {},
    studySessions: [],
    dailyQuiz: {},
    erros: [],
    taskStatus: {},
    dailySummaries: {},
  };
  assert(
    getDayStatus("2026-07-10", base, "2026-07-13") === "faltou",
    "dia passado sem atividade é falta",
  );

  const withSession = {
    ...base,
    studySessions: [{ date: "2026-07-10", minutes: 35 }],
  };
  assert(
    getDayActivity("2026-07-10", withSession).minutes === 35,
    "atividade soma minutos reais",
  );
  assert(
    getDayStatus("2026-07-10", withSession, "2026-07-13") === "parcial",
    "sessão sem conclusão é parcial",
  );

  const withQuestions = {
    ...base,
    dailyQuiz: { "2026-07-10": { answered: 4, correct: 3 } },
  };
  assert(
    getDayStatus("2026-07-10", withQuestions, "2026-07-13") === "parcial",
    "questões impedem falta completa",
  );

  const withReview = {
    ...base,
    erros: [{ createdAt: "2026-07-01", done: { d1: "2026-07-10" } }],
  };
  assert(
    getDayStatus("2026-07-10", withReview, "2026-07-13") === "parcial",
    "revisão impede falta completa",
  );

  const withTask = { ...base, taskStatus: { "2026-07-10_0": "concluida" } };
  assert(
    getDayStatus("2026-07-10", withTask, "2026-07-13") === "parcial",
    "tarefa concluída impede falta completa",
  );

  assert(
    getDayStatus("2026-07-13", withSession, "2026-07-13") === "pendente",
    "atividade de outro dia não inicia hoje",
  );
  const todaySession = {
    ...base,
    studySessions: [{ date: "2026-07-13", minutes: 5 }],
  };
  assert(
    getDayStatus("2026-07-13", todaySession, "2026-07-13") === "em_andamento",
    "atividade de hoje fica em andamento",
  );
  assert(
    getDayStatus(
      "2026-07-10",
      { ...base, dayStatus: { "2026-07-10": "concluido" } },
      "2026-07-13",
    ) === "concluido",
    "conclusão explícita é preservada",
  );
  assert(
    getDayStatus(
      "2026-07-10",
      { ...base, dayStatus: { "2026-07-10": "recuperado" } },
      "2026-07-13",
    ) === "recuperado",
    "recuperação é preservada",
  );
}

console.log(fails ? `\n${fails} falha(s)` : "\nTestes de calendário OK");
process.exit(fails ? 1 : 0);
