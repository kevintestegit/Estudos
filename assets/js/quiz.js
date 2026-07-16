// Questões, simulados e provas
async function initQuestoes() {
  App.initShell("questoes");
  try {
    const [qInss, qPrf, qPrev, textos] = await Promise.all([
      App.loadJSON("data/questoes-inss.json"),
      App.loadJSON("data/questoes-prf.json"),
      App.loadJSON("data/questoes-prev.json").catch(() => ({ questoes: [] })),
      App.loadJSON("data/textos.json").catch(() => ({ textos: {} })),
    ]);
    const data = { qInss, qPrf, qPrev, textos: textos.textos || {} };
    const params = new URLSearchParams(location.search);
    renderQuestoesHome(data, params);
  } catch (e) {
    document.getElementById("app-root").innerHTML =
      `<div class="alert alert-danger">Erro ao carregar questões. ${App.esc(e.message)}</div>`;
  }
}

function allQuestions(data) {
  return [
    ...(data.qInss?.questoes || []),
    ...(data.qPrf?.questoes || []),
    ...(data.qPrev?.questoes || []),
  ];
}

function renderQuestoesHome(data, params) {
  const all = allQuestions(data);
  const materias = [...new Set(all.map((q) => q.materia))].sort();
  const tag = params.get("tag") || "";
  const materia = params.get("materia") || "";
  const nParam = Number(params.get("n")) || 0;
  const auto = params.get("auto") === "1";
  const taskKey = params.get("taskKey") || "";
  const root = document.getElementById("app-root");

  root.innerHTML = `
    <div class="card mb-1" id="q-setup">
      <h2>Questionários</h2>
      <p class="muted">${all.length} questões disponíveis · Certo/errado e múltipla escolha.</p>
      <div class="grid grid-2">
        <div class="form-row">
          <label for="q-materia">Matéria</label>
          <select id="q-materia">
            <option value="">Todas</option>
            ${materias.map((m) => `<option value="${App.esc(m)}" ${m === materia ? "selected" : ""}>${App.esc(m)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <label for="q-tag">Tag / assunto</label>
          <input id="q-tag" type="text" value="${App.esc(tag)}" placeholder="ex.: prev-carencia">
        </div>
        <div class="form-row">
          <label for="q-n">Quantidade</label>
          <input id="q-n" type="number" min="1" max="50" value="${nParam || 5}">
        </div>
        <div class="form-row">
          <label for="q-origem">Origem</label>
          <select id="q-origem">
            <option value="todas">Todas</option>
            <option value="inss">INSS / comum</option>
            <option value="prf">PRF / comum</option>
            <option value="prev">Previdenciário (lei seca)</option>
          </select>
        </div>
        <div class="form-row">
          <label for="q-modo">Modo</label>
          <select id="q-modo">
            <option value="pratica">Prática (gabarito na hora)</option>
            <option value="prova">Modo prova (gabarito só no final)</option></select></div><div class="form-row"><label for="q-flag">Filtro</label><select id="q-flag"><option value="">Todas</option><option value="favorite">Favoritas</option><option value="doubt">Dúvidas</option><option value="review">Pendentes revisão</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn" id="q-start">Iniciar questionário</button>
      </div>
      <div id="q-msg" class="mt-1"></div>
    </div>
    <div id="q-area"></div>
  `;

  function beginQuiz(forceMode) {
    const msg = document.getElementById("q-msg");
    try {
      let pool = allQuestions(data);
      const origem = document.getElementById("q-origem").value;
      if (origem === "inss") pool = data.qInss.questoes || [];
      if (origem === "prf") pool = data.qPrf.questoes || [];
      if (origem === "prev") pool = data.qPrev?.questoes || [];
      const mat = document.getElementById("q-materia").value;
      const tg = document.getElementById("q-tag").value.trim();
      if (mat) pool = pool.filter((q) => q.materia === mat);
      if (tg) {
        const tgl = tg.toLowerCase();
        pool = pool.filter(
          (q) =>
            (q.tag || "").toLowerCase().includes(tgl) ||
            (q.assunto || "").toLowerCase().includes(tgl) ||
            (q.materia || "").toLowerCase().includes(tgl),
        );
      }
      const flagFilt = document.getElementById("q-flag")?.value;
      if (flagFilt === "favorite")
        pool = pool.filter((q) => Storage.getQuestionFlag(q.id).favorite);
      if (flagFilt === "doubt")
        pool = pool.filter((q) => Storage.getQuestionFlag(q.id).doubt);
      if (flagFilt !== "review")
        pool = pool.filter(
          (q) => !q.reviewStatus || q.reviewStatus !== "pendente_de_revisao",
        );
      const n = Math.max(1, Number(document.getElementById("q-n").value) || 5);
      pool = shuffle(pool).slice(0, Math.min(n, pool.length));
      if (!pool.length) {
        msg.innerHTML =
          '<div class="alert alert-warn">Nenhuma questão com esse filtro. Limpe a matéria/tag e tente de novo.</div>';
        return;
      }
      msg.innerHTML = "";
      const setup = document.getElementById("q-setup");
      if (setup) setup.classList.add("hidden");
      const mode =
        forceMode || document.getElementById("q-modo").value || "pratica";
      startQuiz(pool, { mode, tipo: origem, textos: data.textos || {}, taskKey });
    } catch (err) {
      msg.innerHTML = `<div class="alert alert-danger">Erro ao iniciar: ${App.esc(err.message || err)}</div>`;
      console.error(err);
    }
  }

  document
    .getElementById("q-start")
    .addEventListener("click", () => beginQuiz());
  if (auto || tag || materia) beginQuiz(params.get("modo") || "pratica");
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function answerLabel(question, value) {
  if (question.tipo === "ce") return value === "C" ? "Certo" : "Errado";
  return typeof value === "number"
    ? String.fromCharCode(65 + value)
    : String(value ?? "—");
}

function startQuiz(questions, meta) {
  meta = meta || {};
  let area = document.getElementById("q-area");
  if (!area) {
    const root = document.getElementById("app-root");
    root.insertAdjacentHTML("beforeend", '<div id="q-area"></div>');
    area = document.getElementById("q-area");
  }
  if (!questions || !questions.length) {
    area.innerHTML =
      '<div class="alert alert-warn">Nenhuma questão para exibir.</div>';
    return;
  }

  const unitMode = Boolean(meta.unitId && meta.phase && meta.attemptId);
  const resumed = Array.isArray(meta.resumeAnswers) ? meta.resumeAnswers : [];
  const answeredIds = new Set(resumed.map((answer) => answer.questionId));
  const pendingIndex = questions.findIndex(
    (question) => !answeredIds.has(question.id),
  );
  let idx = pendingIndex < 0 ? questions.length : pendingIndex;
  let correct = resumed.filter((answer) => answer.correct).length;
  let wrong = resumed.length - correct;
  const answers = resumed.map((answer) => ({
    id: answer.questionId,
    ok: answer.correct,
    selected: answer.answer,
  }));
  const bySubject = {};
  const started = Date.now();
  let timerId = null;
  let remain = (meta.tempoMinutos || 0) * 60;
  let answeredCurrent = false;
  const provaMode = ["prova", "simulado"].includes(meta.mode);
  const selections = [];
  const BLANK = "__blank__";
  const textos = meta.textos || {};

  function ensureSubject(m) {
    const key = m || "Geral";
    if (!bySubject[key]) bySubject[key] = { total: 0, correct: 0 };
    return key;
  }

  function renderTextoBase(q) {
    const t = q.textoId ? textos[q.textoId] : null;
    if (!t) return "";
    const body = App.esc(t.conteudo || "").replace(/\n/g, "<br>");
    const image = t.imagem
      ? `<img class="context-image" src="${App.esc(t.imagem)}" alt="${App.esc(t.imagemAlt || t.titulo || "Imagem de apoio da questão")}">`
      : "";
    return `
      <div class="card mb-1 context-card" id="texto-base">
        <p class="context-label">Contexto da questão</p>
        <h3>${App.esc(t.titulo || "Texto de apoio")}</h3>
        <p class="muted context-source">${App.esc(t.fonte || "")}</p>
        ${image}
        ${body ? `<div class="context-body">${body}</div>` : ""}
      </div>`;
  }

  function renderQuestion() {
    const q = questions[idx];
    if (!q) {
      finish();
      return;
    }
    answeredCurrent = false;
    const timerHtml = meta.tempoMinutos
      ? `<p><strong>Tempo:</strong> <span id="sim-timer">${fmtTime(remain)}</span></p>`
      : "";
    area.innerHTML = `
      ${renderTextoBase(q)}
      ${
        q.trechoContexto
          ? `
        <div class="alert alert-info context-excerpt">
          <strong>Trecho relevante:</strong> “${App.esc(q.trechoContexto)}”
        </div>`
          : ""
      }
      <div class="card" id="quiz-card">
        <p class="muted">Questão ${idx + 1} de ${questions.length} · ${App.esc(q.materia || "")} · ${App.esc(q.assunto || "")}
          ${provaMode ? ' · <span class="badge badge-warn">Modo prova</span>' : ""}</p>
        ${timerHtml}
        <h3>${App.esc(q.enunciado || "")}</h3>
        <div id="opts" class="mt-1"></div>
        <div class="actions">
          <button type="button" class="btn" id="q-confirm" disabled>${provaMode ? (idx + 1 < questions.length ? "Próxima" : "Finalizar prova") : "Confirmar"}</button>
          ${provaMode ? '<button type="button" class="btn btn-secondary" id="q-blank">Deixar em branco</button>' : ""}
          <button type="button" class="btn btn-secondary" id="q-cancel">Sair</button>
        </div>
        <div id="q-feedback" class="mt-1"></div>
      </div>`;

    area.scrollIntoView({ behavior: "smooth", block: "start" });
    const opts = document.getElementById("opts");
    let selected = selections[idx] != null ? selections[idx] : null;
    const tipo = q.tipo === "ce" ? "ce" : "me";

    if (tipo === "ce") {
      ["C", "E"].forEach((v) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-option" + (selected === v ? " selected" : "");
        b.textContent = v === "C" ? "Certo" : "Errado";
        b.addEventListener("click", () => {
          selected = v;
          selections[idx] = v;
          opts
            .querySelectorAll(".quiz-option")
            .forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          document.getElementById("q-confirm").disabled = false;
        });
        opts.appendChild(b);
      });
    } else {
      (q.alternativas || []).forEach((alt, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-option" + (selected === i ? " selected" : "");
        b.textContent = `${String.fromCharCode(65 + i)}) ${alt}`;
        b.addEventListener("click", () => {
          selected = i;
          selections[idx] = i;
          opts
            .querySelectorAll(".quiz-option")
            .forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          document.getElementById("q-confirm").disabled = false;
        });
        opts.appendChild(b);
      });
    }
    if (selected !== null)
      document.getElementById("q-confirm").disabled = false;

    document.getElementById("q-blank")?.addEventListener("click", () => {
      selected = BLANK;
      selections[idx] = BLANK;
      opts
        .querySelectorAll(".quiz-option")
        .forEach((option) => option.classList.remove("selected"));
      document.getElementById("q-confirm").disabled = false;
      document.getElementById("q-confirm").click();
    });

    document.getElementById("q-cancel").addEventListener("click", () => {
      if (timerId) clearInterval(timerId);
      if (typeof meta.onCancel === "function") meta.onCancel();
      else location.href = "questoes.html";
    });

    document.getElementById("q-confirm").addEventListener("click", () => {
      if (selected === null || selected === undefined) return;

      if (provaMode) {
        selections[idx] = selected;
        idx++;
        if (idx >= questions.length) finish();
        else renderQuestion();
        return;
      }

      if (answeredCurrent) {
        idx++;
        if (idx >= questions.length) finish();
        else renderQuestion();
        return;
      }
      answeredCurrent = true;
      const answerValue =
        tipo === "ce" ? selected : q._alternativeIds?.[selected] ?? selected;
      const ok =
        tipo === "ce"
          ? answerValue === q.gabarito
          : q._alternativeIds
            ? answerValue === q.gabarito
            : Number(answerValue) === Number(q.gabarito);
      if (typeof meta.onAnswer === "function") {
        const saved = meta.onAnswer({
          unitId: meta.unitId,
          phase: meta.phase,
          attemptId: meta.attemptId,
          questionId: q.id,
          answer: answerValue,
          correct: ok,
          objetivos: [...(q.objetivos || [])],
        });
        if (saved === false || saved?.ok === false) {
          answeredCurrent = false;
          document.getElementById("q-feedback").innerHTML =
            '<div class="alert alert-danger" role="alert">Não foi possível salvar a resposta. Tente novamente.</div>';
          return;
        }
      }
      const subj = ensureSubject(q.materia);
      bySubject[subj].total++;
      if (ok) {
        correct++;
        bySubject[subj].correct++;
      } else {
        wrong++;
      }
      answers.push({ id: q.id, ok, selected: answerValue });
      if (!ok && !unitMode)
        showFeedbackWithClassification(q, selected, tipo);
      else showFeedback(q, ok, selected, tipo);
    });
  }

  function showFeedback(q, ok, selected, tipo) {
    const fb = document.getElementById("q-feedback");
    const gabLabel =
      q.tipo === "ce"
        ? q.gabarito === "C"
          ? "Certo"
          : "Errado"
        : typeof q.gabarito === "number"
          ? String.fromCharCode(65 + q.gabarito)
          : q.gabarito;
    const unitFeedback = ok ? q.feedback?.correta : q.feedback?.incorreta;
    const sectionLink = unitMode && q.feedback?.leituraSecaoId
      ? `<p><a href="#${App.esc(q.feedback.leituraSecaoId)}">Revisar seção</a></p>`
      : "";
    fb.innerHTML = `
      <div class="alert ${ok ? "alert-ok" : "alert-danger"}">
        <strong>${ok ? "Correto" : "Incorreto"}</strong> · Gabarito: <strong>${App.esc(String(gabLabel))}</strong>
      </div>
      <div class="card mt-1" style="border-left:4px solid ${ok ? "var(--ok)" : "var(--danger)"}">
        <h3 style="margin:0 0 0.5rem;font-size:1rem">Resolução</h3>
        <p style="margin:0;color:var(--text)">${App.esc(unitFeedback || q.comentario || "Sem resolução cadastrada.")}</p>
        ${sectionLink}
      </div>`;
    const opts = document.getElementById("opts");
    opts.querySelectorAll(".quiz-option").forEach((btn, i) => {
      btn.disabled = true;
      if (tipo === "ce") {
        const val = i === 0 ? "C" : "E";
        if (val === q.gabarito) btn.classList.add("correct");
        if (val === selected && !ok) btn.classList.add("wrong");
      } else {
        if (i === Number(q.gabarito)) btn.classList.add("correct");
        if (i === selected && !ok) btn.classList.add("wrong");
      }
    });
    const conf = document.getElementById("q-confirm");
    conf.textContent =
      idx + 1 < questions.length ? "Próxima" : "Ver resultado";
    conf.disabled = false;
  }

  function showFeedbackWithClassification(q, selected, tipo) {
    const fb = document.getElementById("q-feedback");
    const gabLabel =
      q.tipo === "ce"
        ? q.gabarito === "C"
          ? "Certo"
          : "Errado"
        : typeof q.gabarito === "number"
          ? String.fromCharCode(65 + q.gabarito)
          : q.gabarito;

    const opts = document.getElementById("opts");
    opts.querySelectorAll(".quiz-option").forEach((btn, i) => {
      btn.disabled = true;
      if (tipo === "ce") {
        const val = i === 0 ? "C" : "E";
        if (val === q.gabarito) btn.classList.add("correct");
        if (val === selected) btn.classList.add("wrong");
      } else {
        if (i === Number(q.gabarito)) btn.classList.add("correct");
        if (i === selected) btn.classList.add("wrong");
      }
    });

    const conf = document.getElementById("q-confirm");
    conf.disabled = true;
    conf.classList.add("hidden");

    fb.innerHTML = `
      <div class="alert alert-danger">
        <strong>Incorreto</strong> · Gabarito: <strong>${App.esc(String(gabLabel))}</strong>
      </div>
      <div class="card mt-1" style="border-left:4px solid var(--danger)">
        <h3 style="margin:0 0 0.5rem;font-size:1rem">Resolução</h3>
        <p style="margin:0 0 1rem;color:var(--text)">${App.esc(q.comentario || "Sem resolução cadastrada.")}</p>

        <div class="error-classify">
          <h4 style="margin:0 0 0.5rem;font-size:0.95rem">Por que você errou? (obrigatório)</h4>
          <p class="muted" style="margin:0 0 0.75rem;font-size:0.85rem">Classificar o erro melhora muito a revisão depois.</p>
          <div class="form-row">
            <label for="err-tipo">Tipo de erro</label>
            <select id="err-tipo">
              <option value="">Selecione…</option>
              <option value="teoria">Falta de teoria</option>
              <option value="interpretacao">Interpretação / compreensão</option>
              <option value="atencao">Atenção / pegadinha de banca</option>
              <option value="memorizacao">Memorização (lei seca, detalhes)</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div class="form-row">
            <label for="err-motivo">Por que errou? (1 frase)</label>
            <input id="err-motivo" type="text" placeholder="Ex.: Confundi carência com qualidade de segurado" maxlength="180">
          </div>
          <button type="button" class="btn btn-accent" id="err-save">Salvar erro e continuar</button>
        </div>
      </div>`;

    document.getElementById("err-save").onclick = () => {
      const tipoErro = document.getElementById("err-tipo").value;
      const motivo = document.getElementById("err-motivo").value.trim();

      if (!tipoErro) {
        alert("Selecione o tipo de erro.");
        return;
      }
      if (motivo.length < 4) {
        alert("Escreva uma frase curta explicando por que errou.");
        return;
      }

      try {
        Storage.addErro({
          questionId: q.id,
          materia: q.materia,
          assunto: q.assunto,
          questao: q.enunciado,
          motivo: motivo,
          comentario: q.comentario || "",
          tipo: tipoErro,
        });
      } catch (e) {
        console.error(e);
      }

      conf.classList.remove("hidden");
      conf.disabled = false;
      conf.textContent =
        idx + 1 < questions.length ? "Próxima" : "Ver resultado";

      const classify = fb.querySelector(".error-classify");
      if (classify) {
        classify.innerHTML = `<p class="alert alert-ok" style="margin:0">Erro classificado e enviado ao caderno.</p>`;
      }
    };
  }

  function finish() {
    if (timerId) clearInterval(timerId);
    const minutes = Math.max(1, Math.round((Date.now() - started) / 60000));

    if (provaMode) {
      correct = 0;
      wrong = 0;
      answers.length = 0;
      Object.keys(bySubject).forEach((k) => delete bySubject[k]);
      questions.forEach((q, i) => {
        const selected = selections[i];
        const tipo = q.tipo === "ce" ? "ce" : "me";
        const blank = selected == null || selected === BLANK;
        const ok = blank
          ? false
          : tipo === "ce"
            ? selected === q.gabarito
            : Number(selected) === Number(q.gabarito);
        const subj = ensureSubject(q.materia);
        bySubject[subj].total++;
        bySubject[subj].blank = (bySubject[subj].blank || 0) + (blank ? 1 : 0);
        if (ok) {
          correct++;
          bySubject[subj].correct++;
        } else if (!blank) {
          wrong++;
          try {
            Storage.addErro({
              questionId: q.id,
              materia: q.materia,
              assunto: q.assunto,
              questao: q.enunciado,
              motivo: "Erro no modo prova",
              comentario: q.comentario || "",
              tipo: "atencao",
            });
          } catch (e) {
            console.error(e);
          }
        }
        answers.push({
          id: q.id,
          ok,
          blank,
          selected,
          gabarito: q.gabarito,
          comentario: q.comentario,
        });
      });
    }

    if (meta.mode === "simulado") {
      Storage.addSimulado({
        tipo: meta.tipo || "misto",
        total: questions.length,
        correct,
        wrong,
        blank: questions.length - correct - wrong,
        minutes,
        bySubject,
      });
    }

    if (!unitMode) Storage.update((d) => {
      if (meta.mode !== "simulado") {
        d.quiz.answered += correct + wrong;
        d.quiz.correct += correct;
        d.quiz.wrong += wrong;
        d.xp += correct * 2 + wrong;
        Storage._daily(d, todayISO(), correct + wrong, correct, wrong);
      }
      Object.entries(bySubject).forEach(([mat, v]) => {
        if (!d.quiz.bySubject[mat])
          d.quiz.bySubject[mat] = { answered: 0, correct: 0, wrong: 0 };
        d.quiz.bySubject[mat].answered += v.total - (v.blank || 0);
        d.quiz.bySubject[mat].correct += v.correct;
        d.quiz.bySubject[mat].wrong += v.total - v.correct - (v.blank || 0);
      });
      Storage._level(d);
      Storage._achievements(d);
    });
    if (meta.taskKey) Storage.setTaskStatus(meta.taskKey, "concluida");

    const blank = questions.length - correct - wrong;
    const isCE = questions.every((q) => q.tipo === "ce");
    const cebrasp = isCE
      ? Storage.getCebraspeScore(correct, wrong, blank)
      : null;
    const pct = questions.length
      ? Math.round((correct / questions.length) * 100)
      : 0;
    const summary = {
      correct,
      wrong,
      total: questions.length,
      blank,
      minutes,
      answers: answers.slice(),
    };
    const reviewHtml = provaMode
      ? `
      <h3 class="mt-2">Gabarito comentado</h3>
      <ul class="list">
        ${answers
          .map((a, i) => {
            const q = questions[i];
            return `<li>
            <strong>${i + 1}.</strong> ${a.blank ? '<span class="badge badge-muted">Em branco</span>' : a.ok ? '<span class="badge badge-ok">Certo</span>' : '<span class="badge badge-danger">Errado</span>'}
            · sua resposta: ${a.blank ? "Em branco" : App.esc(answerLabel(q, a.selected))} · gabarito: ${App.esc(answerLabel(q, a.gabarito))}
            <p class="muted">${App.esc((q.enunciado || "").slice(0, 140))}…</p>
            <p><strong>Resolução:</strong> ${App.esc(a.comentario || q.comentario || "")}</p>
          </li>`;
          })
          .join("")}
      </ul>`
      : "";

    area.innerHTML = `
      <div class="card">
        <h2>Resultado ${provaMode ? "(modo prova)" : ""}</h2>${cebrasp ? `<p><strong>Pontuação conforme sua configuração:</strong> ${cebrasp.acertos} acerto(s), ${cebrasp.erros} erro(s), ${cebrasp.brancos} em branco · total: ${cebrasp.liquida}</p>` : ""}
        <p class="stat"><span class="value">${correct}/${questions.length}</span><span class="label">${pct}% de acertos</span></p>
        <p>Acertos: ${correct} · Erros: ${wrong} · Questões em branco: ${blank}</p>
        <p>Tempo: ${minutes} min · Erros enviados ao caderno: ${wrong}</p>
        <h3 class="mt-1">Por matéria</h3>
        <ul class="list">
          ${Object.entries(bySubject)
            .map(
              ([k, v]) =>
                `<li>${App.esc(k)}: ${v.correct}/${v.total} (${Math.round((v.correct / v.total) * 100)}%)</li>`,
            )
            .join("")}
        </ul>
        ${reviewHtml}
        <div class="actions">
          <a class="btn" href="caderno-erros.html">Caderno de erros</a>
          <button class="btn btn-secondary" id="q-again">Novo questionário</button>
        </div>
      </div>`;
    const again = document.getElementById("q-again");
    if (again) again.onclick = () => location.reload();
    if (typeof meta.onFinish === "function") meta.onFinish(summary, area);
  }

  function fmtTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  if (meta.tempoMinutos) {
    timerId = setInterval(() => {
      remain--;
      const el = document.getElementById("sim-timer");
      if (el) el.textContent = fmtTime(Math.max(0, remain));
      if (remain <= 0) {
        clearInterval(timerId);
        finish();
      }
    }, 1000);
  }

  renderQuestion();
}

window.startQuiz = startQuiz;

async function initSimulados() {
  App.initShell("simulados");
  try {
    const [qInss, qPrf, qPrev, simulados, textos] = await Promise.all([
      App.loadJSON("data/questoes-inss.json"),
      App.loadJSON("data/questoes-prf.json"),
      App.loadJSON("data/questoes-prev.json").catch(() => ({ questoes: [] })),
      App.loadJSON("data/simulados.json"),
      App.loadJSON("data/textos.json").catch(() => ({ textos: {} })),
    ]);
    const bank = allQuestions({ qInss, qPrf, qPrev });
    const byId = Object.fromEntries(bank.map((q) => [q.id, q]));
    const textosMap = textos.textos || {};
    const p = Storage.get();
    const config = p.cebraspeConfig || { acerto: 1, erro: 0, branco: 0 };

    document.getElementById("app-root").innerHTML = `
      <details class="card mb-1">
        <summary>Configuração da pontuação Cebraspe</summary>
        <p class="muted">Defina os valores usados no cálculo. O padrão não penaliza erros.</p>
        <div class="grid grid-3 mt-1">
          <div class="form-row"><label for="cebraspe-acerto">Valor do acerto</label><input id="cebraspe-acerto" type="number" step="0.1" value="${config.acerto}"></div>
          <div class="form-row"><label for="cebraspe-erro">Penalização do erro</label><input id="cebraspe-erro" type="number" step="0.1" min="0" value="${config.erro}"></div>
          <div class="form-row"><label for="cebraspe-branco">Valor da questão em branco</label><input id="cebraspe-branco" type="number" step="0.1" value="${config.branco}"></div>
        </div>
        <button class="btn btn-secondary" type="button" id="save-cebraspe">Salvar configuração</button>
      </details>
      <div class="grid grid-2 mb-1">
        ${(simulados.simulados || [])
          .map(
            (s) => `
          <div class="card">
            <h3>${App.esc(s.titulo)}</h3>
            <p class="muted">${App.esc(s.descricao)}</p>
            <p><span class="badge badge-info">${App.esc(s.tipo)}</span> · ${s.questaoIds.length} questões · ${s.tempoMinutos} min</p>
            <button class="btn" data-sim="${s.id}">Iniciar cronometrado</button>
          </div>
        `,
          )
          .join("")}
      </div>
      <div id="q-area"></div>
      <div class="card mt-2">
        <h2>Histórico e desempenho</h2>
        ${
          (p.simulados || []).length
            ? `
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Acertos</th><th>Tempo</th><th>Por matéria</th></tr></thead>
            <tbody>
              ${p.simulados
                .slice()
                .reverse()
                .map(
                  (s) => `
                <tr>
                  <td>${App.formatDateBR(s.date)}</td>
                  <td>${App.esc(s.tipo)}</td>
                  <td>${s.correct}/${s.total}</td>
                  <td>${s.minutes} min</td>
                  <td>${
                    Object.entries(s.bySubject || {})
                      .map(([k, v]) => `${App.esc(k)} ${v.correct}/${v.total}`)
                      .join("; ") || "—"
                  }</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>`
            : '<p class="muted">Nenhum simulado realizado.</p>'
        }
      </div>
    `;

    document.getElementById("save-cebraspe").onclick = () => {
      Storage.setCebraspeConfig({
        acerto: Number(document.getElementById("cebraspe-acerto").value),
        erro: Number(document.getElementById("cebraspe-erro").value),
        branco: Number(document.getElementById("cebraspe-branco").value),
      });
      alert("Configuração salva.");
    };

    document.querySelectorAll("[data-sim]").forEach((btn) => {
      btn.onclick = () => {
        const sim = simulados.simulados.find((x) => x.id === btn.dataset.sim);
        const qs = sim.questaoIds.map((id) => byId[id]).filter(Boolean);
        if (!qs.length) return alert("Questões não encontradas.");
        startQuiz(qs, {
          mode: "simulado",
          tipo: sim.tipo,
          tempoMinutos: sim.tempoMinutos,
          textos: textosMap,
        });
        document
          .getElementById("q-area")
          .scrollIntoView({ behavior: "smooth" });
      };
    });
  } catch (e) {
    document.getElementById("app-root").innerHTML =
      `<div class="alert alert-danger">${App.esc(e.message)}</div>`;
  }
}

