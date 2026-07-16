/** Inclui questões do banco comum (PT, RL, Inf, etc.) */
(function () {
  if (typeof allQuestions !== "function") return;
  const _all = allQuestions;
  window.__qComum = null;

  fetch("data/questoes-comum.json")
    .then((r) => (r.ok ? r.json() : { questoes: [] }))
    .then((d) => {
      window.__qComum = d;
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
