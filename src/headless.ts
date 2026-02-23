import { debugLog } from "./debug.ts";
import { loadConfig, migrateInstallations, slugify, isAccountAuthenticated, readOAuthCredentials, isOAuthTokenValid } from "./config.ts";
import { getEffectiveModels } from "./providers.ts";
import type { ConfiguredProvider, Installation } from "./schema.ts";
import { DEFAULT_INSTALLATION_ID } from "./schema.ts";

// --- Types ---

export interface HeadlessArgs {
	provider: string;
	model: string | undefined;
	installation: string | undefined;
	claudeArgs: string[];
}

type Result<T> =
	| { ok: true; value: T }
	| { ok: false; error: string };

// --- CLI ID helper (shared with TUI sidebar) ---

export function getCliId(provider: ConfiguredProvider, allProviders: ConfiguredProvider[]): string {
	const sameTemplate = allProviders.filter(p => p.templateId === provider.templateId);
	return sameTemplate.length === 1 ? provider.templateId : slugify(provider.name);
}

// --- Arg parsing ---

export function extractHeadlessArgs(args: string[]): HeadlessArgs | null {
	let provider: string | undefined;
	let model: string | undefined;
	let installation: string | undefined;
	const claudeArgs: string[] = [];

	let i = 0;
	while (i < args.length) {
		const arg = args[i]!;

		// --provider (consumed, not forwarded)
		if (arg === "--provider") {
			if (i + 1 >= args.length) {
				console.error("Error: --provider requires a value.");
				console.error("Usage: mclaude --provider <name> [claude-flags...]");
				process.exit(1);
			}
			provider = args[i + 1]!;
			i += 2;
			continue;
		}
		if (arg.startsWith("--provider=")) {
			provider = arg.slice("--provider=".length);
			if (!provider) {
				console.error("Error: --provider requires a value.");
				process.exit(1);
			}
			i += 1;
			continue;
		}

		// --installation (consumed, not forwarded)
		if (arg === "--installation") {
			if (i + 1 >= args.length) {
				console.error("Error: --installation requires a value.");
				process.exit(1);
			}
			installation = args[i + 1]!;
			i += 2;
			continue;
		}
		if (arg.startsWith("--installation=")) {
			installation = arg.slice("--installation=".length);
			i += 1;
			continue;
		}

		// --model / -m (peeked: read value but keep in claudeArgs for runner.ts)
		if ((arg === "--model" || arg === "-m") && i + 1 < args.length) {
			model = args[i + 1]!;
			claudeArgs.push(arg, args[i + 1]!);
			i += 2;
			continue;
		}
		if (arg.startsWith("--model=")) {
			model = arg.slice("--model=".length);
			claudeArgs.push(arg);
			i += 1;
			continue;
		}

		// Everything else forwarded to claude
		claudeArgs.push(arg);
		i += 1;
	}

	if (provider === undefined) return null;

	return { provider, model, installation, claudeArgs };
}

// --- Resolvers ---

function resolveProvider(input: string, providers: ConfiguredProvider[]): Result<ConfiguredProvider> {
	const inputLower = input.toLowerCase();
	const inputSlug = slugify(input);

	// 1. Exact name match (case-insensitive)
	const byName = providers.filter(p => p.name.toLowerCase() === inputLower);
	if (byName.length === 1) return { ok: true, value: byName[0]! };

	// 2. Exact templateId match
	const byTemplate = providers.filter(p => p.templateId === inputLower);
	if (byTemplate.length === 1) return { ok: true, value: byTemplate[0]! };

	// 3. Slug of provider name
	const bySlug = providers.filter(p => slugify(p.name) === inputSlug);
	if (bySlug.length === 1) return { ok: true, value: bySlug[0]! };

	// 4. Provider UUID
	const byId = providers.filter(p => p.id === input);
	if (byId.length === 1) return { ok: true, value: byId[0]! };

	// Ambiguous
	const ambiguous = byName.length > 1 ? byName
		: byTemplate.length > 1 ? byTemplate
		: bySlug.length > 1 ? bySlug
		: [];

	if (ambiguous.length > 1) {
		const list = ambiguous
			.map(p => `  - "${p.name}" (${p.templateId})`)
			.join("\n");
		return {
			ok: false,
			error: `Multiple providers match "${input}":\n${list}\n\nUse the exact provider name: --provider "Provider Name"`,
		};
	}

	// Not found
	const available = providers.length > 0
		? providers.map(p => `  - "${p.name}" (${p.templateId})`).join("\n")
		: "  (none configured)";
	return {
		ok: false,
		error: `Provider "${input}" not found.\n\nAvailable providers:\n${available}\n\nRun mclaude without --provider to manage providers in the TUI.`,
	};
}

