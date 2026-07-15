const { test, expect } = require("@playwright/test");

const UNIT_ID = "unidade-pt-interpretacao-01";

test.beforeEach(async ({ page }) => {
  await page.goto("/hoje.html");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("migra schema 4 sem perder progresso", async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 4,
        xp: 37,
        taskStatus: { legado: "concluida" },
      }),
    ),
  );
  await page.reload();

  const data = await page.evaluate(() => Storage.get());
  expect(data.schemaVersion).toBe(5);
  expect(data.xp).toBe(37);
  expect(data.taskStatus.legado).toBe("concluida");
  expect(data.unitProgress).toEqual({});
  expect(data.unitAttempts).toEqual([]);
  expect(data.unitReviews).toEqual([]);
});

test("executa a sequência válida e abrir o vídeo não o conclui", async ({
  page,
}) => {
  const states = await page.evaluate((unitId) => {
    const events = [
      "iniciar_leitura",
      "concluir_leitura",
      "iniciar_video",
    ];
    return events.map((event) => Storage.transitionUnit(unitId, event).state);
  }, UNIT_ID);

  expect(states).toEqual([
    "leitura_em_andamento",
    "leitura_concluida",
    "video_em_andamento",
  ]);
  expect(
    await page.evaluate((unitId) => Storage.getUnitProgress(unitId).state, UNIT_ID),
  ).toBe("video_em_andamento");
});

test("não permite pular leitura nem grava evento inválido", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    const before = localStorage.getItem("portal-estudos-v1");
    const transition = Storage.transitionUnit(unitId, "concluir_video");
    return {
      transition,
      unchanged: before === localStorage.getItem("portal-estudos-v1"),
    };
  }, UNIT_ID);

  expect(result.transition).toEqual({ ok: false, state: "nao_iniciada" });
  expect(result.unchanged).toBe(true);
});

test("preserva tentativas anteriores e respostas", async ({ page }) => {
  const attempts = await page.evaluate((unitId) => {
    Storage.transitionUnit(unitId, "iniciar_leitura");
    Storage.transitionUnit(unitId, "concluir_leitura");
    Storage.transitionUnit(unitId, "iniciar_video");
    Storage.transitionUnit(unitId, "concluir_video");
    Storage.transitionUnit(unitId, "iniciar_checagem");

    const first = Storage.startUnitAttempt(unitId, "checagem", ["check-1"]);
    Storage.recordUnitAnswer(first.attemptId, {
      questionId: "check-1",
      answer: "A",
      correct: false,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.finishUnitAttempt(first.attemptId);

    const second = Storage.startUnitAttempt(unitId, "checagem", ["check-1"]);
    Storage.recordUnitAnswer(second.attemptId, {
      questionId: "check-1",
      answer: "B",
      correct: true,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.finishUnitAttempt(second.attemptId);
    return Storage.get().unitAttempts;
  }, UNIT_ID);

  expect(attempts).toHaveLength(2);
  expect(attempts.map((attempt) => attempt.number)).toEqual([1, 2]);
  expect(attempts[0].answers[0].answer).toBe("A");
  expect(attempts[1].answers[0].answer).toBe("B");
  expect(attempts.every((attempt) => attempt.finishedAt)).toBe(true);
});

test("conclui a sequência somente com tentativas e revisão persistidas", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    const go = (event) => Storage.transitionUnit(unitId, event);
    go("iniciar_leitura");
    go("concluir_leitura");
    go("iniciar_video");
    go("concluir_video");
    go("iniciar_checagem");
    let attempt = Storage.startUnitAttempt(unitId, "checagem", ["check-1"]);
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "check-1",
      answer: "A",
      correct: true,
      objetivos: ["pt-int-compreensao-explicita"],
    });
    Storage.finishUnitAttempt(attempt.attemptId);
    go("concluir_checagem");
    go("iniciar_pratica");
    attempt = Storage.startUnitAttempt(unitId, "pratica", ["real-1"]);
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "real-1",
      answer: "E",
      correct: true,
      objetivos: ["pt-int-compreensao-explicita"],
    });
    Storage.finishUnitAttempt(attempt.attemptId);
    const practice = go("concluir_pratica");
    const correction = go("concluir_correcao");
    const review = Storage.scheduleUnitReview({
      unitId,
      objetivos: ["pt-int-compreensao-explicita"],
      scheduledDate: "2026-07-22",
      reason: "Objetivo correto na primeira tentativa; revisão em sete dias.",
    });
    const completed = go("concluir_unidade");
    return { practice, correction, review, completed };
  }, UNIT_ID);

  expect(result.practice).toEqual({ ok: true, state: "pratica_concluida" });
  expect(result.correction).toEqual({
    ok: true,
    state: "correcao_concluida",
  });
  expect(result.review).toEqual({ ok: true, state: "revisao_agendada" });
  expect(result.completed).toEqual({ ok: true, state: "concluida" });
});

