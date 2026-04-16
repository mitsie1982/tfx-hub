import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('taskAutomation.compute', () => {
    vscode.window.showInformationMessage('Task Automation: Compute Percentage (scaffold placeholder)');
  }));
}
export function deactivate() {}
