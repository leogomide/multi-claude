import { existsSync, readFileSync } from "node:fs";
import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR } from "./config.ts";
import type { ConfiguredProvider } from "./schema.ts";

const SCRIPT_VERSION = "3";

export const STATUSLINE_TEMPLATE_IDS = ["none", "full", "progress", "gauge", "budget", "context", "engineer", "cashflow", "compact", "boxed", "ratio", "worktree"] as const;
export type StatusLineTemplateId = (typeof STATUSLINE_TEMPLATE_IDS)[number];

export interface StatusLineTemplate {
	id: StatusLineTemplateId;
	nameKey: string;
	descKey: string;
	preview: string;
}

export const STATUSLINE_TEMPLATES: StatusLineTemplate[] = [
	{ id: "none", nameKey: "statusLine.none", descKey: "statusLine.noneDesc", preview: "" },
	{
		id: "full",
		nameKey: "statusLine.full",
		descKey: "statusLine.fullDesc",
		preview: "Provider/Opus | Ctx:153.9k | Ctx:77% | Remaining:23%\nIn:84.2k | Out:62.8k | Cached:20.6M | Total:20.7M | Cost:$11.15\nSession:3h31m | API:1h38m | (+45,-7)",
	},
	{
		id: "progress",
		nameKey: "statusLine.progress",
		descKey: "statusLine.progressDesc",
		preview: "Provider/Opus  \u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 153.9k/77% | 23% left\nIn:84.2k | Out:62.8k | Cached:20.6M | Total:20.7M | Cost:$11.15\nSession:3h31m | API:1h38m | (+45,-7)",
	},
	{ id: "gauge", nameKey: "statusLine.gauge", descKey: "statusLine.gaugeDesc", preview: "Opus \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 40% $0.52" },
	{ id: "budget", nameKey: "statusLine.budget", descKey: "statusLine.budgetDesc", preview: "$2.47 | In:15.2k Out:4.5k | Ctx 8% | Opus" },
	{
		id: "context",
		nameKey: "statusLine.context",
		descKey: "statusLine.contextDesc",
		preview: "Opus 200k window    \u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 30% used\nIn:15.2k Out:4.5k | Cache:7.0k | 140.0k remaining",
	},
	{
		id: "engineer",
		nameKey: "statusLine.engineer",
		descKey: "statusLine.engineerDesc",
		preview: "Opus | multi-claude | master | +156 -23\nCtx \u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591 30% | $0.52 | 12m 45s",
	},
	{
		id: "cashflow",
		nameKey: "statusLine.cashflow",
		descKey: "statusLine.cashflowDesc",
		preview: "$2.47 total | $0.19/min | API: 2.3s of 13m session\nTokens: 15.2k in + 4.5k out = 19.7k | \u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591 Ctx 30%",
	},
	{ id: "compact", nameKey: "statusLine.compact", descKey: "statusLine.compactDesc", preview: "Opus | Ctx 30% | $0.52 | 12m | master" },
	{
		id: "boxed",
		nameKey: "statusLine.boxed",
		descKey: "statusLine.boxedDesc",
		preview: "\u250c\u2500 Provider/Opus \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502 \u2593\u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 30% | In:15.2k Out:4.5k | $0.52 \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 master \u2500\u2500 12m 45s \u2500\u2518",
	},
	{ id: "ratio", nameKey: "statusLine.ratio", descKey: "statusLine.ratioDesc", preview: "Opus | I/O 7.1:1 | Cache 71% hit | Ctx 30%" },
	{
		id: "worktree",
		nameKey: "statusLine.worktree",
		descKey: "statusLine.worktreeDesc",
		preview: "WT:my-feature (worktree-branch \u2190 main) | Opus\n\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591 30% | $0.52 | +156 -23 | 12m",
	},
];

