import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export interface IconPreview {
	readonly iconName: string;
	readonly svg: string;
	readonly dataUri: string;
}

interface PackageCache {
	names?: readonly string[];
	readonly previews: Map<string, Promise<IconPreview | undefined>>;
}

const svgElements = ['path', 'circle', 'rect', 'polygon', 'polyline', 'line', 'ellipse'] as const;
const svgAttributes = [
	'd', 'opacity', 'fill', 'fillOpacity', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin',
	'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'ry', 'points', 'x1', 'x2', 'y1', 'y2',
	'transform',
] as const;
const attributeNames: Readonly<Record<string, string>> = {
	fillOpacity: 'fill-opacity',
	strokeWidth: 'stroke-width',
	strokeLinecap: 'stroke-linecap',
	strokeLinejoin: 'stroke-linejoin',
};

export class IconLoader {
	private readonly packageCaches = new Map<string, PackageCache>();
	private readonly packageRootsByDirectory = new Map<string, Promise<string | undefined>>();
	private loggedMissingPackage = false;

	public constructor(private readonly output: vscode.OutputChannel) {}

	public async initialize(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<void> {
		const roots = await Promise.all(workspaceFolders.map((folder) => this.findPackageRoot(folder.uri.fsPath)));
		const uniqueRoots = [...new Set(roots.filter((root): root is string => root !== undefined))];

		if (uniqueRoots.length === 0) {
			this.output.appendLine('No workspace installation of @mui/icons-material found. Icons will be loaded on demand.');
			return;
		}

		for (const root of uniqueRoots) {
			const names = await this.getNamesFromRoot(root);
			this.output.appendLine(`Indexed ${names.length} MUI icons from ${root}.`);
		}
	}

	public async getIconNames(documentUri?: vscode.Uri): Promise<readonly string[]> {
		const root = await this.resolvePackageRoot(documentUri);
		if (!root) {
			this.logMissingPackage();
			return [];
		}

		return this.getNamesFromRoot(root);
	}

	public async getIcon(iconName: string, documentUri?: vscode.Uri): Promise<IconPreview | undefined> {
		if (!/^[A-Z][A-Za-z0-9]*$/.test(iconName)) {
			return undefined;
		}

		const root = await this.resolvePackageRoot(documentUri);
		if (!root) {
			this.logMissingPackage();
			return undefined;
		}

		return this.loadFromRoot(root, iconName);
	}

	private async resolvePackageRoot(documentUri?: vscode.Uri): Promise<string | undefined> {
		if (documentUri?.scheme === 'file') {
			const documentRoot = await this.findPackageRoot(path.dirname(documentUri.fsPath));
			if (documentRoot) {
				return documentRoot;
			}
		}

		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			const workspaceRoot = await this.findPackageRoot(folder.uri.fsPath);
			if (workspaceRoot) {
				return workspaceRoot;
			}
		}

		return undefined;
	}

	private findPackageRoot(startDirectory: string): Promise<string | undefined> {
		const normalizedStart = path.resolve(startDirectory);
		const cached = this.packageRootsByDirectory.get(normalizedStart);
		if (cached) {
			return cached;
		}

		const result = this.walkForPackageRoot(normalizedStart);
		this.packageRootsByDirectory.set(normalizedStart, result);
		return result;
	}

	private async walkForPackageRoot(startDirectory: string): Promise<string | undefined> {
		let currentDirectory = startDirectory;
		while (true) {
			const packageRoot = path.join(currentDirectory, 'node_modules', '@mui', 'icons-material');
			try {
				await fs.access(path.join(packageRoot, 'package.json'));
				return packageRoot;
			} catch {
				const parentDirectory = path.dirname(currentDirectory);
				if (parentDirectory === currentDirectory) {
					return undefined;
				}
				currentDirectory = parentDirectory;
			}
		}
	}

	private getPackageCache(root: string): PackageCache {
		let cache = this.packageCaches.get(root);
		if (!cache) {
			cache = { previews: new Map<string, Promise<IconPreview | undefined>>() };
			this.packageCaches.set(root, cache);
		}
		return cache;
	}

	private async getNamesFromRoot(root: string): Promise<readonly string[]> {
		const cache = this.getPackageCache(root);
		if (cache.names) {
			return cache.names;
		}

		try {
			const entries = await fs.readdir(root, { withFileTypes: true });
			cache.names = entries
				.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
				.map((entry) => entry.name.slice(0, -3))
				.filter((name) => /^[A-Z][A-Za-z0-9]*$/.test(name))
				.sort((left, right) => left.localeCompare(right));
			return cache.names;
		} catch (error: unknown) {
			this.output.appendLine(`Unable to read MUI icon package at ${root}: ${formatError(error)}`);
			return [];
		}
	}

	private loadFromRoot(root: string, iconName: string): Promise<IconPreview | undefined> {
		const cache = this.getPackageCache(root);
		const cached = cache.previews.get(iconName);
		if (cached) {
			return cached;
		}

		const preview = this.readIcon(root, iconName);
		cache.previews.set(iconName, preview);
		return preview;
	}

	private async readIcon(root: string, iconName: string): Promise<IconPreview | undefined> {
		try {
			const source = await fs.readFile(path.join(root, `${iconName}.js`), 'utf8');
			const preview = createIconPreviewFromSource(iconName, source);
			if (!preview) {
				this.output.appendLine(`No supported SVG elements found for ${iconName}.`);
				return undefined;
			}
			return preview;
		} catch (error: unknown) {
			this.output.appendLine(`Unable to load MUI icon ${iconName}: ${formatError(error)}`);
			return undefined;
		}
	}

	private logMissingPackage(): void {
		if (!this.loggedMissingPackage) {
			this.loggedMissingPackage = true;
			this.output.appendLine('Could not locate node_modules/@mui/icons-material for the active workspace.');
		}
	}
}

export function createIconPreviewFromSource(iconName: string, source: string): IconPreview | undefined {
	const elements = extractSvgElements(source);
	if (elements.length === 0) {
		return undefined;
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="#757575">${elements.join('')}</svg>`;
	return {
		iconName,
		svg,
		dataUri: `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`,
	};
}

function extractSvgElements(source: string): readonly string[] {
	const elementPattern = new RegExp(`["'](${svgElements.join('|')})["']\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)`, 'g');
	const elements: string[] = [];

	for (const elementMatch of source.matchAll(elementPattern)) {
		const elementName = elementMatch[1];
		const properties = elementMatch[2];
		if (!elementName || !properties) {
			continue;
		}

		const attributes: string[] = [];
		const attributePattern = new RegExp(`(?:["']?(${svgAttributes.join('|')})["']?)\\s*:\\s*(?:(["'])(.*?)\\2|(-?\\d+(?:\\.\\d+)?))`, 'g');
		for (const attributeMatch of properties.matchAll(attributePattern)) {
			const sourceName = attributeMatch[1];
			const value = attributeMatch[3] ?? attributeMatch[4];
			if (sourceName && value !== undefined) {
				attributes.push(`${attributeNames[sourceName] ?? sourceName}="${escapeXml(value)}"`);
			}
		}

		if (attributes.length > 0) {
			elements.push(`<${elementName} ${attributes.join(' ')} />`);
		}
	}

	return elements;
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}