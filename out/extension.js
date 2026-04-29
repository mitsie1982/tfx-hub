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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const AWS = __importStar(require("aws-sdk"));
const openai_1 = __importDefault(require("openai"));
async function getOpenAIKeyFromAWS(secretName, region = 'us-east-1') {
    const client = new AWS.SecretsManager({ region });
    return new Promise((resolve, reject) => {
        client.getSecretValue({ SecretId: secretName }, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                if (data.SecretString) {
                    resolve(data.SecretString);
                }
                else {
                    reject('No SecretString found');
                }
            }
        });
    });
}
function activate(context) {
    let disposable = vscode.commands.registerCommand('tfxhub-ml-automation.runCompletion', async () => {
        try {
            const secretName = await vscode.window.showInputBox({ prompt: 'Enter AWS Secrets Manager secret name for OpenAI API key', value: 'openai/apikey' });
            if (!secretName)
                return;
            const apiKey = await getOpenAIKeyFromAWS(secretName);
            const openai = new openai_1.default({ apiKey });
            const prompt = await vscode.window.showInputBox({ prompt: 'Enter prompt for OpenAI completion' });
            if (!prompt)
                return;
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50
            });
            vscode.window.showInformationMessage('OpenAI Response: ' + (response.choices?.[0]?.message?.content?.trim() || 'No response'));
        }
        catch (err) {
            vscode.window.showErrorMessage('Error: ' + err.message || String(err));
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map