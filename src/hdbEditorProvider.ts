import * as vscode from 'vscode';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { readConfig, readInform, readKeys, readRecords } from './tchmgr';

export class HdbEditorProvider implements vscode.CustomReadonlyEditorProvider {
  static readonly viewType = 'hdbviewer.hashDB';

  constructor(private readonly context: vscode.ExtensionContext) {}

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose() {} };
  }

  async resolveCustomEditor(document: vscode.CustomDocument, panel: vscode.WebviewPanel): Promise<void> {
    const webview = panel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };
    webview.html = this.getHtml(webview);

    const fileName = path.basename(document.uri.fsPath);
    let generation = 0;

    // For manual testing: call only tchmgr inform / list.
    const subscription = webview.onDidReceiveMessage(async (msg: { type: string }) => {
      try {
        const cfg = readConfig();
        const lock = cfg.noLock ? '-nl' : '-nb';
        if (msg.type === 'ready') {
          // inform と list -pv を両方やって、まとめて送り返す
          const [info, records] = await Promise.all([
            readInform(cfg, lock, document.uri.fsPath),
            readRecords(cfg, lock, document.uri.fsPath)
          ]);
          webview.postMessage({ type: 'data', fileName, info, records });
        } else if (msg.type === 'inform') {
          const info = await readInform(cfg, lock, document.uri.fsPath);
          webview.postMessage({ type: 'inform', info });
        } else if (msg.type === 'list') {
          const keys = await readKeys(cfg, lock, document.uri.fsPath);
          webview.postMessage({ type: 'keys', keys });
        } else if (msg.type === 'listPv') {
          const records = await readRecords(cfg, lock, document.uri.fsPath);
          webview.postMessage({ type: 'records', records });
        }
      } catch (e) {
        webview.postMessage({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    });
    panel.onDidDispose(() => subscription.dispose());
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString('hex');
    const media = (file: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', file));
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media('main.css')}">
<title>Tokyo Cabinet Hash DB</title>
</head>
<body>
<header>
  <div class="title-row">
    <span id="fileName" class="file-name"></span>
    <span id="status" class="status"></span>
  </div>
  <div class="toolbar">
    <input id="prefix" type="search" placeholder="Search the whole DB by key prefix (Enter)">
    <button id="search">Search</button>
  </div>
  <div class="toolbar">
    <input id="filter" type="search" placeholder="Filter within loaded records">
    <label>Display
      <select id="mode">
        <option value="auto">Auto</option>
        <option value="text">Text</option>
        <option value="hex">Hex</option>
      </select>
    </label>
    <label><input id="showValues" type="checkbox">Show values</label>
    <button id="reload">Reload</button>
  </div>
  <div class="toolbar pager">
    <button id="prev">← Prev</button>
    <span id="pageInfo" class="status"></span>
    <button id="next">Next →</button>
    <label><input id="jumpTo" type="number" min="1" placeholder="record #">Jump to record #</label>
    <button id="go">Go</button>
  </div>
  <details id="info">
    <summary>DB Info</summary>
    <dl id="infoList"></dl>
  </details>
  <div id="message" hidden></div>
  <!-- For manual testing: call only tchmgr inform -->
  <div class="toolbar">
    <button id="inform">tchmgr inform</button>
    <button id="list">tchmgr list</button>
    <button id="listPv">tchmgr list -pv</button>
  </div>
  <pre id="debugOut"></pre>
</header>
<table id="records">
  <thead>
    <tr><th class="num">#</th><th>Key</th><th>Value</th></tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>
<script nonce="${nonce}" src="${media('main.js')}"></script>
</body>
</html>`;
  }
}