test("agenda revisão somente depois da correção", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    const progress = {
      state: "correcao_concluida",
      updatedAt: new Date().toISOString(),
      reading: { startedAt: null, completedAt: null },
      video: { startedAt: null, completedAt: null },
      activeAttemptId: "attempt-pratica-finalizada",
    };
    Storage.update((data) => {
      data.unitProgress[unitId] = progress;
      data.unitAttempts.push({
        id: "attempt-pratica-finalizada",
        unitId,
        phase: "pratica",
        questionIds: ["real-1"],
        startedAt: new Date(Date.now() - 1000).toISOString(),
        answers: [{
          questionId: "real-1",
          answer: "C",
          correct: true,
          objetivos: ["pt-int-inferencia-valida"],
        }],
        performanceByObjective: { "pt-int-inferencia-valida": { wrong: 1 } },
        finishedAt: new Date().toISOString(),
      });
    });
    const scheduledDate = addDaysISO(todayISO(), 1);
    return {
      scheduledDate,
      review: Storage.scheduleUnitReview({
        unitId,
        objetivos: ["pt-int-inferencia-valida"],
        scheduledDate,
        reason: "Erro de inferência registrado na tentativa.",
      }),
    };
  }, UNIT_ID);

  expect(result.review.ok).toBe(true);
  const data = await page.evaluate(() => Storage.get());
  expect(data.unitProgress[UNIT_ID].state).toBe("revisao_agendada");
  expect(data.unitReviews).toHaveLength(1);
  expect(data.unitReviews[0]).toMatchObject({
    unitId: UNIT_ID,
    objetivos: ["pt-int-inferencia-valida"],
    scheduledDate: result.scheduledDate,
    status: "pendente",
  });
});

test("entrada inválida não corrompe o armazenamento", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    const before = Storage.exportJSON();
    const attempt = Storage.startUnitAttempt(unitId, "simulado", []);
    const review = Storage.scheduleUnitReview({ unitId });
    return {
      attempt,
      review,
      unchanged: before === Storage.exportJSON(),
    };
  }, UNIT_ID);

  expect(result.attempt.ok).toBe(false);
  expect(result.review.ok).toBe(false);
  expect(result.unchanged).toBe(true);
});

test("falha de persistência mantém o estado anterior", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    const before = Storage.exportJSON();
    Storage.set = () => {
      throw new Error("falha simulada");
    };
    const transition = Storage.transitionUnit(unitId, "iniciar_leitura");
    return { transition, unchanged: before === Storage.exportJSON() };
  }, UNIT_ID);

  expect(result.transition).toEqual({ ok: false, state: "nao_iniciada" });
  expect(result.unchanged).toBe(true);
});

test("exige classificação e revisão de todos os erros da prática", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    const progress = {
      state: "pratica_em_andamento",
      updatedAt: new Date().toISOString(),
      reading: { startedAt: null, completedAt: null },
      video: { startedAt: null, completedAt: null },
      activeAttemptId: null,
    };
    Storage.update((data) => {
      data.unitProgress[unitId] = progress;
    });
    const attempt = Storage.startUnitAttempt(unitId, "pratica", [
      "real-1",
      "real-2",
    ]);
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "real-1",
      answer: "C",
      correct: false,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "real-2",
      answer: "E",
      correct: false,
      objetivos: ["pt-int-coesao-referencial"],
    });
    Storage.finishUnitAttempt(attempt.attemptId);
    Storage.transitionUnit(unitId, "concluir_pratica");
    const beforeCorrection = Storage.transitionUnit(
      unitId,
      "concluir_correcao",
    );
    const correction = Storage.recordUnitCorrection(
      attempt.attemptId,
      "real-1",
      "interpretacao",
    );
    const afterFirstCorrection = Storage.transitionUnit(
      unitId,
      "concluir_correcao",
    );
    Storage.recordUnitCorrection(attempt.attemptId, "real-2", "conceitual");
    const afterAllCorrections = Storage.transitionUnit(
      unitId,
      "concluir_correcao",
    );
    return {
      beforeCorrection,
      correction,
      afterFirstCorrection,
      afterAllCorrections,
      answer: Storage.get().unitAttempts[0].answers[0],
    };
  }, UNIT_ID);

  expect(result.beforeCorrection).toEqual({
    ok: false,
    state: "correcao_pendente",
  });
  expect(result.correction.ok).toBe(true);
  expect(result.afterFirstCorrection).toEqual({
    ok: false,
    state: "correcao_pendente",
  });
  expect(result.afterAllCorrections).toEqual({
    ok: true,
    state: "correcao_concluida",
  });
  expect(result.answer.answer).toBe("C");
  expect(result.answer.correct).toBe(false);
  expect(result.answer.correction.classification).toBe("interpretacao");
  expect(result.answer.correction.classifiedAt).toBeTruthy();
  expect(result.answer.correction.reviewedAt).toBeTruthy();
});

