import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR } from "./config.ts";
import type { ConfiguredProvider } from "./schema.ts";

export const STATUSLINE_TEMPLATE_IDS = ["none", "full", "slim", "mini", "cost", "dev", "perf", "context"] as const;
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
		preview: "Provider/Opus\n\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 153.9k/77% | 46.1k/23% left\nIn:84.2k | Out:62.8k | I/O 1.3:1 | Cache:20.6M (71% hit) | $0.19/min | Cost:$11.15\nSession:3h31m | API:1h38m | master | (+45,-7)",
	},
	{
		id: "slim",
		nameKey: "statusLine.slim",
		descKey: "statusLine.slimDesc",
		preview: "Provider/Opus\n\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 153.9k/77% | 46.1k/23% left\nIn:84.2k Out:62.8k | $11.15 | 3h31m | master | (+45,-7)",
	},
	{
		id: "mini",
		nameKey: "statusLine.mini",
		descKey: "statusLine.miniDesc",
		preview: "Provider/Opus | Ctx 77% | $11.15 | 3h31m | master | (+45,-7)",
	},
	{
		id: "cost",
		nameKey: "statusLine.cost",
		descKey: "statusLine.costDesc",
		preview: "",
	},
	{
		id: "dev",
		nameKey: "statusLine.dev",
		descKey: "statusLine.devDesc",
		preview: "",
	},
	{
		id: "perf",
		nameKey: "statusLine.perf",
		descKey: "statusLine.perfDesc",
		preview: "",
	},
	{
		id: "context",
		nameKey: "statusLine.context",
		descKey: "statusLine.contextDesc",
		preview: "",
	},
];

