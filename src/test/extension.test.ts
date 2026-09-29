import * as assert from 'assert';
import { createIconPreviewFromSource } from '../utils/iconLoader';
import { resolveMuiIconImport, resolveMuiIconImports } from '../utils/importResolver';

suite('MUI import resolver', () => {
	test('resolves a direct icon import', () => {
		const result = resolveMuiIconImport(
			"import HomeIcon from '@mui/icons-material/Home';",
			'HomeIcon',
		);

		assert.deepStrictEqual(result, {
			localName: 'HomeIcon',
			iconName: 'Home',
			source: '@mui/icons-material/Home',
		});
	});

	test('resolves aliased and unaliased barrel imports', () => {
		const results = resolveMuiIconImports(
			"import { Home as HomeIcon, Delete } from '@mui/icons-material';",
		);

		assert.deepStrictEqual(results.map(({ localName, iconName }) => ({ localName, iconName })), [
			{ localName: 'HomeIcon', iconName: 'Home' },
			{ localName: 'Delete', iconName: 'Delete' },
		]);
	});
});

suite('MUI icon source conversion', () => {
	test('renders ESM path elements as a 64 pixel SVG data URI', () => {
		const preview = createIconPreviewFromSource(
			'Home',
			`export default createSvgIcon(_jsx("path", { d: "M10 20v-6h4v6", opacity: ".3" }), "Home");`,
		);

		assert.ok(preview);
		assert.match(preview.svg, /width="64" height="64"/);
		assert.match(preview.svg, /<path d="M10 20v-6h4v6" opacity="\.3" \/>/);
		assert.match(preview.dataUri, /^data:image\/svg\+xml;base64,/);
	});

	test('renders multiple CommonJS SVG primitives', () => {
		const preview = createIconPreviewFromSource(
			'Settings',
			`(0, jsxRuntime.jsxs)(Fragment, { children: [(0, jsxRuntime.jsx)("circle", { cx: "12", cy: "12", r: "3" }), (0, jsxRuntime.jsx)("path", { d: "M19.4 13" })] });`,
		);

		assert.ok(preview);
		assert.match(preview.svg, /<circle cx="12" cy="12" r="3" \/>/);
		assert.match(preview.svg, /<path d="M19\.4 13" \/>/);
	});
});
