/** Unique JupyterLab plugin identifier. */
export const PLUGIN_ID = 'vre-jupyterlab-extension:plugin';

/** Language-related constants for VRE CodeMirror integration. */
export const LANGUAGE = {
  mime: 'text/x-vre',
  defaultCodeMime: 'text/plain',
  kernelName: 'vre-language',
  extensionName: 'vre-jupyterlab-extension-language-support'
} as const;

/** BEM-style class and metadata constants for execution guard visuals/state. */
export const EXECUTION = {
  metadataKey: 'vre.executed',
  executedCellClass: 'vre-jupyterlab-extension__cell--executed',
  executedInputClass: 'vre-jupyterlab-extension__input-editor--executed',
  executedEditorClass: 'vre-jupyterlab-extension__cm-editor--executed'
} as const;
