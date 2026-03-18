#!/usr/bin/env node
// mclaude status line script - auto-managed by mclaude
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";

const PROVIDER = process.env.MCLAUDE_PROVIDER_NAME || "";
const MODEL_HINT = process.env.MCLAUDE_MODEL || "";
const TEMPLATE = process.env.MCLAUDE_STATUSLINE_TEMPLATE || "default";
const LANG = process.env.MCLAUDE_LANG || "en";
const OAUTH_TOKEN = process.env.MCLAUDE_OAUTH_TOKEN || "";
const CLAUDE_CONFIG_DIR = process.env.MCLAUDE_CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const CACHE_DIR = join(tmpdir(), "mclaude-cache");
const CACHE_FILE = join(CACHE_DIR, "usage-cache.json");
const LOCK_FILE = join(CACHE_DIR, "usage.lock");
const CACHE_TTL_MS = 120000; // 120 seconds
const LOCK_TTL_MS = 30000; // 30 seconds — rate limit between API attempts
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 300000; // 5 min backoff for 429
const C = {
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[91m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
	reset: "\x1b[0m",
	white: "\x1b[97m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
	brightBlue: "\x1b[94m",
	orange: "\x1b[38;5;208m",
};

const L = {
	en: {
		left: "left",
		hit: "hit",
		session: "Session",
		api: "API",
		cost: "Cost",
		time: "time",
		ctxApproaching: "approaching",
		ctxImminent: "imminent",
		ctxCompact: "/compact",
		usage5h: "5h",
		usage7d: "7d",
		usageReset: "reset",
		usageWeekly: "weekly",
	},
	"pt-BR": {
		left: "rest.",
		hit: "hit",
		session: "Sessao",
		api: "API",
		cost: "Custo",
		time: "tempo",
		ctxApproaching: "aproximando",
		ctxImminent: "iminente",
		ctxCompact: "/compact",
		usage5h: "5h",
		usage7d: "7d",
		usageReset: "reset",
		usageWeekly: "semanal",
	},
	es: {
		left: "rest.",
		hit: "hit",
		session: "Sesion",
		api: "API",
		cost: "Costo",
		time: "tiempo",
		ctxApproaching: "aproximando",
		ctxImminent: "inminente",
		ctxCompact: "/compact",
		usage5h: "5h",
		usage7d: "7d",
		usageReset: "reset",
		usageWeekly: "semanal",
	},
}[LANG] || {
	left: "left",
	hit: "hit",
	session: "Session",
	api: "API",
	cost: "Cost",
	time: "time",
	ctxApproaching: "approaching",
	ctxImminent: "imminent",
	ctxCompact: "/compact",
	usage5h: "5h",
	usage7d: "7d",
	usageReset: "reset",
	usageWeekly: "weekly",
};

const fmtK = (n) => {
	if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
	if (n >= 1000) return (n / 1000).toFixed(1) + "k";
	return String(n);
};

const fmtDur = (ms) => {
	const s = Math.floor(ms / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (h > 0) return h + "h" + String(m).padStart(2, "0") + "m";
	return m + "m " + sec + "s";
};

const fmtDurShort = (ms) => Math.floor(ms / 60000) + "m";
const fmtCost = (usd) => "$" + usd.toFixed(2);
const mkBar = (pct, w) =>
	"\u2501".repeat(Math.floor((pct * w) / 100)) + "\u254c".repeat(w - Math.floor((pct * w) / 100));
const ctxC = (pct) => {
	if (pct >= 80) return C.bold + C.red;
	if (pct >= 70) return C.orange;
	if (pct >= 61) return C.yellow;
	return C.white;
};
const usageC = (pct) => {
	if (pct >= 90) return C.bold + C.red;
	if (pct >= 80) return C.orange;
	if (pct >= 70) return C.yellow;
	return C.white;
};
const fmtResetTime = (isoStr) => {
	try {
		const diffMs = new Date(isoStr).getTime() - Date.now();
		if (diffMs <= 0) return "now";
		const m = Math.floor(diffMs / 60000);
		if (m >= 1440) {
			const d = Math.floor(m / 1440);
			const h = Math.floor((m % 1440) / 60);
			return d + "d" + String(h).padStart(2, "0") + "h";
		}
		if (m >= 60) {
			const h = Math.floor(m / 60);
			const rm = m % 60;
			return h + "h" + String(rm).padStart(2, "0") + "m";
		}
		return m + "m";
	} catch {
		return "--";
	}
};
const readFreshOAuthToken = () => {
	// Read token from the active config dir (default or isolated installation)
	try {
		const credFile = join(CLAUDE_CONFIG_DIR, ".credentials.json");
		if (existsSync(credFile)) {
			const raw = JSON.parse(readFileSync(credFile, "utf-8"));
			const token = raw?.claudeAiOauth?.accessToken;
			if (token) return token;
		}
	} catch {}
	// macOS Keychain fallback (only for default installation)
	if (process.platform === "darwin" && !process.env.MCLAUDE_CLAUDE_CONFIG_DIR) {
		try {
			const result = execSync('security find-generic-password -s "Claude Code-credentials" -w', {
				encoding: "utf-8",
				timeout: 3000,
				stdio: ["pipe", "pipe", "ignore"],
			});
			const parsed = JSON.parse(result.trim());
			return parsed?.claudeAiOauth?.accessToken || null;
		} catch {}
	}
	return null;
};
const isLockActive = () => {
	try {
		if (!existsSync(LOCK_FILE)) return false;
		const lock = JSON.parse(readFileSync(LOCK_FILE, "utf-8"));
		return lock.blockedUntil > Date.now();
	} catch {
		try {
			const age = Date.now() - statSync(LOCK_FILE).mtimeMs;
			return age < LOCK_TTL_MS;
		} catch {}
	}
	return false;
};
const writeLock = (blockedUntilMs) => {
	try {
		if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
		writeFileSync(LOCK_FILE, JSON.stringify({ blockedUntil: blockedUntilMs }));
	} catch {}
};
const tryFetchUsage = async (token) => {
	if (!token) return { data: null, rateLimited: false };
	try {
		const resp = await fetch("https://api.anthropic.com/api/oauth/usage", {
			headers: {
				Authorization: "Bearer " + token,
				"anthropic-beta": "oauth-2025-04-20",
			},
			signal: AbortSignal.timeout(5000),
		});
		if (resp.status === 429) {
			const retryAfter = resp.headers.get("retry-after");
			const backoffMs = retryAfter
				? parseInt(retryAfter, 10) * 1000 || DEFAULT_RATE_LIMIT_BACKOFF_MS
				: DEFAULT_RATE_LIMIT_BACKOFF_MS;
			return { data: null, rateLimited: true, backoffMs };
		}
		if (!resp.ok) return { data: null, rateLimited: false };
		const data = await resp.json();
		return { data: data?.five_hour ? data : null, rateLimited: false };
	} catch {
		return { data: null, rateLimited: false };
	}
};
const readStaleCache = () => {
	try {
		if (existsSync(CACHE_FILE)) {
			return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
		}
	} catch {}
	return null;
};
const getUsageData = async () => {
	const hasAnyToken = OAUTH_TOKEN || readFreshOAuthToken();
	if (!hasAnyToken) return null;

	// 1. Fresh cache → use immediately
	try {
		if (existsSync(CACHE_FILE)) {
			const age = Date.now() - statSync(CACHE_FILE).mtimeMs;
			if (age < CACHE_TTL_MS) {
				return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
			}
		}
	} catch {}

	// 2. Lock active → another instance is fetching, use stale cache
	if (isLockActive()) return readStaleCache();

	// 3. Acquire lock and fetch
	writeLock(Date.now() + LOCK_TTL_MS);

	// Try with env var token first
	let result = await tryFetchUsage(OAUTH_TOKEN);

	// If failed (not rate-limited), try with fresh token from config dir
	if (!result.data && !result.rateLimited) {
		const freshToken = readFreshOAuthToken();
		if (freshToken && freshToken !== OAUTH_TOKEN) {
			result = await tryFetchUsage(freshToken);
		}
	}

	// If rate limited, write lock with long backoff
	if (result.rateLimited) {
		writeLock(Date.now() + (result.backoffMs || DEFAULT_RATE_LIMIT_BACKOFF_MS));
	}

	// Cache successful data
	if (result.data) {
		try {
			if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
			writeFileSync(CACHE_FILE, JSON.stringify(result.data));
		} catch {}
		return result.data;
	}

	// Fallback: stale cache
	return readStaleCache();
};
const SEP = C.dim + " | " + C.reset;
const SEP_W = 3; // visible width of ' | '

// Grid layout helpers
const visibleLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, "").length;
const padV = (s, w) => {
	const vl = visibleLen(s);
	return vl >= w ? s : s + " ".repeat(w - vl);
};

// Compute column width W from all core segments across all lines
const calcW = (coreLines) => Math.max(...coreLines.flat().filter(Boolean).map(visibleLen));

// Render grid lines: all core segments padded to W, tail appended as-is
const fmtGrid = (W, coreLines, tailPerLine = []) => {
	return coreLines.map((core, i) => {
		const padded = core.map((s) => padV(s, W));
		const tail = (tailPerLine[i] || []).filter(Boolean);
		return [...padded, ...tail].join(SEP);
	});
};

// Build unified bar line: entire line in one color block (no mid-line resets)
const mkBarLine = (cc, pct, barW, W, ctxTokens, remaining, remPct, leftLabel, statusTxt) => {
	const padPlain = (s, w) => (s.length >= w ? s : s + " ".repeat(w - s.length));
	return (
		cc +
		mkBar(pct, barW) +
		" | " +
		padPlain(fmtK(ctxTokens) + "/" + pct + "%", W) +
		" | " +
		padPlain(fmtK(remaining) + "/" + remPct + "% " + leftLabel, W) +
		statusTxt +
		C.reset
	);
};

// Build usage bar line: bar | 5h% | reset time left | weekly%
const mkUsageBarLine = (cc, pct5h, barW, W, reset5h, pct7d, has7d) => {
	const padPlain = (s, w) => (s.length >= w ? s : s + " ".repeat(w - s.length));
	const resetStr = reset5h ? fmtResetTime(reset5h) + " " + L.left : "--";
	const weeklyStr = has7d ? Math.floor(pct7d) + "% " + L.usageWeekly : "";
	return (
		cc +
		mkBar(pct5h, barW) +
		" | " +
		padPlain(Math.floor(pct5h) + "%", W) +
		" | " +
		padPlain(resetStr, W) +
		(weeklyStr ? " | " + weeklyStr : "") +
		C.reset
	);
};

// Simple uniform padding for non-grid templates (mini)
const fmtLine = (core, tail = []) => {
	const fc = core.filter(Boolean);
	if (!fc.length) return tail.filter(Boolean).join(SEP);
	const W = Math.max(...fc.map(visibleLen));
	return [...fc.map((s) => padV(s, W)), ...tail.filter(Boolean)].join(SEP);
};

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", async () => {
	try {
		const d = JSON.parse(input);

		// -- Session --
		const cwd = d.cwd || "";
		const sessionId = d.session_id || "";
		const transcriptPath = d.transcript_path || "";
		const claudeVersion = d.version || "";

		// -- Model --
		const modelId = d.model?.id || "";
		const model = d.model?.display_name || MODEL_HINT || "unknown";

		// -- Workspace --
		const workspaceCurrentDir = d.workspace?.current_dir || "";
		const workspaceProjectDir = d.workspace?.project_dir || "";

		// -- Output style --
		const outputStyle = d.output_style?.name || "default";

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
		const vimMode = d.vim?.mode || "";

		// -- Agent --
		const agentName = d.agent?.name || "";

		// -- Worktree --
		const wt = d.worktree;
		const wtName = wt?.name || "";
		const wtPath = wt?.path || "";
		const wtBranch = wt?.branch || "";
		const wtOriginalCwd = wt?.original_cwd || "";
		const wtOriginalBranch = wt?.original_branch || "";

		// -- Git branch (from local git) --
		let branch = "";
		try {
			branch = execSync("git branch --show-current", { encoding: "utf8", timeout: 2000 }).trim();
		} catch {}

		// -- Derived values --
		const cc = ctxC(pct);
		const ctxStatus =
			pct >= 80
				? " " + cc + "(" + L.ctxCompact + ")" + C.reset
				: pct >= 70
					? " " + cc + "(" + L.ctxImminent + ")" + C.reset
					: pct >= 61
						? " " + cc + "(" + L.ctxApproaching + ")" + C.reset
						: "";
		const ctxStatusTxt =
			pct >= 80
				? " (" + L.ctxCompact + ")"
				: pct >= 70
					? " (" + L.ctxImminent + ")"
					: pct >= 61
						? " (" + L.ctxApproaching + ")"
						: "";
		const ctxTokens = curIn + cacheCreate + cacheRead;
		const cachedTokens = cacheCreate + cacheRead;
		const remaining = Math.floor((ctxSize * remPct) / 100);
		// -- Git display parts --
		let gitPart = "";
		if (wtName) {
			const brInfo = wtBranch
				? C.magenta +
					wtBranch +
					C.reset +
					(wtOriginalBranch
						? " " + C.dim + "<-" + C.reset + " " + C.white + wtOriginalBranch + C.reset
						: "")
				: "";
			gitPart =
				C.bold +
				C.brightBlue +
				"WT:" +
				wtName +
				C.reset +
				(brInfo ? " " + C.dim + "(" + C.reset + brInfo + C.dim + ")" + C.reset : "");
		} else if (branch) {
			gitPart = C.magenta + branch + C.reset;
		}
		if (agentName) gitPart += (gitPart ? SEP : "") + C.yellow + "Agent:" + agentName + C.reset;
		const linesPart =
			linesAdd || linesRem
				? C.green + "+" + linesAdd + C.reset + " " + C.red + "-" + linesRem + C.reset
				: "";

		// -- Usage limits (Anthropic only) --
		const usage = await getUsageData();
		const has5h = usage?.five_hour != null;
		const has7d = usage?.seven_day != null;
		const u5h = usage?.five_hour?.utilization ?? 0;
		const u7d = usage?.seven_day?.utilization ?? 0;
		const reset5h = usage?.five_hour?.resets_at || "";
		const reset7d = usage?.seven_day?.resets_at || "";

		// Shared parts
		const provModel = PROVIDER
			? C.cyan + PROVIDER + C.reset + "/" + C.white + model + C.reset
			: C.white + model + C.reset;
		switch (TEMPLATE) {
			case "default": {
				// Grid: 3 columns
				const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;

				// Line 1: Provider/Model + git info + lines changed
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");

				const coreLines = [
					[
						C.cyan + "Input:" + fmtK(totalIn) + C.reset,
						C.yellow + "Output:" + fmtK(totalOut) + C.reset,
						C.green + "Cache:" + fmtK(cachedTokens) + C.reset,
					],
					[
						C.cyan + L.session + ":" + fmtDur(durMs) + C.reset,
						C.yellow + L.api + ":" + fmtDur(apiMs) + C.reset,
						C.green + L.cost + ":" + fmtCost(cost) + C.reset,
					],
				];
				const tailPerLine = [[], [C.green + fmtCost(cpm) + "/min" + C.reset]];
				const W = calcW(coreLines);
				const lines = fmtGrid(W, coreLines, tailPerLine);

				// Bar line: bar(2 cols) | used/pct(1 col) | remaining/pct left(1 col)
				const barW = 2 * W + SEP_W;
				const barLine = mkBarLine(
					cc,
					pct,
					barW,
					W,
					ctxTokens,
					remaining,
					remPct,
					L.left,
					ctxStatusTxt,
				);

				console.log(provModelLine);
				lines.forEach((l) => console.log(l));
				console.log(barLine);
				if (has5h || has7d) {
					const uc = usageC(u5h);
					console.log(mkUsageBarLine(uc, u5h, 2 * W + SEP_W, W, reset5h, u7d, has7d));
				}
				break;
			}
			case "full": {
				// Grid: 3 columns — context line moved to last position
				const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;

				// Line 1: Provider/Model + git info + lines changed
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");

				const coreLines = [
					[
						C.cyan + "Input:" + fmtK(totalIn) + C.reset,
						C.yellow + "Output:" + fmtK(totalOut) + C.reset,
						C.green + "Cache:" + fmtK(cachedTokens) + C.reset,
					],
					[
						C.cyan + L.session + ":" + fmtDur(durMs) + C.reset,
						C.yellow + L.api + ":" + fmtDur(apiMs) + C.reset,
						C.green + L.cost + ":" + fmtCost(cost) + C.reset,
					],
					[
						cc + "Ctx:" + fmtK(ctxTokens) + "/" + pct + "%" + C.reset,
						cc + L.left + ":" + fmtK(remaining) + "/" + remPct + "%" + C.reset,
						cc + "Win:" + fmtK(ctxSize) + C.reset,
					],
				];
				const tailPerLine = [
					[],
					[C.green + fmtCost(cpm) + "/min" + C.reset],
					[ctxStatus ? ctxStatus.trim() : ""],
				];
				const W = calcW(coreLines);
				const lines = fmtGrid(W, coreLines, tailPerLine);

				console.log(provModelLine);
				lines.forEach((l) => console.log(l));
				if (has5h || has7d) {
					const uc = usageC(u5h);
					const resetStr = reset5h ? L.usageReset + ":" + fmtResetTime(reset5h) : "--";
					const usageParts = [
						uc + padV(L.usage5h + ":" + Math.floor(u5h) + "%", W) + C.reset,
						uc + padV(resetStr, W) + C.reset,
						has7d ? uc + padV(L.usage7d + ":" + Math.floor(u7d) + "%", W) + C.reset : "",
					].filter(Boolean);
					console.log(usageParts.join(SEP));
				}
				break;
			}
			case "slim": {
				// Grid: 3 columns — compact version of default

				// Line 1: Provider/Model + git info + lines changed
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");

				const coreLines = [
					[
						C.cyan + "Input:" + fmtK(totalIn) + C.reset,
						C.yellow + "Output:" + fmtK(totalOut) + C.reset,
						C.green + L.cost + ":" + fmtCost(cost) + C.reset,
						C.cyan + L.session + ":" + fmtDur(durMs) + C.reset,
					],
				];
				const W = calcW(coreLines);
				const lines = fmtGrid(W, coreLines);

				// Bar line: bar(2 cols) | used/pct(1 col) | remaining/pct left(1 col)
				const barW = 2 * W + SEP_W;
				const barLine = mkBarLine(
					cc,
					pct,
					barW,
					W,
					ctxTokens,
					remaining,
					remPct,
					L.left,
					ctxStatusTxt,
				);

				console.log(provModelLine);
				lines.forEach((l) => console.log(l));
				console.log(barLine);
				if (has5h || has7d) {
					const uc = usageC(u5h);
					console.log(mkUsageBarLine(uc, u5h, 2 * W + SEP_W, W, reset5h, u7d, has7d));
				}
				break;
			}
			case "mini": {
				// Two lines — follows default color scheme
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");
				console.log(provModelLine);
				const miniParts = [
					cc + "Ctx " + pct + "%" + ctxStatus + C.reset,
					C.green + fmtCost(cost) + C.reset,
					C.cyan + fmtDurShort(durMs) + C.reset,
				];
				if (has5h) miniParts.push(usageC(u5h) + L.usage5h + ":" + Math.floor(u5h) + "%" + C.reset);
				console.log(fmtLine(miniParts));
				break;
			}
			case "cost": {
				// Grid: 3 columns — cost-focused
				const cpm = durMs > 0 ? cost / (durMs / 60000) : 0;
				const cph = cpm * 60;
				const inCost =
					cost > 0 && totalIn + totalOut > 0 ? (cost * totalIn) / (totalIn + totalOut) : 0;
				const outCost = cost > 0 ? cost - inCost : 0;

				// Line 1: Provider/Model + git info + lines changed
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");

				const coreLines = [
					[
						C.cyan + "Input:" + fmtCost(inCost) + C.reset,
						C.yellow + "Output:" + fmtCost(outCost) + C.reset,
						C.green + L.cost + ":" + fmtCost(cost) + C.reset,
					],
					[
						C.cyan + fmtCost(cpm) + "/min" + C.reset,
						C.yellow + "~" + fmtCost(cph) + "/h" + C.reset,
						C.green + L.session + ":" + fmtDur(durMs) + C.reset,
					],
				];
				const W = calcW(coreLines);
				const lines = fmtGrid(W, coreLines);

				// Bar line: bar(2 cols) | used/pct(1 col) | remaining/pct left(1 col)
				const barW = 2 * W + SEP_W;
				const barLine = mkBarLine(
					cc,
					pct,
					barW,
					W,
					ctxTokens,
					remaining,
					remPct,
					L.left,
					ctxStatusTxt,
				);

				console.log(provModelLine);
				lines.forEach((l) => console.log(l));
				console.log(barLine);
				if (has5h || has7d) {
					const uc = usageC(u5h);
					console.log(mkUsageBarLine(uc, u5h, 2 * W + SEP_W, W, reset5h, u7d, has7d));
				}
				break;
			}
			case "perf": {
				// Grid: 3 columns — performance-focused
				const totalCch = cacheCreate + cacheRead;
				const cchHit = totalCch > 0 ? Math.floor((cacheRead / totalCch) * 100) : 0;
				const ioR = curOut > 0 ? (curIn / curOut).toFixed(1) : "\u221e";
				const apiPct = durMs > 0 ? Math.floor((apiMs / durMs) * 100) : 0;
				const outTokS = apiMs > 0 ? Math.floor(totalOut / (apiMs / 1000)) : 0;

				// Line 1: Provider/Model + git info + lines changed
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");

				const coreLines = [
					[
						C.cyan + "Cache:" + cchHit + "% " + L.hit + C.reset,
						C.yellow + "I/O " + ioR + ":1" + C.reset,
						C.green + L.api + ":" + apiPct + "% " + L.time + C.reset,
					],
					[
						C.cyan + "Output:~" + outTokS + "tok/s" + C.reset,
						C.yellow + L.session + ":" + fmtDur(durMs) + C.reset,
						C.green + fmtCost(cost) + C.reset,
					],
				];
				const W = calcW(coreLines);
				const lines = fmtGrid(W, coreLines);

				// Bar line: bar(2 cols) | used/pct(1 col) | remaining/pct left(1 col)
				const barW = 2 * W + SEP_W;
				const barLine = mkBarLine(
					cc,
					pct,
					barW,
					W,
					ctxTokens,
					remaining,
					remPct,
					L.left,
					ctxStatusTxt,
				);

				console.log(provModelLine);
				lines.forEach((l) => console.log(l));
				console.log(barLine);
				if (has5h || has7d) {
					const uc = usageC(u5h);
					console.log(mkUsageBarLine(uc, u5h, 2 * W + SEP_W, W, reset5h, u7d, has7d));
				}
				break;
			}
			case "context": {
				// Grid: 3 columns — context window detail
				const totalUsed = ctxTokens + curOut;

				// Line 1: Provider/Model + git info + lines changed
				const gitAndLines = [gitPart, linesPart].filter(Boolean).join(" ");
				const provModelLine =
					provModel +
					(gitAndLines ? " " + C.dim + "(" + C.reset + gitAndLines + C.dim + ")" + C.reset : "");

				const coreLines = [
					[
						C.cyan + "Input:" + fmtK(curIn) + C.reset,
						C.yellow + "Output:" + fmtK(curOut) + C.reset,
						C.green + "Total:" + fmtK(totalUsed) + "/" + fmtK(ctxSize) + C.reset,
					],
					[
						C.cyan + "CacheCreate:" + fmtK(cacheCreate) + C.reset,
						C.yellow + "CacheRead:" + fmtK(cacheRead) + C.reset,
						C.green + "Cache:" + fmtK(cachedTokens) + C.reset,
					],
				];
				const W = calcW(coreLines);
				const lines = fmtGrid(W, coreLines);

				// Bar line: bar(2 cols) | used/pct(1 col) | remaining/pct left(1 col)
				const barW = 2 * W + SEP_W;
				const barLine = mkBarLine(
					cc,
					pct,
					barW,
					W,
					ctxTokens,
					remaining,
					remPct,
					L.left,
					ctxStatusTxt,
				);

				console.log(provModelLine);
				lines.forEach((l) => console.log(l));
				console.log(barLine);
				if (has5h || has7d) {
					const uc = usageC(u5h);
					console.log(mkUsageBarLine(uc, u5h, 2 * W + SEP_W, W, reset5h, u7d, has7d));
				}
				break;
			}
			default:
				console.log(provModel);
		}
	} catch {
		console.log("[mclaude]");
	}
});
