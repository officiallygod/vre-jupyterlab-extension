import {
	HighlightStyle,
	LanguageSupport,
	StreamLanguage,
	StringStream,
	syntaxHighlighting,
} from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { DEFAULT_LANGUAGE_OPTIONS } from '../config/defaults';

export interface IVreLanguageOptions {
	keywords: string[];
	builtins: string[];
	types: string[];
	constants: string[];
	wordOperators: string[];
	textMTypes: string[];
	units: string[];
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
 * Maintains consistency with Pygments console highlighting.
 * 
 * Token mapping strategy:
 * - 'magic': Magic commands (special keyword variant)
 * - 'builtin': Built-in functions → styled as function
 * - 'constant': Constants (null, true, false, default) → styled as atom
 * - 'wordOperator': Word operators (not, and, or, in) → styled as operator
 * - 'type': Type keywords → styled as typeName
 * - 'keyword', 'operator', etc.: Standard CodeMirror tokens
 */
function vreStreamParser(options: IVreLanguageOptions) {
	const keywords = toLookup(options.keywords);
	const builtins = toLookup(options.builtins);
	const types = toLookup(options.types);
	const constants = toLookup(options.constants);
	const wordOperators = toLookup(options.wordOperators);
	const textMTypes = toLookup(options.textMTypes);
	const units = toLookup(options.units);

	return {
		startState() {
			return {};
		},
		token(stream: StringStream) {
			if (stream.eatSpace()) {
				return null;
			}

			// Comments
			if (stream.match(/#.*/)) {
				return 'comment';
			}

			// String literals
			if (stream.match(STRING)) {
				return 'string';
			}

			// Magic commands (%, should be visually distinct from keywords)
			if (stream.match(MAGIC)) {
				return 'magic';
			}

			// Operators (symbolic)
			if (stream.match(OPERATOR)) {
				return 'operator';
			}

			// Punctuation
			if (stream.match(PUNCTUATION)) {
				return 'punctuation';
			}

			// Numbers with optional units (Pygments style)
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

			// Identifiers and keyword-like tokens
			if (stream.match(IDENTIFIER)) {
				const word = stream.current();

				// Check in priority order (matching Pygments logic)
				if (constants.has(word)) {
					return 'constant';
				}
				if (builtins.has(word)) {
					return 'builtin';
				}
				if (wordOperators.has(word)) {
					return 'wordOperator';
				}
				if (types.has(word)) {
					return 'type';
				}
				if (textMTypes.has(word)) {
					return 'type';
				}
				if (keywords.has(word)) {
					return 'keyword';
				}

				// Default type inference (capitalized = type name)
				if (/^[A-Z]/.test(word)) {
					return 'typeName';
				}

				return 'variableName';
			}

			stream.next();
			return null;
		},
	};
}

/**
 * Highlight style for VRE DSL - synchronized with Pygments console colors.
 * Reference: vre-language-pygments/texts_style.py (VMLangStyle)
 */
const vreHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: '#7c4dff', fontWeight: 'bold' },
	{ tag: t.operator, color: '#ad1457' },
	{ tag: t.punctuation, color: '#5f6368' },
	{ tag: t.string, color: '#BB6622' },
	{ tag: t.function(t.variableName), color: '#2080d0' },
	{ tag: t.typeName, color: '#6a1b9a', fontWeight: 'bold' },
	{ tag: t.atom, color: '#00838f' },
	{ tag: t.number, color: '#007700' },
	{ tag: t.comment, color: '#607d8b', fontStyle: 'italic' },
]);

/**
 * Theme extension for custom VRE token types.
 * Styles StreamLanguage tokens: magic, builtin, constant, wordOperator, type
 */
const vreCustomTokenTheme = EditorView.theme({
	// Magic commands (%, distinctly different from keywords)
	'.cm-magic': { color: '#0066ff', fontWeight: 'bold' },

	// Built-in functions (print, view, map, etc.)
	'.cm-builtin': { color: '#2080d0' },

	// Constants (true, false, null, default)
	'.cm-constant': { color: '#00838f' },

	// Word operators (not, and, or, in)
	'.cm-wordOperator': { color: '#ad1457' },

	// Type keywords (String, Quantity, Bool, etc.)
	'.cm-type': { color: '#6a1b9a', fontWeight: 'bold' },
});

/**
 * Create a CodeMirror LanguageSupport extension for VRE DSL.
 * Configured with comprehensive keyword/type/builtin lists for Pygments parity.
 * Includes custom theme for VRE-specific token types.
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
		units: userOptions?.units ?? DEFAULT_LANGUAGE_OPTIONS.units,
	};

	const language = StreamLanguage.define(vreStreamParser(options));
	return new LanguageSupport(language, [
		syntaxHighlighting(vreHighlightStyle),
		vreCustomTokenTheme,
	]);
}
