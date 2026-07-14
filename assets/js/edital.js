async function initEdital() {
  App.initShell('edital');
  try {
    const [inss, prf] = await Promise.all([
      App.loadJSON('data/edital-inss.json'),
      App.loadJSON('data/edital-prf-administrativo.json')
    ]);
    const progress = Storage.get().editalProgress || {};
    const root = document.getElementById('app-root');

    function coverage(list) {
      const total = list.length || 1;
      let done = 0, theory = 0, review = 0;
      list.forEach((t) => {
        const st = progress[t.id]?.status || t.status || 'nao_iniciado';
        if (st === 'consolidado') done++;
        if (['teoria_concluida', 'questoes_iniciadas', 'em_revisao', 'consolidado'].includes(st)) theory++;
        if (st === 'em_revisao') review++;
      });
      return {
        total: list.length,
        consolidado: done,
        teoria: theory,
        revisao: review,
        pct: Math.round((done / total) * 100),
        pctTeoria: Math.round((theory / total) * 100)
      };
    }

    function block(title, list) {
      const cov = coverage(list);
      const byMat = {};
      list.forEach((t) => {
        if (!byMat[t.materia]) byMat[t.materia] = [];
        byMat[t.materia].push(t);
      });
      return `
        <div class="card mb-1">
          <h2>${App.esc(title)}</h2>
          <p><strong>${cov.pct}%</strong> consolidado · <strong>${cov.pctTeoria}%</strong> com teoria · ${cov.total} tópicos</p>
          <div class="progress-bar mb-1"><span style="width:${cov.pct}%"></span></div>
          ${Object.entries(byMat).map(([mat, tops]) => `
            <h3 class="mt-1">${App.esc(mat)}</h3>
            <div class="table-scroll" role="region" aria-label="Tópicos de ${App.esc(mat)}" tabindex="0"><table>
              <thead><tr><th>Tópico</th><th>Subtópico</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${tops.map((t) => {
                  const st = progress[t.id]?.status || t.status || 'nao_iniciado';
                  return `<tr>
                    <td>${App.esc(t.topico)}</td>
                    <td>${App.esc(t.subtopico)}</td>
                    <td><span class="badge ${t.prioridade === 'alta' ? 'badge-danger' : 'badge-muted'}">${App.esc(t.prioridade)}</span></td>
                    <td>
                      <select data-ed="${t.id}">
                        ${['nao_iniciado','teoria_iniciada','teoria_concluida','questoes_iniciadas','em_revisao','consolidado'].map((s) =>
                          `<option value="${s}" ${s === st ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}
                      </select>
                    </td>
                    <td class="muted">${App.esc(t.fonte || '')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>`).join('')}
        </div>`;
    }

    const cInss = coverage(inss.topicos || []);
    const cPrf = coverage(prf.topicos || []);
    const all = (inss.topicos || []).concat(prf.topicos || []);
    const cAll = coverage(all);

    root.innerHTML = `
      <div class="grid grid-3 mb-1">
        <div class="card stat"><span class="value">${cAll.pct}%</span><span class="label">Geral consolidado</span></div>
        <div class="card stat"><span class="value">${cInss.pct}%</span><span class="label">INSS</span></div>
        <div class="card stat"><span class="value">${cPrf.pct}%</span><span class="label">PRF Administrativo</span></div>
      </div>
      <div class="alert alert-info">Consolidado = teoria + prática + revisão. Abrir material sozinho não consolida tópico.</div>
      ${block('INSS — Técnico do Seguro Social', inss.topicos || [])}
      ${block('PRF Administrativo', prf.topicos || [])}
    `;

    root.querySelectorAll('[data-ed]').forEach((sel) => {
      sel.onchange = () => {
        Storage.update((d) => {
          if (!d.editalProgress) d.editalProgress = {};
          d.editalProgress[sel.dataset.ed] = {
            status: sel.value,
            updatedAt: todayISO()
          };
        });
      };
    });
  } catch (e) {
    document.getElementById('app-root').innerHTML =
      `<div class="alert alert-danger">${App.esc(e.message)}</div>`;
  }
}
window.initEdital = initEdital;
