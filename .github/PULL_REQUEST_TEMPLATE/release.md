## Release Pull Request

Use this template for release PRs.

## Release Checklist
- [ ] Bump version in `setup.cfg`
- [ ] Bump `__version__` in `vre_jupyterlab_extension/__init__.py`
- [ ] Bump version in `package.json`
- [ ] Run `npm ci && npm run ci`
- [ ] Build distributions with `python -m build`
- [ ] Tag release (`vX.Y.Z`) and push tag
- [ ] Confirm publish workflow succeeded for PyPI and GitHub Packages

## Notes
<!-- Add release notes/changelog highlights here -->
