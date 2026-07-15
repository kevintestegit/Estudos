import test from "node:test";
import assert from "node:assert/strict";
import { validateUnits } from "../scripts/validate-units.mjs";

const base = {
  unidades: [{
    id: "unidade-pt-interpretacao-01",
    materia: "Português",
    assunto: "Interpretação de textos",
    objetivos: ["pt-int-inferencia-valida"],
    leitura: {
      objetivosCobertos: ["pt-int-inferencia-valida"],
      secoes: [{ id: "inferencia", conteudo: "Conteúdo" }],
      fontes: [{ titulo: "Fonte oficial", url: "https://www.gov.br/fonte", verificada: true }]
    },
    video: {
      aulaId: "aula-pt-01",
      inicioSegundos: 0,
      fimSegundos: 600,
      objetivosCobertos: ["pt-int-inferencia-valida"],
      motivoSelecao: "Trecho confirmado para o objetivo.",
      fonte: "YouTube",
      fonteUrl: "https://www.youtube.com/watch?v=video123456",
      fonteVerificada: true,
      verificadoEm: "2026-07-15",
      statusVerificacao: "aprovado"
    },
    checagem: { questionIds: ["check-1", "check-2", "check-3"], quantidadeMinima: 3 },
    pratica: { questionIds: ["real-1", "real-2", "real-3", "real-4", "real-5"], quantidadeMinima: 5 },
    correcao: { agruparPorObjetivo: true },
    revisao: { habilitada: true, estrategia: "baseada-em-desempenho" },
    statusEditorial: "publicada"
  }],
  checagens: [1, 2, 3].map((n) => ({ id: `check-${n}`, unitId: "unidade-pt-interpretacao-01", objetivos: ["pt-int-inferencia-valida"], feedback: { leituraSecaoId: "inferencia" } })),
  aulas: [{ id: "aula-pt-01", duracaoTotalSegundos: 1959 }],
  questoes: [1, 2, 3, 4, 5].map((n) => ({ id: `real-${n}`, materia: "Português", assunto: "Interpretação de textos", unitIds: ["unidade-pt-interpretacao-01"], objetivos: ["pt-int-inferencia-valida"], fonte: "Cebraspe", fonteUrl: "https://cdn.cebraspe.org.br/prova.pdf", fonteVerificada: true }))
};

test("rejeita timestamp fora da duração", () => {
  const input = structuredClone(base);
  input.unidades[0].video.fimSegundos = 2000;
  assert.match(validateUnits(input).unidades[0].erros.join(" "), /timestamp/i);
});

test("rejeita questão sem objetivo", () => {
  const input = structuredClone(base);
  input.questoes[0].objetivos = [];
  assert.match(validateUnits(input).unidades[0].erros.join(" "), /objetivo/i);
});

test("registra quantidade insuficiente como pendência editorial", () => {
  const input = structuredClone(base);
  input.unidades[0].pratica.questionIds.pop();
  assert.match(validateUnits(input).unidades[0].pendenciasEditoriais.join(" "), /5 questões/i);
});

for (const field of ["motivoSelecao", "fonte", "fonteUrl", "verificadoEm", "statusVerificacao"]) {
  test(`bloqueia publicação sem ${field} verificado do vídeo`, () => {
    const input = structuredClone(base);
    delete input.unidades[0].video[field];
    const result = validateUnits(input);
    assert.match(result.unidades[0].dadosNaoVerificados.join(" "), /vídeo/i);
    assert.equal(result.falhou, true);
  });
}

test("mantém rascunho com dado não verificado sem bloquear a validação", () => {
  const input = structuredClone(base);
  input.unidades[0].statusEditorial = "rascunho";
  input.unidades[0].video.statusVerificacao = "pendente_revisao_manual";
  const result = validateUnits(input);
  assert.match(result.unidades[0].dadosNaoVerificados.join(" "), /vídeo/i);
  assert.equal(result.falhou, false);
});

test("registra checagem abaixo do mínimo editorial", () => {
  const input = structuredClone(base);
  input.unidades[0].checagem.questionIds.pop();
  assert.match(validateUnits(input).unidades[0].pendenciasEditoriais.join(" "), /3 questões/i);
});

test("rejeita quantidade mínima de checagem fora do intervalo 3 a 5", () => {
  const input = structuredClone(base);
  input.unidades[0].checagem.quantidadeMinima = 2;
  assert.match(validateUnits(input).unidades[0].erros.join(" "), /3 a 5/i);
});

test("rejeita fontes ausentes na leitura e no vídeo", () => {
  const input = structuredClone(base);
  input.unidades[0].leitura.fontes = [];
  delete input.unidades[0].video.fonte;
  const errors = validateUnits(input).unidades[0].erros.join(" ");
  assert.match(errors, /leitura sem fonte/i);
  assert.match(errors, /vídeo sem fonte/i);
});

test("registra fontes não verificadas na leitura e no vídeo", () => {
  const input = structuredClone(base);
  input.unidades[0].leitura.fontes[0].verificada = false;
  input.unidades[0].video.fonteVerificada = false;
  const unverified = validateUnits(input).unidades[0].dadosNaoVerificados.join(" ");
  assert.match(unverified, /fonte da leitura/i);
  assert.match(unverified, /fonte do vídeo/i);
});

test("rejeita IDs duplicados de aulas e seções de leitura", () => {
  const input = structuredClone(base);
  input.aulas.push(structuredClone(input.aulas[0]));
  input.unidades[0].leitura.secoes.push({ id: "inferencia", conteudo: "Duplicada" });
  const errors = validateUnits(input).unidades[0].erros.join(" ");
  assert.match(errors, /aula duplicado/i);
  assert.match(errors, /seção de leitura duplicado/i);
});
