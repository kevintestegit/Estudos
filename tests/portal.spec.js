const { test, expect } = require("@playwright/test");

const pages = [
  "index.html",
  "hoje.html",
  "cronograma.html",
  "edital.html",
  "biblioteca.html",
  "materias.html",
  "questoes.html",
  "flashcards.html",
  "simulados.html",
  "provas.html",
  "caderno-erros.html",
  "progresso.html",
  "backup.html",
];

function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

async function openClean(page, url) {
  const errors = watchErrors(page);
  await page.goto(url);
  await expect(page.locator("#app-root")).not.toContainText(
    /Carregando|Falha ao carregar|Erro ao carregar|Não foi possível carregar/i,
  );
  expect(errors).toEqual([]);
}

async function answerOneQuestion(page, shouldBeCorrect) {
  const statement = await page.locator("#quiz-card h3").textContent();
  const question = await page.evaluate(async (text) => {
    const files = ["data/questoes-inss.json", "data/questoes-prf.json"];
    const banks = await Promise.all(
      files.map((file) => fetch(file).then((response) => response.json())),
    );
    return banks
      .flatMap((bank) => bank.questoes)
      .find((item) => item.enunciado.trim() === text.trim());
  }, statement);
  const correctIndex =
    question.tipo === "ce"
      ? question.gabarito === "C"
        ? 0
        : 1
      : Number(question.gabarito);
  const options = page.locator(".quiz-option");
  const index = shouldBeCorrect ? correctIndex : correctIndex === 0 ? 1 : 0;
  await options.nth(index).click();
  await page.locator("#q-confirm").click();
  await page.locator("#q-confirm").click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (const path of pages) {
  test(`${path} abre sem erro`, async ({ page }) => {
    await openClean(page, `/${path}`);
  });
}

test("primeiro acesso normaliza início para o primeiro dia habilitado", async ({
  page,
}) => {
  await openClean(page, "/hoje.html");
  await page.locator("#plan-start-date").fill("2026-07-12");
  await page.locator("#btn-start-plan").click();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("portal-estudos-v1")),
  );
  expect(progress.startDate).toBe("2026-07-13");
});

test("biblioteca aplica e limpa filtro vindo da URL", async ({ page }) => {
  await openClean(page, "/biblioteca.html?materia=Portugu%C3%AAs");
  await expect(page.getByText(/Filtro ativo.*Português/i)).toBeVisible();
  await page.getByRole("button", { name: /Limpar filtro/i }).click();
  await expect(page.locator("#bib-list .task-card").first()).toBeVisible();
});

test("biblioteca aceita filtros por tipo e busca", async ({ page }) => {
  await openClean(page, "/biblioteca.html?tipo=pdfs");
  await expect(page.locator("#bib-list .task-card").first()).toBeVisible();
  await page.locator("#bib-search").fill("redação");
  await expect(page.locator("#bib-list")).toContainText(/redação/i);
});

test("biblioteca mantém filtros legados úteis", async ({ page }) => {
  await openClean(
    page,
    "/biblioteca.html?tipo=questoes&materia=Direito%20Administrativo",
  );
  await expect(page.locator("#bib-list")).toContainText("Fazer questões");
  await page.goto("/biblioteca.html?tipo=acertos&materia=Portugu%C3%AAs");
  await expect(page.locator("#bib-list")).toContainText("Seu desempenho");
  await expect(page.locator("#bib-list")).not.toContainText("Nenhum resultado");
});

test("matérias renderiza botões e cartões com classes válidas", async ({
  page,
}) => {
  await openClean(page, "/materias.html");
  await expect(page.locator(".subject-card").first()).toBeVisible();
  await expect(page.locator("a.btn.btn-sm").first()).toBeVisible();
  expect(await page.locator('[class*="+"]').count()).toBe(0);
});

test("modo prova permite deixar questão em branco", async ({ page }) => {
  await openClean(
    page,
    "/questoes.html?tag=portugues-interpretacao&n=1&auto=1&modo=prova",
  );
  await page.getByRole("button", { name: "Deixar em branco" }).click();
  await expect(page.locator("#q-area")).toContainText("Questões em branco: 1");
  await expect(page.locator("#q-area")).toContainText("Em branco");
});

