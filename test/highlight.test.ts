import { readFileSync } from "node:fs";
import { StringStream } from "@codemirror/language";
import Prism from "prismjs";
import { describe, expect, it } from "vitest";
import { streamMode } from "../src/editor-mode";
import { registerPrism, type PrismLike } from "../src/reading-view";
import { Tokenizer, type Language } from "../src/tokenizer";

const tokenizer = new Tokenizer();
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

/** [text, class name] pairs for every classified token. */
function classes(lang: Language, code: string): [string, string][] {
	return [...tokenizer.block(lang, code)].filter((t) => t.cls).map((t) => [code.slice(t.start, t.end), t.cls!.name]);
}

describe("cedar", () => {
	const code = `@id("P1")
permit (
  principal is NS1::User,
  action == NS1::Action::"rename\\q",
  resource in ?resource
)
when { principal in resource.owners && context.n > 10 && ip("10.0.0.1").isIpv4() } // c
unless { true };`;
	const cls = classes("cedar", code);
	const kinds = (text: string) => cls.filter(([t]) => t === text).map(([, k]) => k);

	it.each([
		["permit", "keyword"],
		["when", "keyword"],
		["unless", "keyword"],
		["principal", "variable"],
		["context", "variable"],
		["is", "keyword"],
		["in", "keyword"],
		["NS1::User", "entity-type"],
		["?resource", "slot"],
		["10", "number"],
		["true", "boolean"],
		["ip", "function"],
		["isIpv4", "method"],
		["&&", "operator"],
		["// c", "comment"],
		["\\q", "invalid-escape"],
		["@id", "annotation"],
	])("%s is %s", (text, kind) => {
		expect(kinds(text)).toContain(kind);
	});

	it("classifies the upstream datatypes fixture without gaps", () => {
		const code = fixture("datatypes.cedar");
		const tokens = [...tokenizer.block("cedar", code)];
		expect(tokens.some((t) => t.cls?.name === "keyword")).toBe(true);
		expect(tokens.map((t) => code.slice(t.start, t.end)).join("")).toBe(code.replaceAll("\n", ""));
	});
});

describe("cedarschema", () => {
	const cls = classes("cedarschema", fixture("tinytodo.cedarschema"));
	const kinds = (text: string) => cls.filter(([t]) => t === text).map(([, k]) => k);

	it.each([
		["namespace", "keyword"],
		["entity", "keyword"],
		["action", "keyword"],
		["appliesTo", "keyword"],
		["TinyTodo", "namespace"],
		["Long", "builtin-type"],
		["Set", "builtin-type"],
		['"editors"', "property"],
		["@doc", "annotation"],
	])("%s is %s", (text, kind) => {
		expect(kinds(text)).toContain(kind);
	});
});

/**
 * Drives a stream mode the way Obsidian's HyperMD mode drives an inner fenced-code mode: one CodeMirror
 * StringStream per line, `blankLine` for empty lines, and each token's style string turned into `cm-*`
 * classes word by word (Obsidian's editor decorates the raw style string rather than mapping it to tags).
 */
function runMode(lang: Language, code: string, prefix = ""): [string, string][] {
	const mode = streamMode(tokenizer, lang);
	let state = mode.startState();
	const out: [string, string][] = [];
	for (const line of code.split("\n")) {
		if (line === "") {
			mode.blankLine(state);
			continue;
		}
		state = mode.copyState(state); // the editor may resume from any saved line state
		const stream = new StringStream(prefix + line, 4, 2);
		stream.pos = prefix.length; // the Markdown mode has consumed e.g. a blockquote marker
		while (!stream.eol()) {
			const before = stream.pos;
			const style = mode.token(stream, state);
			expect(stream.pos).toBeGreaterThan(before);
			if (style) out.push([stream.string.slice(before, stream.pos), style.split(" ").map((w) => `cm-${w}`).join(" ")]);
		}
	}
	return out;
}

describe("editor mode (CodeMirror StringStream, as Obsidian's HyperMD calls it)", () => {
	it("highlights multi-line cedar", () => {
		const doc = `permit (\n  principal,\n\n  action == Action::"a\\"b",\n  resource\n) when { 1 < 2 };`;
		const seen = runMode("cedar", doc);
		const has = (text: string, cls: string) => seen.some(([t, c]) => t === text && c.split(" ").includes(cls));
		expect(has("permit", "cm-keyword")).toBe(true);
		expect(has("principal", "cm-keyword")).toBe(true);
		expect(has("principal", "cm-cedar-variable")).toBe(true);
		expect(has("Action", "cm-type")).toBe(true);
		expect(has('\\"', "cm-cedar-string-escape")).toBe(true);
		expect(has("b", "cm-string")).toBe(true); // still inside the string after the escape
		expect(has("when", "cm-keyword")).toBe(true);
		expect(has("1", "cm-number")).toBe(true);
	});

	it("handles code blocks inside blockquotes, including repeated identical lines", () => {
		const seen = runMode("cedar", `permit (principal, action, resource)\nwhen { "a" };\nwhen { "a" };`, "> ");
		expect(seen.filter(([t, c]) => t === "when" && c.includes("cm-keyword"))).toHaveLength(2);
		expect(seen.filter(([t, c]) => t === "a" && c.includes("cm-string"))).toHaveLength(2);
		expect(seen.some(([t]) => t.includes(">"))).toBe(false);
	});

	it("highlights the upstream cedarschema fixture", () => {
		const seen = runMode("cedarschema", fixture("tinytodo.cedarschema"));
		const has = (text: string, cls: string) => seen.some(([t, c]) => t === text && c.split(" ").includes(cls));
		expect(has("namespace", "cm-keyword")).toBe(true);
		expect(has("TinyTodo", "cm-type")).toBe(true);
		expect(has('"editors"', "cm-variable")).toBe(true);
		expect(has("@doc", "cm-attribute")).toBe(true);
	});
});

describe("reading view (Prism hook)", () => {
	it("renders Prism token spans for both languages and unregisters cleanly", () => {
		const undo = registerPrism(Prism as unknown as PrismLike, tokenizer, ["cedar", "cedarschema"]);
		const html = Prism.highlight('forbid (principal, action, resource) when { x < "<b>" };', Prism.languages.cedar, "cedar");
		expect(html).toContain('<span class="token keyword cedar-keyword">forbid</span>');
		expect(html).toContain("&lt;b>"); // content is escaped
		const schema = Prism.highlight("entity User;", Prism.languages.cedarschema, "cedarschema");
		expect(schema).toContain('<span class="token keyword cedar-keyword">entity</span>');
		// Other languages are untouched.
		expect(Prism.highlight("var x", Prism.languages.javascript, "javascript")).toContain('token keyword">var');
		undo();
		expect(Prism.languages.cedar).toBeUndefined();
		expect(Prism.hooks.all["after-tokenize"] ?? []).toHaveLength(0);
	});
});
