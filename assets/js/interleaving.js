/** Interleaving nas semanas finais: injeta revisões mistas no plano do dia */
(function () {
  const MIX = [
    { materia: "Português", assunto: "Revisão intercalada — interpretação/gramática", tempo: 25, questoesTag: "portugues-interpretacao" },
    { materia: "Raciocínio Lógico", assunto: "Revisão intercalada — proposições", tempo: 20, questoesTag: "rl-proposicoes" },
    { materia: "Direito Constitucional", assunto: "Revisão intercalada — art. 5º e 37", tempo: 25, questoesTag: "dc-fundamentais" },
    { materia: "Direito Administrativo", assunto: "Revisão intercalada — atos e princípios", tempo: 25, questoesTag: "da-principios" },
    { materia: "Direito Previdenciário", assunto: "Revisão intercalada — benefícios e carência", tempo: 30, questoesTag: "prev-beneficios" },
    { materia: "Ética no Serviço Público", assunto: "Revisão intercalada — Dec. 1.171", tempo: 15, questoesTag: "etica" },
  ];

  function injectInterleaving(cronograma) {
    if (!cronograma?.days) return cronograma;
    cronograma.days = cronograma.days.map((day) => {
      const week = Number(day.semana) || 0;
      if (week < 14) return day;
      // Evita duplicar se já injetado
      if ((day.tasks || []).some((t) => String(t.assunto || "").includes("intercalada")))
        return day;
      const pick = MIX[(week + (day.dia || 0)) % MIX.length];
      const extra = {
        ...pick,
        tempo: pick.tempo,
        pdfId: null,
        aulaId: null,
      };
      return {
        ...day,
        titulo: `${day.titulo || "Dia"} · + interleaving`,
        tasks: [...(day.tasks || []), extra],
      };
    });
    return cronograma;
  }

  const _load = App.loadJSON.bind(App);
  App.loadJSON = async function (path) {
    const data = await _load(path);
    if (path.includes("cronograma.json") && data && data.days) {
      return injectInterleaving(data);
    }
    return data;
  };
})();
