import * as vscode from 'vscode';
import * as AWS from 'aws-sdk';
import OpenAI from 'openai';

async function getOpenAIKeyFromAWS(secretName: string, region = 'us-east-1'): Promise<string> {
    const client = new AWS.SecretsManager({ region });
    return new Promise((resolve, reject) => {
        client.getSecretValue({ SecretId: secretName }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                if (data.SecretString) {
                    resolve(data.SecretString);
                } else {
                    reject('No SecretString found');
                }
            }
        });
    });
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('tfxhub-ml-automation.runCompletion', async () => {
        try {
            const secretName = await vscode.window.showInputBox({ prompt: 'Enter AWS Secrets Manager secret name for OpenAI API key', value: 'openai/apikey' });
            if (!secretName) return;
            const apiKey = await getOpenAIKeyFromAWS(secretName);
            const openai = new OpenAI({ apiKey });
            const prompt = await vscode.window.showInputBox({ prompt: 'Enter prompt for OpenAI completion' });
            if (!prompt) return;
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50
            });
            vscode.window.showInformationMessage('OpenAI Response: ' + (response.choices?.[0]?.message?.content?.trim() || 'No response'));
        } catch (err: any) {
            vscode.window.showErrorMessage('Error: ' + err.message || String(err));
        }
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {}
