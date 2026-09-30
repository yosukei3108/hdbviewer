(function () {
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const els = {
    fileName: $('fileName'),
    filter: $('filter'),
    reload: $('reload'),
    prev: $('prev'),
    next: $('next'),
    go: $('go'),
    infoList: $('infoList'),
    tbody: $('tbody'),
    out: $('debugOut'),
  }

  let page = { offset: 0, pageSize: 0, hasNext: false };


  function requestLoad(type, offset) {
    setBusy(true);
    vscode.postMessage({ type, offset: Math.max(0, offset) });
  }


  function renderInfo(info) {
    const fragment = document.createDocumentFragment();
    for (const [k, v] of Object.entries(info)) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v === '' ? '-' : v;
      fragment.append(dt, dd);
    }
    els.infoList.replaceChildren(fragment);
  }

  function renderRecords(records) {
    const rows = records.map((r, i) => {
      const tr = document.createElement('tr');
      for (const [text, cls] of [
        [String(page.offset + i + 1), 'num'],
        [hexToText(r.key), 'text'],
        [hexToText(r.value), 'text']
      ]) {
        const td = document.createElement('td');
        td.className = cls;
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    });
    els.tbody.replaceChildren(...rows);
  }


  els.reload.addEventListener('click', () => requestLoad('reload', page.offset));
  els.prev.addEventListener('click', () => requestLoad('page', page.offset - page.pageSize));
  els.next.addEventListener('click', () => requestLoad('page', page.offset + page.pageSize));

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'data') {
      page = { offset: msg.offset, pageSize: msg.pageSize, hasNext: msg.hasNext };
      els.fileName.textContent = msg.fileName;
      renderInfo(msg.info);
      renderRecords(msg.records);
      setBusy(false);
      els.out.textContent = 'HDB file is loaded';
    } else if (msg.type === 'error') {
      els.out.textContent = msg.message;
      setBusy(false);
    }
  });

  function setBusy(busy) {
    els.filter.disabled = busy;
    els.reload.disabled = busy;
    els.prev.disabled = busy || page.offset <= 0;
    els.next.disabled = busy || !page.hasNext;
    els.go.disabled = busy;
  }


  // utility functions
  function hexToText(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  }


  setBusy(true);
  els.out.textContent = 'loading...';
  vscode.postMessage({ type: 'ready' });
})();
