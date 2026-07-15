#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = new Date().toISOString().slice(0, 10);
const SEARCH = /youtube\.com\/results|[?&]search_query=/i;
const ID = /^[\w-]{11}$/;
const PLAYLIST_ID = /^[\w-]{10,}$/;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (value) => normalize(value).split(" ").filter((word) => word.length > 3 && !["aula", "curso", "concurso", "direito", "nocoes"].includes(word));

export function extractIds(url) {
  try {
    const parsed = new URL(url);
    return { videoId: parsed.searchParams.get("v"), playlistId: parsed.searchParams.get("list") };
  } catch {
    return { videoId: null, playlistId: null };
  }
}

export const linkScope = (url) => /^https?:\/\//i.test(url || "") ? "externo" : url ? "interno" : "ausente";

function topicCompatible(lesson, externalTitle) {
  const actual = words(externalTitle);
  return words(lesson.titulo).some((expected) => actual.some((word) => expected.slice(0, 5) === word.slice(0, 5)));
}

function playlistMetadata(text) {
  const title = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const rawAuthor = text.match(/"ownerChannelName":"((?:\\.|[^"])*)"/)?.[1];
  let author = rawAuthor;
  try { author = JSON.parse(`"${rawAuthor}"`); } catch {}
  return {
    title: title?.replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
    author_name: author,
  };
}

