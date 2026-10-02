(function () {
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const els = {
    fileName: $('fileName'),
    prefix: $('prefix'),
    filter: $('filter'),
    searchText: $('searchText'),
    searchCount: $('searchCount'),
    reload: $('reload'),
    prev: $('prev'),
    next: $('next'),
    infoList: $('infoList'),
    tbody: $('tbody'),
  }

  let page = { offset: 0, pageSize: 0, hasNext: false, prefix: '' };


  function requestLoad(type, offset, prefix) {
    setBusy(true);
    vscode.postMessage({ type, offset: Math.max(0, offset), prefix });
  }

  function applyFilter() {
    requestLoad('filter', 0, els.prefix.value);
  }

  function applySearch() {
    const keyword = els.searchText.value.toLowerCase();
    let count = 0;
    for (const tr of els.tbody.rows) {
      const [, keyCell, valueCell] = tr.cells;
      const hit =
        keyword !== '' &&
        (keyCell.textContent.toLowerCase().includes(keyword) ||
          valueCell.textContent.toLowerCase().includes(keyword));
      tr.classList.toggle('match', hit);
      tr.hidden = keyword !== '' && !hit;
      if (hit) {
        count++;
      }
    }
    els.searchCount.textContent = keyword === '' ? '' : `${count} hits`;
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

  els.prefix.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyFilter(); } });
  els.filter.addEventListener('click', applyFilter);
  els.searchText.addEventListener('input', applySearch);
  els.reload.addEventListener('click', () => requestLoad('reload', page.offset, page.prefix));
  els.prev.addEventListener('click', () => requestLoad('page', page.offset - page.pageSize, page.prefix));
  els.next.addEventListener('click', () => requestLoad('page', page.offset + page.pageSize, page.prefix));

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'data') {
      page = { offset: msg.offset, pageSize: msg.pageSize, hasNext: msg.hasNext, prefix: msg.prefix };
      els.fileName.textContent = msg.fileName;
      renderInfo(msg.info);
      renderRecords(msg.records);
      applySearch();
      setBusy(false);
    } else if (msg.type === 'error') {
      setBusy(false);
    }
  });

  function setBusy(busy) {
    els.filter.disabled = busy;
    els.reload.disabled = busy;
    els.prev.disabled = busy || page.offset <= 0;
    els.next.disabled = busy || !page.hasNext;
  }


  function hexToText(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  }


  setBusy(true);
  vscode.postMessage({ type: 'ready' });
})();
