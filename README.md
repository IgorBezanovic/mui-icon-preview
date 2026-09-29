# MUI Icon Preview

Preview icons from `@mui/icons-material` without leaving VS Code. The extension reads icon sources from the current workspace, so hover previews and icon search work completely offline.

## Features

- Hover an imported MUI icon to see its module and a 64 by 64 SVG preview alongside VS Code's standard TypeScript information.
- Complete icon component names in TypeScript, TSX, JavaScript, and JSX files. The selected completion includes an SVG preview.
- Run **MUI Icons: Search** from the Command Palette to search installed icons and insert both the import and component usage.
- Cache installed icon SVGs in memory to avoid repeated filesystem reads.

## Requirements

The opened project must have `@mui/icons-material` installed. No network access is used by the extension.

## Development

1. Run `npm install`.
2. Run `npm run compile`.
3. Press `F5` in VS Code to launch the Extension Development Host.
4. Open a React project that contains `@mui/icons-material`.
5. Hover a symbol imported from a direct icon module, such as `import HomeIcon from '@mui/icons-material/Home';`.

Build a production bundle with `npm run package`.
