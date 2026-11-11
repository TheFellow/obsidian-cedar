// Copyright Cedar Contributors
// SPDX-License-Identifier: Apache-2.0

import { INITIAL, type Language, type StateStack, type Token, type Tokenizer } from "./tokenizer";

/**
 * A CodeMirror 5-style mode over the TextMate tokenizer, for fenced code blocks in Live Preview and
 * Source mode. Obsidian's Markdown editor (HyperMD, run through CodeMirror 6's StreamLanguage) looks up
 * the mode for a fence's language in `window.CodeMirror.modes`.
 *
 * TextMate works a line at a time with an immutable rule stack, which maps onto a stream mode's state:
 * the first token request on a line tokenizes the rest of the line and later requests are served from
 * that result. A new line is detected by its text and position rather than `sol()`, because inside a
 * blockquote or list the Markdown mode consumes the `> ` / indent prefix before delegating.
 */
interface ModeState {
	stack: StateStack;
	/** Tokens of the current line, offset to positions in `text`. */
	tokens: Token[];
	index: number;
	/** The line `tokens` belong to, and the end of the last token served from it. */
	text: string | null;
	pos: number;
}

/** The subset of CodeMirror's StringStream used here. */
export interface Stream {
	pos: number;
	string: string;
	sol(): boolean;
	eol(): boolean;
	skipToEnd(): void;
}

export interface StreamMode {
	name: string;
	startState(): ModeState;
	copyState(state: ModeState): ModeState;
	token(stream: Stream, state: ModeState): string | null;
	blankLine(state: ModeState): void;
	lineComment: string;
}

export function streamMode(tokenizer: Tokenizer, lang: Language): StreamMode {
	return {
		name: lang,
		lineComment: "//",
		startState: () => ({ stack: INITIAL, tokens: [], index: 0, text: null, pos: 0 }),
		copyState: (s) => ({ ...s }),
		blankLine(state) {
			state.stack = tokenizer.line(lang, "", state.stack).state;
			state.tokens = [];
			state.index = 0;
			state.text = null;
		},
		token(stream, state) {
			if (stream.sol() || stream.string !== state.text || stream.pos < state.pos) {
				const start = stream.pos;
				const r = tokenizer.line(lang, stream.string.slice(start), state.stack);
				state.stack = r.state;
				state.tokens = r.tokens.map((t) => ({ ...t, start: t.start + start, end: t.end + start }));
				state.index = 0;
				state.text = stream.string;
			}
			const tokens = state.tokens;
			while (state.index < tokens.length && tokens[state.index].end <= stream.pos) state.index++;
			const t = tokens[state.index];
			if (!t || t.start > stream.pos) {
				// Not covered by a token (shouldn't happen): consume the rest so the stream always advances.
				stream.skipToEnd();
				state.pos = stream.pos;
				return null;
			}
			stream.pos = t.end;
			state.pos = t.end;
			state.index++;
			return t.cls ? `${t.cls.cm} cedar-${t.cls.name}` : null;
		},
	};
}