test("rejeita classificação inválida sem alterar a resposta", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    Storage.update((data) => {
      data.unitProgress[unitId] = {
        state: "pratica_em_andamento",
        updatedAt: new Date().toISOString(),
        reading: { startedAt: null, completedAt: null },
        video: { startedAt: null, completedAt: null },
        activeAttemptId: null,
      };
    });
    const attempt = Storage.startUnitAttempt(unitId, "pratica", ["real-1"]);
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "real-1",
      answer: "E",
      correct: false,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.finishUnitAttempt(attempt.attemptId);
    const before = Storage.exportJSON();
    const correction = Storage.recordUnitCorrection(
      attempt.attemptId,
      "real-1",
      "chute",
    );
    return { correction, unchanged: before === Storage.exportJSON() };
  }, UNIT_ID);

  expect(result.correction.ok).toBe(false);
  expect(result.unchanged).toBe(true);
});

test("rejeita correção fora do estado pendente e não permite sobrescrita", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    Storage.update((data) => {
      data.unitProgress[unitId] = {
        state: "pratica_em_andamento",
        updatedAt: new Date().toISOString(),
        reading: { startedAt: null, completedAt: null },
        video: { startedAt: null, completedAt: null },
        activeAttemptId: null,
      };
    });
    const attempt = Storage.startUnitAttempt(unitId, "pratica", ["real-1"]);
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "real-1",
      answer: "C",
      correct: false,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.finishUnitAttempt(attempt.attemptId);

    const beforeWrongState = Storage.exportJSON();
    const wrongState = Storage.recordUnitCorrection(
      attempt.attemptId,
      "real-1",
      "conceitual",
    );
    const wrongStateUnchanged = beforeWrongState === Storage.exportJSON();

    Storage.transitionUnit(unitId, "concluir_pratica");
    const first = Storage.recordUnitCorrection(
      attempt.attemptId,
      "real-1",
      "conceitual",
    );
    const beforeOverwrite = Storage.exportJSON();
    const overwrite = Storage.recordUnitCorrection(
      attempt.attemptId,
      "real-1",
      "atencao",
    );
    return {
      wrongState,
      wrongStateUnchanged,
      first,
      overwrite,
      overwriteUnchanged: beforeOverwrite === Storage.exportJSON(),
    };
  }, UNIT_ID);

  expect(result.wrongState.ok).toBe(false);
  expect(result.wrongStateUnchanged).toBe(true);
  expect(result.first.ok).toBe(true);
  expect(result.overwrite.ok).toBe(false);
  expect(result.overwriteUnchanged).toBe(true);
});

test("rejeita correção de tentativa histórica inativa", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    Storage.update((data) => {
      data.unitProgress[unitId] = {
        state: "pratica_em_andamento",
        updatedAt: new Date().toISOString(),
        reading: { startedAt: null, completedAt: null },
        video: { startedAt: null, completedAt: null },
        activeAttemptId: null,
      };
    });
    const answerWrong = (attemptId, questionId) => {
      Storage.recordUnitAnswer(attemptId, {
        questionId,
        answer: "E",
        correct: false,
        objetivos: ["pt-int-inferencia-valida"],
      });
      Storage.finishUnitAttempt(attemptId);
    };
    const historical = Storage.startUnitAttempt(unitId, "pratica", ["real-1"]);
    answerWrong(historical.attemptId, "real-1");
    const active = Storage.startUnitAttempt(unitId, "pratica", ["real-2"]);
    answerWrong(active.attemptId, "real-2");
    Storage.transitionUnit(unitId, "concluir_pratica");

    const before = Storage.exportJSON();
    const correction = Storage.recordUnitCorrection(
      historical.attemptId,
      "real-1",
      "interpretacao",
    );
    return { correction, unchanged: before === Storage.exportJSON() };
  }, UNIT_ID);

  expect(result.correction.ok).toBe(false);
  expect(result.unchanged).toBe(true);
});

test("agenda revisão futura somente para objetivos do desempenho ativo", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    Storage.update((data) => {
      data.unitProgress[unitId] = {
        state: "pratica_em_andamento",
        updatedAt: new Date().toISOString(),
        reading: { startedAt: null, completedAt: null },
        video: { startedAt: null, completedAt: null },
        activeAttemptId: null,
      };
    });
    const attempt = Storage.startUnitAttempt(unitId, "pratica", ["real-1"]);
    Storage.recordUnitAnswer(attempt.attemptId, {
      questionId: "real-1",
      answer: "C",
      correct: true,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.finishUnitAttempt(attempt.attemptId);
    Storage.transitionUnit(unitId, "concluir_pratica");
    Storage.transitionUnit(unitId, "concluir_correcao");
    const future = addDaysISO(todayISO(), 1);
    const base = {
      unitId,
      scheduledDate: future,
      reason: "Desempenho registrado na prática.",
    };
    const invalidResults = [
      Storage.scheduleUnitReview({ ...base, objetivos: [""] }),
      Storage.scheduleUnitReview({
        ...base,
        objetivos: ["pt-int-inferencia-valida", "pt-int-inferencia-valida"],
      }),
      Storage.scheduleUnitReview({ ...base, objetivos: ["objetivo-inexistente"] }),
      Storage.scheduleUnitReview({
        ...base,
        objetivos: ["pt-int-inferencia-valida"],
        scheduledDate: todayISO(),
      }),
      Storage.scheduleUnitReview({
        ...base,
        objetivos: ["pt-int-inferencia-valida"],
        scheduledDate: "2026-02-30",
      }),
    ];
    const valid = Storage.scheduleUnitReview({
      ...base,
      objetivos: ["pt-int-inferencia-valida"],
    });
    Storage.update((data) => {
      data.unitProgress[unitId].state = "correcao_concluida";
    });
    const beforeDuplicate = Storage.exportJSON();
    const duplicate = Storage.scheduleUnitReview({
      ...base,
      objetivos: ["pt-int-inferencia-valida"],
    });
    return {
      invalidResults,
      valid,
      duplicate,
      duplicateUnchanged: beforeDuplicate === Storage.exportJSON(),
    };
  }, UNIT_ID);

  expect(result.invalidResults.every((item) => item.ok === false)).toBe(true);
  expect(result.valid).toEqual({ ok: true, state: "revisao_agendada" });
  expect(result.duplicate.ok).toBe(false);
  expect(result.duplicateUnchanged).toBe(true);
});

