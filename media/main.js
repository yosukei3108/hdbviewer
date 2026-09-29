(function () {
  const vscode = acquireVsCodeApi();
  const out = document.getElementById('debugOut');

  document.getElementById('inform').addEventListener('click', () => {
    out.textContent = 'tchmgr inform clicked';
    vscode.postMessage({ type: 'inform' });
  });

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'inform') {
      out.textContent = JSON.stringify(msg.info, null, 2);
    } else if (msg.type === 'error') {
      out.textContent = msg.message;
    }
  });
})();
