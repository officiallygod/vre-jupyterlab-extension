import {
	HighlightStyle,
	LanguageSupport,
	StreamLanguage,
	StringStream,
	syntaxHighlighting,
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { DEFAULT_LANGUAGE_OPTIONS } from '../config/defaults';
import type { IVreLanguageOptions } from './vre-language-options';

interface IVreStreamState {
	taskMode: boolean;
	lastIdentifier: string | null;
	pendingPropertySource: string | null;
}

const NUMBER_WITH_OPTIONAL_UNIT = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;
const MAGIC = /^%[A-Za-z_][A-Za-z0-9_]*/;
const OPERATOR = /^(?:\:=|==|!=|<=|>=|[-+*/=<>])/;
const PUNCTUATION = /^[()[\]{},.:;]/;
const STRING = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/;

function toLookup(values: string[]): Set<string> {
	return new Set(values);
}

/**
 * Stream parser for VRE syntax tokenization in CodeMirror 6.
 * Maintains consistency with the Pygments console highlighting.
 */
function vreStreamParser(options: IVreLanguageOptions) {
	const keywords = toLookup(options.keywords);
	const builtins = toLookup(options.builtins);
	const types = toLookup(options.types);
	const constants = toLookup(options.constants);
	const wordOperators = toLookup(options.wordOperators);
	const textMTypes = toLookup(options.textMTypes);
	const specialProperties = toLookup(options.specialProperties);
	const units = toLookup(options.units);

	return {
		startState(): IVreStreamState {
			return {
				taskMode: false,
				lastIdentifier: null,
				pendingPropertySource: null,
			};
		},
		token(stream: StringStream, state: IVreStreamState) {
			if (stream.eatSpace()) {
				return null;
			}

			if (stream.match(/#.*/)) {
				state.taskMode = false;
				state.lastIdentifier = null;
				state.pendingPropertySource = null;
				return 'comment';
			}

			if (stream.match(STRING)) {
				return 'string';
			}

			if (stream.match(MAGIC)) {
				state.taskMode = false;
				state.lastIdentifier = null;
				state.pendingPropertySource = null;
				return 'magic';
			}

			if (stream.match(OPERATOR)) {
				return 'operator';
			}

			if (stream.match(PUNCTUATION)) {
				const punctuation = stream.current();
				if (punctuation === ':') {
					if (state.lastIdentifier) {
						state.pendingPropertySource = state.lastIdentifier;
						if (state.lastIdentifier === 'task') {
							state.taskMode = true;
						}
					}
				} else if (punctuation === ',' || punctuation === ')' || punctuation === ']' || punctuation === '}' || punctuation === ';') {
					state.taskMode = false;
					state.pendingPropertySource = null;
				}
				state.lastIdentifier = null;
				return 'punctuation';
			}

			if (stream.match(NUMBER_WITH_OPTIONAL_UNIT)) {
				stream.eatSpace();
				const beforeUnit = stream.current();
				if (stream.match(IDENTIFIER, true)) {
					const token = stream.current().replace(beforeUnit, '').trim();
					if (units.has(token)) {
						return 'number';
					}
				}
				return 'number';
			}

			if (stream.match(IDENTIFIER)) {
				const word = stream.current();

				if (state.taskMode) {
					state.lastIdentifier = word;
					return 'taskValue';
				}

				if (state.pendingPropertySource) {
					state.pendingPropertySource = null;
					if (specialProperties.has(word)) {
						state.lastIdentifier = word;
						return 'propertyName';
					}
				}

				if (constants.has(word)) {
					state.lastIdentifier = word;
					return 'constant';
				}
				if (builtins.has(word)) {
					state.lastIdentifier = word;
					return 'builtin';
				}
				if (wordOperators.has(word)) {
					state.lastIdentifier = word;
					return 'wordOperator';
				}
				if (types.has(word) || textMTypes.has(word)) {
					state.lastIdentifier = word;
					return 'type';
				}
				if (keywords.has(word)) {
					state.lastIdentifier = word;
					return 'keyword';
				}
				if (/^[A-Z]/.test(word)) {
					state.lastIdentifier = word;
					return 'typeName';
				}

				state.lastIdentifier = word;
				return 'variableName';
			}

			state.lastIdentifier = null;
			state.pendingPropertySource = null;
			stream.next();
			return null;
		},
		tokenTable: {
			magic: [t.special(t.keyword)],
			builtin: [t.function(t.variableName)],
			constant: [t.atom],
			wordOperator: [t.operator],
			type: [t.typeName],
			taskValue: [t.atom],
			propertyName: [t.propertyName],
		},
		languageData: {
			commentTokens: { line: '#' },
		},
	};
}

/**
 * Highlight style for VRE DSL - synchronized with Pygments console colors.
 * Reference: vre-language-pygments/texts_style.py (VMLangStyle)
 */
const vreHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: '#7c4dff', fontWeight: 'bold' },
	{ tag: t.special(t.keyword), color: '#0066ff', fontWeight: 'bold' },
	{ tag: t.atom, color: '#00838f' },
	{ tag: t.typeName, color: '#6a1b9a', fontWeight: 'bold' },
	{ tag: t.function(t.variableName), color: '#2080d0' },
	{ tag: t.operator, color: '#ad1457' },
	{ tag: t.propertyName, color: '#1565c0' },
	{ tag: t.punctuation, color: '#5f6368' },
	{ tag: t.string, color: '#BB6622' },
	{ tag: t.number, color: '#007700' },
	{ tag: t.comment, color: '#607d8b', fontStyle: 'italic' },
]);

/**
 * Create a CodeMirror LanguageSupport extension for VRE DSL.
 * Configured with comprehensive keyword/type/builtin lists for Pygments parity.
 */
export function createVreLanguageExtension(
	userOptions?: Partial<IVreLanguageOptions>,
): LanguageSupport {
	const options: IVreLanguageOptions = {
		keywords: userOptions?.keywords ?? DEFAULT_LANGUAGE_OPTIONS.keywords,
		builtins: userOptions?.builtins ?? DEFAULT_LANGUAGE_OPTIONS.builtins,
		types: userOptions?.types ?? DEFAULT_LANGUAGE_OPTIONS.types,
		constants: userOptions?.constants ?? DEFAULT_LANGUAGE_OPTIONS.constants,
		wordOperators: userOptions?.wordOperators ?? DEFAULT_LANGUAGE_OPTIONS.wordOperators,
		textMTypes: userOptions?.textMTypes ?? DEFAULT_LANGUAGE_OPTIONS.textMTypes,
		specialProperties: userOptions?.specialProperties ?? DEFAULT_LANGUAGE_OPTIONS.specialProperties,
		units: userOptions?.units ?? DEFAULT_LANGUAGE_OPTIONS.units,
	};

	const language = StreamLanguage.define(vreStreamParser(options));
	return new LanguageSupport(language, [syntaxHighlighting(vreHighlightStyle)]);
}