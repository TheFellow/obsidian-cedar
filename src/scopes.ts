// Copyright Cedar Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Maps TextMate scopes from the upstream grammars to Obsidian's code colours.
 *
 * The rules mirror jetbrains-cedar's CedarColors.forScope (most specific scope first). Each class has a
 * CodeMirror token type (Live Preview / Source mode, coloured by `.cm-*` rules) and a Prism token type
 * (Reading view, coloured by `.token.*` rules); both resolve to the same `--code-*` theme variable so
 * the two views agree. `name` is also emitted as a `cedar-<name>` class for CSS snippets.
 */
export interface TokenClass {
	name: string;
	cm: string;
	prism: string;
}

const c = (name: string, cm: string, prism: string): TokenClass => ({ name, cm, prism });

const COMMENT = c("comment", "comment", "comment"); //                 --code-comment
const STRING = c("string", "string", "string"); //                     --code-string
const ESCAPE = c("string-escape", "tag", "constant"); //               --code-tag
const INVALID_ESCAPE = c("invalid-escape", "string", "string"); //     + .cedar-invalid-escape in styles.css
const KEYWORD = c("keyword", "keyword", "keyword"); //                 --code-keyword
const OPERATOR = c("operator", "operator", "operator"); //             --code-operator
const NUMBER = c("number", "number", "number"); //                     --code-value
const BOOLEAN = c("boolean", "number", "boolean"); //                  --code-value
const VARIABLE = c("variable", "keyword", "keyword"); //               principal, action, resource, context
const SLOT = c("slot", "variable", "parameter"); //                    ?principal, ?resource: --code-property
const ENTITY_TYPE = c("entity-type", "type", "class-name"); //         --code-function
const NAMESPACE = c("namespace", "type", "class-name"); //             --code-function
const METHOD = c("method", "property", "function"); //                 --code-function
const FUNCTION = c("function", "builtin", "function"); //              --code-function
const BUILTIN_TYPE = c("builtin-type", "keyword", "keyword"); //       Long, String, Set, ... (as in JetBrains)
const PROPERTY = c("property", "variable", "property"); //             --code-property
const ANNOTATION = c("annotation", "attribute", "atrule"); //          --code-function
const PUNCTUATION = c("punctuation", "punctuation", "punctuation"); // --code-punctuation
const BRACKET = c("bracket", "bracket", "punctuation"); //             --code-punctuation

function forScope(s: string): TokenClass | null {
	if (s.startsWith("comment")) return COMMENT;
	if (s.startsWith("constant.character.escape")) return ESCAPE;
	if (s.startsWith("invalid")) return INVALID_ESCAPE;
	if (s.startsWith("variable.other.property")) return PROPERTY;
	if (s.startsWith("string")) return STRING;
	if (s.startsWith("entity.name.function.decorator") || s.startsWith("meta.decorator")) return ANNOTATION;
	if (s.startsWith("keyword.control") || s.startsWith("keyword.operator.word")) return KEYWORD;
	if (s.startsWith("keyword.operator")) return OPERATOR;
	if (s.startsWith("constant.numeric")) return NUMBER;
	if (s.startsWith("constant.language")) return BOOLEAN;
	if (s.startsWith("variable.language")) return VARIABLE;
	if (s.startsWith("variable.parameter")) return SLOT;
	if (s.startsWith("entity.name.type")) return ENTITY_TYPE;
	if (s.startsWith("entity.name.namespace")) return NAMESPACE;
	if (s.startsWith("entity.name.function")) return METHOD;
	if (s.startsWith("support.function")) return FUNCTION;
	if (s.startsWith("support.type")) return BUILTIN_TYPE;
	if (s.startsWith("punctuation.section.brackets") || s.startsWith("punctuation.definition.typeparameters")) return BRACKET;
	if (s.startsWith("punctuation.separator.key-value")) return OPERATOR;
	if (s.startsWith("punctuation")) return PUNCTUATION;
	return null;
}

/** Classifies a TextMate scope list (outermost first), most specific scope first. */
export function classify(scopes: readonly string[]): TokenClass | null {
	for (let i = scopes.length - 1; i >= 0; i--) {
		const cls = forScope(scopes[i]);
		if (cls) return cls;
	}
	return null;
}
