"""Tests for the Linux virtualenv Jupyter wrapper."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.jupyter_wrapper import build_command, venv_python_path, workspace_root


class JupyterWrapperTests(unittest.TestCase):
    """Validate command construction and path resolution."""

    def test_workspace_root_resolution(self) -> None:
        script_path = Path("/repo/packages/vre-jupyterlab-extension/scripts/jupyter_wrapper.py")
        self.assertEqual(workspace_root(script_path), Path("/repo"))

    def test_venv_python_path_resolution(self) -> None:
        self.assertEqual(venv_python_path(Path("/repo")), Path("/repo/vre/bin/python"))

    def test_build_command_uses_workspace_venv_python(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            script_path = root / "packages" / "vre-jupyterlab-extension" / "scripts" / "jupyter_wrapper.py"
            script_path.parent.mkdir(parents=True, exist_ok=True)
            script_path.touch()

            python_bin = root / "vre" / "bin" / "python"
            python_bin.parent.mkdir(parents=True, exist_ok=True)
            python_bin.touch()

            cmd = build_command(["lab", "--version"], script_path=script_path)
            self.assertEqual(cmd[0], str(python_bin))
            self.assertEqual(cmd[1:3], ["-m", "jupyter"])
            self.assertEqual(cmd[3:], ["lab", "--version"])

    def test_build_command_fails_without_venv_python(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            script_path = root / "packages" / "vre-jupyterlab-extension" / "scripts" / "jupyter_wrapper.py"
            script_path.parent.mkdir(parents=True, exist_ok=True)
            script_path.touch()

            with self.assertRaises(FileNotFoundError):
                build_command(["lab"], script_path=script_path)


if __name__ == "__main__":
    unittest.main()