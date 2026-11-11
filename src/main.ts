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

/** A ```cedar / ~~~cedarschema fence, also inside blockquotes and lists. */
const CEDAR_FENCE = /^[ \t>*+\-\d.)]*(`{3,}|~{3,})[ \t]*cedar(schema)?\b/im;

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

		// Notes open before the plugin loaded already chose a mode for their code blocks: an unknown
		// language gets CodeMirror's plain-text mode, and that choice lives in the editor's saved parse
		// state. Obsidian re-highlights once after loading its own bundled modes, which usually happens
		// before community plugins load, so re-highlight notes with Cedar blocks now (and again on unload
		// so they go back to plain text).
		this.app.workspace.onLayoutReady(() => this.rehighlight());
		this.register(() => this.rehighlight());
	}

	private rehighlight() {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue; // deferred tabs parse when first shown
			if (!CEDAR_FENCE.test(view.editor.getValue())) continue;
			view.previewMode.rerender(true);
			const editMode = (view as unknown as { editMode?: { resetSyntaxHighlighting?(): void } }).editMode;
			if (typeof editMode?.resetSyntaxHighlighting === "function") {
				// What Obsidian itself calls after loading late language modes (not in the public API).
				editMode.resetSyntaxHighlighting();
			} else {
				// Public-API fallback: reopen the note in the same tab.
				const state = leaf.getViewState();
				const eState: unknown = leaf.getEphemeralState();
				void leaf.setViewState({ type: "empty" }).then(() => leaf.setViewState(state, eState));
			}
		}
	}
}
