export interface MuiIconImport {
	readonly localName: string;
	readonly iconName: string;
	readonly source: string;
}

const directImportPattern = /import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])(@mui\/icons-material\/([^'";]+))\2\s*;?/g;
const barrelImportPattern = /import\s*\{([^}]+)\}\s*from\s*(['"])@mui\/icons-material\2\s*;?/g;

export function resolveMuiIconImports(text: string): readonly MuiIconImport[] {
	const imports: MuiIconImport[] = [];

	for (const match of text.matchAll(directImportPattern)) {
		const [, localName, , source, iconName] = match;
		if (localName && source && iconName && !iconName.includes('/')) {
			imports.push({ localName, iconName, source });
		}
	}

	for (const match of text.matchAll(barrelImportPattern)) {
		const specifiers = match[1];
		if (!specifiers) {
			continue;
		}

		for (const specifier of specifiers.split(',')) {
			const parts = specifier.trim().match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
			if (!parts) {
				continue;
			}

			const iconName = parts[1];
			const localName = parts[2] ?? iconName;
			imports.push({ localName, iconName, source: `@mui/icons-material/${iconName}` });
		}
	}

	return imports;
}

export function resolveMuiIconImport(text: string, localName: string): MuiIconImport | undefined {
	return resolveMuiIconImports(text).find((iconImport) => iconImport.localName === localName);
}