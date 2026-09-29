# Publishing MUI Icon Preview

The **Publish extension** GitHub Actions workflow runs on every push to `master`, including merged pull requests. It verifies Entra publisher access, installs locked dependencies, checks version consistency, runs the extension tests, automatically increases the patch version, builds a production VSIX, saves the version to `master`, and publishes that exact package as `IgorBezanovic.mui-icon-preview`.

Publishing runs are serialized and check out the latest `master` when they start, including version commits from earlier runs. Closely spaced merges can be included in one release. The version commit uses `GITHUB_TOKEN` and `[skip ci]`, so it does not trigger another publishing run.

## Repository write access

The workflow requests `contents: write` and pushes only the two package files in a `chore(release): vX.Y.Z [skip ci]` commit. Repository and organization policies must allow GitHub Actions to write to `master`. If branch protection or a ruleset blocks that push, the workflow fails before publishing; arrange an authorized release-bot write path under your repository policy before enabling this workflow. It never force-pushes or bypasses protection itself.

## One-time Entra ID setup

Publishing uses Microsoft Entra ID with GitHub OIDC only. No PAT, client secret, or Azure subscription ID is used by these workflows. You need access to an Entra workforce tenant where you can register an application and to the **IgorBezanovic** Marketplace publisher. Having only a personal Microsoft account does not establish this tenant access; see [Microsoft's tenant prerequisites](https://learn.microsoft.com/entra/identity-platform/quickstart-create-new-tenant).

If signing in shows **AADSTS50020**, **live.com**, and tenant **Microsoft Services**, follow [Microsoft's personal-account troubleshooting steps](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist#cause-1users-log-in-to-microsoft-entra-admin-center-by-using-personal-microsoft-accounts): sign up for an [Azure account](https://azure.microsoft.com/free/) to establish your directory, or use an existing tenant to which you have appropriate access. Azure signup can require phone/card verification. Once signed in, select your own directory in the portal. Creating additional tenants from the admin center has separate eligibility requirements; this workflow only needs one existing workforce tenant.

### 1. Register the publishing application

Open [Microsoft Entra admin center](https://entra.microsoft.com/), select the intended directory, then **Entra ID → App registrations → New registration**:

- Name: `mui-icon-preview-publisher`
- Supported account types: **Accounts in this organizational directory only** (single tenant)
- Redirect URI: leave empty

Select **Register**. From **Overview**, record **Application (client) ID** and **Directory (tenant) ID**. These are identifiers, not access tokens. Do not use the application's Object ID for either GitHub secret.

### 2. Trust this GitHub repository

In the app, open **Certificates & secrets → Federated credentials → Add credential**. Choose **GitHub Actions deploying Azure resources** and enter:

| Field | Value |
| --- | --- |
| Organization / owner | `IgorBezanovic` |
| Repository | `mui-icon-preview` |
| Entity type | `Branch` |
| Branch | `master` |
| Credential name | `github-master-publish` |

Check the generated values before saving:

- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:IgorBezanovic/mui-icon-preview:ref:refs/heads/master`
- Audience: `api://AzureADTokenExchange`

These values are case-sensitive. The workflows use a branch subject, not a GitHub environment subject. See [Microsoft's federation instructions](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust) and [Azure Login OIDC](https://github.com/Azure/login#login-with-openid-connect-oidc-recommended).

### 3. Set the two GitHub repository secrets

Open [repository Actions secrets](https://github.com/IgorBezanovic/mui-icon-preview/settings/secrets/actions) and use **New repository secret** for each:

| Secret name | Value from the application's Overview |
| --- | --- |
| `AZURE_CLIENT_ID` | Application (client) ID |
| `AZURE_TENANT_ID` | Directory (tenant) ID |

The workflow does not read `VSCE_PAT`. `GITHUB_TOKEN` is supplied automatically by GitHub.

### 4. Obtain the Marketplace identity ID

Once the workflow files are on `master`, open **Actions → Set up Marketplace identity → Run workflow**, selecting `master`. This manual setup workflow signs in as the application, calls Microsoft's profile endpoint, and displays **Identity ID** in the run's **Summary**. It does not build, bump versions, commit, or publish.

If a push-triggered publishing run happens before setup is complete, it will fail at configuration/authentication checks before changing the version. Finish the setup and start a new run.

### 5. Grant publisher access

Sign in to [Marketplace publisher management](https://marketplace.visualstudio.com/manage) with the publisher owner's account. Select publisher **IgorBezanovic**, open **Members → Add**, enter the **Identity ID from the setup workflow**, and assign **Contributor**. If the publisher does not exist yet, its owner must create it with the identifier matching `package.json`.

Use the profile ID returned by the setup workflow, not the application's client ID or either Entra Object ID. This follows the profile lookup and publisher authorization described in [Microsoft's publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace). Azure role assignments do not replace Marketplace publisher membership.

### 6. Publish

Open **Actions → Publish extension → Run workflow → master**. The workflow signs in and runs `vsce verify-pat --azure-credential` to check publisher access before changing the version. Despite the command's historical name, this invocation uses Entra ID, not a PAT.

After verification and tests pass, it increments the patch, packages, saves the version to `master`, and publishes. With the current `0.1.0` manifest, the first new release will be `0.1.1`. Future merges publish automatically. Confirm success in the **Publish using Microsoft Entra ID** step and then on the [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=IgorBezanovic.mui-icon-preview).

### Troubleshooting setup

- **Cannot open App registrations or create an app:** check that you are in an Entra workforce tenant and have application registration permissions. A tenant administrator may need to grant access.
- **No matching federated identity / AADSTS700213:** check the exact owner, repository, branch subject, issuer, audience, and that the run uses `master`. Allow time for a new credential to propagate.
- **Profile lookup fails with unauthorized / identity not found:** the application may need to be provisioned into Azure DevOps first. In an Azure DevOps organization connected to the same Entra tenant, an organization administrator can use **Organization settings → Users → Add users** to add the app's service principal. Follow [Microsoft's service-principal provisioning guide](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity?view=azure-devops), then rerun **Set up Marketplace identity**. Do not substitute an Entra Object ID for a missing profile ID.
- **Publisher access verification fails:** confirm that the profile ID is a Contributor on the publisher whose ID exactly matches `package.json`.
- **Version push is rejected:** check the repository write policy described above, or rerun from the latest `master` if another merge advanced the branch.

## Publish a new version

Merge your changes into `master`; no manual version command is needed. Include release notes in `CHANGELOG.md` with the changes. The required **Bump patch version** step runs:

```sh
npm version patch --no-git-tag-version
```

This updates both `package.json` and `package-lock.json`, for example from `0.1.0` to `0.1.1`. After packaging succeeds, the workflow commits and pushes those files before uploading the VSIX. The saved version represents a prepared release; check the publishing step to confirm it reached the Marketplace. Sync your local `master` after a release to pick up the bot's commit. The workflow always uses a patch increment for new changes.

Check **Actions → Publish extension** for the result. A successful initial publish creates the listing; later versions update the same listing. Keep the manifest's `publisher` and `name` unchanged so existing users receive updates.

To retry after fixing credentials or a transient failure, rerun the failed workflow or choose **Run workflow** on `master`. When the latest commit is the saved release commit, the version step reuses that version instead of increasing it again. An already published version is skipped successfully (`--skip-duplicate`). New changes on `master` produce a new patch version, including when an older workflow is rerun. Manual runs on other branches are skipped.

If another merge advances `master` between checkout and the version push, Git rejects the push and nothing is published by that run. The queued run (or a manual retry) starts from the latest `master` and tests the combined changes. The workflow does not rebase and publish code that it has not tested.

## Automatic updates for users

[VS Code checks for extension updates and installs them automatically](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#extension-auto-update) when automatic updates are enabled. Users can turn this off globally or for this extension; publishing cannot override their preference. An extension-host restart may be requested to activate an update, and distribution is not immediate.

Updates must remain compatible with the user's VS Code version according to `engines.vscode`. No custom updater is needed in the extension.
