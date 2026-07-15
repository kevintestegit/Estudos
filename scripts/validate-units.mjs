#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const includesAll = (expected = [], actual = []) => expected.every((id) => actual.includes(id));
const duplicates = (items = []) => items.filter((item, index) => items.indexOf(item) !== index);
const isIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function validateUnits({ unidades = [], checagens = [], aulas = [], questoes = [] }) {
  const duplicateUnitIds = new Set(duplicates(unidades.map(({ id }) => id)));
  const duplicateCheckIds = new Set(duplicates(checagens.map(({ id }) => id).filter(Boolean)));
  const duplicateQuestionIds = new Set(duplicates(questoes.map(({ id }) => id).filter(Boolean)));
  const duplicateAulaIds = new Set(duplicates(aulas.map(({ id }) => id).filter(Boolean)));
  const aulasById = new Map(aulas.filter(({ id }) => id).map((item) => [item.id, item]));
  const checksById = new Map(checagens.filter(({ id }) => id).map((item) => [item.id, item]));
  const questionsById = new Map(questoes.filter(({ id }) => id).map((item) => [item.id, item]));

  const reports = unidades.map((unit) => {
    const erros = [];
    const avisos = [];
    const pendenciasEditoriais = [];
    const dadosNaoVerificados = [];
    const objectives = unit.objetivos || [];
    const objectiveSet = new Set(objectives);
    const sectionIds = new Set((unit.leitura?.secoes || []).map(({ id }) => id).filter(Boolean));
    const duplicateSectionIds = new Set(duplicates((unit.leitura?.secoes || []).map(({ id }) => id).filter(Boolean)));
    const checks = (unit.checagem?.questionIds || []).map((id) => checksById.get(id));
    const questions = (unit.pratica?.questionIds || []).map((id) => questionsById.get(id));
    const aula = aulasById.get(unit.video?.aulaId);

    if (!unit.id || duplicateUnitIds.has(unit.id)) erros.push("ID de unidade ausente ou duplicado.");
    if (!objectives.length || duplicates(objectives).length) erros.push("Objetivos ausentes ou duplicados.");
    if (!unit.leitura?.secoes?.length) erros.push("Leitura obrigatória sem conteúdo.");
    if (unit.leitura?.secoes?.some(({ id }) => !id)) erros.push("ID de seção de leitura ausente.");
    if (duplicateSectionIds.size) erros.push("ID de seção de leitura duplicado.");
    if (!includesAll(objectives, unit.leitura?.objetivosCobertos)) erros.push("Objetivo sem cobertura na leitura.");
    if (!unit.leitura?.fontes?.length) erros.push("Leitura sem fonte.");
    else {
      if (unit.leitura.fontes.some(({ titulo, url }) => !String(titulo || "").trim() || !String(url || "").trim())) erros.push("Fonte da leitura sem título ou URL.");
      if (unit.leitura.fontes.some(({ verificada }) => verificada !== true)) dadosNaoVerificados.push("Fonte da leitura não verificada.");
    }

    if (aulas.some(({ id }) => !id)) erros.push("ID de aula ausente.");
    if (!aula) erros.push("Referência de videoaula quebrada.");
    if (duplicateAulaIds.has(unit.video?.aulaId)) erros.push("ID de aula duplicado.");
    if (!includesAll(objectives, unit.video?.objetivosCobertos)) erros.push("Objetivo sem cobertura na videoaula.");
    if (!unit.video?.fonte || !unit.video?.fonteUrl) erros.push("Vídeo sem fonte.");
    if (unit.video?.fonteVerificada !== true) dadosNaoVerificados.push("Fonte do vídeo não verificada.");
    const verifiedDate = isIsoDate(unit.video?.verificadoEm);
    if (!verifiedDate) dadosNaoVerificados.push("Data de verificação do vídeo ausente ou inválida.");
    if (!unit.video?.motivoSelecao || !unit.video?.fonte || !unit.video?.fonteUrl || !verifiedDate || unit.video?.statusVerificacao !== "aprovado") dadosNaoVerificados.push("Vídeo ou trecho sem evidência pedagógica verificada.");
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
    const checkMinimum = unit.checagem?.quantidadeMinima;
    const checkCount = unit.checagem?.questionIds?.length || 0;
    if (!Number.isInteger(checkMinimum) || checkMinimum < 3 || checkMinimum > 5 || checkCount < 3 || checkCount > 5) erros.push("Checagem deve conter de 3 a 5 questões.");
    if (Number.isInteger(checkMinimum) && checkCount < checkMinimum) pendenciasEditoriais.push(`Checagem possui ${checkCount} de ${checkMinimum} questões exigidas.`);

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

  const unitsById = new Map(unidades.map((unit) => [unit.id, unit]));
  const falhou = reports.some((item) => item.erros.length || (unitsById.get(item.unitId)?.statusEditorial === "publicada" && (item.pendenciasEditoriais.length || item.dadosNaoVerificados.length)));
  return { unidades: reports, falhou };
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
    console.log(result.falhou ? "Validação de unidades falhou." : "Validação de unidades OK.");
    process.exitCode = result.falhou ? 1 : 0;
  } catch (error) {
    const result = { status: "erro", erro: error.message };
    fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
    console.error(`Falha ao validar unidades: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
