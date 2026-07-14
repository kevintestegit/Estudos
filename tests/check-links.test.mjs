import test from "node:test";
import assert from "node:assert/strict";
import { validateLesson, validateAll, linkScope } from "../scripts/check-links.mjs";

const base = {
  id: "aula-da-01",
  titulo: "Organização da Administração",
  materia: "Direito Administrativo",
  verificadoEm: "2026-07-14",
};

test("indisponível não faz requisição externa", async () => {
  let called = false;
  const result = await validateLesson(
    { ...base, tipo: "indisponivel", url: null, notas: "Videoaula confiável ainda não selecionada." },
    { fetch: async () => { called = true; } },
  );
  assert.equal(result.status, "indisponivel");
  assert.equal(called, false);
});

test("pesquisa genérica é rejeitada antes da rede", async () => {
  const result = await validateLesson(
    { ...base, tipo: "video", url: "https://www.youtube.com/results?search_query=x", videoId: "abcdefghijk", canal: "Canal", tituloYoutube: base.titulo },
    { fetch: async () => assert.fail("fetch não deveria ser chamado") },
  );
  assert.equal(result.status, "pesquisa_generica");
});

test("vídeo só fica ok com metadados externos compatíveis", async () => {
  const lesson = { ...base, tipo: "video", url: "https://www.youtube.com/watch?v=abcdefghijk", videoId: "abcdefghijk", canal: "Escola de Governo", tituloYoutube: "Organização da Administração Pública" };
  const result = await validateLesson(lesson, { fetch: async () => new Response(JSON.stringify({ title: lesson.tituloYoutube, author_name: lesson.canal }), { status: 200, headers: { "content-type": "application/json" } }) });
  assert.equal(result.status, "ok");
  assert.equal(result.httpStatus, 200);
  assert.equal(result.idExtraido, lesson.videoId);
});

test("erro de rede não é convertido em ok", async () => {
  const result = await validateLesson(
    { ...base, tipo: "video", url: "https://www.youtube.com/watch?v=abcdefghijk", videoId: "abcdefghijk", canal: "Canal", tituloYoutube: base.titulo },
    { fetch: async () => { throw new TypeError("fetch failed"); } },
  );
  assert.equal(result.status, "erro_de_rede");
  assert.match(result.erroTecnico, /fetch failed/);
  assert.equal(typeof result.durationMs, "number");
});

test("título externo divergente é incompatível", async () => {
  const result = await validateLesson(
    { ...base, tipo: "video", url: "https://www.youtube.com/watch?v=abcdefghijk", videoId: "abcdefghijk", canal: "Canal", tituloYoutube: base.titulo },
    { fetch: async () => new Response(JSON.stringify({ title: "Receita de bolo", author_name: "Canal" }), { status: 200 }) },
  );
  assert.equal(result.status, "titulo_incompativel");
});

test("duplicação sem justificativa é suspeita", async () => {
  const lessons = [
    { ...base, tipo: "video", url: "https://www.youtube.com/watch?v=abcdefghijk", videoId: "abcdefghijk", canal: "Canal", tituloYoutube: base.titulo },
    { ...base, id: "aula-pt-01", materia: "Português", titulo: "Crase", tipo: "video", url: "https://www.youtube.com/watch?v=abcdefghijk", videoId: "abcdefghijk", canal: "Canal", tituloYoutube: base.titulo },
  ];
  const report = await validateAll(lessons, { fetch: async () => new Response(JSON.stringify({ title: base.titulo, author_name: "Canal" }), { status: 200 }) });
  assert.equal(report.duplicacoes[0].classificacao, "suspeita");
  assert.ok(report.resultados.some((item) => item.status === "duplicacao_suspeita"));
});

test("relatório distingue links internos, externos e ausentes", () => {
  assert.equal(linkScope("biblioteca.html"), "interno");
  assert.equal(linkScope("https://www.youtube.com/watch?v=abcdefghijk"), "externo");
  assert.equal(linkScope(null), "ausente");
});
