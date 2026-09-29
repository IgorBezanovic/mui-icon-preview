import * as vscode from 'vscode';
import { IconLoader } from '../utils/iconLoader';
import { resolveMuiIconImport } from '../utils/importResolver';

export class MuiIconHoverProvider implements vscode.HoverProvider {
	public constructor(private readonly iconLoader: IconLoader) {}

	public async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
	): Promise<vscode.Hover | undefined> {
		const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);
		if (!wordRange) {
			return undefined;
		}

		const localName = document.getText(wordRange);
		const iconImport = resolveMuiIconImport(document.getText(), localName);
		if (!iconImport || token.isCancellationRequested) {
			return undefined;
		}

		const preview = await this.iconLoader.getIcon(iconImport.iconName, document.uri);
		if (!preview || token.isCancellationRequested) {
			return undefined;
		}

		const queryName = iconImport.iconName.replace(/(Outlined|Rounded|Sharp|TwoTone)$/, '');
		const documentationUrl = `https://mui.com/material-ui/material-icons/?query=${encodeURIComponent(queryName)}`;
		const markdown = new vscode.MarkdownString(undefined, true);
		markdown.supportHtml = true;
		markdown.appendMarkdown(
			`**MUI Icon** - **${escapeMarkdown(iconImport.localName)}** - [\`${iconImport.source}\`](${documentationUrl})\n\n`,
		);
		markdown.appendMarkdown(
			`<img src="${preview.dataUri}" width="64" height="64" alt="${iconImport.iconName} icon preview">\n\n`,
		);
		markdown.appendMarkdown(`[Click to open MUI docs](${documentationUrl})`);

		return new vscode.Hover(markdown, wordRange);
	}
}

function escapeMarkdown(value: string): string {
	return value.replace(/[\\`*_{}\[\]()<>#+.!|~-]/g, '\\$&');
}