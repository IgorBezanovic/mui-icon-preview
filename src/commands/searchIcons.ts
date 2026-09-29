import * as vscode from 'vscode';
import { IconLoader } from '../utils/iconLoader';
import { resolveMuiIconImports } from '../utils/importResolver';

interface IconQuickPickItem extends vscode.QuickPickItem {
	readonly iconName: string;
}

export function registerSearchIconsCommand(
	iconLoader: IconLoader,
	output: vscode.OutputChannel,
): vscode.Disposable {
	return vscode.commands.registerCommand('muiIconPreview.searchIcons', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			void vscode.window.showInformationMessage('Open a JavaScript or TypeScript file to insert a MUI icon.');
			return;
		}

		const iconNames = await iconLoader.getIconNames(editor.document.uri);
		if (iconNames.length === 0) {
			void vscode.window.showWarningMessage('No @mui/icons-material installation was found for this workspace.');
			return;
		}

		const items = iconNames.map((iconName): IconQuickPickItem => ({
			label: `$(symbol-color) ${iconName}Icon`,
			description: `@mui/icons-material/${iconName}`,
			iconName,
		}));
		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Search Material UI icons',
			matchOnDescription: true,
		});
		if (!selected) {
			return;
		}

		await insertIcon(editor, selected.iconName, output);
	});
}

async function insertIcon(
	editor: vscode.TextEditor,
	iconName: string,
	output: vscode.OutputChannel,
): Promise<void> {
	const document = editor.document;
	const existingImport = resolveMuiIconImports(document.getText()).find((item) => item.iconName === iconName);
	const localName = existingImport?.localName ?? findAvailableLocalName(document.getText(), `${iconName}Icon`);
	const importPosition = findImportPosition(document);
	const selection = editor.selection;
	const usage = `<${localName} />`;

	const applied = await editor.edit((editBuilder) => {
		if (!existingImport) {
			const importText = `import ${localName} from '@mui/icons-material/${iconName}';\n`;
			if (selection.isEmpty && selection.active.isEqual(importPosition)) {
				editBuilder.insert(importPosition, `${importText}\n${usage}`);
				return;
			}
			editBuilder.insert(importPosition, importText);
		}

		if (selection.isEmpty) {
			editBuilder.insert(selection.active, usage);
		} else {
			editBuilder.replace(selection, usage);
		}
	});

	if (!applied) {
		output.appendLine(`VS Code rejected the edit for ${iconName}.`);
		void vscode.window.showErrorMessage(`Unable to insert ${localName}.`);
	}
}

function findAvailableLocalName(text: string, preferredName: string): string {
	if (!new RegExp(`\\b${preferredName}\\b`).test(text)) {
		return preferredName;
	}

	let suffix = 2;
	while (new RegExp(`\\b${preferredName}${suffix}\\b`).test(text)) {
		suffix += 1;
	}
	return `${preferredName}${suffix}`;
}

function findImportPosition(document: vscode.TextDocument): vscode.Position {
	const text = document.getText();
	const importPattern = /^import(?:[\s\S]*?from\s*)?['"][^'"]+['"]\s*;?[ \t]*(?:\r?\n|$)/gm;
	let insertionOffset = text.startsWith('#!') ? (text.indexOf('\n') + 1 || text.length) : 0;

	for (const match of text.matchAll(importPattern)) {
		if (match.index !== undefined) {
			insertionOffset = match.index + match[0].length;
		}
	}

	return document.positionAt(insertionOffset);
}