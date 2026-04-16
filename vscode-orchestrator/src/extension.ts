import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const out = vscode.window.createOutputChannel('Orchestrator');
  context.subscriptions.push(out);

  context.subscriptions.push(vscode.commands.registerCommand('orchestrator.open', async () => {
    const panel = vscode.window.createWebviewPanel('orchestrator', 'Orchestrator', vscode.ViewColumn.One, { enableScripts: true });
    panel.webview.html = getHtml();
    panel.webview.onDidReceiveMessage(async msg => {
      if (msg.command === 'run') {
        const cmd = msg.cmd;
        out.appendLine(`[${new Date().toISOString()}] Running: ${cmd}`);
        const terminal = vscode.window.createTerminal({ name: 'Orchestrator' });
        terminal.show();
        terminal.sendText(cmd);
        // log to .logs/orchestrator.log in workspace
        const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
        if (ws) {
          const logDir = path.join(ws.uri.fsPath, '.logs');
          try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
          const logFile = path.join(logDir, 'orchestrator.log');
          fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${cmd}\n`);
        }
      }
    });
  }));
}

export function deactivate() {}

function getHtml(): string {
  return `<!doctype html><html><body>
  <h3>Orchestrator</h3>
  <input id="cmd" style="width:100%" placeholder="Command to run"/>
  <button onclick="run()">Run</button>
  <script>
    const vscode = acquireVsCodeApi();
    function run(){ const cmd=document.getElementById('cmd').value; vscode.postMessage({command:'run', cmd}); }
  </script>
</body></html>`;
}
