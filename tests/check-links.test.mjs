import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateLesson, validateAll, linkScope, hasPublishedFailure } from "../scripts/check-links.mjs";

const base = {
  id: "aula-da-01",
  titulo: "Organização da Administração",
  materia: "Direito Administrativo",
  verificadoEm: "2026-07-14",
};

test("vídeo relatado como inacessível não volta à biblioteca", () => {
  const aulas = JSON.parse(fs.readFileSync(new URL("../data/aulas.json", import.meta.url))).aulas;
  assert.ok(!aulas.some((aula) => aula.videoId === "22iA3PPjr7c"));
});

test("biblioteca usa data/aulas.json como única fonte de videoaulas", () => {
  assert.equal(
    fs.existsSync(new URL("../data/aulas-patch.json", import.meta.url)),
    false,
  );
  assert.equal(
    fs.existsSync(new URL("../assets/js/aulas-patch.js", import.meta.url)),
    false,
  );
  for (const arquivo of ["hoje.html", "materias.html"]) {
    const html = fs.readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
    assert.doesNotMatch(html, /aulas-patch/, arquivo);
  }
});

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

test("compatibilidade temática aceita termos flexionados e equivalência documentada", async () => {
  const lesson = { ...base, titulo: "Morfossintaxe essencial", tipo: "video", url: "https://www.youtube.com/watch?v=abcdefghijk", videoId: "abcdefghijk", canal: "Professor", tituloYoutube: "Diferença entre MORFOLOGIA e SINTAXE - Para concurso", notas: "Aula sobre morfologia e sintaxe." };
  const result = await validateLesson(lesson, { fetch: async () => new Response(JSON.stringify({ title: lesson.tituloYoutube, author_name: lesson.canal }), { status: 200 }) });
  assert.equal(result.status, "ok");
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

test("questões usam somente matérias canônicas", () => {
  const materiasData = JSON.parse(
    fs.readFileSync(new URL("../data/materias.json", import.meta.url)),
  );
  const nomes = new Set(
    Object.values(materiasData)
      .flat()
      .map((materia) => materia.nome),
  );
  const questoes = ["questoes-inss.json", "questoes-prf.json"].flatMap(
    (arquivo) =>
      JSON.parse(
        fs.readFileSync(new URL(`../data/${arquivo}`, import.meta.url)),
      ).questoes,
  );
  const divergentes = questoes.filter((questao) => !nomes.has(questao.materia));
  assert.deepEqual(
    divergentes.map(({ id, materia }) => ({ id, materia })),
    [],
  );
});

test("materiais não mantêm URLs comprovadamente quebradas", () => {
  const materiais = JSON.parse(
    fs.readFileSync(new URL("../data/materiais.json", import.meta.url)),
  ).materiais;
  const quebradas = new Set([
    "https://cdn.cebraspe.org.br/concursos/inss_22/arquivos/ED_8_INSS_22_RETIFICACAO.PDF",
    "https://www.gov.br/previdencia/pt-br/assuntos/prev/acordos-internacionais",
    "https://cdn.cebraspe.org.br/concursos/prf_21/arquivos/ED_1_2021_ABERTURA.PDF",
  ]);
  assert.deepEqual(
    materiais.filter((item) => quebradas.has(item.url)).map((item) => item.id),
    [],
  );
});

test("HTTP 403 não é prova de vídeo privado", async () => {
  const lesson = {
    ...base,
    tipo: "video",
    url: "https://www.youtube.com/watch?v=abcdefghijk",
    videoId: "abcdefghijk",
    canal: "Canal",
    tituloYoutube: base.titulo,
  };
  const result = await validateLesson(lesson, {
    fetch: async () => new Response("Forbidden", { status: 403 }),
  });
  assert.equal(result.status, "nao_verificado");
});

test("playlist é validada pela página pública", async () => {
  const lesson = {
    ...base,
    titulo: "Organização da Administração",
    tipo: "playlist",
    url: "https://www.youtube.com/playlist?list=PLabcdefghijk",
    playlistId: "PLabcdefghijk",
    canal: "Escola de Governo",
    tituloYoutube: "Organização da Administração Pública",
  };
  let requestedUrl = "";
  const result = await validateLesson(lesson, {
    fetch: async (url) => {
      requestedUrl = url;
      return new Response(
        '<meta property="og:title" content="Organização da Administração Pública"><script>{"ownerChannelName":"Escola de Governo"}</script>',
        { status: 200 },
      );
    },
  });
  assert.equal(requestedUrl, lesson.url);
  assert.equal(result.status, "ok");
});

test("páginas carregam somente os dados que consomem", () => {
  for (const arquivo of ["app.js", "dashboard.js", "cronograma.js"]) {
    const source = fs.readFileSync(
      new URL(`../assets/js/${arquivo}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /loadAll\s*\(/, arquivo);
  }
});

test("deploy executa a suíte antes de publicar", () => {
  const workflow = fs.readFileSync(
    new URL("../.github/workflows/pages.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /actions\/setup-node@v4/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx playwright install --with-deps chromium/);
  assert.match(workflow, /npm test/);
  assert.ok(workflow.indexOf("npm test") < workflow.indexOf("Preparar site"));
});

test("candidato histórico inconclusivo não reprova biblioteca válida", () => {
  const report = {
    resultados: [
      { status: "ok", auditoriaCandidato: { status: "erro_de_rede" } },
      { status: "indisponivel" },
    ],
    duplicacoes: [],
  };
  assert.equal(hasPublishedFailure(report), false);
  report.resultados[0].status = "nao_verificado";
  assert.equal(hasPublishedFailure(report), true);
});
