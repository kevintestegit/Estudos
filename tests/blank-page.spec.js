const { test, expect } = require("@playwright/test");
const fs = require("fs");

const pages = [
  { path: "index.html",       name: "Dashboard" },
  { path: "hoje.html",        name: "Hoje" },
  { path: "cronograma.html",  name: "Cronograma" },
  { path: "edital.html",      name: "Edital" },
  { path: "biblioteca.html",  name: "Biblioteca" },
  { path: "materias.html",    name: "Matérias" },
  { path: "questoes.html",    name: "Questões" },
  { path: "flashcards.html",  name: "Flashcards" },
  { path: "simulados.html",   name: "Simulados" },
  { path: "provas.html",      name: "Provas" },
  { path: "caderno-erros.html", name: "Caderno de erros" },
  { path: "progresso.html",   name: "Progresso" },
  { path: "backup.html",      name: "Backup" },
];

const results = [];

function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push({ type: "js", msg: error.message }));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      const url = response.url().replace(/http:\/\/127\.0\.0\.1:3050/, "");
      errors.push({ type: "http", msg: `${response.status()} ${url}` });
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push({ type: "console", msg: message.text() });
    }
  });
  return errors;
}

test.describe("Blank page detection", () => {
  for (const { path, name } of pages) {
    test(`${name} (${path})`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(`/${path}`);
      await page.waitForTimeout(300);

      const root = page.locator("#app-root");
      const text = await root.innerText();
      const hasContent = text.trim().length > 20;
      const title = await page.title();

      const result = {
        page: name,
        path,
        blank: !hasContent,
        textLength: text.trim().length,
        title,
        errors,
        heading: await page.locator("h1").count() > 0 ? (await page.locator("h1").first().textContent()) : null,
      };
      results.push(result);

      console.log(`${hasContent ? "OK" : "*** BRANCO ***"} ${name.padEnd(18)} ${title.padEnd(28)} h1="${result.heading || ""}" len=${String(text.trim().length).padStart(5)} errs=${errors.length}`);

      expect(hasContent).toBe(true);
    });
  }

  test.afterAll(() => {
    const blank = results.filter(r => r.blank);
    const ok = results.filter(r => !r.blank);
    const allErrors = results.flatMap(r => r.errors);
    const report = {
      total: pages.length,
      ok: ok.length,
      blank: blank.length,
      pagesWithErrors: results.filter(r => r.errors.length),
      allErrors,
      summary: blank.length > 0
        ? `*** ${blank.length} pagina(s) em branco detectada(s) ***`
        : `Nenhuma pagina em branco. ${ok.length}/${pages.length} carregam conteudo.`,
    };
    if (blank.length > 0) {
      console.log("\n=== PAGINAS EM BRANCO ===");
      blank.forEach(r => console.log(`  ${r.page} (${r.path})`));
    }
    if (allErrors.length > 0) {
      console.log("\n=== TODOS ERROS HTTP ===");
      allErrors.filter(e => e.type === "http").forEach(e => console.log(`  ${e.msg}`));
    }
    console.log("\n" + report.summary);
    fs.writeFileSync("reports/blank-page-report.json", JSON.stringify(report, null, 2));
  });
});
