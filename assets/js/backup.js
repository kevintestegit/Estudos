function initBackup() {
  App.initShell("backup");
  const root = document.getElementById("app-root");
  const progress = Storage.get();
  root.innerHTML = `
    ${Storage.corruptRaw != null ? '<div class="alert alert-danger" id="storage-warning">Seu progresso local está corrompido. Baixe o conteúdo bruto antes de restaurar um backup.<div class="actions"><button class="btn btn-secondary" type="button" id="btn-export-corrupt">Baixar dados para recuperação</button></div></div>' : ""}
    <section class="card mb-1">
      <p class="eyebrow">Proteja seu progresso</p>
      <h2>Baixar uma cópia</h2>
      <p>Último backup: <strong id="last-backup">${progress.lastBackupAt ? App.formatDateBR(progress.lastBackupAt.slice(0, 10)) : "nunca"}</strong></p>
      <p class="muted">O progresso existe somente neste navegador. Guarde o arquivo em local seguro.</p>
      <button class="btn" type="button" id="btn-export">Baixar cópia do meu progresso</button>
    </section>
    <section class="card mb-1">
      <h2>Restaurar uma cópia</h2>
      <p class="muted">O arquivo será validado antes de substituir os dados atuais.</p>
      <div class="form-row"><label for="file-import">Arquivo JSON</label><input type="file" id="file-import" accept="application/json,.json"></div>
      <button class="btn btn-accent" type="button" id="btn-import">Importar backup</button>
    </section>
    <section class="card danger-zone">
      <h2>Apagar neste navegador</h2>
      <p>Esta ação apaga somente os dados deste navegador e não pode ser desfeita sem backup.</p>
      <button class="btn btn-danger" type="button" id="btn-reset">Apagar todo o progresso</button>
    </section>`;

  document.getElementById("btn-export-corrupt")?.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([Storage.corruptRaw], { type: "text/plain" }));
    link.download = `portal-estudos-corrompido-${todayISO()}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  });

  document.getElementById("btn-export").onclick = () => {
    const timestamp = new Date().toISOString();
    Storage.update((data) => {
      data.lastBackupAt = timestamp;
    });
    const blob = new Blob([Storage.exportJSON()], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `portal-estudos-backup-${todayISO()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    document.getElementById("last-backup").textContent = App.formatDateBR(
      timestamp.slice(0, 10),
    );
  };

  document.getElementById("btn-import").onclick = async () => {
    const file = document.getElementById("file-import").files[0];
    if (!file) return alert("Selecione um arquivo JSON.");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("O arquivo não contém um backup válido.");
      if (
        !(await Modal.waitConfirm(
          "Importar este backup substituirá o progresso atual neste navegador. Continuar?",
        ))
      )
        return;
      Storage.importJSON(text);
      await alert("Backup importado com sucesso.");
      location.reload();
    } catch (error) {
      alert(`Falha ao importar: ${error.message}`);
    }
  };

  document.getElementById("btn-reset").onclick = async () => {
    if (
      !(await Modal.waitConfirm(
        "Apagar todo o progresso somente deste navegador? Esta ação não pode ser desfeita.",
      ))
    )
      return;
    Storage.reset();
    location.reload();
  };
}

window.initBackup = initBackup;
