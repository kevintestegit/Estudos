async function initBiblioteca() {
  App.initShell('biblioteca');
  try {
    const [materiaisData, provasData] = await Promise.all([
      App.loadJSON('data/materiais.json'),
      App.loadJSON('data/provas.json')
    ]);
    const materiais = (materiaisData.materiais || []).map((m) => ({
      ...m,
      _origem: 'material'
    }));
    const provas = (provasData.provas || []).map((p) => ({
      ...p,
      categoria: p.categoria || catFromConcurso(p.concurso),
      materia: p.materia || (p.tipo === 'gabarito' ? 'Gabarito' : 'Prova completa'),
      prioridade: p.prioridade || 'alta',
      _origem: 'prova'
    }));
    const all = [...materiais, ...provas];
    renderBiblioteca(all);
  } catch (e) {
    document.getElementById('app-root').innerHTML =
      `<div class="alert alert-danger">Erro ao carregar biblioteca. Use servidor local. ${App.esc(e.message)}</div>`;
  }
}

function catFromConcurso(c) {
  const s = String(c || '').toLowerCase();
  if (s.includes('prf')) return 'prf';
  if (s.includes('inss')) return 'inss';
  return 'comum';
}

function renderBiblioteca(all) {
  const root = document.getElementById('app-root');
  const p = Storage.get();
  const estudados = p.materiaisEstudados || [];
  const provasFeitas = p.provasFeitas || [];
  const revisao = p.materiaisRevisao || [];

  root.innerHTML = `
    <div class="grid grid-3 mb-1">
      <div class="card stat"><span class="value">${estudados.length}</span><span class="label">Materiais estudados</span></div>
      <div class="card stat"><span class="value">${provasFeitas.length}</span><span class="label">Provas reais feitas</span></div>
      <div class="card stat"><span class="value">${revisao.length}</span><span class="label">Na fila de revisão</span></div>
    </div>

    <div class="card mb-1">
      <h2>Filtros</h2>
      <div class="actions" id="filters">
        <button class="btn btn-sm filter-btn active" data-f="todos">Todos</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="inss">INSS</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="prf">PRF Administrativo</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="comum">Conteúdo comum</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="prova">Provas</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="gabarito">Gabaritos</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="legislacao">Legislação</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-f="pdf">PDFs oficiais</button>
      </div>
      <div class="form-row mt-1" style="max-width:360px">
        <label for="bib-search">Buscar</label>
        <input id="bib-search" type="search" placeholder="título, matéria, banca…">
      </div>
    </div>

    <div id="bib-list" class="grid grid-2"></div>

    <div class="card mt-2">
      <h2>Fila de revisão</h2>
      <div id="bib-revisao"></div>
    </div>
  `;

  let filter = (()=>{const m=params.get('materia');if(m==='comum')return'comum';if(m==='prf')return'prf';if(m==='inss')return'inss';if(m)return'nome';return'todos'})();
  let q = '';

  function match(item) {
    if(filter === 'nome'){
        const m = (params.get('materia')||'').toLowerCase();
        return (item.materia||'').toLowerCase() === m || (item.concurso||'').toLowerCase().includes(m);
    }
    if(filter === 'inss' && item.categoria !== 'inss') return false;
    if(filter === 'prf' && item.categoria !== 'prf') return false;
    if(filter === 'comum' && item.categoria !== 'comum') return false;
    if(filter === 'prova' && item.tipo !== 'prova') return false;
    if(filter === 'gabarito' && item.tipo !== 'gabarito') return false;
    if(filter === 'legislacao' && item.tipo !== 'legislacao') return false;
    if(filter === 'pdf' && item.tipo !== 'pdf' && !(item.url||'').toLowerCase().includes('.pdf')) return false;
    if(q){
        const hay = [item.titulo,item.materia,item.concurso,item.banca,item.fonte,item.cargo].join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
    }
    return true;
}
function paintList() {
    const list = document.getElementById('bib-list');
    const items = all.filter(match);
    if (!items.length) {
      list.innerHTML = '<div class="card"><p class="muted">Nenhum material com esse filtro.</p></div>';
      return;
    }
    list.innerHTML = items.map((item) => {
      const studied = Storage.isMaterialStudied(item.id);
      const inRev = Storage.isInRevisao(item.id);
      return `
        <div class="card task-card">
          <h3>${App.esc(item.titulo)}</h3>
          <div class="task-meta">
            <span class="badge badge-info">${App.esc(item.concurso || '—')}</span>
            <span class="badge badge-muted">${App.esc(item.tipo || '—')}</span>
            <span class="badge ${prioBadge(item.prioridade)}">${App.esc(item.prioridade || '—')}</span>
            ${studied ? '<span class="badge badge-ok">Estudado</span>' : ''}
            ${inRev ? '<span class="badge badge-warn">Revisão</span>' : ''}
          </div>
          <p><strong>Matéria:</strong> ${App.esc(item.materia || '—')}</p>
          <p><strong>Ano:</strong> ${item.ano ?? '—'}
            ${item.banca ? ` · <strong>Banca:</strong> ${App.esc(item.banca)}` : ''}
            ${item.questoes ? ` · <strong>Questões:</strong> ${item.questoes}` : ''}
          </p>
          <p class="muted"><strong>Fonte:</strong> ${App.esc(item.fonte || '—')}</p>
          <div class="actions">
            <a class="btn btn-sm" href="${App.esc(item.url || '#')}" target="_blank" rel="noopener">Abrir material</a>
            <button class="btn btn-sm btn-accent" data-study="${App.esc(item.id)}">${studied ? 'Já estudado' : 'Marcar como estudado'}</button>
            <button class="btn btn-sm btn-secondary" data-rev="${App.esc(item.id)}">${inRev ? 'Na revisão' : 'Adicionar à revisão'}</button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-study]').forEach((btn) => {
      btn.onclick = () => {
        const item = all.find((x) => x.id === btn.dataset.study);
        if (!item) return;
        Storage.markMaterialStudied(item);
        paintStats();
        paintList();
        paintRevisao();
        App.renderStatusBar();
      };
    });
    list.querySelectorAll('[data-rev]').forEach((btn) => {
      btn.onclick = () => {
        const item = all.find((x) => x.id === btn.dataset.rev);
        if (!item) return;
        if (Storage.isInRevisao(item.id)) Storage.removeMaterialRevisao(item.id);
        else Storage.addMaterialRevisao(item);
        paintStats();
        paintList();
        paintRevisao();
      };
    });
  }

  function paintStats() {
    const pr = Storage.get();
    root.querySelectorAll('.stat .value')[0].textContent = (pr.materiaisEstudados || []).length;
    root.querySelectorAll('.stat .value')[1].textContent = (pr.provasFeitas || []).length;
    root.querySelectorAll('.stat .value')[2].textContent = (pr.materiaisRevisao || []).length;
  }

  function paintRevisao() {
    const box = document.getElementById('bib-revisao');
    const items = Storage.get().materiaisRevisao || [];
    if (!items.length) {
      box.innerHTML = '<p class="muted">Nada na fila de revisão.</p>';
      return;
    }
    box.innerHTML = `<ul class="list">${items.map((r) => `
      <li>
        <strong>${App.esc(r.titulo)}</strong>
        <span class="muted"> · ${App.esc(r.materia)} · ${App.esc(r.tipo)}</span>
        <div class="actions">
          ${r.url ? `<a class="btn btn-sm btn-secondary" href="${App.esc(r.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}
          <button class="btn btn-sm btn-danger" data-rm="${App.esc(r.id)}">Remover</button>
        </div>
      </li>`).join('')}</ul>`;
    box.querySelectorAll('[data-rm]').forEach((btn) => {
      btn.onclick = () => {
        Storage.removeMaterialRevisao(btn.dataset.rm);
        paintStats();
        paintList();
        paintRevisao();
      };
    });
  }

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.onclick = () => {
      filter = btn.dataset.f;
      document.querySelectorAll('.filter-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.classList.toggle('btn-secondary', b !== btn);
        if (b === btn) b.classList.remove('btn-secondary');
      });
      paintList();
    };
  });
  document.getElementById('bib-search').oninput = (e) => {
    q = e.target.value.trim().toLowerCase();
    paintList();
  };

  paintList();
  paintRevisao();
}

window.initBiblioteca = initBiblioteca;
