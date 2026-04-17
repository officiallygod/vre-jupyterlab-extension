import {
	HighlightStyle,
	LanguageSupport,
	StreamLanguage,
	StringStream,
	syntaxHighlighting,
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { DEFAULT_LANGUAGE_OPTIONS } from '../config/defaults';

export interface IVreLanguageOptions {
	keywords: string[];
	units: string[];
}

const NUMBER_WITH_OPTIONAL_UNIT = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;
const MAGIC = /^%[A-Za-z_][A-Za-z0-9_]*/;
const OPERATOR = /^(?:\:=|==|!=|<=|>=|[-+*/=<>])/;
const PUNCTUATION = /^[()[\]{},.:;]/;
const STRING = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/;

const BUILTIN_FUNCTIONS = new Set([
	'map',
	'filter',
	'reduce',
	'sum',
	'any',
	'all',
	'range',
	'info',
	'constr',
	'min',
	'max',
]);

function toLookup(values: string[]): Set<string> {
	return new Set(values);
}

/**
 * Stream parser for lightweight VRE syntax tokenization in CodeMirror 6.
 */
function vreStreamParser(options: IVreLanguageOptions) {
	const keywords = toLookup(options.keywords);
	const units = toLookup(options.units);

	return {
		startState() {
			return {};
		},
		token(stream: StringStream) {
			if (stream.eatSpace()) {
				return null;
			}

			if (stream.match(/#.*/)) {
				return 'comment';
			}

			if (stream.match(STRING)) {
				return 'string';
			}

			if (stream.match(MAGIC)) {
				return 'keyword';
			}

			if (stream.match(OPERATOR)) {
				return 'operator';
			}

			if (stream.match(PUNCTUATION)) {
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
				if (BUILTIN_FUNCTIONS.has(word)) {
					return 'function';
				}
				if (word === 'true' || word === 'false') {
					return 'atom';
				}
				if (keywords.has(word)) {
					return 'keyword';
				}
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

const vreHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: '#7c4dff', fontWeight: 'bold' },
	{ tag: t.operator, color: '#ad1457' },
	{ tag: t.punctuation, color: '#5f6368' },
	{ tag: t.string, color: '#2e7d32' },
	{ tag: t.function(t.variableName), color: '#1565c0' },
	{ tag: t.typeName, color: '#6a1b9a', fontWeight: 'bold' },
	{ tag: t.atom, color: '#00838f' },
	{ tag: t.number, color: '#00897b' },
	{ tag: t.comment, color: '#607d8b', fontStyle: 'italic' },
]);

/**
 * Create a CodeMirror LanguageSupport extension for VRE DSL.
 */
export function createVreLanguageExtension(
	userOptions?: Partial<IVreLanguageOptions>,
): LanguageSupport {
	const options: IVreLanguageOptions = {
		keywords: userOptions?.keywords ?? DEFAULT_LANGUAGE_OPTIONS.keywords,
		units: userOptions?.units ?? DEFAULT_LANGUAGE_OPTIONS.units,
	};

	const language = StreamLanguage.define(vreStreamParser(options));
	return new LanguageSupport(language, [syntaxHighlighting(vreHighlightStyle)]);
}
