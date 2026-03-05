import { existsSync, readFileSync } from "node:fs";
import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR } from "./config.ts";
import type { ConfiguredProvider } from "./schema.ts";

const SCRIPT_VERSION = "1";

export const STATUSLINE_TEMPLATE_IDS = ["none", "minimal", "basic", "detailed", "compact"] as const;
export type StatusLineTemplateId = (typeof STATUSLINE_TEMPLATE_IDS)[number];

export interface StatusLineTemplate {
	id: StatusLineTemplateId;
	nameKey: string;
	descKey: string;
	preview: string;
}

export const STATUSLINE_TEMPLATES: StatusLineTemplate[] = [
	{ id: "none", nameKey: "statusLine.none", descKey: "statusLine.noneDesc", preview: "" },
	{ id: "minimal", nameKey: "statusLine.minimal", descKey: "statusLine.minimalDesc", preview: "[Provider/model-name]" },
	{ id: "basic", nameKey: "statusLine.basic", descKey: "statusLine.basicDesc", preview: "[Provider/model-name] \u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 20%" },
	{
		id: "detailed",
		nameKey: "statusLine.detailed",
		descKey: "statusLine.detailedDesc",
		preview: "[Provider] model-name | my-project | main\n\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 20% | $0.05 | 3m 22s",
	},
	{ id: "compact", nameKey: "statusLine.compact", descKey: "statusLine.compactDesc", preview: "[Provider/model-name] 20% | $0.05 | main" },
];

function getStatusLineScript(): string {
	return `#!/usr/bin/env node
// mclaude status line script - auto-managed by mclaude
// mclaude-script-version: ${SCRIPT_VERSION}
const PROVIDER = process.env.MCLAUDE_PROVIDER_NAME || '';
const MODEL_HINT = process.env.MCLAUDE_MODEL || '';
const TEMPLATE = process.env.MCLAUDE_STATUSLINE_TEMPLATE || 'basic';

const C = { cyan: '\\x1b[36m', green: '\\x1b[32m', yellow: '\\x1b[33m', red: '\\x1b[31m', dim: '\\x1b[2m', reset: '\\x1b[0m' };

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const d = JSON.parse(input);
        const model = d.model?.display_name || MODEL_HINT || 'unknown';
        const pct = Math.floor(d.context_window?.used_percentage || 0);
        const cost = d.cost?.total_cost_usd || 0;
        const durationMs = d.cost?.total_duration_ms || 0;
        const dir = (d.workspace?.current_dir || d.cwd || '').split(/[\\/\\\\]/).pop() || '';

        let branch = '';
        try {
            const { execSync } = require('child_process');
            branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8', timeout: 2000 }).trim();
        } catch {}

        const mins = Math.floor(durationMs / 60000);
        const secs = Math.floor((durationMs % 60000) / 1000);

        const barColor = pct >= 90 ? C.red : pct >= 70 ? C.yellow : C.green;
        const filled = Math.floor(pct / 10);
        const bar = '\\u2593'.repeat(filled) + '\\u2591'.repeat(10 - filled);

        const tag = PROVIDER ? \`[\${PROVIDER}/\${model}]\` : \`[\${model}]\`;
        const costFmt = '$' + cost.toFixed(2);

        switch (TEMPLATE) {
            case 'minimal':
                console.log(tag);
                break;
            case 'basic':
                console.log(\`\${tag} \${barColor}\${bar}\${C.reset} \${pct}%\`);
                break;
            case 'detailed': {
                const provTag = PROVIDER ? \`[\${PROVIDER}]\` : '';
                const branchPart = branch ? \` | \\u{1F33F} \${branch}\` : '';
                console.log(\`\${C.cyan}\${provTag}\${C.reset} \${model} | \\u{1F4C1} \${dir}\${branchPart}\`);
                console.log(\`\${barColor}\${bar}\${C.reset} \${pct}% | \${C.yellow}\${costFmt}\${C.reset} | \\u23F1\\uFE0F \${mins}m \${secs}s\`);
                break;
            }
            case 'compact': {
                const branchPart = branch ? \` | \${branch}\` : '';
                console.log(\`\${tag} \${pct}% | \${costFmt}\${branchPart}\`);
                break;
            }
            default:
                console.log(tag);
        }
    } catch {
        console.log('[mclaude]');
    }
});
`;
}

export async function ensureStatusLineScript(): Promise<string> {
	const scriptPath = join(CONFIG_DIR, "statusline.mjs");

	if (existsSync(scriptPath)) {
		const content = readFileSync(scriptPath, "utf-8");
		if (content.includes(`// mclaude-script-version: ${SCRIPT_VERSION}`)) {
			return scriptPath;
		}
	}

	await writeFile(scriptPath, getStatusLineScript(), "utf-8");

	if (process.platform !== "win32") {
		await chmod(scriptPath, 0o755);
	}

	return scriptPath;
}

export function buildStatusLineSettingsJson(scriptPath: string): string {
	const normalizedPath = scriptPath.replace(/\\/g, "/");
	const settings = {
		statusLine: {
			type: "command",
			command: `bun "${normalizedPath}"`,
			padding: 0,
		},
	};
	return JSON.stringify(settings);
}

export function getStatusLineEnvVars(
	provider: ConfiguredProvider,
	model: string,
	template: string,
): Record<string, string> {
	return {
		MCLAUDE_PROVIDER_NAME: provider.name,
		MCLAUDE_MODEL: model,
		MCLAUDE_STATUSLINE_TEMPLATE: template,
	};
}
