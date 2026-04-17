"""Linux-only wrapper for invoking Jupyter from the workspace virtual environment.

This script enforces a single execution path for all extension build/link commands:
`./vre/bin/python -m jupyter ...`
"""

from __future__ import annotations

import subprocess
import sys
from os import environ
from pathlib import Path
from typing import Sequence


def workspace_root(script_path: Path) -> Path:
    """Return the repository root from this script location."""
    return script_path.resolve().parents[3]


def venv_python_path(root: Path) -> Path:
    """Return the Linux virtual environment Python path for this workspace."""
    return root / "vre" / "bin" / "python"


def build_command(args: Sequence[str], script_path: Path | None = None) -> list[str]:
    """Build the concrete command used to invoke Jupyter."""
    path = script_path or Path(__file__)
    root = workspace_root(path)
    python_bin = venv_python_path(root)
    if not python_bin.is_file():
        raise FileNotFoundError(
            f"Expected virtualenv python at {python_bin}. "
            "Create or activate the workspace virtual environment first."
        )
    return [str(python_bin), "-m", "jupyter", *args]


def main(argv: Sequence[str] | None = None) -> int:
    """Run Jupyter with workspace virtualenv Python and return process exit code."""
    if not sys.platform.startswith("linux"):
        raise OSError("This wrapper supports Linux only.")

    cmd = build_command(list(argv or sys.argv[1:]))
    venv_bin = str(Path(cmd[0]).parent)
    env = dict(environ)
    path_sep = ':'
    current_path = env.get("PATH", "")
    env["PATH"] = f"{venv_bin}{path_sep}{current_path}" if current_path else venv_bin
    result = subprocess.run(cmd, check=False, env=env)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())