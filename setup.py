from __future__ import annotations

import shutil
from pathlib import Path

from setuptools import setup
from setuptools.command.build_py import build_py as _build_py

ROOT = Path(__file__).parent.resolve()


class build_py(_build_py):
    """Copy the prebuilt labextension into the importable package before wheel build."""

    def run(self) -> None:
        super().run()
        self._copy_labextension_assets()

    def _copy_labextension_assets(self) -> None:
        package_root = Path(self.build_lib) / "vre_jupyterlab_extension"
        package_root.mkdir(parents=True, exist_ok=True)

        for source_name in ["labextension", "install.json"]:
            source = ROOT / source_name
            destination = package_root / source_name
            if source.is_dir():
                shutil.copytree(source, destination, dirs_exist_ok=True)
            elif source.exists():
                shutil.copy2(source, destination)


setup(cmdclass={"build_py": build_py})
