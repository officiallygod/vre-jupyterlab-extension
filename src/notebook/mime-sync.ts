import { NotebookPanel } from '@jupyterlab/notebook';
import { LANGUAGE } from '../config/constants';

/**
 * Return true when the notebook kernel looks like a VRE kernel.
 */
function isVreKernel(panel: NotebookPanel): boolean {
  const kernelName = panel.sessionContext.session?.kernel?.name?.toLowerCase() ?? '';
  const displayName = panel.sessionContext.kernelDisplayName?.toLowerCase() ?? '';
  return (
    kernelName === LANGUAGE.kernelName ||
    kernelName.includes('vre') ||
    displayName.includes('vre')
  );
}

/**
 * Wire VRE MIME sync into a notebook panel.
 *
 * When enabled and the kernel matches VRE, code cells are switched to the VRE MIME.
 */
export function attachNotebookMimeSync(panel: NotebookPanel, shouldUseVreMime: () => boolean): void {
  const notebook = panel.content;

  const sync = () => {
    if (!notebook?.model) {
      return;
    }
    const useVreMime = shouldUseVreMime() && isVreKernel(panel);
    for (let i = 0; i < notebook.model.cells.length; i += 1) {
      const cell = notebook.model.cells.get(i);
      if (cell.type !== 'code') {
        continue;
      }
      if (useVreMime) {
        cell.mimeType = LANGUAGE.mime;
      } else if (cell.mimeType === LANGUAGE.mime) {
        cell.mimeType = LANGUAGE.defaultCodeMime;
      }
    }
  };

  (panel as any).__vreRefreshMime = sync;

  panel.context.ready
    .then(() => {
      sync();
      notebook.modelContentChanged.connect(sync);
      panel.sessionContext.kernelChanged.connect(sync);
    })
    .catch(() => {
      // no-op
    });
}

/**
 * Force-refresh the VRE MIME state for a previously wired notebook panel.
 */
export function refreshNotebookMime(panel: NotebookPanel): void {
  const fn = (panel as any).__vreRefreshMime;
  if (typeof fn === 'function') {
    fn();
  }
}
