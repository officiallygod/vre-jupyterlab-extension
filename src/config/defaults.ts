import type { IVreLanguageOptions } from '../language/vre-language-options';

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
		'task',
		'collinear',
		'normal',
		'structure',
		'many_to_one',
		'composition',
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
	// Post-colon property names used in the DSL
	specialProperties: ['array', 'columns'],
	// Unit keywords
	units: ['K', 'eV'],
};
