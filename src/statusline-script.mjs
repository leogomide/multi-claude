#!/usr/bin/env node
// mclaude status line script - auto-managed by mclaude
import { execSync } from 'child_process';

const PROVIDER = process.env.MCLAUDE_PROVIDER_NAME || '';
const MODEL_HINT = process.env.MCLAUDE_MODEL || '';
const TEMPLATE = process.env.MCLAUDE_STATUSLINE_TEMPLATE || 'default';
const LANG = process.env.MCLAUDE_LANG || 'en';

const C = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[91m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    white: '\x1b[97m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    brightBlue: '\x1b[94m',
};

const L = ({
    en:      { left: 'left',  hit: 'hit', session: 'Session', api: 'API', cost: 'Cost', time: 'time' },
    'pt-BR': { left: 'rest.', hit: 'hit', session: 'Sessao',  api: 'API', cost: 'Custo', time: 'tempo' },
    es:      { left: 'rest.', hit: 'hit', session: 'Sesion',  api: 'API', cost: 'Costo', time: 'tiempo' },
})[LANG] || { left: 'left', hit: 'hit', session: 'Session', api: 'API', cost: 'Cost', time: 'time' };

const fmtK = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
};

const fmtDur = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + 'h' + String(m).padStart(2, '0') + 'm';
    return m + 'm ' + sec + 's';
};

const fmtDurShort = (ms) => Math.floor(ms / 60000) + 'm';
const fmtCost = (usd) => '$' + usd.toFixed(2);
const mkBar = (pct, w) => '\u2501'.repeat(Math.floor(pct * w / 100)) + '\u254c'.repeat(w - Math.floor(pct * w / 100));
const ctxC = (pct) => pct > 90 ? C.red : pct > 70 ? C.yellow : C.white;
const costC = (usd) => usd >= 5 ? C.red : usd >= 1 ? C.yellow : C.green;
const cphC = (usd) => usd >= 20 ? C.red : usd >= 5 ? C.yellow : C.green;
const SEP = C.dim + ' | ' + C.reset;
const SEP_W = 3; // visible width of ' | '

// Grid layout helpers
const visibleLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;
const padV = (s, w) => {
    const vl = visibleLen(s);
    return vl >= w ? s : s + ' '.repeat(w - vl);
};

// Compute column width W from all core segments across all lines
const calcW = (coreLines) => Math.max(...coreLines.flat().filter(Boolean).map(visibleLen));

// Render grid lines: all core segments padded to W, tail appended as-is
const fmtGrid = (W, coreLines, tailPerLine = []) => {
    return coreLines.map((core, i) => {
        const padded = core.map(s => padV(s, W));
        const tail = (tailPerLine[i] || []).filter(Boolean);
        return [...padded, ...tail].join(SEP);
    });
};

// Build bar line that spans (cols-1) columns + 1 column for rest info
const fmtBarLine = (pct, W, cols, cc, restText) => {
    const barCols = cols - 1;
    const barW = barCols * W + (barCols - 1) * SEP_W;
    const bar = cc + mkBar(pct, barW) + C.reset;
    return bar + SEP + padV(restText, W);
};

