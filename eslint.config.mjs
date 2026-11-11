// Obsidian's official lint rules: the same plugin the community directory's automated review runs.
// See https://github.com/obsidianmd/eslint-plugin/blob/master/docs/configuration.md
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	// Not plugin source: build output, build/release scripts, the test vault. (Tests are linted, though
	// the directory's scanner skips them.)
	globalIgnores(["node_modules", "main.js", "esbuild.config.mjs", "scripts", "test-vault"]),
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mjs"],
				},
			},
		},
	},
]);