test("layout móvel não cria rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openClean(page, "/hoje.html");
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test("sessão antiga sem conclusão aparece como dia parcial", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 3,
        startDate: "2026-07-06",
        studyDays: [1, 2, 3, 4, 5, 6],
        dayStatus: {},
        studySessions: [
          { id: "old", date: "2026-07-11", minutes: 35, subject: "Português" },
        ],
      }),
    ),
  );
  await openClean(page, "/hoje.html");
  await expect(page.locator("#app-root")).toContainText(
    "Você estudou 35 minutos",
  );
  const status = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("portal-estudos-v1")).dayStatus[
        "2026-07-11"
      ],
  );
  expect(status).toBe("parcial");
});

test("recuperação registra data real e data do cronograma separadamente", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 3,
        startDate: "2026-07-06",
        studyDays: [1, 2, 3, 4, 5, 6],
        dayStatus: { "2026-07-06": "faltou" },
        studySessions: [],
      }),
    ),
  );
  await openClean(page, "/hoje.html");
  await page.getByRole("button", { name: /Recuperar 06\/07\/2026/i }).click();
  await page.getByText("Mais opções", { exact: true }).click();
  await page.getByRole("button", { name: /Registrar estudo manual/i }).click();
  await page.locator("#manual-min").fill("10");
  await page.locator("#btn-save-manual").click();
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("portal-estudos-v1")).studySessions.at(-1),
  );
  expect(session.date).toBe("2026-07-13");
  expect(session.dayKey).toBe("2026-07-06");
  expect(session.origin).toBe("recovery");
});

test("cronômetro inicia, pausa e salva sessão", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 4,
        startDate: "2026-07-13",
        studyDays: [1, 2, 3, 4, 5, 6],
        dayStatus: {},
        studySessions: [],
      }),
    ),
  );
  await openClean(page, "/hoje.html");
  await page.getByText("Cronômetro e registro").click();
  await page.locator("#btn-start").click();
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem("portal-estudos-v1"));
    progress.timer.startedAt -= 61_000;
    localStorage.setItem("portal-estudos-v1", JSON.stringify(progress));
  });
  await page.locator("#btn-pause").click();
  await page.locator("#btn-save").click();
  const minutes = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("portal-estudos-v1")).studySessions.at(-1)
        .minutes,
  );
  expect(minutes).toBeGreaterThanOrEqual(1);
});

test("exportação de backup registra a última cópia", async ({ page }) => {
  await openClean(page, "/backup.html");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar cópia do meu progresso" })
    .click();
  await download;
  const lastBackupAt = await page.evaluate(
    () => JSON.parse(localStorage.getItem("portal-estudos-v1")).lastBackupAt,
  );
  expect(lastBackupAt).toMatch(/^2026-07-13/);
});

test("migração preserva progresso da versão anterior", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 3,
        startDate: "2026-07-13",
        studyDays: [1],
        studySessions: [
          { id: "keep-session", date: "2026-07-13", minutes: 20 },
        ],
        quiz: { answered: 2, correct: 1, wrong: 1, bySubject: {} },
        erros: [{ id: "keep-error" }],
        simulados: [{ id: "keep-sim" }],
      }),
    ),
  );
  await openClean(page, "/progresso.html");
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("portal-estudos-v1")),
  );
  expect(progress.schemaVersion).toBe(4);
  expect(progress.studySessions[0].id).toBe("keep-session");
  expect(progress.quiz.answered).toBe(2);
  expect(progress.erros[0].id).toBe("keep-error");
  expect(progress.simulados[0].id).toBe("keep-sim");
});

test("simulados permite configurar a pontuação Cebraspe", async ({ page }) => {
  await openClean(page, "/simulados.html");
  await page
    .getByText("Configuração da pontuação Cebraspe", { exact: true })
    .click();
  await page.locator("#cebraspe-acerto").fill("1");
  await page.locator("#cebraspe-erro").fill("1");
  await page.locator("#cebraspe-branco").fill("0");
  await page.getByRole("button", { name: "Salvar configuração" }).click();
  const config = await page.evaluate(
    () => JSON.parse(localStorage.getItem("portal-estudos-v1")).cebraspeConfig,
  );
  expect(config).toEqual({ acerto: 1, erro: 1, branco: 0 });
});

