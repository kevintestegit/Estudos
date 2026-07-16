/** Aplica atualizações de videoaulas (data/aulas-patch.json) */
(function () {
  const _load = App.loadJSON.bind(App);
  App.loadJSON = async function (path) {
    const data = await _load(path);
    if (!path.includes("aulas.json")) return data;
    try {
      const patch = await _load("data/aulas-patch.json");
      const byId = Object.fromEntries(
        (patch.updates || []).map((u) => [u.id, u]),
      );
      if (Array.isArray(data.aulas)) {
        data.aulas = data.aulas.map((a) =>
          byId[a.id] ? { ...a, ...byId[a.id] } : a,
        );
      }
    } catch (e) {
      console.warn("aulas-patch", e);
    }
    return data;
  };
})();
