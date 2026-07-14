#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
let fails = 0;
const log = (ok, msg) => {
  console.log(`${ok ? "OK" : "FAIL"}  ${msg}`);
  if (!ok) fails++;
};
const warn = (msg) => console.log(`WARN  ${msg}`);

function load(name) {
  const p = path.join(dataDir, name);
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

// JSON parse all
for (const f of fs.readdirSync(dataDir).filter((x) => x.endsWith(".json"))) {
  try {
    load(f);
    log(true, `JSON ${f}`);
  } catch (e) {
    log(false, `JSON ${f}: ${e.message}`);
  }
}

const inss = load("questoes-inss.json").questoes || [];
const prf = load("questoes-prf.json").questoes || [];
const all = [...inss, ...prf];
const ids = new Set();
let dup = 0;
for (const q of all) {
  if (ids.has(q.id)) dup++;
  ids.add(q.id);
  if (!q.gabarito && q.gabarito !== 0) log(false, `sem gabarito: ${q.id}`);
  if (q.tipo === "me" && (!q.alternativas || q.alternativas.length < 2))
    log(false, `ME sem alternativas: ${q.id}`);
  if (!String(q.comentario || "").trim()) log(false, `sem resolução: ${q.id}`);
}
log(dup === 0, `IDs únicos (${all.length} questões, dups=${dup})`);

const aulas = load("aulas.json").aulas || [];
const pdfs = load("pdfs.json").pdfs || [];
const materiais = load("materiais.json").materiais || [];
const provas = load("provas.json").provas || [];
const contentGroups = { aulas, pdfs, materiais, provas };
for (const [group, items] of Object.entries(contentGroups)) {
  const seen = new Set();
  for (const item of items) {
    log(
      Boolean(item.id) && !seen.has(item.id),
      `${group}: ID único ${item.id || "(vazio)"}`,
    );
    seen.add(item.id);
  }
}

log(aulas.length === 69, `aulas: total 69 (${aulas.length})`);
for (const aula of aulas) {
  log(["video", "playlist", "indisponivel"].includes(aula.tipo), `aula com tipo válido: ${aula.id}`);
  log(!("yt" in aula), `aula sem campo yt: ${aula.id}`);
  log(!/youtube\.com\/results|[?&]search_query=/i.test(aula.url || ""), `aula sem pesquisa: ${aula.id}`);
  log(aula.verificadoEm === "2026-07-14", `aula com data real: ${aula.id}`);
  if (aula.tipo === "indisponivel") {
    log(aula.url === null, `aula indisponível sem link: ${aula.id}`);
    continue;
  }
  const parsed = new URL(aula.url);
  const id = aula.tipo === "video" ? parsed.searchParams.get("v") : parsed.searchParams.get("list");
  const stored = aula.tipo === "video" ? aula.videoId : aula.playlistId;
  log(id === stored, `aula com ID correspondente: ${aula.id}`);
  log(Boolean(aula.canal && aula.tituloYoutube && aula.verificadoEm), `aula com metadados obrigatórios: ${aula.id}`);
}

const badVideo = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
log(
  !aulas.some((a) => a.url === badVideo || a.yt === badVideo),
  "sem videoaula conhecida incorreta",
);
const videosByUrl = new Map();
for (const aula of aulas) {
  if (!/^https:\/\/www\.youtube\.com\/watch\?v=/.test(aula.url || "")) continue;
  const list = videosByUrl.get(aula.url) || [];
  list.push(aula);
  videosByUrl.set(aula.url, list);
}
for (const [url, list] of videosByUrl) {
  if (list.length > 1)
    warn(
      `videoaula duplicada (${list.length}): ${url} — ${list.map((a) => a.id).join(", ")}`,
    );
}

for (const item of pdfs) {
  const isPdf =
    /\.pdf(?:$|[?#])/i.test(item.url || "") ||
    String(item.url || "").startsWith("materiais/");
  log(
    ["pdf", "legislacao", "fonte", "indisponivel"].includes(item.tipo),
    `tipo válido: ${item.id}`,
  );
  log(item.tipo !== "pdf" || isPdf, `PDF aponta para arquivo: ${item.id}`);
  log(isPdf || item.paginas == null, `páginas apenas em PDF: ${item.id}`);
}
for (const item of materiais)
  log(Boolean(item.fonte), `material com fonte: ${item.id}`);

// policial content scan
const banned =
  /Legislação de Trânsito|Primeiros Socorros|Física\/Mecânica|crimes de trânsito|\bCTB\b|sinalização de trânsito/i;
let bannedHits = 0;
for (const f of [
  "cronograma.json",
  "materias.json",
  "aulas.json",
  "pdfs.json",
  "flashcards.json",
  "materiais.json",
  "questoes-prf.json",
]) {
  const raw = fs.readFileSync(path.join(dataDir, f), "utf8");
  if (banned.test(raw)) {
    bannedHits++;
    log(false, `conteúdo policial residual em ${f}`);
  } else log(true, `sem policial em ${f}`);
}

// simulados refs
const sims = load("simulados.json").simulados || [];
for (const s of sims) {
  const miss = (s.questaoIds || []).filter((id) => !ids.has(id));
  log(
    miss.length === 0,
    `simulado ${s.id}: ${s.questaoIds?.length || 0} q, miss=${miss.length}`,
  );
}

const aulaIds = new Set(aulas.map((a) => a.id));
const pdfIds = new Set(pdfs.map((p) => p.id));
const cronograma = load("cronograma.json").days || [];
for (const [dayIndex, day] of cronograma.entries()) {
  for (const task of day.tasks || []) {
    if (task.aulaId)
      log(
        aulaIds.has(task.aulaId),
        `Dia ${dayIndex + 1}: aulaId ${task.aulaId}`,
      );
    if (task.pdfId)
      log(pdfIds.has(task.pdfId), `Dia ${dayIndex + 1}: pdfId ${task.pdfId}`);
    if (task.questoesTag) {
      const tag = task.questoesTag.toLowerCase();
      const match = all.some((q) =>
        [q.tag, q.assunto, q.materia].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(tag),
        ),
      );
      log(match, `Dia ${dayIndex + 1}: questoesTag ${task.questoesTag}`);
    }
  }
}

// cronograma structure
const crono = load("cronograma.json");
log(
  (crono.days || []).length === 96,
  `cronograma 96 dias (${crono.days?.length})`,
);
log(
  !fs.existsSync(path.join(root, "assets/js/schedule-fix.js")),
  "schedule-fix.js removido",
);

// edital
const edInss = load("edital-inss.json");
const edPrf = load("edital-prf-administrativo.json");
log(
  (edInss.topicos || []).length >= 20,
  `edital INSS ${edInss.topicos?.length}`,
);
log(
  (edPrf.topicos || []).length >= 15,
  `edital PRF Adm ${edPrf.topicos?.length}`,
);
const sourceSubjects = [...aulas, ...pdfs, ...materiais].map((item) =>
  String(item.materia || "").toLowerCase(),
);
for (const topic of [...(edInss.topicos || []), ...(edPrf.topicos || [])]) {
  const subject = String(topic.materia || "").toLowerCase();
  if (
    !sourceSubjects.some(
      (candidate) => candidate.includes(subject) || subject.includes(candidate),
    )
  ) {
    warn(`tópico sem material correspondente: ${topic.id} (${topic.materia})`);
  }
}

const sourceFiles = fs
  .readdirSync(root)
  .filter((file) => file.endsWith(".html"))
  .map((file) => path.join(root, file))
  .concat(
    fs
      .readdirSync(path.join(root, "assets/js"))
      .filter((file) => file.endsWith(".js"))
      .map((file) => path.join(root, "assets/js", file)),
  );
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  log(
    !/class=(?:["'][^"']*\+[^"']*["']|[^\s>]*\+[^\s>]*)/i.test(source),
    `classes sem +: ${path.relative(root, file)}`,
  );
  log(
    !/(?:style=["']?[^>"']*\+solid\+|border[^;"']*\+solid\+)/i.test(source),
    `estilos sem +solid+: ${path.relative(root, file)}`,
  );
}

const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
log(serviceWorker.includes("portal-estudos-v13"), "Service Worker usa cache v13");
log(serviceWorker.includes("./assets/js/calendar.js"), "Service Worker inclui calendar.js");
log(serviceWorker.includes("e.request.mode==='navigate'||u.pathname.includes('/data/')"), "Service Worker mantém network-first para navegação e dados");

console.log(fails ? `\n${fails} falha(s)` : "\nValidação OK");
process.exit(fails ? 1 : 0);
