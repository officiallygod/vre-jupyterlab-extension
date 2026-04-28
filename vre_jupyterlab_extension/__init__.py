"""Python package marker for the VRE JupyterLab prebuilt extension."""

import sys
from pathlib import Path

__version__ = "0.1.0"


def _jupyter_labextension_paths():
	"""Tell JupyterLab where to find the prebuilt labextension assets."""
	here = Path(__file__).parent.resolve()
	src_prefix = here / "labextension"

	if not src_prefix.exists():
		src_prefix = Path(sys.prefix) / "share/jupyter/labextensions/@virtmat/vre-jupyterlab-extension"

	return [
		{
			"src": str(src_prefix),
			"dest": "@virtmat/vre-jupyterlab-extension",
		}
	]


__all__ = ["_jupyter_labextension_paths", "__version__"]