function getStatusLineScript(): string {
	return `#!/usr/bin/env node
// mclaude status line script - auto-managed by mclaude
// mclaude-script-version: ${SCRIPT_VERSION}
const PROVIDER = process.env.MCLAUDE_PROVIDER_NAME || '';
const MODEL_HINT = process.env.MCLAUDE_MODEL || '';
const TEMPLATE = process.env.MCLAUDE_STATUSLINE_TEMPLATE || 'compact';

const C = { cyan: '\\x1b[36m', green: '\\x1b[32m', yellow: '\\x1b[33m', red: '\\x1b[31m', dim: '\\x1b[2m', bold: '\\x1b[1m', reset: '\\x1b[0m', white: '\\x1b[37m', magenta: '\\x1b[35m', blue: '\\x1b[34m' };

const fmtK = (n) => { if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return String(n); };
const fmtDur = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; if (h > 0) return h + 'h' + String(m).padStart(2, '0') + 'm'; return m + 'm ' + sec + 's'; };
const fmtDurShort = (ms) => Math.floor(ms / 60000) + 'm';
const fmtCost = (usd) => '$' + usd.toFixed(2);
const mkBar = (pct, w) => '\\u2593'.repeat(Math.floor(pct * w / 100)) + '\\u2591'.repeat(w - Math.floor(pct * w / 100));
const ctxC = (pct) => pct >= 80 ? C.red : pct >= 50 ? C.yellow : C.green;
const costC = (usd) => usd >= 5 ? C.red : usd >= 1 ? C.yellow : C.green;

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const d = JSON.parse(input);
        const model = d.model?.display_name || MODEL_HINT || 'unknown';
        const pct = Math.floor(d.context_window?.used_percentage || 0);
        const remPct = Math.floor(d.context_window?.remaining_percentage || 0);
        const cost = d.cost?.total_cost_usd || 0;
        const durMs = d.cost?.total_duration_ms || 0;
        const apiMs = d.cost?.total_api_duration_ms || 0;
        const linesAdd = d.cost?.total_lines_added || 0;
        const linesRem = d.cost?.total_lines_removed || 0;
        const totalIn = d.context_window?.total_input_tokens || 0;
        const totalOut = d.context_window?.total_output_tokens || 0;
        const ctxSize = d.context_window?.context_window_size || 200000;
        const curIn = d.context_window?.current_usage?.input_tokens || 0;
        const curOut = d.context_window?.current_usage?.output_tokens || 0;
        const cacheCreate = d.context_window?.current_usage?.cache_creation_input_tokens || 0;
        const cacheRead = d.context_window?.current_usage?.cache_read_input_tokens || 0;
        const dir = (d.workspace?.current_dir || d.cwd || '').split(/[\\/\\\\]/).pop() || '';

        let branch = '';
        try { const { execSync } = require('child_process'); branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8', timeout: 2000 }).trim(); } catch {}

        const tag = PROVIDER ? '[' + PROVIDER + '/' + model + ']' : '[' + model + ']';
        const cc = ctxC(pct);
        const ctxTokens = curIn + cacheCreate + cacheRead;
        const cachedTokens = cacheCreate + cacheRead;
        const allTokens = ctxTokens + curOut;

        switch (TEMPLATE) {
            case 'full': {
                const p = PROVIDER ? C.cyan + PROVIDER + C.reset + '/' + model : model;
                console.log(p + ' | ' + C.green + 'Ctx:' + fmtK(ctxTokens) + C.reset + ' | ' + cc + 'Ctx:' + pct + '%' + C.reset + ' | ' + C.dim + 'Remaining:' + remPct + '%' + C.reset);
                console.log(C.cyan + 'In:' + fmtK(totalIn) + C.reset + ' | ' + C.yellow + 'Out:' + fmtK(totalOut) + C.reset + ' | ' + C.green + 'Cached:' + fmtK(cachedTokens) + C.reset + ' | ' + C.dim + 'Total:' + fmtK(allTokens) + C.reset + ' | ' + C.yellow + 'Cost:' + fmtCost(cost) + C.reset);
                console.log(C.dim + 'Session:' + fmtDur(durMs) + C.reset + ' | ' + C.cyan + 'API:' + fmtDur(apiMs) + C.reset + ' | ' + C.green + '(+' + linesAdd + ',-' + linesRem + ')' + C.reset);
                break;
            }
            case 'progress': {
                const p = PROVIDER ? C.cyan + PROVIDER + C.reset + '/' + model : model;
                console.log(p + '  ' + cc + mkBar(pct, 30) + C.reset + ' ' + fmtK(ctxTokens) + '/' + pct + '% | ' + C.dim + remPct + '% left' + C.reset);
                console.log(C.cyan + 'In:' + fmtK(totalIn) + C.reset + ' | ' + C.yellow + 'Out:' + fmtK(totalOut) + C.reset + ' | ' + C.green + 'Cached:' + fmtK(cachedTokens) + C.reset + ' | ' + C.dim + 'Total:' + fmtK(allTokens) + C.reset + ' | ' + C.yellow + 'Cost:' + fmtCost(cost) + C.reset);
                console.log(C.dim + 'Session:' + fmtDur(durMs) + C.reset + ' | ' + C.cyan + 'API:' + fmtDur(apiMs) + C.reset + ' | ' + C.green + '(+' + linesAdd + ',-' + linesRem + ')' + C.reset);
                break;
            }
            case 'gauge': {
                console.log(C.cyan + model + C.reset + ' ' + cc + mkBar(pct, 20) + C.reset + ' ' + C.bold + cc + pct + '%' + C.reset + ' ' + C.dim + fmtCost(cost) + C.reset);
                break;
            }
            case 'budget': {
                const cCol = costC(cost);
                console.log(C.bold + cCol + fmtCost(cost) + C.reset + ' | ' + C.cyan + 'In:' + fmtK(totalIn) + C.reset + ' ' + C.magenta + 'Out:' + fmtK(totalOut) + C.reset + ' | ' + cc + 'Ctx ' + pct + '%' + C.reset + ' | ' + C.dim + model + C.reset);
                break;
            }
            case 'context': {
                const wFmt = fmtK(ctxSize);
                const remaining = Math.floor(ctxSize * remPct / 100);
                console.log(C.cyan + model + C.reset + ' ' + C.dim + wFmt + ' window' + C.reset + '    ' + cc + mkBar(pct, 40) + C.reset + ' ' + C.bold + pct + '%' + C.reset + ' ' + C.dim + 'used' + C.reset);
                console.log(C.blue + 'In:' + fmtK(curIn) + C.reset + ' ' + C.magenta + 'Out:' + fmtK(curOut) + C.reset + ' | ' + C.green + 'Cache:' + fmtK(cachedTokens) + C.reset + ' | ' + C.dim + fmtK(remaining) + ' remaining' + C.reset);
                break;
            }
            case 'engineer': {
                const bp = branch ? ' | ' + C.magenta + branch + C.reset : '';
                const lp = (linesAdd || linesRem) ? ' | ' + C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset : '';
                console.log(C.cyan + model + C.reset + ' | ' + C.blue + dir + C.reset + bp + lp);
                console.log(C.dim + 'Ctx' + C.reset + ' ' + cc + mkBar(pct, 10) + C.reset + ' ' + C.dim + pct + '%' + C.reset + ' | ' + C.yellow + fmtCost(cost) + C.reset + ' | ' + C.dim + fmtDur(durMs) + C.reset);
                break;
            }
            case 'cashflow': {
                const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;
                const apiSec = Math.floor(apiMs / 1000);
                const totTok = totalIn + totalOut;
                const cCol = costC(cost);
                console.log(C.bold + cCol + fmtCost(cost) + C.reset + ' ' + C.dim + 'total' + C.reset + ' | ' + C.cyan + fmtCost(cpm) + '/min' + C.reset + ' | ' + C.dim + 'API:' + C.reset + ' ' + C.green + apiSec + 's' + C.reset + ' ' + C.dim + 'of' + C.reset + ' ' + fmtDur(durMs) + ' ' + C.dim + 'session' + C.reset);
                console.log(C.dim + 'Tokens:' + C.reset + ' ' + C.blue + fmtK(totalIn) + ' in' + C.reset + ' + ' + C.magenta + fmtK(totalOut) + ' out' + C.reset + ' = ' + C.white + fmtK(totTok) + C.reset + ' | ' + cc + mkBar(pct, 10) + C.reset + ' ' + C.dim + 'Ctx ' + pct + '%' + C.reset);
                break;
            }
            case 'compact': {
                const bp = branch ? ' | ' + C.magenta + branch + C.reset : '';
                console.log(C.cyan + model + C.reset + ' | ' + cc + 'Ctx ' + pct + '%' + C.reset + ' | ' + C.yellow + fmtCost(cost) + C.reset + ' | ' + C.dim + fmtDurShort(durMs) + C.reset + bp);
                break;
            }
            case 'boxed': {
                const hdr = PROVIDER ? ' ' + PROVIDER + '/' + model + ' ' : ' ' + model + ' ';
                const bw = 55;
                const topPad = Math.max(1, bw - 2 - hdr.length);
                const bp = branch || '';
                const dur = fmtDur(durMs);
                const botContent = bp + (bp ? ' \\u2500\\u2500 ' : '') + dur;
                const botPad = Math.max(1, bw - 3 - botContent.length);
                console.log(C.dim + '\\u250c\\u2500' + C.reset + C.cyan + hdr + C.reset + C.dim + '\\u2500'.repeat(topPad) + '\\u2510' + C.reset);
                console.log(C.dim + '\\u2502' + C.reset + ' ' + cc + mkBar(pct, 14) + C.reset + ' ' + pct + '% | ' + C.blue + 'In:' + fmtK(totalIn) + C.reset + ' ' + C.magenta + 'Out:' + fmtK(totalOut) + C.reset + ' | ' + C.yellow + fmtCost(cost) + C.reset + ' | ' + C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset + ' ' + C.dim + '\\u2502' + C.reset);
                console.log(C.dim + '\\u2514' + '\\u2500'.repeat(botPad) + ' ' + C.reset + C.magenta + bp + C.reset + C.dim + (bp ? ' \\u2500\\u2500 ' : '') + dur + ' \\u2500\\u2518' + C.reset);
                break;
            }
            case 'ratio': {
                const ioR = curOut > 0 ? (curIn / curOut).toFixed(1) : '\\u221e';
                const totalCch = cacheCreate + cacheRead;
                const cchHit = totalCch > 0 ? Math.floor(cacheRead / totalCch * 100) : 0;
                const cchC = cchHit >= 60 ? C.green : cchHit >= 30 ? C.yellow : C.red;
                console.log(C.cyan + model + C.reset + ' | ' + C.blue + 'I/O ' + ioR + ':1' + C.reset + ' | ' + cchC + 'Cache ' + cchHit + '%' + C.reset + ' ' + C.dim + 'hit' + C.reset + ' | ' + C.dim + 'Ctx ' + pct + '%' + C.reset);
                break;
            }
            case 'worktree': {
                const wt = d.worktree;
                const agentName = d.agent?.name;
                let l1 = '';
                if (wt?.name) {
                    const wtBr = wt.branch || '';
                    const origBr = wt.original_branch || '';
                    const brInfo = wtBr ? C.magenta + wtBr + C.reset + (origBr ? ' ' + C.dim + '<-' + C.reset + ' ' + C.dim + origBr + C.reset : '') : '';
                    l1 = C.bold + C.blue + 'WT:' + wt.name + C.reset + (brInfo ? ' ' + C.dim + '(' + C.reset + brInfo + C.dim + ')' + C.reset : '');
                } else if (branch) {
                    l1 = C.magenta + branch + C.reset;
                }
                if (agentName) l1 += (l1 ? ' | ' : '') + C.yellow + 'Agent:' + agentName + C.reset;
                l1 += (l1 ? ' | ' : '') + C.cyan + model + C.reset;
                console.log(l1);
                const lp = (linesAdd || linesRem) ? ' | ' + C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset : '';
                console.log(cc + mkBar(pct, 10) + C.reset + ' ' + C.dim + pct + '%' + C.reset + ' | ' + C.yellow + fmtCost(cost) + C.reset + lp + ' | ' + C.dim + fmtDurShort(durMs) + C.reset);
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
