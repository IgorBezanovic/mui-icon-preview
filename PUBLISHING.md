# Manual Marketplace publishing

MUI Icon Preview is packaged locally and uploaded manually through the [Visual Studio Marketplace publisher portal](https://marketplace.visualstudio.com/manage). There are no GitHub publishing workflows. This upload flow requires signing in to an account with access to the publisher; it does not require Entra application setup or GitHub Actions secrets.

## Build the VSIX

```sh
npm ci
npm run vsce:package
```

The packaging command runs TypeScript checks, lint, and the production build through `vscode:prepublish`. It then creates `mui-icon-preview-<version>.vsix` in the repository root. The current version is `0.1.0`, so the file is `mui-icon-preview-0.1.0.vsix`.

The VSIX contains the extension bundle, Marketplace manifest, PNG icon, README, changelog, license, and security/third-party notices. Development files, workflow files, editable artwork, and other VSIX files are excluded. Relative documentation links point to the repository's `master` branch.

Optionally install the package locally using **Extensions → … → Install from VSIX…**, or:

```sh
code --install-extension mui-icon-preview-0.1.0.vsix
```

## Upload the first release

1. Sign in to the [publisher portal](https://marketplace.visualstudio.com/manage) with the account that owns or can publish under **IgorBezanovic**.
2. Select that publisher. If it has not been created, create it using the identifier `IgorBezanovic`, matching `package.json`.
3. Choose **New extension → Visual Studio Code**, select `mui-icon-preview-0.1.0.vsix`, and confirm the upload.
4. Wait for Marketplace validation and check the result in the portal. The listing will use the identity `IgorBezanovic.mui-icon-preview`.

The package is ready for upload locally; only a successful upload and Marketplace validation make the release available. See [Microsoft's publishing documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publish-an-extension).

## Publish an update

For each new release, increase the version before packaging:

```sh
npm version patch --no-git-tag-version
```

This updates `package.json` and `package-lock.json` together, for example `0.1.0` to `0.1.1`. Update `CHANGELOG.md`, run `npm run vsce:package`, and commit the two package files and release notes. Use `minor` or `major` instead of `patch` when appropriate.

In the publisher portal, select the existing extension and upload the new VSIX using its update action. Keep `publisher` and `name` unchanged. A published version cannot be overwritten: if `0.1.0` is already published, upload a package with a higher version.

VS Code distributes compatible updates to users who have automatic extension updates enabled. No custom updater is needed. See [extension auto-update](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#extension-auto-update).
