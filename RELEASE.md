# Release Checklist

This project has an automated release flow and PR checklist support.

## 1) Prepare Version

Use the package-local script:

```bash
npm run release
```

This updates:
- `setup.cfg`
- `package.json`
- `vre_jupyterlab_extension/__init__.py`

It also cleans build artifacts and rebuilds distributions.

## 2) Open Release PR

Create a PR with one of:
- title containing `release`
- branch name like `release/x.y.z`
- `release` label

Automation:
- workflow: `.github/workflows/release-pr-checklist.yml`
- template: `.github/PULL_REQUEST_TEMPLATE/release.md`

The workflow auto-inserts the release checklist in the PR description if it is missing.

## 3) Validate

Run:

```bash
npm run ci
python -m build
```

## 4) Merge and Tag

After PR merge:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 5) Publish

The workflow `.github/workflows/extension-publish.yml` publishes artifacts to:
- PyPI
- GitHub Packages

Required secret:
- `PYPI_API_TOKEN`

## 6) Verify

- Check GitHub Actions run success.
- Confirm package appears on PyPI.
