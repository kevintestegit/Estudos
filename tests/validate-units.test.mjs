import test from "node:test";
import assert from "node:assert/strict";
import { validateUnits } from "../scripts/validate-units.mjs";

const base = {
  unidades: [{
    id: "unidade-pt-interpretacao-01",
    materia: "Português",
    assunto: "Interpretação de textos",
    objetivos: ["pt-int-inferencia-valida"],
    leitura: { objetivosCobertos: ["pt-int-inferencia-valida"], secoes: [{ id: "inferencia", conteudo: "Conteúdo" }] },
    video: { aulaId: "aula-pt-01", inicioSegundos: 0, fimSegundos: 600, objetivosCobertos: ["pt-int-inferencia-valida"] },
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
