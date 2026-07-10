function initBackup() {
  App.initShell('backup');
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="card mb-1">
      <h2>Exportar progresso</h2>
      <p class="muted">Gera arquivo JSON com todo o progresso salvo neste navegador.</p>
      <button class="btn" id="btn-export">Baixar backup.json</button>
    </div>
    <div class="card mb-1">
      <h2>Importar progresso</h2>
      <p class="muted">Substitui o progresso atual pelo conteúdo do arquivo.</p>
      <div class="form-row">
        <label for="file-import">Arquivo JSON</label>
        <input type="file" id="file-import" accept="application/json,.json">
      </div>
      <button class="btn btn-accent" id="btn-import">Importar</button>
    </div>
    <div class="card">
      <h2>Zona de risco</h2>
      <p class="muted">Apaga progresso local deste navegador.</p>
      <button class="btn btn-danger" id="btn-reset">Apagar progresso</button>
    </div>
  `;

  document.getElementById('btn-export').onclick = () => {
    const blob = new Blob([Storage.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `portal-estudos-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  document.getElementById('btn-import').onclick = async () => {
    const file = document.getElementById('file-import').files[0];
    if (!file) return alert('Selecione um arquivo.');
    try {
      const text = await file.text();
      Storage.importJSON(text);
      alert('Backup importado.');
      App.renderStatusBar();
    } catch (e) {
      alert('Falha ao importar: ' + e.message);
    }
  };

document.getElementById('btn-reset').onclick = async () => {
if (!await Modal.waitConfirm('Apagar todo o progresso local?')) return;
    Storage.reset();
    Storage.ensureStartDate();
    App.renderStatusBar();
    alert('Progresso apagado.');
  };
}

window.initBackup = initBackup;
