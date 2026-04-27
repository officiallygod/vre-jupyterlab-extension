# VRE JupyterLab Extension

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
- Watch TypeScript: `npm run -w @virtmat/vre-jupyterlab-extension watch`
- Link for local JupyterLab: `npm run -w @virtmat/vre-jupyterlab-extension lab:develop`
- Run tests: `npm run -w @virtmat/vre-jupyterlab-extension test`

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
