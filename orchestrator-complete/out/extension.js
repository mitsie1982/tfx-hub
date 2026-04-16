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
function loadYamlWithIncludes(filePath, visited = new Set()) {
    if (visited.has(filePath))
        throw new Error('Circular include: ' + filePath);
    visited.add(filePath);
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(raw);
    // process top-level includes
    if (doc && doc.include) {
        const baseDir = path.dirname(filePath);
        const includes = Array.isArray(doc.include) ? doc.include : [doc.include];
        for (const inc of includes) {
            const incPath = path.resolve(baseDir, inc);
            if (fs.existsSync(incPath)) {
                const incDoc = loadYamlWithIncludes(incPath, visited);
                // merge: included doc keys override only if not present
                Object.assign(doc, incDoc, doc);
            }
        }
    }
    return doc;
}
function discoverWorkflows(root) {
    const dir = path.join(root, '.orchestrator', 'workflows');
    if (!fs.existsSync(dir))
        return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    const out = [];
    for (const f of files) {
        try {
            const full = path.join(dir, f);
            const doc = loadYamlWithIncludes(full);
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
function evalWhenExpression(expr, vars, env) {
    // Very small evaluator supporting:
    // - existence: "varName" true if varName defined and non-empty
    // - equality: "varName == value"
    // - inequality: "varName != value"
    // - env: prefix env.ENVNAME
    try {
        const trimmed = expr.trim();
        const eq = trimmed.match(/^([^!=\s]+)\s*==\s*(.+)$/);
        const neq = trimmed.match(/^([^!=\s]+)\s*!=\s*(.+)$/);
        if (eq) {
            const left = eq[1];
            const right = eq[2].replace(/^['"]|['"]$/g, '');
            const val = left.startsWith('env.') ? env[left.slice(4)] : vars[left];
            return String(val ?? '') === right;
        }
        else if (neq) {
            const left = neq[1];
            const right = neq[2].replace(/^['"]|['"]$/g, '');
            const val = left.startsWith('env.') ? env[left.slice(4)] : vars[left];
            return String(val ?? '') !== right;
        }
        else {
            const key = trimmed;
            const val = key.startsWith('env.') ? env[key.slice(4)] : vars[key];
            return !!(val && String(val).length > 0);
        }
    }
    catch {
        return false;
    }
}
async function executeSingleStep(step, workspaceRoot, runLogFile, out, vars) {
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
        let timedOut = false;
        let timeoutHandle;
        if (step.timeoutSeconds && step.timeoutSeconds > 0) {
            timeoutHandle = setTimeout(() => {
                timedOut = true;
                try {
                    child.kill('SIGKILL');
                }
                catch { }
            }, step.timeoutSeconds * 1000);
        }
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
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
            fs.appendFileSync(runLogFile, `ERROR: ${String(err)}\n`);
            reject(err);
        });
        child.on('close', code => {
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
            fs.appendFileSync(runLogFile, `\n[exit ${code}]\n`);
            if (timedOut)
                reject(new Error('Timeout'));
            else if (code === 0)
                resolve();
            else
                reject(new Error('Exit code ' + code));
        });
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
function appendRunHistory(logsDir, runMeta) {
    const runsFile = path.join(logsDir, 'runs.json');
    const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
    arr.unshift(runMeta);
    fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
}
function activate(context) {
    const out = vscode.window.createOutputChannel('Orchestrator Complete');
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
        // Minimal webview content for Orchestrator UI
        function getWebviewContent(webview, extensionUri) {
            return `
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Orchestrator</title>
					<style>
						body { font-family: sans-serif; margin: 0; padding: 0; }
						#workflows { margin: 1em; }
						.workflow { border: 1px solid #ccc; margin-bottom: 1em; padding: 1em; border-radius: 4px; }
						button { margin-right: 0.5em; }
					</style>
				</head>
				<body>
					<h2>Orchestrator Workflows</h2>
					<div id="workflows"></div>
					<script>
						const vscode = acquireVsCodeApi();
						window.addEventListener('message', event => {
							const msg = event.data;
							if (msg.type === 'workflows') {
								const container = document.getElementById('workflows');
								container.innerHTML = '';
								msg.workflows.forEach((wf, idx) => {
									const div = document.createElement('div');
									div.className = 'workflow';
									div.innerHTML = \`<b>\${wf.name}</b><br>\${wf.description || ''}<br><button onclick="run(\${idx})">Run</button>\`;
									container.appendChild(div);
								});
							}
						});
						function run(idx) {
							vscode.postMessage({ command: 'runWorkflow', workflowIndex: idx });
						}
						vscode.postMessage({ command: 'refresh' });
					</script>
				</body>
				</html>
			`;
        }
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
        function refresh() {
            if (!root)
                return;
            const workflows = discoverWorkflows(root);
            panel.webview.postMessage({ type: 'workflows', workflows });
        }
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'refresh') {
                refresh();
            }
            else if (message.command === 'runWorkflow') {
                const wf = message.workflow;
                const overrideVars = message.overrideVars || {};
                const vars = Object.assign({}, wf.variables || {}, overrideVars);
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
                for (let i = 0; i < (wf.steps || []).length; i++) {
                    const s = (wf.steps || [])[i];
                    if (s.parallel) {
                        const group = s.parallel;
                        panel.webview.postMessage({ type: 'stepGroupStatus', runId, index: i, status: 'running' });
                        const promises = group.map((step, idx) => {
                            // evaluate when for each parallel step
                            const shouldRun = !step.when || evalWhenExpression(step.when, vars, process.env);
                            if (!shouldRun) {
                                panel.webview.postMessage({ type: 'stepStatus', runId, index: i, subIndex: idx, status: 'skipped' });
                                return Promise.resolve({ idx, status: 'skipped' });
                            }
                            panel.webview.postMessage({ type: 'stepStatus', runId, index: i, subIndex: idx, status: 'running' });
                            return executeStepWithRetries(step, root, runLogFile, out, vars)
                                .then(() => ({ idx, status: 'success' }))
                                .catch(err => ({ idx, status: 'failed', error: String(err) }));
                        });
                        const results = await Promise.all(promises);
                        const failed = results.find(r => r.status === 'failed');
                        if (failed) {
                            panel.webview.postMessage({ type: 'stepGroupStatus', runId, index: i, status: 'failed' });
                            const runsFile = path.join(logsDir, 'runs.json');
                            const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                            const entry = arr.find((r) => r.id === runId);
                            if (entry)
                                entry.steps[i].status = 'failed';
                            fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
                            break;
                        }
                        else {
                            panel.webview.postMessage({ type: 'stepGroupStatus', runId, index: i, status: 'success' });
                            const runsFile = path.join(logsDir, 'runs.json');
                            const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                            const entry = arr.find((r) => r.id === runId);
                            if (entry)
                                entry.steps[i].status = 'success';
                            fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
                        }
                    }
                    else {
                        const step = s;
                        // evaluate when expression
                        const shouldRun = !step.when || evalWhenExpression(step.when, vars, process.env);
                        if (!shouldRun) {
                            panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'skipped' });
                            const runsFile = path.join(ensureLogsDir(root), 'runs.json');
                            const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                            const entry = arr.find((r) => r.id === runId);
                            if (entry)
                                entry.steps[i].status = 'skipped';
                            fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
                            continue;
                        }
                        panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'running' });
                        try {
                            await executeStepWithRetries(step, root, runLogFile, out, vars);
                            panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'success' });
                            const runsFile = path.join(ensureLogsDir(root), 'runs.json');
                            const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                            const entry = arr.find((r) => r.id === runId);
                            if (entry)
                                entry.steps[i].status = 'success';
                            fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
                        }
                        catch (err) {
                            panel.webview.postMessage({ type: 'stepStatus', runId, index: i, status: 'failed', error: String(err) });
                            const runsFile = path.join(ensureLogsDir(root), 'runs.json');
                            const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                            const entry = arr.find((r) => r.id === runId);
                            if (entry)
                                entry.steps[i].status = 'failed';
                            fs.writeFileSync(runsFile, JSON.stringify(arr, null, 2), 'utf8');
                            break;
                        }
                    }
                }
                const runsFile = path.join(ensureLogsDir(root), 'runs.json');
                const arr = JSON.parse(fs.readFileSync(runsFile, 'utf8') || '[]');
                const entry = arr.find((r) => r.id === runId);
                if (entry)
                    entry.endedAt = new Date().toISOString();
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
        refresh();
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map