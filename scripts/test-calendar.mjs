#!/usr/bin/env node
// Testes de calendário (espelham lógica de storage.js)

function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function addDaysISO(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekdayISO(iso) {
  return new Date(iso + 'T12:00:00').getDay();
}
function isStudyDate(date, p) {
  return !!p.startDate && date >= p.startDate && (p.studyDays || [1, 2, 3, 4, 5, 6]).includes(weekdayISO(date));
}
function plannedPastDates(p, today = todayISO()) {
  if (!p.startDate) return [];
  const out = [];
  for (let d = p.startDate; d < today; d = addDaysISO(d, 1)) if (isStudyDate(d, p)) out.push(d);
  return out;
}
function countStudyDatesBefore(start, end, p) {
  let n = 0;
  for (let d = start; d < end; d = addDaysISO(d, 1)) if (isStudyDate(d, p)) n++;
  return n;
}

let fails = 0;
function assert(cond, msg) {
  console.log(`${cond ? 'OK' : 'FAIL'}  ${msg}`);
  if (!cond) fails++;
}

// domingo = 0 não é estudo por padrão
const p = { startDate: '2026-07-06', studyDays: [1, 2, 3, 4, 5, 6] }; // segunda
assert(!isStudyDate('2026-07-05', p), 'domingo não é estudo (antes do start)');
assert(isStudyDate('2026-07-06', p), 'segunda é estudo');
assert(!isStudyDate('2026-07-12', p), 'domingo não é estudo');
assert(isStudyDate('2026-07-13', p), 'segunda seguinte é estudo');

// data futura: start no futuro
const fut = { startDate: '2026-08-01', studyDays: [1, 2, 3, 4, 5, 6] };
assert(plannedPastDates(fut, '2026-07-10').length === 0, 'start futuro: zero past planned');

// past dates only before today
const past = plannedPastDates({ startDate: '2026-07-06', studyDays: [1, 2, 3, 4, 5, 6] }, '2026-07-10');
assert(past.includes('2026-07-06') && past.includes('2026-07-09') && !past.includes('2026-07-10'), 'past não inclui hoje');
assert(!past.includes('2026-07-12'), 'past não inclui futuro');

// índice de dias de estudo
assert(countStudyDatesBefore('2026-07-06', '2026-07-13', p) === 6, '6 dias de estudo em 1 semana útil');

// ano bissexto
assert(addDaysISO('2024-02-28', 1) === '2024-02-29', 'bissexto +1');
assert(addDaysISO('2024-02-29', 1) === '2024-03-01', 'bissexto +1 mar');

// virada de ano
assert(addDaysISO('2025-12-31', 1) === '2026-01-01', 'virada de ano');

console.log(fails ? `\n${fails} falha(s)` : '\nTestes de calendário OK');
process.exit(fails ? 1 : 0);
