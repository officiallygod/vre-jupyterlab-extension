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
- Watch TypeScript: `npm run -w @virtmat/vre-jupyterlab-extension watch`
- Link for local JupyterLab: `npm run -w @virtmat/vre-jupyterlab-extension lab:develop`
- Run tests: `npm run -w @virtmat/vre-jupyterlab-extension test`
