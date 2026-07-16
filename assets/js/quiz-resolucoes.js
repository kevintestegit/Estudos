/** Aplica resoluções sobrescritas (comentarios-override.json) ao banco de questões */
(function () {
  let overrideMap = null;
  let loading = null;

  async function loadOverrides() {
    if (overrideMap) return overrideMap;
    if (loading) return loading;
    loading = fetch("data/comentarios-override.json")
      .then((r) => (r.ok ? r.json() : { byId: {} }))
      .then((data) => {
        overrideMap = data.byId || {};
        return overrideMap;
      })
      .catch(() => {
        overrideMap = {};
        return overrideMap;
      });
    return loading;
  }

  function applyOverrides(questions, map) {
    if (!map || !questions) return questions;
    return questions.map((q) => {
      const c = map[q.id];
      return c ? { ...q, comentario: c } : q;
    });
  }

  // Enrich startQuiz so every session uses updated resolutions
  if (typeof startQuiz === "function") {
    const _start = startQuiz;
    window.startQuiz = async function (questions, meta) {
      const map = await loadOverrides();
      return _start(applyOverrides(questions, map), meta);
    };
  }

  // Also patch allQuestions if already defined later
  document.addEventListener("DOMContentLoaded", () => {
    loadOverrides();
  });
})();
