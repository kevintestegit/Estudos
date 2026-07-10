#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
let fails = 0;
const log = (ok, msg) => {
  console.log(`${ok ? 'OK' : 'FAIL'}  ${msg}`);
  if (!ok) fails++;
};

function load(name) {
  const p = path.join(dataDir, name);
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

// JSON parse all
for (const f of fs.readdirSync(dataDir).filter((x) => x.endsWith('.json'))) {
  try {
    load(f);
    log(true, `JSON ${f}`);
  } catch (e) {
    log(false, `JSON ${f}: ${e.message}`);
  }
}

const inss = load('questoes-inss.json').questoes || [];
const prf = load('questoes-prf.json').questoes || [];
const all = [...inss, ...prf];
const ids = new Set();
let dup = 0;
for (const q of all) {
  if (ids.has(q.id)) dup++;
  ids.add(q.id);
  if (!q.gabarito && q.gabarito !== 0) log(false, `sem gabarito: ${q.id}`);
  if (q.tipo === 'me' && (!q.alternativas || q.alternativas.length < 2)) log(false, `ME sem alternativas: ${q.id}`);
}
log(dup === 0, `IDs únicos (${all.length} questões, dups=${dup})`);

// policial content scan
const banned = /Legislação de Trânsito|Primeiros Socorros|Física\/Mecânica|crimes de trânsito|\bCTB\b|sinalização de trânsito/i;
let bannedHits = 0;
for (const f of ['cronograma.json', 'materias.json', 'aulas.json', 'pdfs.json', 'flashcards.json', 'materiais.json', 'questoes-prf.json']) {
  const raw = fs.readFileSync(path.join(dataDir, f), 'utf8');
  if (banned.test(raw)) {
    bannedHits++;
    log(false, `conteúdo policial residual em ${f}`);
  } else log(true, `sem policial em ${f}`);
}

// simulados refs
const sims = load('simulados.json').simulados || [];
for (const s of sims) {
  const miss = (s.questaoIds || []).filter((id) => !ids.has(id));
  log(miss.length === 0, `simulado ${s.id}: ${s.questaoIds?.length || 0} q, miss=${miss.length}`);
}

// cronograma structure
const crono = load('cronograma.json');
log((crono.days || []).length === 96, `cronograma 96 dias (${crono.days?.length})`);
log(!fs.existsSync(path.join(root, 'assets/js/schedule-fix.js')), 'schedule-fix.js removido');

// edital
const edInss = load('edital-inss.json');
const edPrf = load('edital-prf-administrativo.json');
log((edInss.topicos || []).length >= 20, `edital INSS ${edInss.topicos?.length}`);
log((edPrf.topicos || []).length >= 15, `edital PRF Adm ${edPrf.topicos?.length}`);

console.log(fails ? `\n${fails} falha(s)` : '\nValidação OK');
process.exit(fails ? 1 : 0);
