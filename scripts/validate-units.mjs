#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const includesAll = (expected = [], actual = []) => expected.every((id) => actual.includes(id));
const duplicates = (items = []) => items.filter((item, index) => items.indexOf(item) !== index);

export function validateUnits({ unidades = [], checagens = [], aulas = [], questoes = [] }) {
  const duplicateUnitIds = new Set(duplicates(unidades.map(({ id }) => id)));
  const duplicateCheckIds = new Set(duplicates(checagens.map(({ id }) => id)));
  const duplicateQuestionIds = new Set(duplicates(questoes.map(({ id }) => id)));
  const aulasById = new Map(aulas.map((item) => [item.id, item]));
  const checksById = new Map(checagens.map((item) => [item.id, item]));
  const questionsById = new Map(questoes.map((item) => [item.id, item]));

  const reports = unidades.map((unit) => {
    const erros = [];
    const avisos = [];
    const pendenciasEditoriais = [];
    const dadosNaoVerificados = [];
    const objectives = unit.objetivos || [];
    const objectiveSet = new Set(objectives);
    const sectionIds = new Set((unit.leitura?.secoes || []).map(({ id }) => id));
    const checks = (unit.checagem?.questionIds || []).map((id) => checksById.get(id));
    const questions = (unit.pratica?.questionIds || []).map((id) => questionsById.get(id));
    const aula = aulasById.get(unit.video?.aulaId);

    if (!unit.id || duplicateUnitIds.has(unit.id)) erros.push("ID de unidade ausente ou duplicado.");
    if (!objectives.length || duplicates(objectives).length) erros.push("Objetivos ausentes ou duplicados.");
    if (!unit.leitura?.secoes?.length) erros.push("Leitura obrigatória sem conteúdo.");
    if (!includesAll(objectives, unit.leitura?.objetivosCobertos)) erros.push("Objetivo sem cobertura na leitura.");

    if (!aula) erros.push("Referência de videoaula quebrada.");
    if (!includesAll(objectives, unit.video?.objetivosCobertos)) erros.push("Objetivo sem cobertura na videoaula.");
    const start = unit.video?.inicioSegundos;
    const end = unit.video?.fimSegundos;
    const duration = aula?.duracaoTotalSegundos ?? unit.video?.duracaoTotalSegundos;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || !Number.isFinite(duration) || end > duration) {
      erros.push("Timestamp do trecho de vídeo inválido.");
    }

    for (const [index, check] of checks.entries()) {
      const id = unit.checagem.questionIds[index];
      if (!check) erros.push(`Referência de checagem quebrada: ${id}.`);
      else {
        if (duplicateCheckIds.has(id)) erros.push(`ID de checagem duplicado: ${id}.`);
        if (check.unitId !== unit.id) erros.push(`Checagem ${id} associada a outra unidade.`);
        if (!check.objetivos?.length || check.objetivos.some((objective) => !objectiveSet.has(objective))) erros.push(`Checagem ${id} sem objetivo válido.`);
        if (!sectionIds.has(check.feedback?.leituraSecaoId)) erros.push(`Checagem ${id} referencia seção de leitura inexistente.`);
      }
    }
    if (!includesAll(objectives, checks.flatMap((item) => item?.objetivos || []))) erros.push("Objetivo sem checagem.");

    const minimum = unit.pratica?.quantidadeMinima || 0;
    if (questions.length < minimum) pendenciasEditoriais.push(`Prática possui ${questions.length} de ${minimum} questões exigidas.`);
    for (const [index, question] of questions.entries()) {
      const id = unit.pratica.questionIds[index];
      if (!question) erros.push(`Referência de questão quebrada: ${id}.`);
      else {
        if (duplicateQuestionIds.has(id)) erros.push(`ID de questão duplicado: ${id}.`);
        if (!question.objetivos?.length || question.objetivos.some((objective) => !objectiveSet.has(objective))) erros.push(`Questão ${id} sem objetivo válido.`);
        if (!question.unitIds?.includes(unit.id)) erros.push(`Questão ${id} não referencia a unidade.`);
        if (question.materia !== unit.materia || question.assunto !== unit.assunto) erros.push(`Questão ${id} associada a assunto diferente.`);
        if (!question.fonte || !question.fonteUrl) erros.push(`Questão ${id} sem fonte.`);
        if (question.fonteVerificada !== true) dadosNaoVerificados.push(`Fonte da questão ${id} não verificada.`);
      }
    }
    if (!includesAll(objectives, questions.flatMap((item) => item?.objetivos || []))) erros.push("Objetivo sem questão real.");
    if (!unit.correcao?.agruparPorObjetivo) erros.push("Unidade sem correção configurada por objetivo.");
    if (!unit.revisao?.habilitada || !unit.revisao?.estrategia) erros.push("Unidade sem regra de revisão.");

    return {
      unitId: unit.id,
      status: erros.length ? "invalida" : pendenciasEditoriais.length ? "pendente_editorial" : "valida",
      erros,
      avisos,
      pendenciasEditoriais,
      dadosNaoVerificados
    };
  });

  return { unidades: reports };
}

function runCli() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
  const reportPath = path.join(root, "reports", "unit-validation-report.json");
  try {
    const unitData = read("unidades.json");
    const result = validateUnits({
      unidades: unitData.unidades,
      checagens: unitData.checagens,
      aulas: read("aulas.json").aulas,
      questoes: [...read("questoes-inss.json").questoes, ...read("questoes-prf.json").questoes]
    });
    fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
    const unitsById = new Map((unitData.unidades || []).map((unit) => [unit.id, unit]));
    const failed = result.unidades.some((item) => item.erros.length || (unitsById.get(item.unitId)?.statusEditorial === "publicada" && (item.pendenciasEditoriais.length || item.dadosNaoVerificados.length)));
    console.log(failed ? "Validação de unidades falhou." : "Validação de unidades OK.");
    process.exitCode = failed ? 1 : 0;
  } catch (error) {
    const result = { status: "erro", erro: error.message };
    fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
    console.error(`Falha ao validar unidades: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