async function initProvas() {
  App.initShell("provas");
  try {
    const provasData = await App.loadJSON("data/provas.json");
    const items = provasData.provas || [];
    document.getElementById("app-root").innerHTML = `
      <div class="alert alert-info mb-1">Provas e gabaritos oficiais. Biblioteca completa: <a href="biblioteca.html">Biblioteca</a>.</div>
      <div class="grid grid-2">
        ${items
          .map(
            (p) => `
          <div class="card">
            <h3>${App.esc(p.titulo)}</h3>
            <p><strong>${App.esc(p.concurso)}</strong> · ${p.ano} · ${App.esc(p.banca || "—")}</p>
            <p class="muted">${App.esc(p.cargo || "")} · ${App.esc(p.tipo)} ${p.questoes ? "· " + p.questoes + " questões" : ""}</p>
            <p class="muted">Fonte: ${App.esc(p.fonte || "—")}</p>
            <div class="actions">
              <a class="btn" href="${App.esc(p.url)}" target="_blank" rel="noopener">Abrir</a>
              <button class="btn btn-accent btn-sm" data-done="${App.esc(p.id)}">Marcar como estudado</button>
            </div>
          </div>`,
          )
          .join("")}
      </div>
    `;
    document.querySelectorAll("[data-done]").forEach((btn) => {
      btn.onclick = () => {
        const item = items.find((x) => x.id === btn.dataset.done);
        if (item) {
          Storage.markMaterialStudied(item);
          btn.textContent = "Estudado";
          btn.disabled = true;
        }
      };
    });
  } catch (e) {
    document.getElementById("app-root").innerHTML =
      `<div class="alert alert-danger">${App.esc(e.message)}</div>`;
  }
}

window.initQuestoes = initQuestoes;
window.initSimulados = initSimulados;
window.initProvas = initProvas;
