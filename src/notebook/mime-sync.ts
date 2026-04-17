import { NotebookPanel } from '@jupyterlab/notebook';
import { LANGUAGE } from '../config/constants';

/**
 * Returns true when the current kernel/session appears to be VRE-related.
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
 * Attach MIME synchronization for notebook code cells.
 *
 * - Applies `text/x-vre` for code cells when plugin is enabled and VRE kernel is active
 * - Restores default code MIME when plugin is disabled
 * - Installs a per-panel refresh handle for manual resync
 */
export function attachNotebookMimeSync(panel: NotebookPanel, isPluginEnabled: () => boolean): void {
  const notebook = panel.content;

  const refresh = () => {
    if (!notebook?.model) {
      return;
    }
    const useVreMime = isPluginEnabled() && isVreKernel(panel);
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

  (panel as any).__vreRefreshMime = refresh;

  panel.context.ready
    .then(() => {
      refresh();
      notebook.modelContentChanged.connect(refresh);
      panel.sessionContext.kernelChanged.connect(refresh);
    })
    .catch(() => {
      // no-op
    });
}

/**
 * Force-refresh code-cell MIME state for a previously wired notebook panel.
 */
export function refreshNotebookMime(panel: NotebookPanel): void {
  const fn = (panel as any).__vreRefreshMime;
  if (typeof fn === 'function') {
    fn();
  }
}
