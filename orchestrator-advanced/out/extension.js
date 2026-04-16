"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
function workspaceRoot() {
    const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    return ws ? ws.uri.fsPath : undefined;
}
function ensureLogsDir(root) {
    const logs = path.join(root, '.logs');
    if (!fs.existsSync(logs))
        fs.mkdirSync(logs, { recursive: true });
    const runsFile = path.join(logs, 'runs.json');
    if (!fs.existsSync(runsFile))
        fs.writeFileSync(runsFile, '[]', 'utf8');
    return logs;
}
function discoverWorkflows(root) {
    const dir = path.join(root, '.orchestrator', 'workflows');
    if (!fs.existsSync(dir))
        return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    const out = [];
    for (const f of files) {
        try {
            const raw = fs.readFileSync(path.join(dir, f), 'utf8');
            const doc = yaml.load(raw);
            if (doc && doc.name && Array.isArray(doc.steps)) {
                out.push({ name: doc.name, description: doc.description, variables: doc.variables, steps: doc.steps });
            }
        }
        catch (e) {
            // ignore parse errors
        }
    }
    return out;
}
function interpolate(template, vars) {
    return template.replace(/\$\{\{\s*([^}\s]+)\s*\}\}/g, (_, key) => {
        return vars[key] ?? '';
    });
}
async function executeStepWithRetries(step, root, runLogFile, out, vars) {
    const maxRetries = step.retries ?? 0;
    const delay = (step.retryDelaySeconds ?? 0) * 1000;
    let attempt = 0;
    while (true) {
        attempt++;
        try {
            await executeSingleStep(step, root, runLogFile, out, vars);
            return;
        }
        catch (err) {
            if (attempt > maxRetries)
                throw err;
            out.appendLine(`[Orchestrator] Step failed, retrying (${attempt}/${maxRetries}) after ${delay}ms: ${String(err)}`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}
function executeSingleStep(step, workspaceRoot, runLogFile, out, vars) {
    return new Promise((resolve, reject) => {
        if (!step.run)
            return resolve();
        const rendered = interpolate(step.run, vars);
        const cwd = step.cwd ? path.resolve(workspaceRoot, interpolate(step.cwd, vars)) : workspaceRoot;
        const env = Object.assign({}, process.env, step.env ? Object.fromEntries(Object.entries(step.env).map(([k, v]) => [k, interpolate(v, vars)])) : {});
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
        const args = process.platform === 'win32' ? ['/c', rendered] : ['-lc', rendered];
        out.appendLine(`[Orchestrator] Running: ${rendered} (cwd: ${cwd})`);
        fs.appendFileSync(runLogFile, `\n[${new Date().toISOString()}] RUN: ${rendered}\n`);
        const child = (0, child_process_1.spawn)(shell, args, { cwd, env });
        child.stdout.on('data', data => {
            const s = String(data);
            fs.appendFileSync(runLogFile, s);
            out.appendLine(s);
        });
        child.stderr.on('data', data => {
            const s = String(data);
            fs.appendFileSync(runLogFile, s);
            out.appendLine(s);
        });
        child.on('error', err => {
            fs.appendFileSync(runLogFile, `ERROR: ${String(err)}\n`);
            reject(err);
        });
        child.on('close', code => {
            fs.appendFileSync(runLogFile, `\n[exit ${code}]\n`);
            if (code === 0)
                resolve();
            else
                reject(new Error('Exit code ' + code));
        });
    });
}
function appendRunHistory(logsDir, runMeta) {
    const runsFile = path.join(logsDir, 'runs.json');
    const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
    arr.unshift(runMeta);
    fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
}
function activate(context) {
    const out = vscode.window.createOutputChannel('Orchestrator Advanced');
    context.subscriptions.push(out);
    context.subscriptions.push(vscode.commands.registerCommand('orchestrator.open', async () => {
        const root = workspaceRoot();
        if (!root) {
            vscode.window.showWarningMessage('Open a workspace folder to use Orchestrator.');
            return;
        }
        const panel = vscode.window.createWebviewPanel('orchestrator', 'Orchestrator', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = getWebviewContent();
        function refresh() {
            const workflows = discoverWorkflows(root);
            panel.webview.postMessage({ type: 'workflows', workflows });
        }
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'refresh') {
                refresh();
            }
            else if (message.command === 'runWorkflow') {
                const wf = message.workflow;
                const vars = Object.assign({}, wf.variables || {}, message.overrideVars || {});
                const runId = (0, uuid_1.v4)();
                const logsDir = ensureLogsDir(root);
                const runLogFile = path.join(logsDir, `${runId}.log`);
                const runMeta = {
                    id: runId,
                    workflow: wf.name,
                    startedAt: new Date().toISOString(),
                    steps: (wf.steps || []).map(s => {
                        if (s.parallel) {
                            return { name: 'parallel-group', status: 'pending', parallel: s.parallel.map((p) => ({ name: p.name || p.run, status: 'pending' })) };
                        }
                        else {
                            const st = s;
                            return { name: st.name || st.run, status: 'pending' };
                        }
                    })
                };
                appendRunHistory(logsDir, runMeta);
                panel.webview.postMessage({ type: 'runStarted', runId, workflow: wf.name });
                // execute steps sequentially; parallel groups run concurrently
                for (let i = 0; i < (wf.steps || []).length; i++) {
                    const s = (wf.steps || [])[i];
                    if (s.parallel) {
                        // parallel group
                        const group = s.parallel;
                        panel.webview.postMessage({ type: 'stepGroupStatus', runId, index: i, status: 'running' });
                        const promises = group.map((step, j) => executeStepWithRetries(step, root, runLogFile, out, vars)
                            .then(() => panel.webview.postMessage({ type: 'stepStatus', runId, index: i, subIndex: j, status: 'success' }))
                            .catch((err) => panel.webview.postMessage({ type: 'stepStatus', runId, index: i, subIndex: j, status: 'failed', error: String(err) })));
                        await Promise.all(promises);
                        panel.webview.postMessage({ type: 'stepGroupStatus', runId, index: i, status: 'finished' });
                    }
                    else {
                        panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'running' });
                        try {
                            await executeStepWithRetries(s, root, runLogFile, out, vars);
                            panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'success' });
                        }
                        catch (err) {
                            panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'failed', error: String(err) });
                            break;
                        }
                    }
                }
                // finalize run meta
                const runsFile = path.join(logsDir, 'runs.json');
                const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                const entry = arr.find((r) => r.id === runId);
                if (entry) {
                    entry.endedAt = new Date().toISOString();
                }
                fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
                panel.webview.postMessage({ type: 'runFinished', runId });
            }
            else if (message.command === 'getRuns') {
                const logsDir = ensureLogsDir(root);
                const runsFile = path.join(logsDir, 'runs.json');
                const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                panel.webview.postMessage({ type: 'runs', runs: arr });
            }
            else if (message.command === 'getLog') {
                const logsDir = ensureLogsDir(root);
                const file = path.join(logsDir, message.file);
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    panel.webview.postMessage({ type: 'logContent', file: message.file, content });
                }
                else {
                    panel.webview.postMessage({ type: 'logContent', file: message.file, content: '' });
                }
            }
        }, undefined, context.subscriptions);
        // initial load
        refresh();
    }));
}
function getWebviewContent() {
    return `<!doctype html><html><body>
  <h3>Orchestrator Advanced</h3>
  <div id="workflows"></div>
  <button onclick="refresh()">Refresh Workflows</button>
  <script>
    const vscode = acquireVsCodeApi();
    function refresh(){ vscode.postMessage({command:'refresh'}); }
    window.addEventListener('message', event => {
      const msg = event.data;
      if(msg.type==='workflows'){
        document.getElementById('workflows').innerText = JSON.stringify(msg.workflows, null, 2);
      }
    });
    refresh();
  </script>
</body></html>`;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map