test("não permite agendar revisão por transitionUnit", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    Storage.update((data) => {
      data.unitProgress[unitId] = {
        state: "correcao_concluida",
        updatedAt: new Date().toISOString(),
        reading: { startedAt: null, completedAt: null },
        video: { startedAt: null, completedAt: null },
        activeAttemptId: null,
      };
      data.unitReviews.push({
        id: "review-legado",
        unitId,
        objetivos: ["pt-int-inferencia-valida"],
        scheduledDate: addDaysISO(todayISO(), 1),
        reason: "Registro legado.",
        status: "pendente",
        createdAt: new Date().toISOString(),
      });
    });
    const before = Storage.exportJSON();
    const transition = Storage.transitionUnit(unitId, "agendar_revisao");
    return { transition, unchanged: before === Storage.exportJSON() };
  }, UNIT_ID);

  expect(result.transition).toEqual({
    ok: false,
    state: "correcao_concluida",
  });
  expect(result.unchanged).toBe(true);
});

test("importação rejeita estruturas internas de unidade malformadas", async ({
  page,
}) => {
  const errors = await page.evaluate(() => {
    const malformed = [
      { schemaVersion: 5, unitAttempts: [null] },
      {
        schemaVersion: 5,
        unitAttempts: [{
          id: "attempt-sem-resultado",
          unitId: "unidade",
          phase: "pratica",
          questionIds: ["real-1"],
          answers: [],
          finishedAt: new Date().toISOString(),
        }],
      },
      { schemaVersion: 5, unitProgress: { unidade: null } },
    ];
    return malformed.map((data) => {
      try {
        Storage.importJSON(JSON.stringify(data));
        return null;
      } catch (error) {
        return error.message;
      }
    });
  });

  expect(errors.every(Boolean)).toBe(true);
  expect(errors.join(" ")).toMatch(/unidade|tentativa/i);
});

test("migração normaliza unidade legada e mantém entradas válidas", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    const validAttempt = {
      id: "attempt-valid",
      unitId,
      phase: "pratica",
      questionIds: ["real-1"],
      startedAt: new Date().toISOString(),
      finishedAt: null,
      answers: [],
      customLegacyField: "preservado",
    };
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 5,
        unitAttempts: [null, validAttempt],
        unitProgress: {
          quebrada: null,
          [unitId]: {
            state: "estado-legado-invalido",
            customLegacyField: "preservado",
          },
        },
      }),
    );
    const data = Storage.get();
    const transition = Storage.transitionUnit("quebrada", "concluir_video");
    const persisted = JSON.parse(localStorage.getItem("portal-estudos-v1"));
    return { data, transition, persisted };
  }, UNIT_ID);

  expect(result.data.unitAttempts).toHaveLength(1);
  expect(result.data.unitAttempts[0].customLegacyField).toBe("preservado");
  expect(result.data.unitProgress[UNIT_ID].state).toBe("nao_iniciada");
  expect(result.data.unitProgress[UNIT_ID].customLegacyField).toBe("preservado");
  expect(result.transition).toEqual({ ok: false, state: "nao_iniciada" });
  expect(result.persisted.unitAttempts).toHaveLength(1);
  expect(result.persisted.unitProgress.quebrada.state).toBe("nao_iniciada");
});

