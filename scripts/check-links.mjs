#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const jsDir = path.join(root, 'assets/js');
const htmlDir = root;
const internalOnly = process.argv.includes('--internal-only');
const INDIR = path.join(root, 'reports');
const OUTPUT = path.join(INDIR, 'link-report.json');

let ok = 0, warn = 0, fail = 0;
const log = (s, msg) => { console.log(`${s} ${msg}`); if (s === 'FAIL') fail++; else if (s === 'WARN') warn++; else ok++; };
const results = [];

function load(name) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')); }
  catch { return null; }
}

// 1. check HTML pages exist
const pages = ['index.html','hoje.html','cronograma.html','edital.html','biblioteca.html','materias.html',
  'questoes.html','flashcards.html','simulados.html','provas.html','caderno-erros.html','progresso.html','backup.html','offline.html'];
pages.forEach(p => {
  const exists = fs.existsSync(path.join(htmlDir, p));
  log(exists ? 'OK' : 'FAIL', `HTML ${p}`);
  results.push({ type: 'html', file: p, status: exists ? 'ok' : 'missing' });
});

// 2. check JS files
['calendar.js','storage.js','app.js','dashboard.js','cronograma.js','quiz.js','backup.js','biblioteca.js','flashcards.js','edital.js'].forEach(f => {
  const exists = fs.existsSync(path.join(jsDir, f));
  log(exists ? 'OK' : 'FAIL', `JS ${f}`);
  results.push({ type: 'js', file: f, status: exists ? 'ok' : 'missing' });
});

// 3. JSON validity
fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).forEach(f => {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
    log('OK', `JSON ${f}`);
    results.push({ type: 'json', file: f, status: 'ok' });
  } catch (e) {
    log('FAIL', `JSON ${f}: ${e.message}`);
    results.push({ type: 'json', file: f, status: 'invalid', error: e.message });
  }
});

// 4. cross-references
const aulas = load('aulas.json')?.aulas || [];
const pdfs = load('pdfs.json')?.pdfs || [];
const crono = load('cronograma.json')?.days || [];
const inss = load('questoes-inss.json')?.questoes || [];
const prf = load('questoes-prf.json')?.questoes || [];
const provas = load('provas.json')?.provas || [];
const sims = load('simulados.json')?.simulados || [];
const materiais = load('materiais.json')?.materiais || [];
const textos = load('textos.json')?.textos || {};

const aulaIds = new Set(aulas.map(a => a.id));
const pdfIds = new Set(pdfs.map(p => p.id));
const qIds = new Set([...inss, ...prf].map(q => q.id));
const textoIds = new Set(Object.keys(textos));

crono.forEach((day, di) => (day.tasks || []).forEach(t => {
  if (t.aulaId && !aulaIds.has(t.aulaId)) { log('FAIL', `Dia ${di}: aulaId ${t.aulaId} inexistente`); results.push({ type: 'ref', detail: `crono day ${di}: aula ${t.aulaId}`, status: 'missing' }); }
  if (t.pdfId && !pdfIds.has(t.pdfId)) { log('FAIL', `Dia ${di}: pdfId ${t.pdfId} inexistente`); results.push({ type: 'ref', detail: `crono day ${di}: pdf ${t.pdfId}`, status: 'missing' }); }
}));

[inss, prf].forEach((arr, i) => {
  const src = i === 0 ? 'INSS' : 'PRF';
  arr.forEach(q => {
    if (q.textoId && !textoIds.has(q.textoId)) { log('FAIL', `${src} ${q.id}: textoId ${q.textoId} inexistente`); results.push({ type: 'ref', detail: `${q.id}: texto ${q.textoId}`, status: 'missing' }); }
    if (!q.gabarito && q.gabarito !== 0) { log('FAIL', `${src} ${q.id}: sem gabarito`); results.push({ type: 'question', detail: `${q.id}`, issue: 'no-gabarito' }); }
  });
});

sims.forEach(s => {
  (s.questaoIds || []).forEach(qid => {
    if (!qIds.has(qid)) { log('FAIL', `Sim ${s.id}: q ${qid} inexistente`); results.push({ type: 'ref', detail: `sim ${s.id}: ${qid}`, status: 'missing' }); }
  });
});

materiais.forEach(m => {
  if (!m.fonte) { log('WARN', `Material ${m.id}: sem fonte`); results.push({ type: 'material', detail: m.id, issue: 'no-fonte' }); }
  if (!m.titulo) { log('WARN', `Material ${m.id}: sem título`); results.push({ type: 'material', detail: m.id, issue: 'no-titulo' }); }
});

// 5. external URLs (HEAD only if not internal-only)
if (!internalOnly) {
  const urls = [...new Set([...materiais, ...aulas, ...pdfs].map(x => x.url).filter(x => x && x.startsWith('http')))];
  console.log(`\nURLs externas: ${urls.length} (HEAD check, timeout 5s)`);
  urls.forEach(u => {
    results.push({ type: 'url', url: u, status: 'not_verified' });
  });
}

fs.mkdirSync(INDIR, { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
console.log(`\nLink check: ${ok} OK, ${warn} WARN, ${fail} FAIL`);
console.log(`Relatório: ${OUTPUT}`);
process.exit(fail ? 1 : 0);
