// Copyright Cedar Contributors
// SPDX-License-Identifier: Apache-2.0

import { loadPrism, MarkdownView, Plugin } from "obsidian";
import { streamMode } from "./editor-mode";
import { registerPrism, type PrismLike } from "./reading-view";
import { LANGUAGES, Tokenizer, type Language } from "./tokenizer";

interface CodeMirror5Global {
	defineMode(name: string, factory: () => unknown): void;
	modes: Record<string, unknown>;
}

declare global {
	interface Window {
		CodeMirror?: CodeMirror5Global;
	}
}

const languages = Object.keys(LANGUAGES) as Language[];

export default class CedarPlugin extends Plugin {
	override async onload() {
		const tokenizer = new Tokenizer();

		// Live Preview and Source mode.
		const cm = window.CodeMirror;
		if (cm) {
			for (const lang of languages) {
				const mode = streamMode(tokenizer, lang);
				cm.defineMode(lang, () => mode);
			}
			this.register(() => {
				for (const lang of languages) delete cm.modes[lang];
			});
		}

		// Reading view (and anything else Obsidian renders with Prism).
		const prism = (await loadPrism()) as PrismLike;
		this.register(registerPrism(prism, tokenizer, languages));

		// Re-render notes already open in Reading view when the plugin is enabled or disabled mid-session.
		// (Open editors pick up the modes for code blocks they parse from now on.)
		this.app.workspace.onLayoutReady(() => this.rerenderReadingViews());
		this.register(() => this.rerenderReadingViews());
	}

	private rerenderReadingViews() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
		});
	}
}
