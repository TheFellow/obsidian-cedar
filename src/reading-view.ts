// Copyright Cedar Contributors
// SPDX-License-Identifier: Apache-2.0

import type { Language, Tokenizer } from "./tokenizer";

/** The subset of Prism used here (Obsidian bundles Prism 1.x; see `loadPrism`). */
export interface PrismLike {
	languages: Record<string, unknown>;
	hooks: { add(name: string, fn: (env: PrismEnv) => void): void; all: Record<string, ((env: PrismEnv) => void)[]> };
	Token: new (type: string, content: string, alias?: string | string[]) => unknown;
}

interface PrismEnv {
	language: string;
	code: string;
	tokens: unknown[];
}

/**
 * Reading view highlighting. Obsidian highlights rendered code blocks with Prism; Prism grammars are
 * regex lists, so instead of re-writing the Cedar grammars for Prism we register empty Prism languages
 * and replace their token streams with the TextMate tokenizer's output in an `after-tokenize` hook.
 * Everything that renders through Prism (Reading view, embeds, hover previews, PDF export) then
 * highlights Cedar, coloured by the theme's `.token.*` rules.
 *
 * Returns a function that undoes the registration.
 */
export function registerPrism(prism: PrismLike, tokenizer: Tokenizer, languages: readonly Language[]): () => void {
	const hook = (env: PrismEnv) => {
		const lang = languages.find((l) => l === env.language);
		if (!lang) return;
		const out: unknown[] = [];
		let pos = 0;
		for (const t of tokenizer.block(lang, env.code)) {
			if (t.start > pos) out.push(env.code.slice(pos, t.start));
			const text = env.code.slice(t.start, t.end);
			out.push(t.cls ? new prism.Token(t.cls.prism, text, `cedar-${t.cls.name}`) : text);
			pos = t.end;
		}
		if (pos < env.code.length) out.push(env.code.slice(pos));
		env.tokens = out;
	};
	for (const lang of languages) prism.languages[lang] = {};
	prism.hooks.add("after-tokenize", hook);
	return () => {
		const hooks = prism.hooks.all["after-tokenize"];
		const i = hooks?.indexOf(hook) ?? -1;
		if (i >= 0) hooks.splice(i, 1);
		for (const lang of languages) delete prism.languages[lang];
	};
}
