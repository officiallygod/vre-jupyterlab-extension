<div align="center">
  <img src="https://raw.githubusercontent.com/virtmat-tools/vre-jupyterlab-extension/refs/heads/main/style/vre-logo.png" alt="VRE logo" width="128" />

  # VRE JupyterLab Extension

  [![CI](https://github.com/virtmat-tools/vre-jupyterlab-extension/actions/workflows/extension-pr-ci.yml/badge.svg)](https://github.com/virtmat-tools/vre-jupyterlab-extension/actions/workflows/extension-pr-ci.yml)
  [![PyPI Version](https://img.shields.io/pypi/v/vre-jupyterlab-extension.svg?color=blue)](https://pypi.org/project/vre-jupyterlab-extension)
  [![Downloads](https://static.pepy.tech/badge/vre-jupyterlab-extension)](https://pepy.tech/projects/vre-jupyterlab-extension)
  [![JupyterLab 4](https://img.shields.io/badge/JupyterLab-4.x-F37626?logo=jupyter)](https://jupyterlab.readthedocs.io/en/stable/)
  [![Docs](https://img.shields.io/badge/Docs-GitHub%20Pages-green)](https://virtmat-tools.github.io/vre-jupyterlab-extension/)
  [![License](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](LICENSE)
</div>

<br />

> A prebuilt **JupyterLab 4** extension that provides advanced **CodeMirror 6 highlighting** for the VRE DSL and a smart **execution guard** to protect your VRE kernels.

---

## 🚀 Quick Install

No Node tooling required! The provided wheel embeds the prebuilt labextension assets so you can jump right into your environment.
=======
The VRE JupyterLab Extension is a prebuilt integration designed to support the Virtual Research Environment (VRE) directly within JupyterLab 4. It provides domain-specific syntax highlighting and an intelligent execution guard to ensure experimental provenance is maintained.

---

## Installation

Because the frontend assets are prebuilt and bundled directly into the Python wheel, you do not need Node.js or any frontend build tools to use this extension. 

You can install it directly from PyPI:

```bash
pip install vre-jupyterlab-extension
jupyter lab
```

## 🛠️ Developer / Build from Source

To hack on the extension, install the local dependencies, compile the frontend, and pack the wheel:

```bash
# 1. Setup the project
cd packages/vre-jupyterlab-extension
npm ci

# 2. Build the frontend bundle
npm run build:prod

# 3. Build the Python distribution packages (.whl, .tar.gz)
python3 -m pip install --upgrade build
python3 -m build --wheel --sdist

# 4. Install your local wheel
pip install dist/vre_jupyterlab_extension-*.whl
```

## 📦 Releases

We provide a streamlined release script to handle versions, clean artifacts, and generate the final distribution files:
=======
## Core Features

- **Syntax Highlighting:** The extension uses CodeMirror 6 to provide accurate, semantic highlighting for the VRE DSL, including custom keywords and measurement units.
- **Execution Guard:** To preserve the integrity of your research, the extension includes a strict execution guard. It prevents VRE notebook cells from being edited after they have run and stops concurrent cell executions.
- **MIME Type Synchronization:** The extension automatically detects VRE language kernels and ensures that cell inputs and outputs are coerced to the correct `text/x-vre` MIME type for seamless integration with the language server.

## Documentation

For a comprehensive technical breakdown of how the extension manages CodeMirror Lexers, the execution guard, and the build pipeline, please refer to our official documentation:

[**View the Full Documentation**](https://virtmat-tools.github.io/vre-jupyterlab-extension/)

If you would like to run the documentation server locally, you can do so by running `mkdocs serve` from the repository root after installing the requirements.

## Local Development

If you are looking to contribute or build the project from source, you will need Node.js and a Python virtual environment.

```bash
# 1. Install Node.js dependencies
cd packages/vre-jupyterlab-extension
npm ci

# 2. Build the production frontend bundle
npm run build:prod

# 3. Build the Python distribution packages
python3 -m pip install --upgrade build
python3 -m build --wheel --sdist

# 4. Install your local build
pip install dist/vre_jupyterlab_extension-*.whl
```

For testing during active development, we recommend using the symlink approach:

```bash
pip install -e .
jupyter labextension develop . --overwrite
```

## Release Process

We use an automated Python script to manage versioning and clean up build artifacts. When you are ready to publish a new release, simply run:

```bash
cd packages/vre-jupyterlab-extension
npm run release
```
*Tip: Always use this tool rather than building manually for releases to ensure `package.json`, `setup.cfg`, and `__init__.py` versions stay perfectly synchronized.*

## 📚 Documentation & Resources

- 📖 **[Full Documentation](https://virtmat-tools.github.io/vre-jupyterlab-extension/)**
- 🐍 **[PyPI Project Page](https://pypi.org/project/vre-jupyterlab-extension/)**

*Local documentation development:* run `mkdocs serve` from this directory after installing `requirements_docs.txt`.

## ⚙️ Requirements

- `jupyterlab>=4.2,<5`

## 📝 License

Distributed under the **BSD-3-Clause** License. See `LICENSE` for more information.
=======
This will guide you through updating the semantic version across all configuration files and will prepare a pristine build for PyPI.

## Requirements

- JupyterLab 4.2 or higher (`jupyterlab>=4.2,<5`)
- Python 3.10 or higher

## License

This project is licensed under the BSD-3-Clause License. See the `LICENSE` file for more details.