function getStatusLineScript(): string {
	return `#!/usr/bin/env node
// mclaude status line script - auto-managed by mclaude
const PROVIDER = process.env.MCLAUDE_PROVIDER_NAME || '';
const MODEL_HINT = process.env.MCLAUDE_MODEL || '';
const TEMPLATE = process.env.MCLAUDE_STATUSLINE_TEMPLATE || 'full';
const LANG = process.env.MCLAUDE_LANG || 'en';

const C = { cyan: '\\x1b[36m', green: '\\x1b[32m', yellow: '\\x1b[33m', red: '\\x1b[91m', dim: '\\x1b[2m', bold: '\\x1b[1m', reset: '\\x1b[0m', white: '\\x1b[37m', magenta: '\\x1b[35m', blue: '\\x1b[34m', brightBlue: '\\x1b[94m' };

const L = ({
    en:      { left: 'left',  hit: 'hit', session: 'Session', api: 'API', cost: 'Cost', time: 'time' },
    'pt-BR': { left: 'rest.', hit: 'hit', session: 'Sessao',  api: 'API', cost: 'Custo', time: 'tempo' },
    es:      { left: 'rest.', hit: 'hit', session: 'Sesion',  api: 'API', cost: 'Costo', time: 'tiempo' },
})[LANG] || { left: 'left', hit: 'hit', session: 'Session', api: 'API', cost: 'Cost', time: 'time' };

const fmtK = (n) => { if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return String(n); };
const fmtDur = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; if (h > 0) return h + 'h' + String(m).padStart(2, '0') + 'm'; return m + 'm ' + sec + 's'; };
const fmtDurShort = (ms) => Math.floor(ms / 60000) + 'm';
const fmtCost = (usd) => '$' + usd.toFixed(2);
const mkBar = (pct, w) => '\\u2593'.repeat(Math.floor(pct * w / 100)) + '\\u2591'.repeat(w - Math.floor(pct * w / 100));
const ctxC = (pct) => pct > 90 ? C.red : pct > 70 ? C.yellow : C.white;
const costC = (usd) => usd >= 5 ? C.red : usd >= 1 ? C.yellow : C.green;
const cphC = (usd) => usd >= 20 ? C.red : usd >= 5 ? C.yellow : C.green;
const SEP = C.dim + ' | ' + C.reset;

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

        let branch = '';
        try { const { execSync } = require('child_process'); branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8', timeout: 2000 }).trim(); } catch {}

        const cc = ctxC(pct);
        const ctxTokens = curIn + cacheCreate + cacheRead;
        const cachedTokens = cacheCreate + cacheRead;
        const remaining = Math.floor(ctxSize * remPct / 100);

        // Worktree / agent / branch info (shared by full and slim)
        const wt = d.worktree;
        const agentName = d.agent?.name;
        let gitPart = '';
        if (wt?.name) {
            const wtBr = wt.branch || '';
            const origBr = wt.original_branch || '';
            const brInfo = wtBr ? C.magenta + wtBr + C.reset + (origBr ? ' ' + C.dim + '<-' + C.reset + ' ' + C.white + origBr + C.reset : '') : '';
            gitPart = C.bold + C.brightBlue + 'WT:' + wt.name + C.reset + (brInfo ? ' ' + C.dim + '(' + C.reset + brInfo + C.dim + ')' + C.reset : '');
        } else if (branch) {
            gitPart = C.magenta + branch + C.reset;
        }
        if (agentName) gitPart += (gitPart ? SEP : '') + C.yellow + 'Agent:' + agentName + C.reset;
        const linesPart = (linesAdd || linesRem) ? SEP + C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset : '';

        // Shared parts
        const provModel = PROVIDER ? C.cyan + PROVIDER + C.reset + '/' + C.white + model + C.reset : C.white + model + C.reset;
        const ctxBar = cc + mkBar(pct, 30) + ' ' + fmtK(ctxTokens) + '/' + pct + '%' + C.reset + SEP + cc + fmtK(remaining) + '/' + remPct + '% ' + L.left + C.reset;
        const ctxBarWide = cc + mkBar(pct, 50) + ' ' + fmtK(ctxTokens) + '/' + pct + '%' + C.reset + SEP + cc + fmtK(remaining) + ' ' + L.left + C.reset;

        // All templates start with provider/model on line 1
        switch (TEMPLATE) {
            case 'full': {
                console.log(provModel);
                console.log(ctxBar);

                const ioR = curOut > 0 ? (curIn / curOut).toFixed(1) : '\\u221e';
                const totalCch = cacheCreate + cacheRead;
                const cchHit = totalCch > 0 ? Math.floor(cacheRead / totalCch * 100) : 0;
                const cchC = cchHit >= 60 ? C.green : cchHit >= 30 ? C.yellow : C.red;
                const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;
                const cCol = costC(cost);
                console.log(
                    C.cyan + 'In:' + fmtK(totalIn) + C.reset + '/' + C.yellow + 'Out:' + fmtK(totalOut) + C.reset +
                    ' ' + C.dim + '(' + C.reset + C.brightBlue + 'I/O ' + ioR + ':1' + C.reset + C.dim + ')' + C.reset + SEP +
                    C.green + 'Cache:' + fmtK(cachedTokens) + C.reset +
                    (totalCch > 0 ? C.dim + ' (' + C.reset + cchC + cchHit + '% ' + L.hit + C.reset + C.dim + ')' + C.reset : '')
                );

                let l4 = C.white + L.session + ':' + fmtDur(durMs) + C.reset + SEP + C.white + L.api + ':' + fmtDur(apiMs) + C.reset + SEP +
                    C.cyan + L.cost + ':' + fmtCost(cost) + C.reset + SEP +
                    C.cyan + fmtCost(cpm) + '/min' + C.reset;
                if (gitPart) l4 += SEP + gitPart;
                l4 += linesPart;
                console.log(l4);
                break;
            }
            case 'slim': {
                console.log(provModel);
                console.log(ctxBar);

                const cCol = costC(cost);
                let l3 = C.cyan + 'In:' + fmtK(totalIn) + C.reset + ' ' + C.yellow + 'Out:' + fmtK(totalOut) + C.reset + SEP +
                    C.bold + cCol + fmtCost(cost) + C.reset + SEP +
                    C.white + fmtDur(durMs) + C.reset;
                if (gitPart) l3 += SEP + gitPart;
                l3 += linesPart;
                console.log(l3);
                break;
            }
            case 'mini': {
                const cCol = costC(cost);
                let line = provModel + SEP + cc + 'Ctx ' + pct + '%' + C.reset + SEP + C.bold + cCol + fmtCost(cost) + C.reset + SEP + C.white + fmtDurShort(durMs) + C.reset;
                if (gitPart) line += SEP + gitPart;
                line += linesPart;
                console.log(line);
                break;
            }
            case 'cost': {
                console.log(provModel);
                console.log(ctxBar);
                const cCol = costC(cost);
                const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;
                const cph = cpm * 60;
                const cphCol = cphC(cph);
                const inCost = cost > 0 && (totalIn + totalOut) > 0 ? cost * totalIn / (totalIn + totalOut) : 0;
                const outCost = cost > 0 ? cost - inCost : 0;
                console.log(
                    C.bold + cCol + L.cost + ':' + fmtCost(cost) + C.reset + SEP +
                    C.cyan + fmtCost(cpm) + '/min' + C.reset + SEP +
                    cphCol + '~' + fmtCost(cph) + '/h' + C.reset + SEP +
                    C.cyan + 'In:' + fmtCost(inCost) + C.reset + ' ' + C.yellow + 'Out:' + fmtCost(outCost) + C.reset + SEP +
                    C.white + L.session + ':' + fmtDur(durMs) + C.reset
                );
                break;
            }
            case 'dev': {
                console.log(provModel);
                let l2 = '';
                if (gitPart) l2 += gitPart;
                if (linesAdd || linesRem) l2 += (l2 ? SEP : '') + C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset;
                if (!l2) l2 = C.dim + '(no git)' + C.reset;
                console.log(l2);
                const cCol = costC(cost);
                console.log(cc + 'Ctx ' + pct + '%' + C.reset + SEP + C.bold + cCol + fmtCost(cost) + C.reset + SEP + C.white + fmtDur(durMs) + C.reset);
                break;
            }
            case 'perf': {
                console.log(provModel);
                console.log(ctxBar);
                const totalCch = cacheCreate + cacheRead;
                const cchHit = totalCch > 0 ? Math.floor(cacheRead / totalCch * 100) : 0;
                const cchC = cchHit >= 60 ? C.green : cchHit >= 30 ? C.yellow : C.red;
                const ioR = curOut > 0 ? (curIn / curOut).toFixed(1) : '\\u221e';
                const apiPct = durMs > 0 ? Math.floor(apiMs / durMs * 100) : 0;
                const outTokS = apiMs > 0 ? Math.floor(totalOut / (apiMs / 1000)) : 0;
                const cCol = costC(cost);
                console.log(
                    cchC + 'Cache:' + cchHit + '% ' + L.hit + C.reset + SEP +
                    C.brightBlue + 'I/O ' + ioR + ':1' + C.reset + SEP +
                    C.cyan + L.api + ':' + apiPct + '% ' + L.time + C.reset + SEP +
                    C.yellow + 'Out:~' + outTokS + 'tok/s' + C.reset + SEP +
                    C.bold + cCol + fmtCost(cost) + C.reset
                );
                break;
            }
            case 'context': {
                console.log(provModel);
                console.log(ctxBarWide);
                const totalUsed = ctxTokens + curOut;
                console.log(
                    ' ' + C.cyan + 'Input:' + fmtK(curIn) + C.reset + SEP +
                    C.green + 'CacheCreate:' + fmtK(cacheCreate) + C.reset + SEP +
                    C.green + 'CacheRead:' + fmtK(cacheRead) + C.reset + SEP +
                    C.yellow + 'Output:' + fmtK(curOut) + C.reset + SEP +
                    C.bold + C.white + 'Total:' + fmtK(totalUsed) + '/' + fmtK(ctxSize) + C.reset
                );
                break;
            }
            default:
                console.log(provModel);
        }
    } catch {
        console.log('[mclaude]');
    }
});
`;
}

export async function ensureStatusLineScript(): Promise<string> {
	const scriptPath = join(CONFIG_DIR, "statusline.mjs");

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
	language: string,
): Record<string, string> {
	return {
		MCLAUDE_PROVIDER_NAME: provider.name,
		MCLAUDE_MODEL: model,
		MCLAUDE_STATUSLINE_TEMPLATE: template,
		MCLAUDE_LANG: language,
	};
}
