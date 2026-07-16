/** Inclui questões do banco comum + extra */
(function () {
  if (typeof allQuestions !== "function") return;
  const _all = allQuestions;
  window.__qComum = { questoes: [] };

  Promise.all([
    fetch("data/questoes-comum.json").then((r) => (r.ok ? r.json() : { questoes: [] })),
    fetch("data/questoes-comum-extra.json").then((r) => (r.ok ? r.json() : { questoes: [] })),
  ])
    .then(([a, b]) => {
      window.__qComum = {
        questoes: [...(a.questoes || []), ...(b.questoes || [])],
      };
    })
    .catch(() => {
      window.__qComum = { questoes: [] };
    });

  window.allQuestions = function (data) {
    const base = _all(data) || [];
    const extra = window.__qComum?.questoes || [];
    return [...base, ...extra];
  };
})();