test("importação rejeita respostas de tentativa inconsistentes", async ({
  page,
}) => {
  const errors = await page.evaluate(() => {
    const base = {
      id: "attempt-importado",
      unitId: "unidade",
      phase: "pratica",
      questionIds: ["real-1"],
      answers: [{
        questionId: "real-1",
        answer: "E",
        correct: false,
        objetivos: ["pt-int-inferencia-valida"],
      }],
      performanceByObjective: {},
      startedAt: new Date().toISOString(),
      finishedAt: null,
      result: null,
    };
    const malformed = [
      { ...base, answers: [{ ...base.answers[0], questionId: "real-2" }] },
      { ...base, answers: [{ ...base.answers[0], answer: undefined }] },
      { ...base, answers: [{ ...base.answers[0], objetivos: [] }] },
      { ...base, answers: [{ ...base.answers[0], objetivos: [7] }] },
      { ...base, answers: [base.answers[0], { ...base.answers[0] }] },
    ];
    return malformed.map((attempt) => {
      try {
        Storage.importJSON(JSON.stringify({
          schemaVersion: 5,
          unitAttempts: [attempt],
        }));
        return null;
      } catch (error) {
        return error.message;
      }
    });
  });

  expect(errors.every(Boolean)).toBe(true);
});

test("migração recalcula resultado importado antes de concluir prática", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    const attemptId = "attempt-resultado-adulterado";
    const startedAt = new Date(Date.now() - 1000).toISOString();
    Storage.importJSON(JSON.stringify({
      schemaVersion: 5,
      unitProgress: {
        [unitId]: {
          state: "pratica_em_andamento",
          activeAttemptId: attemptId,
        },
      },
      unitAttempts: [{
        id: attemptId,
        unitId,
        phase: "pratica",
        questionIds: ["real-1"],
        answers: [{
          questionId: "real-1",
          answer: "E",
          correct: false,
          objetivos: ["pt-int-inferencia-valida"],
        }],
        performanceByObjective: {
          "pt-int-inferencia-valida": { answered: 1, correct: 1, wrong: 0 },
        },
        startedAt,
        finishedAt: new Date().toISOString(),
        result: { answered: 1, correct: 1, wrong: 0 },
      }],
    }));
    const transition = Storage.transitionUnit(unitId, "concluir_pratica");
    const attempt = Storage.get().unitAttempts[0];
    return { transition, attempt };
  }, UNIT_ID);

  expect(result.attempt.result).toEqual({ answered: 1, correct: 0, wrong: 1 });
  expect(result.attempt.performanceByObjective).toEqual({
    "pt-int-inferencia-valida": { answered: 1, correct: 0, wrong: 1 },
  });
  expect(result.transition).toEqual({ ok: true, state: "correcao_pendente" });
});

test("revisão importada exige contrato completo e não libera conclusão", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    const review = {
      id: "review-valida",
      unitId,
      objetivos: ["pt-int-inferencia-valida"],
      scheduledDate: addDaysISO(todayISO(), 1),
      reason: "Revisar o objetivo com erro.",
      status: "pendente",
      createdAt: new Date().toISOString(),
    };
    const malformed = [
      { ...review, id: "" },
      { ...review, objetivos: [] },
      { ...review, objetivos: ["pt-int-inferencia-valida", "pt-int-inferencia-valida"] },
      { ...review, scheduledDate: "2026-02-30" },
      { ...review, reason: "" },
      { ...review, status: "qualquer" },
      { ...review, createdAt: "invalido" },
    ];
    const importErrors = malformed.map((item) => {
      try {
        Storage.importJSON(JSON.stringify({ schemaVersion: 5, unitReviews: [item] }));
        return null;
      } catch (error) {
        return error.message;
      }
    });
    localStorage.setItem("portal-estudos-v1", JSON.stringify({
      schemaVersion: 5,
      unitProgress: {
        [unitId]: {
          state: "revisao_agendada",
          activeReviewId: "review-incompleta",
        },
      },
      unitReviews: [{ id: "review-incompleta", unitId, status: "pendente" }],
    }));
    const migrated = Storage.get();
    const before = Storage.exportJSON();
    const transition = Storage.transitionUnit(unitId, "concluir_unidade");
    return {
      importErrors,
      migratedReviews: migrated.unitReviews,
      transition,
      unchanged: before === Storage.exportJSON(),
    };
  }, UNIT_ID);

  expect(result.importErrors.every(Boolean)).toBe(true);
  expect(result.migratedReviews).toEqual([]);
  expect(result.transition).toEqual({ ok: false, state: "revisao_agendada" });
  expect(result.unchanged).toBe(true);
});

