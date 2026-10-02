import * as vscode from 'vscode';
import { HdbEditorProvider } from './hdbEditorProvider';


export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(HdbEditorProvider.viewType, new HdbEditorProvider(context), {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true,
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hdbviewer.open', async () => {
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Open',
        filters: {
          'Tokyo Cabinet Hash DB': ['tch', 'hdb'],
          'All Files': ['*'],
        },
      });
      if (!picked || picked.length === 0) {
        return;
      }
      await vscode.commands.executeCommand('vscode.openWith', picked[0], HdbEditorProvider.viewType);
    }),
  );
}
