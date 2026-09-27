// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
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
      await vscode.commands.executeCommand('vscode.openWith', picked[0], 'hdbviewer.hashDB');
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