test("importação rejeita correção fraudulenta e migração não a conclui", async ({
  page,
}) => {
  const result = await page.evaluate((unitId) => {
    const startedAt = new Date(Date.now() - 2000).toISOString();
    const finishedAt = new Date(Date.now() - 1000).toISOString();
    const base = {
      id: "attempt-correcao-importada",
      unitId,
      phase: "pratica",
      questionIds: ["real-1"],
      startedAt,
      finishedAt,
      answers: [{
        questionId: "real-1",
        answer: "E",
        correct: false,
        objetivos: ["pt-int-inferencia-valida"],
        correction: {
          classification: "interpretacao",
          classifiedAt: finishedAt,
          reviewedAt: new Date().toISOString(),
        },
      }],
      result: { answered: 1, correct: 0, wrong: 1 },
      performanceByObjective: {},
    };
    const fraudulent = [
      { ...base, answers: [{ ...base.answers[0], correction: {
        ...base.answers[0].correction,
        classification: "fraudulenta",
      } }] },
      { ...base, answers: [{ ...base.answers[0], correction: {
        ...base.answers[0].correction,
        classifiedAt: "2026-02-30T00:00:00.000Z",
      } }] },
      { ...base, answers: [{ ...base.answers[0], correction: {
        ...base.answers[0].correction,
        reviewedAt: "agora",
      } }] },
    ];
    const importErrors = fraudulent.map((attempt) => {
      try {
        Storage.importJSON(JSON.stringify({ schemaVersion: 5, unitAttempts: [attempt] }));
        return null;
      } catch (error) {
        return error.message;
      }
    });
    localStorage.setItem("portal-estudos-v1", JSON.stringify({
      schemaVersion: 5,
      unitProgress: {
        [unitId]: { state: "correcao_pendente", activeAttemptId: base.id },
      },
      unitAttempts: [fraudulent[0]],
    }));
    const migrated = Storage.get();
    const before = Storage.exportJSON();
    const transition = Storage.transitionUnit(unitId, "concluir_correcao");
    return {
      importErrors,
      migratedAttempts: migrated.unitAttempts,
      transition,
      unchanged: before === Storage.exportJSON(),
    };
  }, UNIT_ID);

  expect(result.importErrors.every(Boolean)).toBe(true);
  expect(result.migratedAttempts).toEqual([]);
  expect(result.transition).toEqual({ ok: false, state: "correcao_pendente" });
  expect(result.unchanged).toBe(true);
});

test("tentativa importada exige IDs e timestamps semanticamente válidos", async ({
  page,
}) => {
  const errors = await page.evaluate(() => {
    const startedAt = new Date(Date.now() - 1000).toISOString();
    const base = {
      id: "attempt-valida",
      unitId: "unidade-valida",
      phase: "pratica",
      questionIds: ["real-1"],
      startedAt,
      finishedAt: null,
      answers: [],
      result: null,
      performanceByObjective: {},
    }, completedAnswers = [{
      questionId: "real-1",
      answer: "C",
      correct: true,
      objetivos: ["pt-int-inferencia-valida"],
    }];
    const malformed = [
      { ...base, id: "   " },
      { ...base, unitId: "\t" },
      { ...base, questionIds: [" "] },
      { ...base, answers: [{
        questionId: " ", answer: "E", correct: false,
        objetivos: ["pt-int-inferencia-valida"],
      }] },
      { ...base, answers: [{
        questionId: "real-1", answer: "E", correct: false, objetivos: ["  "],
      }] },
      { ...base, startedAt: "2026-02-30T00:00:00.000Z" },
      {
        ...base,
        answers: completedAnswers,
        finishedAt: "verdadeiro-mas-invalido",
      },
      {
        ...base,
        answers: completedAnswers,
        finishedAt: new Date(Date.now() - 2000).toISOString(),
      },
    ];
    return malformed.map((attempt) => {
      try {
        Storage.importJSON(JSON.stringify({ schemaVersion: 5, unitAttempts: [attempt] }));
        return null;
      } catch (error) {
        return error.message;
      }
    });
  });

  expect(errors.every(Boolean)).toBe(true);
});

async function openPilot(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => {
    const data = Storage.get();
    data.startDate = todayISO();
    data.studyDays = [0, 1, 2, 3, 4, 5, 6];
    Storage.set(data);
  });
  await page.reload();
}

