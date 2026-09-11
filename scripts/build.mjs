import { cp, readFile, rm } from "node:fs/promises";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
	// Object form keeps the output flat: dist/cli.js and dist/tui-process.js.
	entryPoints: { cli: "cli.ts", "tui-process": "src/tui-process.ts" },
	outdir: "dist",
	bundle: true,
	splitting: false,
	format: "esm",
	platform: "node",
	target: "node22",
	packages: "external",
	jsx: "automatic",
	keepNames: true,
	logLevel: "info",
	// No banner: esbuild keeps cli.ts's own hashbang, and a banner would add a second one.
};

async function postBuild() {
	await cp("src/statusline-script.mjs", "dist/statusline-script.mjs");
	const cli = await readFile("dist/cli.js", "utf-8");
	if (!cli.startsWith("#!/usr/bin/env node")) throw new Error("dist/cli.js lost its shebang");
	if (/from\s+["'](ink|react)["']/.test(cli)) {
		throw new Error("dist/cli.js imports Ink/React: the CLI process must stay TUI-free");
	}
}

await rm("dist", { recursive: true, force: true });
if (watch) {
	const ctx = await esbuild.context({
		...options,
		plugins: [{ name: "post", setup: (b) => b.onEnd((r) => r.errors.length || postBuild()) }],
	});
	await ctx.watch();
} else {
	await esbuild.build(options);
	await postBuild();
}