// Simple uniform padding for non-grid templates (mini, dev)
const fmtLine = (core, tail = []) => {
    const fc = core.filter(Boolean);
    if (!fc.length) return tail.filter(Boolean).join(SEP);
    const W = Math.max(...fc.map(visibleLen));
    return [...fc.map(s => padV(s, W)), ...tail.filter(Boolean)].join(SEP);
};

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const d = JSON.parse(input);

        // -- Session --
        const cwd = d.cwd || '';
        const sessionId = d.session_id || '';
        const transcriptPath = d.transcript_path || '';
        const claudeVersion = d.version || '';

        // -- Model --
        const modelId = d.model?.id || '';
        const model = d.model?.display_name || MODEL_HINT || 'unknown';

        // -- Workspace --
        const workspaceCurrentDir = d.workspace?.current_dir || '';
        const workspaceProjectDir = d.workspace?.project_dir || '';

        // -- Output style --
        const outputStyle = d.output_style?.name || 'default';

        // -- Cost --
        const cost = d.cost?.total_cost_usd || 0;
        const durMs = d.cost?.total_duration_ms || 0;
        const apiMs = d.cost?.total_api_duration_ms || 0;
        const linesAdd = d.cost?.total_lines_added || 0;
        const linesRem = d.cost?.total_lines_removed || 0;

        // -- Context window --
        const totalIn = d.context_window?.total_input_tokens || 0;
        const totalOut = d.context_window?.total_output_tokens || 0;
        const ctxSize = d.context_window?.context_window_size || 200000;
        const pct = Math.floor(d.context_window?.used_percentage || 0);
        const remPct = Math.floor(d.context_window?.remaining_percentage || 0);
        const curIn = d.context_window?.current_usage?.input_tokens || 0;
        const curOut = d.context_window?.current_usage?.output_tokens || 0;
        const cacheCreate = d.context_window?.current_usage?.cache_creation_input_tokens || 0;
        const cacheRead = d.context_window?.current_usage?.cache_read_input_tokens || 0;
        const exceeds200k = d.exceeds_200k_tokens || false;

        // -- Vim --
        const vimMode = d.vim?.mode || '';

        // -- Agent --
        const agentName = d.agent?.name || '';

        // -- Worktree --
        const wt = d.worktree;
        const wtName = wt?.name || '';
        const wtPath = wt?.path || '';
        const wtBranch = wt?.branch || '';
        const wtOriginalCwd = wt?.original_cwd || '';
        const wtOriginalBranch = wt?.original_branch || '';

        // -- Git branch (from local git) --
        let branch = '';
        try {
            branch = execSync('git branch --show-current', { encoding: 'utf8', timeout: 2000 }).trim();
        } catch {}

        // -- Derived values --
        const cc = ctxC(pct);
        const ctxTokens = curIn + cacheCreate + cacheRead;
        const cachedTokens = cacheCreate + cacheRead;
        const remaining = Math.floor(ctxSize * remPct / 100);
        // -- Git display parts --
        let gitPart = '';
        if (wtName) {
            const brInfo = wtBranch ? C.magenta + wtBranch + C.reset + (wtOriginalBranch ? ' ' + C.dim + '<-' + C.reset + ' ' + C.white + wtOriginalBranch + C.reset : '') : '';
            gitPart = C.bold + C.brightBlue + 'WT:' + wtName + C.reset + (brInfo ? ' ' + C.dim + '(' + C.reset + brInfo + C.dim + ')' + C.reset : '');
        } else if (branch) {
            gitPart = C.magenta + branch + C.reset;
        }
        if (agentName) gitPart += (gitPart ? SEP : '') + C.yellow + 'Agent:' + agentName + C.reset;
        const linesPart = (linesAdd || linesRem) ? C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset : '';

        // Shared parts
        const provModel = PROVIDER ? C.cyan + PROVIDER + C.reset + '/' + C.white + model + C.reset : C.white + model + C.reset;
        const ctxRestText = cc + fmtK(remaining) + '/' + remPct + '% ' + L.left + C.reset;

        switch (TEMPLATE) {
            case 'default': {
                // Grid: 3 columns
                const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;

                // Line 1: Provider/Model + git info + lines changed
                const gitAndLines = [gitPart, linesPart].filter(Boolean).join(' ');
                const provModelLine = provModel + (gitAndLines ? ' ' + C.dim + '(' + C.reset + gitAndLines + C.dim + ')' + C.reset : '');

                const coreLines = [
                    [
                        C.cyan + 'Input:' + fmtK(totalIn) + C.reset,
                        C.yellow + 'Output:' + fmtK(totalOut) + C.reset,
                        C.green + 'Cache:' + fmtK(cachedTokens) + C.reset,
                    ],
                    [
                        C.cyan + L.session + ':' + fmtDur(durMs) + C.reset,
                        C.yellow + L.api + ':' + fmtDur(apiMs) + C.reset,
                        C.green + L.cost + ':' + fmtCost(cost) + C.reset,
                    ],
                ];
                const tailPerLine = [[], [C.green + fmtCost(cpm) + '/min' + C.reset]];
                const W = calcW(coreLines);
                const lines = fmtGrid(W, coreLines, tailPerLine);

                // Bar line: bar(2 cols) | used/pct(1 col) | remaining/pct left(1 col)
                const barW = 2 * W + SEP_W;
                const bar = cc + mkBar(pct, barW) + C.reset;
                const ctxUsed = cc + fmtK(ctxTokens) + '/' + pct + '%' + C.reset;
                const ctxLeft = cc + fmtK(remaining) + '/' + remPct + '% ' + L.left + C.reset;
                const barLine = bar + SEP + padV(ctxUsed, W) + SEP + padV(ctxLeft, W);

                console.log(provModelLine);
                lines.forEach(l => console.log(l));
                console.log(barLine);
                break;
            }
            case 'full': {
                // Grid: 3 columns — same as default + context detail line
                const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;

                // Line 1: Provider/Model + git info + lines changed
                const gitAndLines = [gitPart, linesPart].filter(Boolean).join(' ');
                const provModelLine = provModel + (gitAndLines ? ' ' + C.dim + '(' + C.reset + gitAndLines + C.dim + ')' + C.reset : '');

                const coreLines = [
                    [
                        C.cyan + 'Ctx:' + fmtK(ctxTokens) + '/' + pct + '%' + C.reset,
                        C.yellow + L.left + ':' + fmtK(remaining) + '/' + remPct + '%' + C.reset,
                        C.green + 'Win:' + fmtK(ctxSize) + C.reset,
                    ],
                    [
                        C.cyan + 'Input:' + fmtK(totalIn) + C.reset,
                        C.yellow + 'Output:' + fmtK(totalOut) + C.reset,
                        C.green + 'Cache:' + fmtK(cachedTokens) + C.reset,
                    ],
                    [
                        C.cyan + L.session + ':' + fmtDur(durMs) + C.reset,
                        C.yellow + L.api + ':' + fmtDur(apiMs) + C.reset,
                        C.green + L.cost + ':' + fmtCost(cost) + C.reset,
                    ],
                ];
                const tailPerLine = [[], [], [C.green + fmtCost(cpm) + '/min' + C.reset]];
                const W = calcW(coreLines);
                const lines = fmtGrid(W, coreLines, tailPerLine);

                console.log(provModelLine);
                lines.forEach(l => console.log(l));
                break;
            }
            case 'slim': {
                // Grid: 3 columns
                const COLS = 3;
                const cCol = costC(cost);

                const coreLines = [
                    [
                        C.cyan + 'Input:' + fmtK(totalIn) + C.reset + ' ' + C.yellow + 'Output:' + fmtK(totalOut) + C.reset,
                        C.bold + cCol + fmtCost(cost) + C.reset,
                        C.white + fmtDur(durMs) + C.reset,
                    ],
                ];
                const tailPerLine = [[gitPart, linesPart]];
                const W = calcW(coreLines);
                const lines = fmtGrid(W, coreLines, tailPerLine);

                console.log(provModel);
                console.log(fmtBarLine(pct, W, COLS, cc, ctxRestText));
                lines.forEach(l => console.log(l));
                break;
            }
            case 'mini': {
                // No grid — simple uniform padding
                const cCol = costC(cost);
                console.log(fmtLine(
                    [provModel, cc + 'Ctx ' + pct + '%' + C.reset, C.bold + cCol + fmtCost(cost) + C.reset, C.white + fmtDurShort(durMs) + C.reset],
                    [gitPart, linesPart]
                ));
                break;
            }
            case 'cost': {
                // Grid: 5 columns
                const COLS = 5;
                const cCol = costC(cost);
                const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;
                const cph = cpm * 60;
                const cphCol = cphC(cph);
                const inCost = cost > 0 && (totalIn + totalOut) > 0 ? cost * totalIn / (totalIn + totalOut) : 0;
                const outCost = cost > 0 ? cost - inCost : 0;

                const coreLines = [
                    [
                        C.bold + cCol + L.cost + ':' + fmtCost(cost) + C.reset,
                        C.cyan + fmtCost(cpm) + '/min' + C.reset,
                        cphCol + '~' + fmtCost(cph) + '/h' + C.reset,
                        C.cyan + 'Input:' + fmtCost(inCost) + C.reset + ' ' + C.yellow + 'Output:' + fmtCost(outCost) + C.reset,
                        C.white + L.session + ':' + fmtDur(durMs) + C.reset,
                    ],
                ];
                const W = calcW(coreLines);
                const lines = fmtGrid(W, coreLines);

                console.log(provModel);
                console.log(fmtBarLine(pct, W, COLS, cc, ctxRestText));
                lines.forEach(l => console.log(l));
                break;
            }
            case 'dev': {
                // No grid — simple uniform padding
                console.log(provModel);
                let l2 = '';
                if (gitPart) l2 += gitPart;
                if (linesAdd || linesRem) l2 += (l2 ? SEP : '') + C.green + '+' + linesAdd + C.reset + ' ' + C.red + '-' + linesRem + C.reset;
                if (!l2) l2 = C.dim + '(no git)' + C.reset;
                console.log(l2);
                const cCol = costC(cost);
                console.log(fmtLine([
                    cc + 'Ctx ' + pct + '%' + C.reset,
                    C.bold + cCol + fmtCost(cost) + C.reset,
                    C.white + fmtDur(durMs) + C.reset,
                ]));
                break;
            }
            case 'perf': {
                // Grid: 5 columns
                const COLS = 5;
                const totalCch = cacheCreate + cacheRead;
                const cchHit = totalCch > 0 ? Math.floor(cacheRead / totalCch * 100) : 0;
                const cchC = cchHit >= 60 ? C.green : cchHit >= 30 ? C.yellow : C.red;
                const ioR = curOut > 0 ? (curIn / curOut).toFixed(1) : '\u221e';
                const apiPct = durMs > 0 ? Math.floor(apiMs / durMs * 100) : 0;
                const outTokS = apiMs > 0 ? Math.floor(totalOut / (apiMs / 1000)) : 0;
                const cCol = costC(cost);

                const coreLines = [
                    [
                        cchC + 'Cache:' + cchHit + '% ' + L.hit + C.reset,
                        C.brightBlue + 'I/O ' + ioR + ':1' + C.reset,
                        C.cyan + L.api + ':' + apiPct + '% ' + L.time + C.reset,
                        C.yellow + 'Out:~' + outTokS + 'tok/s' + C.reset,
                        C.bold + cCol + fmtCost(cost) + C.reset,
                    ],
                ];
                const W = calcW(coreLines);
                const lines = fmtGrid(W, coreLines);

                console.log(provModel);
                console.log(fmtBarLine(pct, W, COLS, cc, ctxRestText));
                lines.forEach(l => console.log(l));
                break;
            }
            case 'context': {
                // Grid: 5 columns
                const COLS = 5;
                const totalUsed = ctxTokens + curOut;

                const coreLines = [
                    [
                        C.cyan + 'Input:' + fmtK(curIn) + C.reset,
                        C.green + 'CacheCreate:' + fmtK(cacheCreate) + C.reset,
                        C.green + 'CacheRead:' + fmtK(cacheRead) + C.reset,
                        C.yellow + 'Output:' + fmtK(curOut) + C.reset,
                        C.bold + C.white + 'Total:' + fmtK(totalUsed) + '/' + fmtK(ctxSize) + C.reset,
                    ],
                ];
                const W = calcW(coreLines);
                const lines = fmtGrid(W, coreLines);

                console.log(provModel);
                console.log(fmtBarLine(pct, W, COLS, cc, ctxRestText));
                lines.forEach(l => console.log(l));
                break;
            }
            default:
                console.log(provModel);
        }
    } catch {
        console.log('[mclaude]');
    }
});
