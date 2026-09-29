import * as vscode from 'vscode';
import { IconLoader } from '../utils/iconLoader';

interface MuiCompletionItem extends vscode.CompletionItem {
	readonly muiIconName: string;
}

export class MuiIconCompletionProvider implements vscode.CompletionItemProvider<MuiCompletionItem> {
	public constructor(private readonly iconLoader: IconLoader) {}

	public async provideCompletionItems(
		document: vscode.TextDocument,
		_position: vscode.Position,
		token: vscode.CancellationToken,
	): Promise<vscode.CompletionList<MuiCompletionItem> | undefined> {
		const iconNames = await this.iconLoader.getIconNames(document.uri);
		if (token.isCancellationRequested || iconNames.length === 0) {
			return undefined;
		}

		const items = iconNames.map((iconName): MuiCompletionItem => {
			const localName = `${iconName}Icon`;
			return {
				label: localName,
				kind: vscode.CompletionItemKind.Class,
				detail: `MUI icon · @mui/icons-material/${iconName}`,
				filterText: `${localName} ${iconName}`,
				insertText: localName,
				sortText: `mui-${localName}`,
				muiIconName: iconName,
			};
		});

		return new vscode.CompletionList(items, false);
	}

	public async resolveCompletionItem(
		item: MuiCompletionItem,
		token: vscode.CancellationToken,
	): Promise<MuiCompletionItem> {
		const preview = await this.iconLoader.getIcon(item.muiIconName, vscode.window.activeTextEditor?.document.uri);
		if (!preview || token.isCancellationRequested) {
			return item;
		}

		const documentation = new vscode.MarkdownString(undefined, true);
		documentation.supportHtml = true;
		documentation.appendMarkdown(`<img src="${preview.dataUri}" width="64" height="64" alt="${item.muiIconName} icon preview">`);
		item.documentation = documentation;
		return item;
	}
}