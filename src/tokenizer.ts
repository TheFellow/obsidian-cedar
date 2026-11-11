// Copyright Cedar Contributors
// SPDX-License-Identifier: Apache-2.0

import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { INITIAL, Registry, type IGrammar, type IRawGrammar, type StateStack } from "@shikijs/vscode-textmate";
import cedarGrammar from "../syntaxes/cedar.tmLanguage.json";
import cedarSchemaGrammar from "../syntaxes/cedarschema.tmLanguage.json";
import { classify, type TokenClass } from "./scopes";

/** Fenced code block languages and their upstream (vscode-cedar) TextMate grammars. */
export const LANGUAGES = {
	cedar: { scopeName: "source.cedar", grammar: cedarGrammar },
	cedarschema: { scopeName: "source.cedarschema", grammar: cedarSchemaGrammar },
} as const;

export type Language = keyof typeof LANGUAGES;

export interface Token {
	start: number;
	end: number;
	scopes: string[];
	cls: TokenClass | null;
}

export interface LineResult {
	tokens: Token[];
	state: StateStack;
}

export { INITIAL, type StateStack };

/** Runs the upstream TextMate grammars, unmodified, with a pure-JS Oniguruma emulation (no WASM). */
export class Tokenizer {
	private readonly grammars = new Map<Language, IGrammar>();

	constructor() {
		const engine = createJavaScriptRegexEngine();
		const byScope = new Map<string, IRawGrammar>(
			Object.values(LANGUAGES).map((l) => [l.scopeName, l.grammar as unknown as IRawGrammar]),
		);
		const registry = new Registry({
			onigLib: { createOnigScanner: (s) => engine.createScanner(s), createOnigString: (s) => engine.createString(s) },
			loadGrammar: (scope) => byScope.get(scope) ?? null,
		});
		for (const [lang, { scopeName }] of Object.entries(LANGUAGES) as [Language, (typeof LANGUAGES)[Language]][]) {
			const grammar = registry.loadGrammar(scopeName);
			if (!grammar) throw new Error(`Cedar: failed to load grammar ${scopeName}`);
			this.grammars.set(lang, grammar);
		}
	}

	/** Tokenizes one line (without its line terminator), continuing from `state`. */
	line(lang: Language, text: string, state: StateStack = INITIAL): LineResult {
		const grammar = this.grammars.get(lang)!;
		const result = grammar.tokenizeLine(text, state);
		const tokens: Token[] = [];
		for (const t of result.tokens) {
			const end = Math.min(t.endIndex, text.length);
			if (end <= t.startIndex) continue;
			tokens.push({ start: t.startIndex, end, scopes: t.scopes, cls: classify(t.scopes) });
		}
		return { tokens, state: result.ruleStack };
	}

	/** Tokenizes a whole code block; offsets are relative to the start of `code`. */
	*block(lang: Language, code: string): Generator<Token> {
		let state: StateStack = INITIAL;
		let offset = 0;
		for (const text of code.split("\n")) {
			const line = text.endsWith("\r") ? text.slice(0, -1) : text;
			const r = this.line(lang, line, state);
			for (const t of r.tokens) yield { ...t, start: t.start + offset, end: t.end + offset };
			state = r.state;
			offset += text.length + 1;
		}
	}
}
