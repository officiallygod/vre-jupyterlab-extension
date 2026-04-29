# VRE JupyterLab Extension
[![Extension PR CI](https://github.com/officiallygod/vre-jupyterlab-extension/actions/workflows/extension-pr-ci.yml/badge.svg?branch=main)](https://github.com/officiallygod/vre-jupyterlab-extension/actions/workflows/extension-pr-ci.yml)

`@virtmat/vre-jupyterlab-extension` is a frontend-only JupyterLab 4 extension providing:

- CodeMirror 6 syntax highlighting for VRE DSL notebooks and `.vm` files
- execution guard for declarative workflows (executed-cell visuals + re-execution blocking)

## Runtime Assumptions

- Linux-only development workflow
- Jupyter commands are executed through `./vre/bin/python -m jupyter`
- Intended kernel integration target: `vre-language` with `vre-middleware`

## Settings

This extension provides JupyterLab plugin settings via [schema/plugin.json](schema/plugin.json):

- `enabled` (default `true`): enables MIME synchronization and execution guard behavior.
- `cellReadonlyDesignEnabled` (default `true`): controls executed-cell readonly lock and visual treatment.

## Commands

Open the Command Palette and run:

- `VRE: Toggle Cell Readonly Design`
- `VRE: Toggle Extension`

All toggles apply immediately and persist through refresh/restart via JupyterLab settings.

## Development

- Install workspace dependencies: `npm install`
- Build package and bundled labextension assets: `npm run -w @virtmat/vre-jupyterlab-extension build`
- Run tests: `npm run -w @virtmat/vre-jupyterlab-extension test`

## Python Packaging And Installation

This extension is packaged as a prebuilt JupyterLab extension so it can be installed through Python dependencies.

### Build local wheel/sdist

From the package root (`packages/vre-jupyterlab-extension`):

- `npm ci`
- `npm run build`
- `python -m pip install --upgrade build`
- `python -m build --wheel --sdist`

### Install via pip

- `pip install vre-jupyterlab-extension==0.1.0`

### Add to requirements.txt

Once published, add one of these lines in `requirements.txt` for `vre-language` or `vre-middleware`.

- PyPI release: `vre-jupyterlab-extension==0.1.0`
- GitHub tag build: `vre-jupyterlab-extension @ git+https://github.com/<org>/<repo>.git@vre-jupyterlab-extension-v0.1.0#subdirectory=packages/vre-jupyterlab-extension`
- GitLab tag build: `vre-jupyterlab-extension @ git+https://gitlab.com/<group>/<repo>.git@vre-jupyterlab-extension-v0.1.0#subdirectory=packages/vre-jupyterlab-extension`

Install dependencies as usual and the extension package is pulled in automatically.

## Release Automation

### GitHub

- Workflow file: `.github/workflows/extension-publish.yml`
- Trigger: push a tag (`vre-jupyterlab-extension-vX.Y.Z` or `vX.Y.Z`) or run manually.
- Required secrets:
	- `PYPI_API_TOKEN` for publishing to PyPI.
	- `THE_GITHUB_PACKAGES_TOKEN` for publishing to GitHub Packages.

### GitLab

- CI file: `.gitlab-ci.yml`
- Trigger: tag pipeline.
- Publishes to GitLab Package Registry using `CI_JOB_TOKEN`.

## Versioning And Updates

- Keep Python package version (`setup.cfg`) and npm package version (`package.json`) aligned.
- For downstream repos (`vre-language`, `vre-middleware`), pin exact versions in `requirements.txt`.
- To automate dependency bumps in downstream repos, enable Dependabot or Renovate for `requirements.txt`.

Note: JupyterLab does not auto-upgrade Python packages by itself. Upgrades are applied when your environment runs `pip install -U ...` or recreates the environment from updated lock/requirements files.

## CI Commands

- PR pipeline entrypoint: `npm run -w @virtmat/vre-jupyterlab-extension ci`
- Unit tests (TAP output): `npm run -w @virtmat/vre-jupyterlab-extension ci:test:unit`
- Smoke integration tests (PR): `npm run -w @virtmat/vre-jupyterlab-extension ci:test:integration:smoke`
- Full integration suite (nightly): `npm run -w @virtmat/vre-jupyterlab-extension ci:test:integration:full`
- Build PR summary artifacts: `npm run -w @virtmat/vre-jupyterlab-extension ci:summary`

CI summary artifacts are written to `packages/vre-jupyterlab-extension/tests/`:

- `test-results.tap`
- `ci-summary.json`
- `ci-summary.md`
