import type { IVreLanguageOptions } from '../language/vre-language';

export const DEFAULT_LANGUAGE_OPTIONS: IVreLanguageOptions = {
	// Domain-specific keywords (control flow, operations)
	keywords: [
		'else',
		'use',
		'from',
		'to',
		'with',
		'select',
		'file',
		'url',
		'where',
		'column',
		'chunks',
		'step',
		'lineplot',
		'on',
		'for',
	],
	// Built-in functions available in the language
	builtins: [
		'print',
		'view',
		'vary',
		'if',
		'real',
		'imag',
		'all',
		'any',
		'sum',
		'range',
		'map',
		'filter',
		'reduce',
		'info',
		'tag',
		'min',
		'max',
		'constr',
	],
	// Type names
	types: [
		'String',
		'Quantity',
		'Bool',
		'Series',
		'Table',
		'BoolArray',
		'StrArray',
		'IntArray',
		'FloatArray',
		'ComplexArray',
	],
	// Literal constants
	constants: ['true', 'false', 'null', 'default'],
	// Word-based operators
	wordOperators: ['not', 'and', 'or', 'in'],
	// TextM-specific domain types
	textMTypes: [
		'Structure',
		'Calculator',
		'Algorithm',
		'Property',
		'FixedAtoms',
		'FixedLine',
		'FixedPlane',
		'Species',
		'Reaction',
	],
	// Unit keywords
	units: ['K', 'eV'],
};
