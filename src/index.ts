import { LanguageSupport } from '@codemirror/language';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IEditorExtensionRegistry, IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { activateExecutionGuard } from './execution/execution-guard';
import { createVreLanguageExtension } from './language/vre-language';
import { attachNotebookMimeSync, refreshNotebookMime } from './notebook/mime-sync';
import { LANGUAGE, PLUGIN_ID } from './config/constants';
import { DEFAULT_LANGUAGE_OPTIONS } from './config/defaults';
import '../style/index.css';

/**
 * Build VRE language support from defaults.
 */
function buildLanguageExtension(): LanguageSupport {
	return createVreLanguageExtension({
		keywords: DEFAULT_LANGUAGE_OPTIONS.keywords,
		units: DEFAULT_LANGUAGE_OPTIONS.units,
	});
}

/**
 * Main VRE JupyterLab Extension plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
	id: PLUGIN_ID,
	autoStart: true,
	requires: [IEditorLanguageRegistry, IEditorExtensionRegistry, INotebookTracker],
	optional: [ISettingRegistry],
	activate: async (
		_app: JupyterFrontEnd,
		languageRegistry: IEditorLanguageRegistry,
		editorExtensionRegistry: IEditorExtensionRegistry,
		notebookTracker: INotebookTracker,
		settingRegistry: ISettingRegistry | null,
	) => {
		const languageSupport = buildLanguageExtension();
		let enabled = true;

		const refreshAllPanels = () => {
			notebookTracker.forEach((panel) => {
				refreshNotebookMime(panel);
			});
		};

		if (settingRegistry) {
			try {
				const settings = await settingRegistry.load(PLUGIN_ID);
				const syncEnabledSetting = () => {
					enabled = settings.composite['enabled'] !== false;
					refreshAllPanels();
				};
				syncEnabledSetting();
				settings.changed.connect(() => {
					syncEnabledSetting();
				});
			} catch {
				// Use defaults when settings are unavailable.
			}
		}

		languageRegistry.addLanguage({
			name: 'VRE DSL',
			mime: LANGUAGE.mime,
			extensions: ['vm'],
			support: languageSupport,
		});

		editorExtensionRegistry.addExtension({
			name: LANGUAGE.extensionName,
			factory: () => ({
				instance: () => languageSupport.extension,
				reconfigure: () => null,
			}),
		});

		const wireNotebookPanel = (panel: NotebookPanel) => {
			attachNotebookMimeSync(panel, () => enabled);
			activateExecutionGuard(panel, () => enabled);
		};

		notebookTracker.widgetAdded.connect((_sender, panel) => {
			wireNotebookPanel(panel);
		});
		notebookTracker.forEach(panel => {
			wireNotebookPanel(panel);
		});
	},
};

export default plugin;
