# VRE JupyterLab Extension

`@virtmat/vre-jupyterlab-extension` is a frontend-only JupyterLab 4 extension providing:

- CodeMirror 6 syntax highlighting for VRE DSL notebooks and `.vm` files
- execution guard for declarative workflows (executed-cell visuals + re-execution blocking)

## Runtime Assumptions

- Linux-only development workflow
- Jupyter commands are executed through `./vre/bin/python -m jupyter`
- Intended kernel integration target: `vre-language` with `vre-middleware`

## Development

- Install workspace dependencies: `npm install`
- Build package and bundled labextension assets: `npm run -w @virtmat/vre-jupyterlab-extension build`
- Watch TypeScript: `npm run -w @virtmat/vre-jupyterlab-extension watch`
- Link for local JupyterLab: `npm run -w @virtmat/vre-jupyterlab-extension lab:develop`
- Run wrapper tests: `npm run -w @virtmat/vre-jupyterlab-extension test`