async function requestMetadata(lesson, fetchImpl, timeoutMs) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const requestUrl = lesson.tipo === "playlist"
      ? lesson.url
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(lesson.url)}&format=json`;
    const response = await fetchImpl(requestUrl, { method: "GET", redirect: "follow", signal: controller.signal });
    const text = await response.text();
    const blocked = /FortiGate|Application Blocked|captcha|consent\.youtube\.com/i.test(text);
    let body = {};
    if (lesson.tipo === "playlist") body = playlistMetadata(text);
    else try { body = JSON.parse(text); } catch {}
    return { response, body, blocked, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export async function validateLesson(lesson, options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  const started = Date.now();
  const base = {
    id: lesson.id,
    materia: lesson.materia,
    assunto: lesson.titulo,
    url: lesson.url,
    tipo: lesson.tipo,
    escopo: linkScope(lesson.url),
    verificadoEm: TODAY,
  };
  if (lesson.yt && lesson.yt !== lesson.url) return { ...base, status: "url_invalida", motivo: "Divergência entre url e yt." };
  if (lesson.tipo === "indisponivel") return lesson.url === null
    ? { ...base, status: "indisponivel", motivo: lesson.notas || "Videoaula confiável ainda não selecionada." }
    : { ...base, status: "url_invalida", motivo: "Registro indisponível deve usar url null." };
  if (SEARCH.test(lesson.url || "")) return { ...base, status: "pesquisa_generica", motivo: "Página de pesquisa não é videoaula." };
  if (!['video', 'playlist'].includes(lesson.tipo) || !lesson.url) return { ...base, status: "url_invalida", motivo: "Tipo ou URL ausente." };

  const extracted = extractIds(lesson.url);
  const expected = lesson.tipo === "video" ? lesson.videoId : lesson.playlistId;
  const actual = lesson.tipo === "video" ? extracted.videoId : extracted.playlistId;
  const validId = lesson.tipo === "video" ? ID.test(actual || "") : PLAYLIST_ID.test(actual || "");
  if (!validId || actual !== expected) return { ...base, status: lesson.tipo === "playlist" ? "playlist_invalida" : "url_invalida", idExtraido: actual, motivo: "ID ausente, inválido ou divergente da URL." };
  if (actual === "dQw4w9WgXcQ") return { ...base, status: "titulo_incompativel", idExtraido: actual, motivo: "Vídeo conhecido incompatível e expressamente proibido." };

  try {
    const { response, body, blocked, durationMs } = await requestMetadata(lesson, fetchImpl, options.timeoutMs || 10000);
    const evidence = { httpStatus: response.status, urlFinal: response.url || lesson.url, durationMs, idExtraido: actual };
    if (blocked) return { ...base, ...evidence, status: "erro_de_rede", motivo: "Bloqueio de rede impediu a consulta ao YouTube.", evidencias: ["Resposta de bloqueio institucional"] };
    if (!response.ok) {
      const status = response.status === 401 ? "privado" : response.status === 404 ? "removido" : "nao_verificado";
      return { ...base, ...evidence, status, motivo: `oEmbed respondeu HTTP ${response.status}.` };
    }
    if (!body.title || !body.author_name) return { ...base, ...evidence, status: "nao_verificado", motivo: "Resposta externa sem título ou canal." };
    const metadata = { tituloYoutube: body.title, canal: body.author_name, evidencias: [lesson.tipo === "video" ? "YouTube oEmbed retornou title e author_name" : "Página pública da playlist retornou título e canal"] };
    if (normalize(body.title) !== normalize(lesson.tituloYoutube) || !topicCompatible(lesson, body.title)) return { ...base, ...evidence, ...metadata, status: "titulo_incompativel", motivo: "Título externo diverge do cadastro ou não comprova o assunto." };
    if (normalize(body.author_name) !== normalize(lesson.canal)) return { ...base, ...evidence, ...metadata, status: "canal_incompativel", motivo: "Canal externo diverge do cadastro." };
    return { ...base, ...evidence, ...metadata, status: "ok", motivo: lesson.tipo === "video" ? "Vídeo disponível e metadados compatíveis." : "Playlist disponível, compatível e documentada." };
  } catch (error) {
    return { ...base, durationMs: Date.now() - started, status: error.name === "AbortError" ? "timeout" : "erro_de_rede", erroTecnico: error.message, motivo: error.name === "AbortError" ? "Tempo limite excedido." : "Falha técnica na requisição externa." };
  }
}

export async function validateAll(lessons, options = {}) {
  const resultados = [];
  for (const lesson of lessons) resultados.push(await validateLesson(lesson, options));
  const groups = new Map();
  for (const lesson of lessons.filter((item) => item.tipo === "video" || item.tipo === "playlist")) {
    const key = lesson.videoId || lesson.playlistId;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lesson);
  }
  const duplicacoes = [];
  for (const [contentId, uses] of groups) {
    if (uses.length < 2) continue;
    const justified = new Set(uses.map((item) => item.materia)).size === 1 && uses.every((item) => /abrange|cobre|reutiliza/i.test(item.notas || ""));
    duplicacoes.push({ id: contentId, tipo: uses[0].tipo, quantidade: uses.length, aulas: uses.map(({ id, titulo, materia }) => ({ id, titulo, materia })), justificativa: justified ? uses.map((item) => item.notas).join(" | ") : null, classificacao: justified ? "legitima" : "suspeita" });
    if (!justified) for (const use of uses) {
      const index = resultados.findIndex((item) => item.id === use.id);
      resultados[index] = { ...resultados[index], status: "duplicacao_suspeita", motivo: `Conteúdo ${contentId} reutilizado sem justificativa pedagógica.` };
    }
  }
  return { geradoEm: new Date().toISOString(), resultados, duplicacoes };
}

export function hasPublishedFailure(report) {
  return (
    report.resultados.some((item) => !["ok", "indisponivel"].includes(item.status)) ||
    report.duplicacoes.some((item) => item.classificacao === "suspeita")
  );
}

async function main() {
  const lessons = JSON.parse(fs.readFileSync(path.join(root, "data/aulas.json"), "utf8")).aulas;
  const report = await validateAll(lessons);
  const candidatesPath = path.join(root, "reports/aulas-candidates.json");
  const candidateRecords = fs.existsSync(candidatesPath)
    ? JSON.parse(fs.readFileSync(candidatesPath, "utf8")).candidatos
    : [];
  const researchPath = path.join(root, "reports/aulas-research.json");
  const research = fs.existsSync(researchPath)
    ? new Map(JSON.parse(fs.readFileSync(researchPath, "utf8")).registros.map((item) => [item.id, item]))
    : new Map();
  const candidates = new Map(candidateRecords.map((item) => [item.id, item.candidatoAntigo]));
  for (let offset = 0; offset < report.resultados.length; offset += 6) {
    await Promise.all(report.resultados.slice(offset, offset + 6).map(async (result) => {
      const candidate = candidates.get(result.id);
      result.candidatoAntigo = candidate || null;
      result.urlAvaliada = candidate || result.url;
      result.urlSubstituta = result.url && result.url !== candidate ? result.url : null;
      result.tituloReal = result.tituloYoutube || null;
      result.canalReal = result.canal || null;
      if (!candidate) return;
      const ids = extractIds(candidate);
      const type = ids.videoId ? "video" : ids.playlistId ? "playlist" : "video";
      result.auditoriaCandidato = await validateLesson({
        id: result.id,
        titulo: result.assunto,
        materia: result.materia,
        tipo: type,
        url: candidate,
        videoId: ids.videoId,
        playlistId: ids.playlistId,
        canal: "Candidato antigo não confiável",
        tituloYoutube: result.assunto,
      });
    }));
  }
  for (const result of report.resultados) {
    const lessonResearch = research.get(result.id);
    result.candidatoAntigoStatus = result.auditoriaCandidato?.status || null;
    result.urlAprovada = result.status === "ok" ? result.url : null;
    result.tipoAprovado = result.status === "ok" ? result.tipo : null;
    result.pesquisaRealizada = lessonResearch?.pesquisaRealizada || null;
    result.candidatosTestados = lessonResearch?.candidatosTestados || [];
    if (lessonResearch?.motivoFinal) result.motivo = lessonResearch.motivoFinal;
    const validationEvidence = result.evidencias;
    result.evidencias = {
      oembed: result.status === "ok" && result.tipo === "video",
      paginaPlaylist: result.status === "ok" && result.tipo === "playlist",
      httpStatus: result.httpStatus || null,
      idExtraido: result.idExtraido || null,
      urlFinal: result.urlFinal || null,
      duracaoRequisicaoMs: result.durationMs ?? null,
      pesquisaHttpStatus: lessonResearch?.httpStatusPesquisa || null,
      detalhes: validationEvidence || [],
    };
  }
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const candidateGroups = new Map();
  for (const candidate of candidateRecords) {
    const ids = extractIds(candidate.candidatoAntigo);
    const contentId = ids.videoId || ids.playlistId;
    if (!contentId) continue;
    if (!candidateGroups.has(contentId)) candidateGroups.set(contentId, []);
    candidateGroups.get(contentId).push(candidate.id);
  }
  report.duplicacoesCandidatos = [...candidateGroups]
    .filter(([, ids]) => ids.length > 1)
    .map(([contentId, ids]) => ({
      id: contentId,
      tipo: contentId.length === 11 ? "video" : "playlist",
      quantidade: ids.length,
      aulas: ids.map((id) => {
        const lesson = lessonsById.get(id);
        return { id, titulo: lesson?.titulo || null, materia: lesson?.materia || null };
      }),
      justificativa: null,
      classificacao: "suspeita",
      resolucao: "Candidato antigo removido; nenhum uso permanece publicado.",
    }));
  const output = path.join(root, "reports/aulas-link-report.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  const counts = report.resultados.reduce((all, item) => ({ ...all, [item.status]: (all[item.status] || 0) + 1 }), {});
  console.log(JSON.stringify(counts));
  console.log(`Relatório: ${output}`);
  process.exitCode = hasPublishedFailure(report) ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main();
