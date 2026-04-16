import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

type VscodeTask = any;

function isAutomatedTask(task: VscodeTask): boolean {
  // Heuristic (explicit):
  // 1) runOptions.runOn === "folderOpen"
  // 2) isBackground === true
  // 3) problemMatcher contains an object with "watching" property
  // 4) group.kind in ("build","test") and group.isDefault === true
  try {
    if (!task || typeof task !== 'object') return false;
    if (task.runOptions && task.runOptions.runOn === 'folderOpen') return true;
    if (task.isBackground === true) return true;
    if (Array.isArray(task.problemMatcher)) {
      for (const pm of task.problemMatcher) {
        if (pm && typeof pm === 'object' && pm.watching) return true;
      }
    }
    if (task.group && typeof task.group === 'object') {
      const kind = task.group.kind || task.group;
      const isDefault = !!task.group.isDefault;
      if ((kind === 'build' || kind === 'test') && isDefault) return true;
    }
  } catch (e) {
    // ignore parse errors, treat as not automated
  }
  return false;
}

async function findTasksJsonFiles(): Promise<string[]> {
  const results: string[] = [];
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return results;
  for (const f of folders) {
    const candidate = path.join(f.uri.fsPath, '.vscode', 'tasks.json');
    if (fs.existsSync(candidate)) results.push(candidate);
  }
  return results;
}

function readTasksFromFile(filePath: string): VscodeTask[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    // tasks.json can have "tasks" array or "version" + "tasks"
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.tasks)) return parsed.tasks;
    return [];
  } catch (e) {
    return [];
  }
}

export function activate(context: vscode.ExtensionContext) {
  const out = vscode.window.createOutputChannel('Task Automation Inspector');
  context.subscriptions.push(out);

  const disposable = vscode.commands.registerCommand('taskAutomation.compute', async () => {
    out.clear();
    out.appendLine('Task Automation Inspector started...');
    const files = await findTasksJsonFiles();
    if (files.length === 0) {
      vscode.window.showInformationMessage('No .vscode/tasks.json files found in workspace.');
      out.appendLine('No tasks.json files found.');
      return;
    }

    let totalTasks = 0;
    let automatedCount = 0;
    const details: { file: string; total: number; automated: number; automatedTasks: string[] }[] = [];

    for (const f of files) {
      const tasks = readTasksFromFile(f);
      const fileTotal = tasks.length;
      let fileAutomated = 0;
      const automatedNames: string[] = [];
      for (const t of tasks) {
        totalTasks++;
        const name = t.label || t.taskName || t.name || '<unnamed>';
        if (isAutomatedTask(t)) {
          automatedCount++;
          fileAutomated++;
          automatedNames.push(String(name));
        }
      }
      details.push({ file: f, total: fileTotal, automated: fileAutomated, automatedTasks: automatedNames });
    }

    const percent = totalTasks === 0 ? 0 : Math.round((automatedCount / totalTasks) * 10000) / 100;
    const summary = `Automated tasks: ${automatedCount}/${totalTasks} (${percent}%)`;
    vscode.window.showInformationMessage(summary);
    out.appendLine('--- Task Automation Inspector Report ---');
    out.appendLine(summary);
    out.appendLine('');
    out.appendLine('Heuristic used to mark a task automated:');
    out.appendLine(' - runOptions.runOn === "folderOpen"');
    out.appendLine(' - isBackground === true');
    out.appendLine(' - problemMatcher contains watching');
    out.appendLine(' - group.kind in ("build","test") and group.isDefault === true');
    out.appendLine('');
    for (const d of details) {
      out.appendLine(`File: ${d.file}`);
      out.appendLine(`  total tasks: ${d.total}`);
      out.appendLine(`  automated: ${d.automated}`);
      if (d.automatedTasks.length) {
        out.appendLine(`  automated task names: ${d.automatedTasks.join(', ')}`);
      }
      out.appendLine('');
    }
    out.show(true);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
