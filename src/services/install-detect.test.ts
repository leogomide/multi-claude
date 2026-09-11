import { describe, expect, it } from "vitest";
import {
	detectInstallSource,
	formatCommand,
	type InstallSource,
	PACKAGE_SPEC,
} from "./install-detect.ts";

type Case = [path: string, platform: NodeJS.Platform, expected: string, env?: NodeJS.ProcessEnv];

const cases: Case[] = [
	[
		"C:\\Users\\u\\AppData\\Roaming\\npm\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"npm",
	],
	[
		"C:\\Program Files\\nodejs\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"npm",
	],
	["/usr/local/lib/node_modules/@leogomide/multi-claude/dist/cli.js", "linux", "npm"],
	[
		"/home/u/.nvm/versions/node/v22.21.0/lib/node_modules/@leogomide/multi-claude/dist/cli.js",
		"linux",
		"npm",
	],
	[
		"C:\\Users\\u\\.bun\\install\\global\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"bun",
	],
	["/home/u/.bun/install/global/node_modules/@leogomide/multi-claude/dist/cli.js", "linux", "bun"],
	[
		"C:\\Users\\u\\AppData\\Local\\pnpm\\global\\5\\.pnpm\\@leogomide+multi-claude@2.0.0\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"pnpm",
	],
	[
		"/Users/u/Library/pnpm/global/5/.pnpm/@leogomide+multi-claude@2.0.0/node_modules/@leogomide/multi-claude/dist/cli.js",
		"darwin",
		"pnpm",
	],
	[
		"C:\\Users\\u\\AppData\\Local\\Yarn\\Data\\global\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"yarn",
	],
	[
		"C:\\Users\\u\\AppData\\Local\\Volta\\tools\\image\\packages\\@leogomide\\multi-claude\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"volta",
	],
	[
		"C:\\Users\\u\\AppData\\Local\\npm-cache\\_npx\\abc123\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"ephemeral/npx",
	],
	[
		"/tmp/bunx-1000-@leogomide/multi-claude@latest/node_modules/@leogomide/multi-claude/dist/cli.js",
		"linux",
		"ephemeral/bunx",
	],
	[
		"/home/u/.cache/pnpm/dlx/abc123/node_modules/.pnpm/@leogomide+multi-claude@2.0.0/node_modules/@leogomide/multi-claude/dist/cli.js",
		"linux",
		"ephemeral/pnpm-dlx",
	],
	["D:\\Users\\Usuario\\Desktop\\GITHUB\\multi-claude\\dist\\cli.js", "win32", "dev-link"],
	[
		"/opt/bun/install/global/node_modules/@leogomide/multi-claude/dist/cli.js",
		"linux",
		"bun",
		{ BUN_INSTALL: "/opt/bun" },
	],
	[
		"D:\\Tools\\Bun\\install\\global\\node_modules\\@leogomide\\multi-claude\\dist\\cli.js",
		"win32",
		"bun",
		{ BUN_INSTALL: "d:\\tools\\bun\\" },
	],
];

function label(s: InstallSource): string {
	return s.kind === "ephemeral" ? `ephemeral/${s.runner}` : s.kind;
}

describe("detectInstallSource", () => {
	it.each(cases)("%s (%s) -> %s", (path, platform, expected, env = {}) => {
		expect(label(detectInstallSource(path, env, platform))).toBe(expected);
	});

	it("is case-sensitive outside win32", () => {
		const p = "/home/u/.config/Yarn/Global/node_modules/@leogomide/multi-claude/dist/cli.js";
		expect(detectInstallSource(p, {}, "linux").kind).toBe("npm");
		expect(detectInstallSource(p, {}, "win32").kind).toBe("yarn");
	});

	it("never falls back to process.execPath install", () => {
		for (const [path, platform, , env = {}] of cases) {
			const s = detectInstallSource(path, env, platform);
			if ("command" in s) {
				expect(s.args).toContain(PACKAGE_SPEC);
				expect(s.command).not.toMatch(/node(\.exe)?$/);
			}
		}
	});
});

describe("formatCommand", () => {
	const fmt = (path: string, platform: NodeJS.Platform = "linux") =>
		formatCommand(detectInstallSource(path, {}, platform));

	it("formats each manager", () => {
		expect(fmt("/usr/lib/node_modules/@leogomide/multi-claude/dist/cli.js")).toBe(
			"npm i -g @leogomide/multi-claude@latest",
		);
		expect(fmt("/home/u/.bun/install/global/node_modules/x/dist/cli.js")).toBe(
			"bun add -g @leogomide/multi-claude@latest",
		);
		expect(fmt("/home/u/.local/share/pnpm/global/5/.pnpm/x/dist/cli.js")).toBe(
			"pnpm add -g @leogomide/multi-claude@latest",
		);
		expect(fmt("/home/u/.config/yarn/global/node_modules/x/dist/cli.js")).toBe(
			"yarn global add @leogomide/multi-claude@latest",
		);
		expect(fmt("/home/u/.volta/tools/image/packages/@leogomide/multi-claude/dist/cli.js")).toBe(
			"volta install @leogomide/multi-claude@latest",
		);
	});

	it("formats ephemeral runners and the dev link", () => {
		expect(fmt("/c/_npx/1/node_modules/x/dist/cli.js")).toBe("npx @leogomide/multi-claude");
		expect(fmt("/tmp/bunx-1-x/dist/cli.js")).toBe("bunx @leogomide/multi-claude");
		expect(fmt("/c/pnpm/dlx/1/dist/cli.js")).toBe("pnpm dlx @leogomide/multi-claude");
		expect(fmt("/home/u/src/multi-claude/dist/cli.js")).toBe("git pull && pnpm build");
	});
});