for (const [name, viewport] of [
  ["desktop", { width: 1280, height: 800 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  test(`leitura bloqueada mantém uma ação principal e retoma no ${name}`, async ({
    page,
  }) => {
    await openPilot(page, viewport);

    const primary = page.locator("[data-primary-action]");
    await expect(primary).toHaveCount(1);
    await expect(primary).toHaveText("Começar leitura");
    await expect(page.getByText("Videoaula", { exact: true })).toBeVisible();
    await expect(page.getByText(/Conclua a leitura para desbloquear/)).toBeVisible();

    await primary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Comece pelo que o texto afirma" })).toBeVisible();
    await expect(primary).toHaveCount(1);
    await expect(primary).toHaveText("Concluir leitura");
    await page.reload();
    await expect(page.getByText("Continue a leitura de onde parou.")).toBeVisible();
    await expect(primary).toHaveText("Concluir leitura");

    await primary.click();
    await expect(page.getByText("Videoaula pendente de validação")).toBeVisible();
    await expect(page.locator("iframe, a[href*='youtube.com']")).toHaveCount(0);
    await expect(primary).toHaveCount(0);
    await expect(page.getByText(/Aguarde a validação da videoaula/)).toHaveCount(2);
    expect(
      await page.evaluate((unitId) => Storage.getUnitProgress(unitId).state, UNIT_ID),
    ).toBe("leitura_concluida");
  });
}

test("video validado usa trecho incorporado e só conclui por ação explícita", async ({
  page,
}) => {
  await expect(page.locator("#app-root")).not.toContainText("Carregando...");
  await page.route("https://www.youtube.com/**", (route) => route.abort());
  await page.evaluate((unitId) => {
    Storage.update((data) => {
      data.unitProgress[unitId] = {
        state: "leitura_concluida",
        reading: { startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        video: { startedAt: null, completedAt: null },
      };
    });
    const unit = {
      id: unitId,
      titulo: "Unidade de teste",
      objetivos: ["objetivo-1"],
      leitura: { secoes: [] },
      video: {
        aulaId: "aula-teste",
        inicioSegundos: 12,
        fimSegundos: 98,
        objetivosCobertos: ["objetivo-1"],
        fonteVerificada: true,
        coberturaPedagogicaVerificada: true,
        statusVerificacao: "aprovado",
        motivoSelecao: "Trecho conferido.",
        fonte: "YouTube",
        fonteUrl: "https://www.youtube.com/watch?v=B1lk04l-dRU",
        verificadoEm: "2026-07-15",
      },
    };
    const context = {
      unit,
      task: { unitId },
      entry: {},
      data: { aulas: { aulas: [{ id: "aula-teste", tipo: "video", url: "https://www.youtube.com/watch?v=B1lk04l-dRU", videoId: "B1lk04l-dRU", duracaoTotalSegundos: 120, canal: "Canal verificado", tituloYoutube: "Aula verificada", verificadoEm: "2026-07-15" }] } },
    };
    const root = document.getElementById("app-root");
    root.innerHTML = UnitFlow.render(context);
    UnitFlow.bind({ ...context, rerender: () => {
      root.innerHTML = UnitFlow.render(context);
      UnitFlow.bind({ ...context, rerender: () => {} });
    } });
  }, "unidade-video-teste");

  await page.getByRole("button", { name: "Assistir videoaula" }).click();
  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/B1lk04l-dRU?start=12&end=98&rel=0",
  );
  await expect(frame).toHaveAttribute("title", /videoaula/i);
  await expect(frame).toHaveAttribute("allowfullscreen", "");
  await expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  expect(
    await page.evaluate(() => Storage.getUnitProgress("unidade-video-teste").state),
  ).toBe("video_em_andamento");
  await page.getByRole("button", { name: "Concluir videoaula" }).click();
  expect(
    await page.evaluate(() => Storage.getUnitProgress("unidade-video-teste").state),
  ).toBe("video_concluido");
});

test("fechamento da unidade real ignora chaves legadas", async ({ page }) => {
  const today = await page.evaluate(() => todayISO());
  await page.evaluate(({ unitId, today }) => {
    Storage.update((data) => {
      data.startDate = today;
      data.studyDays = [0, 1, 2, 3, 4, 5, 6];
      data.unitProgress[unitId] = { state: "concluida" };
      data.taskStatus[`${today}_0_learn`] = "pendente";
      data.taskStatus[`${today}_0_read`] = "pendente";
      data.taskStatus[`${today}_0_practice`] = "pendente";
      data.studySessions = [{ id: "unit-session", date: today, dayKey: today, minutes: 10 }];
    });
  }, { unitId: UNIT_ID, today });
  await page.reload();

  await expect(page.locator("#btn-done")).toBeEnabled();
  await page.locator("#btn-done").click();
  expect(await page.evaluate((date) => Storage.get().dayStatus[date], today)).toBe("concluido");
});

test("retoma a seção estável da leitura após recarregar", async ({ page }) => {
  await openPilot(page, { width: 1280, height: 800 });
  await page.getByRole("button", { name: "Começar leitura" }).click();
  await page.locator("#coesao-referencial").focus();
  expect(await page.evaluate((id) => Storage.getUnitProgress(id).reading.sectionId, UNIT_ID)).toBe("coesao-referencial");

  await page.reload();
  await expect(page.locator("#coesao-referencial")).toBeFocused();
  await expect(page.getByText("Retomada: Siga a cadeia de referências")).toBeVisible();
});

test("cada data mesclada considera somente suas próprias unidades", async ({ page }) => {
  const dates = await page.evaluate(() => ({ today: todayISO(), yesterday: addDaysISO(todayISO(), -1) }));
  await page.route("**/data/cronograma.json", (route) => route.fulfill({ json: {
    days: [
      { dia: 1, titulo: "Legado", tasks: [{ materia: "Português", assunto: "Legado", aulaId: "aula-pt-01", pdfId: "pdf-pt-01" }] },
      { dia: 2, titulo: "Unidade", tasks: [{ materia: "Português", assunto: "Interpretação de textos", unitId: UNIT_ID }] },
    ],
  } }));
  await page.evaluate(({ unitId, today, yesterday }) => Storage.update((data) => {
    data.startDate = yesterday;
    data.studyDays = [0, 1, 2, 3, 4, 5, 6];
    data.dayStatus[yesterday] = "faltou";
    data.recoveryTarget = { date: yesterday, merge: true };
    for (const step of ["learn", "read", "practice"])
      data.taskStatus[`${yesterday}_0_${step}`] = "concluida";
    data.unitProgress[unitId] = { state: "leitura_em_andamento" };
  }), { unitId: UNIT_ID, ...dates });
  await page.reload();

  await expect(page.locator(`[data-finish-date="${dates.yesterday}"]`)).toBeEnabled();
  await expect(page.locator(`[data-finish-date="${dates.today}"]`)).toBeDisabled();
});

test("recuperação com unidade concluída fecha somente a data recuperada", async ({ page }) => {
  const dates = await page.evaluate(() => ({ today: todayISO(), yesterday: addDaysISO(todayISO(), -1) }));
  await page.route("**/data/cronograma.json", (route) => route.fulfill({ json: {
    days: [
      { dia: 1, titulo: "Unidade", tasks: [{ materia: "Português", assunto: "Interpretação de textos", unitId: UNIT_ID }] },
      { dia: 2, titulo: "Legado", tasks: [{ materia: "Português", assunto: "Legado", aulaId: "aula-pt-02", pdfId: "pdf-pt-02" }] },
    ],
  } }));
  await page.evaluate(({ unitId, today, yesterday }) => Storage.update((data) => {
    data.startDate = yesterday;
    data.studyDays = [0, 1, 2, 3, 4, 5, 6];
    data.dayStatus[yesterday] = "faltou";
    data.recoveryTarget = { date: yesterday };
    data.unitProgress[unitId] = { state: "concluida" };
    data.taskStatus[`${yesterday}_0_learn`] = "pendente";
    data.studySessions = [{ id: "recovery-unit", date: today, dayKey: yesterday, minutes: 10 }];
  }), { unitId: UNIT_ID, ...dates });
  await page.reload();

  await page.locator("#btn-done").click();
  const status = await page.evaluate(() => Storage.get().dayStatus);
  expect(status[dates.yesterday]).toBe("recuperado");
  expect(status[dates.today]).not.toBe("concluido");
});

test("não libera vídeo sem tipo, duração e ID canônico confirmados", async ({ page }) => {
  const result = await page.evaluate((unitId) => {
    Storage.update((data) => { data.unitProgress[unitId] = { state: "leitura_concluida" }; });
    const unit = {
      id: unitId,
      titulo: "Teste",
      objetivos: ["obj"],
      leitura: { secoes: [] },
      video: { aulaId: "aula", inicioSegundos: 0, fimSegundos: 90, objetivosCobertos: ["obj"], fonteVerificada: true, coberturaPedagogicaVerificada: true, statusVerificacao: "aprovado", motivoSelecao: "ok", fonte: "YouTube", fonteUrl: "https://www.youtube.com/watch?v=B1lk04l-dRU", verificadoEm: "2026-07-15" },
    };
    document.getElementById("app-root").innerHTML = UnitFlow.render({ unit, task: {}, entry: {}, data: { aulas: { aulas: [{ id: "aula", tipo: "playlist", url: "https://www.youtube.com/watch?v=outro", videoId: "B1lk04l-dRU", duracaoTotalSegundos: 60, verificadoEm: "2026-07-15" }] } } });
    return {
      iframe: Boolean(document.querySelector("iframe")),
      action: document.querySelector("[data-unit-event='iniciar_video']")?.textContent,
    };
  }, "unidade-video-invalido");
  expect(result).toEqual({ iframe: false, action: undefined });
  await expect(page.getByText("Videoaula pendente de validação")).toBeVisible();
});

test("leitura exibe apoios e fontes verificadas com semântica segura", async ({ page }) => {
  await openPilot(page, { width: 1280, height: 800 });
  await page.getByRole("button", { name: "Começar leitura" }).click();

  await expect(page.getByRole("heading", { name: "Pontos-chave" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Armadilhas de banca" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fontes" })).toBeVisible();
  await expect(page.locator("[aria-label='Pontos-chave'] li")).toHaveCount(4);
  const source = page.locator("[aria-label='Fontes da leitura'] a").first();
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", "noopener noreferrer");
});

test("bind usa entry para conectar a ocorrência correta da unidade", async ({ page }) => {
  const result = await page.evaluate(() => {
    const unit = { id: "unidade-repetida", titulo: "Teste", objetivos: [], leitura: { tempoMinutos: 5, secoes: [] }, video: {} };
    const task = { materia: "Português", assunto: "Teste" };
    const data = { aulas: { aulas: [] } };
    const first = { scheduleDate: "2026-07-14", index: 0 };
    const second = { scheduleDate: "2026-07-15", index: 0 };
    const root = document.getElementById("app-root");
    root.innerHTML = UnitFlow.render({ unit, task, entry: first, data }) + UnitFlow.render({ unit, task, entry: second, data });
    let rerenders = 0;
    UnitFlow.bind({ unit, task, entry: second, data, rerender: () => rerenders++ });
    root.querySelector(`[data-unit-entry="2026-07-15_0"] [data-unit-event]`).click();
    return { rerenders, state: Storage.getUnitProgress(unit.id).state };
  });
  expect(result).toEqual({ rerenders: 1, state: "leitura_em_andamento" });
});
