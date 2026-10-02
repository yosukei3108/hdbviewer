import * as vscode from 'vscode';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { readConfig, readInform, readRecords } from './tchmgr';


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

    const subscription = webview.onDidReceiveMessage(async (msg: { type: string; offset?: number; prefix?: string }) => {
      try {
        const cfg = readConfig();
        const lock = cfg.noLock ? '-nl' : '-nb';
        if (msg.type === 'ready' || msg.type === 'reload' || msg.type === 'page' || msg.type === 'filter') {
          const offset = typeof msg.offset === 'number' && msg.offset > 0 ? Math.floor(msg.offset) : 0;
          const prefix = typeof msg.prefix === 'string' ? msg.prefix : '';
          const [info, page] = await Promise.all([
            readInform(cfg, lock, document.uri.fsPath),
            readRecords(cfg, lock, document.uri.fsPath, offset, prefix),
          ]);
          webview.postMessage({ type: 'data', fileName, info, prefix, ...page });
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
  </div>
  <div class="toolbar">
    <input id="prefix" type="search" placeholder="Filter records by key prefix">
    <button id="filter">Filter</button>
  </div>
  <div class="toolbar">
    <input id="searchText" type="search" placeholder="Search text within loaded records">
    <span id="searchCount" class="status"></span>
    <button id="reload">Reload</button>
  </div>
  <div class="toolbar pager">
    <button id="prev">← Prev</button>
    <button id="next">Next →</button>
  </div>
  <details id="info">
    <summary>DB Info</summary>
    <dl id="infoList"></dl>
  </details>
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
