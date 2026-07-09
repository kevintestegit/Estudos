// Portal Estudos — shell compartilhado
const App = {
  cache: {},

  async loadJSON(path) {
    if (this.cache[path]) return this.cache[path];
    const res = await fetch(path);
    if (!res.ok) throw new Error('Falha ao carregar ' + path);
    const data = await res.json();
    this.cache[path] = data;
    return data;
  },

  async loadAll() {
    const [cronograma, materias, aulas, pdfs, qInss, qPrf, simulados, provas] = await Promise.all([
      this.loadJSON('data/cronograma.json'),
      this.loadJSON('data/materias.json'),
      this.loadJSON('data/aulas.json'),
      this.loadJSON('data/pdfs.json'),
      this.loadJSON('data/questoes-inss.json'),
      this.loadJSON('data/questoes-prf.json'),
      this.loadJSON('data/simulados.json'),
      this.loadJSON('data/provas.json')
    ]);
    return { cronograma, materias, aulas, pdfs, qInss, qPrf, simulados, provas };
  },

  initShell(active) {
    Storage.ensureStartDate();
    this.markMissedDays();
    document.querySelectorAll('[data-nav]').forEach((el) => {
      if (el.getAttribute('data-nav') === active) el.classList.add('active');
    });
    const btn = document.getElementById('menu-toggle');
    const side = document.getElementById('sidebar');
    if (btn && side) {
      btn.addEventListener('click', () => side.classList.toggle('open'));
    }
    this.renderStatusBar();
  },

  markMissedDays() {
    const p = Storage.get();
    const start = p.startDate || todayISO();
    const today = todayISO();
    const total = daysBetween(start, today);
    for (let i = 0; i < total; i++) {
      const date = addDaysISO(start, i);
      const st = p.dayStatus[date];
      if (!st || st === 'pendente' || st === 'em_andamento') {
        Storage.setDayStatus(date, 'faltou');
      }
    }
  },

  getScheduleDayIndex(progress, cronograma) {
    const start = progress.startDate || todayISO();
    const today = todayISO();
    let idx = daysBetween(start, today);
    const max = (cronograma.days || []).length - 1;
    if (idx < 0) idx = 0;
    if (idx > max) idx = max;
    return idx;
  },

  getTodayPlan(cronograma, progress) {
    const days = cronograma.days || [];
    const idx = this.getScheduleDayIndex(progress, cronograma);
    const planned = days[idx] || null;
    const recovery = this.getRecoveryQueue(progress, cronograma);
    return { index: idx, day: planned, recovery };
  },

  getRecoveryQueue(progress, cronograma) {
    const start = progress.startDate || todayISO();
    const today = todayISO();
    const queue = [];
    const total = daysBetween(start, today);
    for (let i = 0; i < total; i++) {
      const date = addDaysISO(start, i);
      const st = progress.dayStatus[date];
      if (st === 'faltou' || st === 'atrasada') {
        const day = (cronograma.days || [])[i];
        if (day) queue.push({ date, dayIndex: i, day, status: st });
      }
    }
    return queue;
  },

  statusLabel(status) {
    const map = {
      pendente: 'Pendente',
      em_andamento: 'Em andamento',
      concluido: 'Concluído',
      faltou: 'Faltou',
      recuperado: 'Recuperado',
      atrasada: 'Atrasada'
    };
    return map[status] || status;
  },

  studyStatus(progress, cronograma) {
    const today = todayISO();
    const yesterday = addDaysISO(today, -1);
    const yStatus = progress.dayStatus[yesterday];
    const tStatus = progress.dayStatus[today];
    const recovery = this.getRecoveryQueue(progress, cronograma);
    let code = 'em_dia';
    let message = 'Em dia';
    if (yStatus === 'faltou') {
      code = 'faltou_ontem';
      message = 'Você faltou ontem';
    } else if (recovery.length > 0) {
      code = 'atrasada';
      message = `Atrasada em ${recovery.length} dia(s)`;
    } else if (tStatus === 'concluido' || tStatus === 'recuperado') {
      code = 'em_dia';
      message = 'Em dia — hoje concluído';
    }
    return { code, message, recoveryCount: recovery.length, yesterdayStatus: yStatus };
  },

  nextAction(progress, cronograma) {
    const st = this.studyStatus(progress, cronograma);
    if (st.code === 'faltou_ontem') return 'Recuperar o dia de ontem ou mesclar com o estudo de hoje';
    if (st.recoveryCount > 0) return `Recuperar ${st.recoveryCount} dia(s) em atraso`;
    const plan = this.getTodayPlan(cronograma, progress);
    if (!plan.day) return 'Revisar caderno de erros e fazer questões';
    if (progress.dayStatus[todayISO()] === 'concluido') return 'Revisar erros ou fazer um simulado curto';
    return `Estudar: ${plan.day.titulo || plan.day.tasks?.[0]?.assunto || 'plano do dia'}`;
  },

  motivationMessage(stats) {
    if (stats.sequenciaAtual >= 7) return 'Sequência sólida. Mantenha o ritmo — consistência vence volume.';
    if (stats.percentualAcertos >= 70 && stats.questoesResolvidas >= 20) return 'Acertos bons. Hora de pressionar pontos fracos no caderno de erros.';
    if (stats.diasFaltados > 0) return 'Atraso não é falha permanente. Recupere um bloco hoje e feche a lacuna.';
    if (stats.diasEstudados === 0) return 'Comece pelo plano de hoje. Uma sessão bem feita vale mais que planejar o mês.';
    return 'Foque no que está programado para hoje. Depois, questões.';
  },

  ACHIEVEMENTS: {
    'first-day': 'Primeiro dia',
    'streak-3': '3 dias seguidos',
    'streak-7': '7 dias seguidos',
    q50: '50 questões',
    q100: '100 questões',
    sim1: '1º simulado',
    hours10: '10 horas',
    level5: 'Nível 5'
  },

  renderStatusBar() {
    const el = document.getElementById('status-bar');
    if (!el) return;
    const stats = computeStats();
    el.innerHTML = `
      <span>Nv. ${stats.nivel}</span>
      <span>${stats.sequenciaAtual}d seq.</span>
      <span>${stats.percentualAcertos}% acertos</span>
    `;
  },

  formatDateBR(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },

  formatMinutes(min) {
    const m = Number(min) || 0;
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h <= 0) return `${r} min`;
    return `${h}h ${r}min`;
  },

  esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // fallback oficial por matéria quando aula/pdf local não tem URL
  MATERIA_URL: {
    'Português': 'https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf',
    'Ética': 'https://www.planalto.gov.br/ccivil_03/decreto/d1171.htm',
    'Direito Constitucional': 'https://www2.senado.leg.br/bdsf/handle/id/864911',
    'Direito Administrativo': 'https://www2.senado.leg.br/bdsf/handle/id/608969',
    'Direito Previdenciário': 'https://www.planalto.gov.br/ccivil_03/leis/l8213compilado.htm',
    'Assistência Social / BPC': 'https://www.planalto.gov.br/ccivil_03/leis/l8742.htm',
    'Legislação de Trânsito': 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
    'Legislação PRF': 'https://www.planalto.gov.br/ccivil_03/decreto/d1655.htm',
    'Arquivologia': 'https://www.gov.br/arquivonacional/pt-br/servicos/publicacoes/Guiadegestaodedocumentos.pdf',
    'Noções de Administração': 'https://repositorio.enap.gov.br/bitstream/1/2260/1/1.%20Apostila%20-%20M%C3%B3dulo%201%20-%20Administra%C3%A7%C3%A3o%20P%C3%BAblica.pdf',
    'Informática': 'https://www.gov.br/governodigital/pt-br',
    'Raciocínio Lógico': 'biblioteca.html',
    'Primeiros Socorros': 'biblioteca.html',
    'Direito Penal': 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
    'Física/Mecânica': 'biblioteca.html',
    'Geografia': 'biblioteca.html',
    'Revisão': 'biblioteca.html',
    'Simulado': 'simulados.html',
    'Questões': 'questoes.html',
    'Prova': 'provas.html',
    'Caderno de erros': 'caderno-erros.html',
    'Preparação': 'hoje.html'
  },


  YT_VIDEO: {
    'Arquivologia': 'https://www.youtube.com/playlist?list=PL4r5S3KL2XqB3t8ZIwZ7gLl2kZ2Z5Z5Z5',
    'Assistência Social / BPC': 'https://www.youtube.com/results?search_query=bpc+loas+assistencia+social+concurso',
    'Direito Administrativo': 'https://www.youtube.com/playlist?list=PL50JqL0R-Woen-shVZgWQxq2RrP6u6yiE',
    'Direito Constitucional': 'https://www.youtube.com/playlist?list=PL50JqL0R-WodZWTbZHFkD7gn7T5vQai-G',
    'Direito Penal': 'https://www.youtube.com/playlist?list=PL50JqL0R-WofM5jjzL_isDjhIMhqvpP8t',
    'Direito Previdenciário': 'https://www.youtube.com/playlist?list=PL50JqL0R-Woc7aDIE8A5rGFWkOG6SMn5y',
    'Física/Mecânica': 'https://www.youtube.com/results?search_query=fisica+basica+no+transito+concurso',
    'Geografia': 'https://www.youtube.com/results?search_query=geografia+rodovias+federais+brasil',
    'Informática': 'https://www.youtube.com/playlist?list=PLZ4qFlJ8_rstdPV1Ti5J_hyVGNdXxYK2B',
    'Legislação PRF': 'https://www.youtube.com/playlist?list=PLgmH1M3vNPm2UYxToMYzB3ZCOkz5rqM2_',
    'Legislação de Trânsito': 'https://www.youtube.com/playlist?list=PLgmH1M3vNPm2UYxToMYzB3ZCOkz5rqM2_',
    'Língua Portuguesa': 'https://www.youtube.com/playlist?list=PLg5MvFnAgD5JjDHYpGnoa7lRUiC93Qixj',
    'Noções de Administração': 'https://www.youtube.com/playlist?list=PL4r5S3KL2XqB3t8ZIwZ7gLl2kZ2Z5Z5Z6',
    'Português': 'https://www.youtube.com/playlist?list=PLg5MvFnAgD5JjDHYpGnoa7lRUiC93Qixj',
    'Primeiros Socorros': 'https://www.youtube.com/results?search_query=primeiros+socorros+prf+concurso',
    'Raciocínio Lógico': 'https://www.youtube.com/playlist?list=PLZ4qFlJ8_rssA3_Kq10qJYKvEw2X7n5O4',
    'Ética': 'https://www.youtube.com/playlist?list=PLr3WpxIp98UyaFnHFYg3rLITKmkAQ015Q',
    'Ética no Serviço Público': 'https://www.youtube.com/playlist?list=PLr3WpxIp98UyaFnHFYg3rLITKmkAQ015Q',
  },

  youtubeUrl(materia) {
    return this.YT_VIDEO[materia] || null;
  },

  resolveUrl(rawUrl, materia) {
    if (rawUrl && rawUrl !== '#' && rawUrl !== '') return rawUrl;
    if (materia && this.MATERIA_URL[materia]) return this.MATERIA_URL[materia];
    if (materia) return 'biblioteca.html';
    return 'biblioteca.html';
  },

  isExternal(url) {
    return /^https?:\/\//i.test(url || '');
  },

  linkAttrs(url) {
    return this.isExternal(url)
      ? `href="${this.esc(url)}" target="_blank" rel="noopener"`
      : `href="${this.esc(url)}"`;
  }
};

window.App = App;