function resolveModel(modelInput: string | undefined, provider: ConfiguredProvider): Result<string> {
	if (provider.type === "oauth") {
		return { ok: true, value: "" };
	}

	const effectiveModels = getEffectiveModels(provider);

	if (modelInput) {
		if (!effectiveModels.includes(modelInput) && effectiveModels.length > 0) {
			console.error(`Warning: "${modelInput}" is not in the configured models for "${provider.name}".`);
			const shown = effectiveModels.slice(0, 5);
			const extra = effectiveModels.length > 5 ? ` (and ${effectiveModels.length - 5} more)` : "";
			console.error(`Known models: ${shown.join(", ")}${extra}`);
			console.error("Proceeding anyway...\n");
		}
		return { ok: true, value: modelInput };
	}

	// Auto-select first model
	if (effectiveModels.length === 0) {
		return {
			ok: false,
			error: `No models configured for "${provider.name}".\nAdd models via the TUI or specify: --model <model-name>`,
		};
	}

	return { ok: true, value: effectiveModels[0]! };
}

function resolveInstallation(
	input: string | undefined,
	installations: Installation[],
): Result<string> {
	if (!input) {
		return { ok: true, value: DEFAULT_INSTALLATION_ID };
	}

	if (input.toLowerCase() === "default") {
		return { ok: true, value: DEFAULT_INSTALLATION_ID };
	}

	const inputLower = input.toLowerCase();
	const inputSlug = slugify(input);

	const match = installations.find(i =>
		i.name.toLowerCase() === inputLower ||
		slugify(i.name) === inputSlug ||
		i.id === input ||
		i.dirName === input,
	);

	if (match) {
		return { ok: true, value: match.dirName };
	}

	const available = [
		'  - "default"',
		...installations.map(i => `  - "${i.name}"`),
	].join("\n");

	return {
		ok: false,
		error: `Installation "${input}" not found.\n\nAvailable installations:\n${available}`,
	};
}

// --- Orchestrator ---

export async function runHeadless(args: HeadlessArgs): Promise<number> {
	debugLog("headless: started, provider=" + args.provider);

	const config = await loadConfig();
	await migrateInstallations(config);

	if (config.providers.length === 0) {
		console.error("Error: No providers configured.");
		console.error("Run mclaude without --provider to open the TUI and add providers.");
		return 1;
	}

	// Resolve provider
	const providerResult = resolveProvider(args.provider, config.providers);
	if (!providerResult.ok) {
		console.error(providerResult.error);
		return 1;
	}
	const provider = providerResult.value;

	// Resolve model
	const modelResult = resolveModel(args.model, provider);
	if (!modelResult.ok) {
		console.error(modelResult.error);
		return 1;
	}
	const model = modelResult.value;

	// Resolve installation
	const installResult = resolveInstallation(args.installation, config.installations);
	if (!installResult.ok) {
		console.error(installResult.error);
		return 1;
	}
	const installationId = installResult.value;

	// OAuth credential check
	if (provider.type === "oauth") {
		if (!isAccountAuthenticated(provider.id)) {
			console.error(`Error: OAuth provider "${provider.name}" is not authenticated.`);
			console.error("Run mclaude without --provider to authenticate via the TUI.");
			return 1;
		}
		const creds = readOAuthCredentials(provider.id);
		if (!creds || !isOAuthTokenValid(creds)) {
			console.error(`Error: OAuth token for "${provider.name}" has expired.`);
			console.error("Run mclaude without --provider to re-authenticate.");
			return 1;
		}
	}

	debugLog(`headless: resolved provider="${provider.name}" model="${model}" installation="${installationId}"`);

	const { runClaude } = await import("./runner.ts");
	const exitCode = await runClaude(provider, model, args.claudeArgs, installationId);

	const providerInfo = provider.type === "oauth"
		? provider.name
		: `${provider.name} (${model})`;

	if (exitCode !== 0) {
		console.log(`\n[mclaude] ${providerInfo} — exited with code ${exitCode}`);
	} else {
		console.log(`\n[mclaude] ${providerInfo} — session ended`);
	}

	return exitCode;
}

// --- List command ---

export async function printHeadlessInfo(): Promise<void> {
	const config = await loadConfig();
	await migrateInstallations(config);

	const output = {
		providers: config.providers.map(p => ({
			cliId: getCliId(p, config.providers),
			name: p.name,
			templateId: p.templateId,
			type: p.type,
			models: getEffectiveModels(p),
		})),
		installations: [
			{ cliId: "default", name: "Default" },
			...config.installations.map(i => ({
				cliId: slugify(i.name),
				name: i.name,
			})),
		],
		usage: "mclaude --provider <cliId> [--model <model>] [--installation <cliId>] [claude-flags...]",
	};

	console.log(JSON.stringify(output, null, 2));
}