test("concluir recuperação não conclui o dia atual", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 4,
        startDate: "2026-07-06",
        studyDays: [1, 2, 3, 4, 5, 6],
        dayStatus: { "2026-07-06": "faltou" },
        studySessions: [
          {
            id: "recovery-session",
            date: "2026-07-13",
            dayKey: "2026-07-06",
            minutes: 20,
            origin: "recovery",
          },
        ],
      }),
    ),
  );
  await openClean(page, "/hoje.html");
  await page.getByRole("button", { name: /Recuperar 06\/07\/2026/i }).click();
  await page.locator("#btn-done").click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  const status = await page.evaluate(
    () => JSON.parse(localStorage.getItem("portal-estudos-v1")).dayStatus,
  );
  expect(status["2026-07-06"]).toBe("recuperado");
  expect(status["2026-07-13"]).not.toBe("concluido");
});

test("mesclar preserva tarefas atuais e recuperadas", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 4,
        startDate: "2026-07-06",
        studyDays: [1, 2, 3, 4, 5, 6],
        dayStatus: { "2026-07-06": "faltou" },
      }),
    ),
  );
  await openClean(page, "/hoje.html");
  await page.getByRole("button", { name: "Mesclar com hoje" }).first().click();
  await expect(page.locator(".study-task")).toHaveCount(2);
  await expect(page.locator(".study-task")).toContainText([
    "Estudo de hoje",
    "Recuperação de 06/07/2026",
  ]);
});

test("concluir estudo normal marca somente o dia atual", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "portal-estudos-v1",
      JSON.stringify({
        schemaVersion: 4,
        startDate: "2026-07-13",
        studyDays: [1, 2, 3, 4, 5, 6],
        dayStatus: {},
        studySessions: [
          {
            id: "today-session",
            date: "2026-07-13",
            dayKey: "2026-07-13",
            minutes: 30,
          },
        ],
      }),
    ),
  );
  await openClean(page, "/hoje.html");
  await page.locator("#btn-done").click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  const status = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("portal-estudos-v1")).dayStatus[
        "2026-07-13"
      ],
  );
  expect(status).toBe("concluido");
});

test("questionário registra acerto", async ({ page }) => {
  await openClean(
    page,
    "/questoes.html?tag=portugues-interpretacao&n=1&auto=1",
  );
  await answerOneQuestion(page, true);
  await expect(page.locator("#q-area")).toContainText("100% de acertos");
});

test("questionário registra erro", async ({ page }) => {
  await openClean(
    page,
    "/questoes.html?tag=portugues-interpretacao&n=1&auto=1",
  );
  await answerOneQuestion(page, false);
  await expect(page.locator("#q-area")).toContainText("0% de acertos");
  const errors = await page.evaluate(
    () => JSON.parse(localStorage.getItem("portal-estudos-v1")).erros.length,
  );
  expect(errors).toBe(1);
});

test("importação valida, confirma e preserva o backup", async ({ page }) => {
  await openClean(page, "/backup.html");
  const backup = JSON.stringify({
    schemaVersion: 3,
    startDate: "2026-07-13",
    studyDays: [1],
    studySessions: [{ id: "imported", date: "2026-07-13", minutes: 15 }],
  });
  await page
    .locator("#file-import")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page.locator("#btn-import").click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Backup importado com sucesso",
  );
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("portal-estudos-v1")),
  );
  expect(progress.schemaVersion).toBe(4);
  expect(progress.studySessions[0].id).toBe("imported");
});

test("menu móvel fecha depois de selecionar um destino", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openClean(page, "/hoje.html");
  await page.locator("#menu-toggle").click();
  await expect(page.locator("#sidebar")).toHaveClass(/open/);
  await page.getByRole("link", { name: "Meu progresso" }).click();
  await expect(page).toHaveURL(/progresso\.html/);
  await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
});

test("modal controla foco e fecha com Escape", async ({ page }) => {
  await openClean(page, "/backup.html");
  const resetButton = page.locator("#btn-reset");
  await resetButton.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(resetButton).toBeFocused();
});

test("Service Worker remove o cache da versão anterior", async ({ page }) => {
  await openClean(page, "/hoje.html");
  const cacheNames = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await caches.open("portal-estudos-v10");
    const script = new URL("service-worker.js?upgrade-test=1", location.href);
    const registration = await navigator.serviceWorker.register(script, {
      scope: "./",
    });
    const worker = registration.installing || registration.waiting || registration.active;
    if (worker?.state !== "activated") {
      await new Promise((resolve) => {
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") resolve();
        });
      });
    }
    return caches.keys();
  });
  expect(cacheNames).toContain("portal-estudos-v11");
  expect(cacheNames).not.toContain("portal-estudos-v10");
});
