(function () {
  const vscode = acquireVsCodeApi();
  const out = document.getElementById('debugOut');
  const tbody = document.getElementById('tbody');

  document.getElementById('inform').addEventListener('click', () => {
    out.textContent = 'tchmgr inform clicked';
    vscode.postMessage({ type: 'inform' });
  });

  document.getElementById('list').addEventListener('click', () => {
    out.textContent = 'tchmgr list clicked';
    vscode.postMessage({type: 'list'});
  });

  function renderKeys(keys) {
    const rows = keys.map((key, i) => {
      const tr = document.createElement('tr');
      for (const [text, cls] of [[String(i + 1), 'num'], [key, 'text'], ['', 'text']]) {
        const td = document.createElement('td');
        td.className = cls;
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    });
    tbody.replaceChildren(...rows);
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'inform') {
      out.textContent = JSON.stringify(msg.info, null, 2);
    } else if (msg.type === 'keys') {
      out.textContent = `${msg.keys.length} keys`;
      renderKeys(msg.keys);
    } else if (msg.type === 'error') {
      out.textContent = msg.message;
    }
  });
})();
