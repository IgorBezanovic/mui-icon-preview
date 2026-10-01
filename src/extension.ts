import * as vscode from 'vscode';
import { registerSearchIconsCommand } from './commands/searchIcons';
import { MuiIconCompletionProvider } from './providers/completionProvider';
import { MuiIconHoverProvider } from './providers/hoverProvider';
import { IconLoader } from './utils/iconLoader';

const supportedLanguages: vscode.DocumentSelector = [
	{ language: 'typescript', scheme: 'file' },
	{ language: 'typescriptreact', scheme: 'file' },
	{ language: 'javascript', scheme: 'file' },
	{ language: 'javascriptreact', scheme: 'file' },
];

export function activate(context: vscode.ExtensionContext): void {
	const output = vscode.window.createOutputChannel('MUI Icon Preview');
	const iconLoader = new IconLoader(output);

	context.subscriptions.push(
		output,
		vscode.languages.registerHoverProvider(supportedLanguages, new MuiIconHoverProvider(iconLoader)),
		vscode.languages.registerCompletionItemProvider(
			supportedLanguages,
			new MuiIconCompletionProvider(iconLoader),
		),
		registerSearchIconsCommand(iconLoader, output),
	);

	output.appendLine('MUI Icon Preview activated.');
}
