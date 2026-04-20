import { LanguageSupport } from '@codemirror/language';
import { ICommandPalette } from '@jupyterlab/apputils';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IEditorExtensionRegistry, IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { activateExecutionGuard, refreshExecutionGuard } from './execution/execution-guard';
import { createVreLanguageExtension } from './language/vre-language';
import { attachNotebookMimeSync, refreshNotebookMime } from './notebook/mime-sync';
import { COMMANDS, LANGUAGE, PLUGIN_ID, SETTINGS } from './config/constants';
import { DEFAULT_LANGUAGE_OPTIONS } from './config/defaults';
import '../style/index.css';

/**
 * Create the default VRE language support.
 */
function makeLanguageSupport(): LanguageSupport {
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
	optional: [ISettingRegistry, ICommandPalette],
	activate: async (
		app: JupyterFrontEnd,
		languageRegistry: IEditorLanguageRegistry,
		editorExtensionRegistry: IEditorExtensionRegistry,
		notebookTracker: INotebookTracker,
		settingRegistry: ISettingRegistry | null,
		commandPalette: ICommandPalette | null,
	) => {
		const languageSupport = makeLanguageSupport();
		const state = {
			enabled: true,
			cellReadonlyDesignEnabled: true,
		};

		const readBool = (
			settings: ISettingRegistry.ISettings,
			key: string,
			defaultValue: boolean,
		): boolean => {
			const value = settings.composite[key];
			return typeof value === 'boolean' ? value : defaultValue;
		};

		const isOn = () => state.enabled;
		const showReadonlyDesign = () => state.enabled && state.cellReadonlyDesignEnabled;
		const useVreMime = () => state.enabled;

		const refreshPanels = () => {
			notebookTracker.forEach((panel) => {
				refreshNotebookMime(panel);
				refreshExecutionGuard(panel);
			});
		};

		let settings: ISettingRegistry.ISettings | null = null;
		const save = async (key: string, value: boolean): Promise<void> => {
			if (!settings) {
				return;
			}
			try {
				await settings.set(key, value);
			} catch {
				// Preserve in-memory behavior even if persistence fails.
			}
		};

		if (settingRegistry) {
			try {
				const loadedSettings = await settingRegistry.load(PLUGIN_ID);
				settings = loadedSettings;
				const sync = () => {
					state.enabled = readBool(loadedSettings, SETTINGS.enabled, true);
					state.cellReadonlyDesignEnabled = readBool(
						loadedSettings,
						SETTINGS.cellReadonlyDesignEnabled,
						true,
					);
					refreshPanels();
				};
				sync();
				loadedSettings.changed.connect(() => {
					sync();
				});
			} catch {
				// Use defaults when settings are unavailable.
			}
		}

		/** Toggle readonly styling for already executed cells. */
		app.commands.addCommand(COMMANDS.toggleReadonlyDesign, {
			label: 'VRE: Toggle Cell Readonly Design',
			isToggled: () => showReadonlyDesign(),
			execute: async () => {
				state.cellReadonlyDesignEnabled = !state.cellReadonlyDesignEnabled;
				refreshPanels();
				await save(SETTINGS.cellReadonlyDesignEnabled, state.cellReadonlyDesignEnabled);
			},
		});

		/** Toggle the whole extension on or off. */
		app.commands.addCommand(COMMANDS.toggleExtension, {
			label: 'VRE: Toggle Extension',
			isToggled: () => isOn(),
			execute: async () => {
				state.enabled = !state.enabled;
				refreshPanels();
				await save(SETTINGS.enabled, state.enabled);
			},
		});

		if (commandPalette) {
			commandPalette.addItem({ command: COMMANDS.toggleReadonlyDesign, category: 'VRE' });
			commandPalette.addItem({ command: COMMANDS.toggleExtension, category: 'VRE' });
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
			attachNotebookMimeSync(panel, () => useVreMime());
			activateExecutionGuard(panel, () => isOn(), () => showReadonlyDesign());
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
