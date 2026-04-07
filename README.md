> *Gerar código é fácil. Transformar ideias em software real é o desafio.*

Quer ir além de prompts e dominar a **Engenharia de Contexto** — a habilidade que elimina a tentativa e erro e te dá controle total do projeto? Conheça a comunidade Ai Coders Academy:

**[Entrar na comunidade](https://kiwify.app/kBV4r4X?afid=Xox2vMps)**

<h1 align="center">multi-claude</h1>

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.29-blue)](https://github.com/leogomide/multi-claude/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![NPM](https://img.shields.io/badge/npm-%40leogomide%2Fmulti--claude-red)](https://www.npmjs.com/package/@leogomide/multi-claude)
[![Bun](https://img.shields.io/badge/runtime-Bun-ffcf2d)](https://bun.sh)
[![Claude Code](https://img.shields.io/badge/Claude-Code-orange)](https://docs.anthropic.com/en/docs/claude-code)

</div>

<div align="center">
  <img src="cover.png" alt="multi-claude cover" width="600"/>
</div>

<div align="center">

https://github.com/user-attachments/assets/d8565001-350a-46b8-ae28-6b5cc6937aa5

</div>

CLI tool to manage multiple API providers and launch [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with the correct environment variables.

Run `mclaude` to open a terminal UI where you can select a provider and model, manage your provider configurations, and launch Claude Code — all in one place.

## Prerequisites

- [Bun](https://bun.sh)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## Installation

### Global install (recommended)

```bash
bun install -g @leogomide/multi-claude
```

### Run without installing (using bunx)

```bash
bunx @leogomide/multi-claude
```

You can also create an alias for convenience:

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
alias mclaude='bunx @leogomide/multi-claude'

# Then run normally
mclaude
```

## Update

```bash
bun install -g @leogomide/multi-claude@latest
```

## Uninstall

```bash
bun remove -g @leogomide/multi-claude
```

## Usage

### Launch

```bash
mclaude
```

This opens the TUI where you can:

1. Select a configured provider from the main menu
2. Pick a model
3. Select an installation (or use default)
4. Claude Code starts with the correct environment variables

### Forwarding arguments to Claude Code

All extra arguments are passed directly to Claude Code:

```bash
mclaude --verbose
mclaude -p "explain this codebase"
mclaude --allowedTools "Bash(git *)" -p "show recent commits"
```

In TUI mode, the model is selected interactively. In headless mode, use `--model` / `-m` to specify it directly.

### TUI Flag Selection

Before launching Claude Code, the TUI presents a flag selection step where you can toggle common flags on or off. Flags passed via the command line are pre-checked, and your selection is persisted between sessions.

| Group | Flag | Description |
|-------|------|-------------|
| Session | `--resume` | Resume a previous session (interactive picker) |
| Permissions | `--dangerously-skip-permissions` | Skip all permission prompts (use with caution) |
| Development | `--verbose` | Enable verbose logging, shows full turn-by-turn output |
| Development | `--worktree [name]` | Run in an isolated git worktree |

### Headless Mode (non-interactive)

Skip the TUI entirely by specifying `--provider` on the command line. Useful for scripting, automation, and AI agents.

```bash
mclaude --provider deepseek --model deepseek-chat -p "explain this function"
mclaude --provider ollama --model llama3 -c
mclaude --provider anthropic --installation work -p "review this PR"
```

**mclaude flags:**

| Flag | Description |
|------|-------------|
| `--provider <name>` | Provider to use (template ID, name, or slug). **Required for headless mode.** |
| `--model <model>` | Model to use. Auto-selects first available if omitted. |
| `--installation <name>` | Installation to use. Defaults to `default`. |
| `--master-password <pw>` | Master password, if configured. Also accepts `MCLAUDE_MASTER_PASSWORD` env var. |
| `--list` | Print available providers, models, and installations as JSON. |

All other flags are forwarded to Claude Code (`-p`, `-c`, `--resume`, `--max-turns`, `--output-format`, etc.).

#### Discovery

Use `--list` to see what's available:

```bash
mclaude --list
```

```json
{
  "providers": [
    { "cliId": "deepseek", "name": "DeepSeek", "templateId": "deepseek", "type": "api", "models": ["deepseek-chat", "deepseek-reasoner"] }
  ],
  "installations": [
    { "cliId": "default", "name": "Default" }
  ],
  "usage": "mclaude --provider <cliId> [--model <model>] [--installation <cliId>] [claude-flags...]"
}
```

The `cliId` field is the identifier to use with `--provider` and `--installation`. It's also shown in the TUI sidebar as **CLI ID** when you highlight a provider.

#### Provider matching

The `--provider` value is matched in this order:

1. **Provider name** (case-insensitive) — `--provider "My DeepSeek"`
2. **Template ID** — `--provider deepseek`
3. **Slug of the name** — `--provider my-deepseek`
4. **Provider UUID** — for scripting with stable IDs

If multiple providers match (e.g., two OpenRouter accounts), use the exact name to disambiguate.

#### Examples

```bash
# Non-interactive query
mclaude --provider deepseek --model deepseek-chat -p "explain this codebase"

# Auto-select model (uses first available)
mclaude --provider deepseek -p "hello"

# Continue last conversation
mclaude --provider ollama --model llama3 -c

# Autonomous agent with limits
mclaude --provider openrouter --model anthropic/claude-sonnet-4 --max-turns 5 -p "fix the failing tests"

# JSON output for programmatic parsing
mclaude --provider deepseek --model deepseek-chat -p --output-format json "list all TODOs"

# With specific installation
mclaude --provider anthropic --installation work -p "review this PR"
```

### Claude Code Skill

A bundled skill at [`.claude/skills/mclaude-headless/`](.claude/skills/mclaude-headless/) teaches AI agents how to use mclaude in headless mode. It includes:

- Usage guide with discovery (`--list`), syntax, and examples
- Complete Claude Code CLI reference (`references/claude-code-cli.md`) with all flags for non-interactive use

The skill triggers automatically when an agent needs to launch Claude Code via mclaude.

### Other flags

```bash
mclaude --help
mclaude --version
```

## Supported Providers

### Anthropic (OAuth)

Uses the native Claude Code OAuth login flow — no API key required. You can add multiple Anthropic accounts and switch between them.

- **Type:** OAuth
- **How to add:** Select "Anthropic (OAuth)" → enter an account name → complete the OAuth login in your browser
- **Models:** Managed natively by Claude Code (no model selection in the TUI)

This is ideal if you already have a Claude Pro/Team/Enterprise subscription and want to manage multiple accounts.

### Alibaba Cloud

- **Docs:** [Alibaba Cloud Coding Plan](https://www.alibabacloud.com/help/en/model-studio/coding-plan#79cb18916c1fl)
- **Base URL:** `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic`
- **API key:** Get a coding plan key (`sk-sp-xxxxx`) at [Alibaba Cloud Model Studio](https://bailian.console.alibabacloud.com/)
- **Default models:** `glm-4.7`, `glm-5`, `kimi-k2.5`, `MiniMax-M2.5`, `qwen3-coder-next`, `qwen3-coder-plus`, `qwen3-max-2026-01-23`, `qwen3.5-plus`

**Coding Plan:** Subscription-based pricing with multi-model access. One subscription covers Qwen, GLM, Kimi, and MiniMax models. Usage is restricted to coding tools (Claude Code, Cursor, etc.).

| Tier | Price | Requests / 5h | Requests / month |
|------|-------|---------------|-----------------|
| Lite | $10/mo | 1,200 | 18,000 |
| Pro | $50/mo | 6,000 | 90,000 |

First month promotional pricing starting at ~$3. [Subscribe here](https://common-buy-intl.alibabacloud.com/coding-plan).

### BytePlus ModelArk

- **Docs:** [BytePlus ModelArk Claude Code integration](https://docs.byteplus.com/en/docs/ModelArk/1928262)
- **Base URL:** `https://ark.ap-southeast.bytepluses.com/api/coding`
- **API key:** Get one at [BytePlus ModelArk Console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey)
- **Default models:** `ark-code-latest`, `bytedance-seed-code`, `glm-4.7`, `gpt-oss-120b`, `kimi-k2-thinking`, `kimi-k2.5`

**Coding Plan:** Subscription with Auto mode that intelligently selects the best model per task. New users get 50% off.

| Tier | Price | New user price |
|------|-------|---------------|
| Lite | $10/mo | $5/mo |
| Pro | $50/mo | $25/mo |
| Lite (3 months) | $30 | $15 |
| Pro (3 months) | $120 | $60 |

[Subscribe here](https://www.byteplus.com/en/activity/codingplan).

### DeepSeek

- **Docs:** [DeepSeek Anthropic API guide](https://api-docs.deepseek.com/guides/anthropic_api)
- **Base URL:** `https://api.deepseek.com/anthropic`
- **API key:** Get one at [platform.deepseek.com](https://platform.deepseek.com)
- **Default models:** `deepseek-chat`, `deepseek-reasoner`

### MiniMax

- **Docs:** [MiniMax Claude Code integration](https://platform.minimax.io/docs/coding-plan/claude-code)
- **Base URL:** `https://api.minimax.io/anthropic`
- **API key:** Get one at [platform.minimax.io](https://platform.minimax.io)
- **Default models:** `MiniMax-M2`, `MiniMax-M2.1`, `MiniMax-M2.5`, `MiniMax-M2.5-highspeed`

**Coding Plan:** Subscription tiers with a rolling 5-hour window for rate limiting. Annual plans save ~17%.

| Tier | Price | Prompts / 5h | Model |
|------|-------|-------------|-------|
| Starter | $10/mo | 100 | M2.5 (~50 TPS) |
| Plus | $20/mo | 300 | M2.5 (~50 TPS) |
| Max | $50/mo | 1,000 | M2.5 (~50 TPS) |
| Plus HS | $40/mo | 300 | M2.5-highspeed (~100 TPS) |
| Max HS | $80/mo | 1,000 | M2.5-highspeed (~100 TPS) |
| Ultra HS | $150/mo | 2,000 | M2.5-highspeed (~100 TPS) |

[Subscribe here](https://platform.minimax.io/subscribe/coding-plan).

### Moonshot AI

- **Docs:** [Moonshot Claude Code support](https://platform.moonshot.ai/docs/guide/agent-support#configure-environment-variables-1)
- **Base URL:** `https://api.moonshot.ai/anthropic`
- **API key:** Get one at [platform.moonshot.ai](https://platform.moonshot.ai)
- **Default models:** `kimi-k2-0711-preview`, `kimi-k2-0905-preview`, `kimi-k2-thinking-turbo`, `kimi-k2-thinking`, `kimi-k2-turbo-preview`, `kimi-k2.5`

### NanoGPT

- **Docs:** [NanoGPT Claude Code integration](https://docs.nano-gpt.com/integrations/claude-code)
- **Base URL:** `https://nano-gpt.com/api/v1`
- **API key:** Get one at [nano-gpt.com/api](https://nano-gpt.com/api)
- **Default models:** None — models are fetched from the NanoGPT API. Supports 400+ models including Claude, GPT, Gemini, DeepSeek, and more.

NanoGPT validates your API key when you add or edit a provider.

### Novita AI

- **Docs:** [Novita AI Claude Code guide](https://novita.ai/docs/guides/claude-code) | [Supported models](https://novita.ai/docs/guides/llm-anthropic-compatibility#supported-models)
- **Base URL:** `https://api.novita.ai/anthropic`
- **API key:** Get one at [novita.ai](https://novita.ai)
- **Default models:** `deepseek/deepseek-v3-0324`, `deepseek/deepseek-v3.1`, `deepseek/deepseek-v3.1-terminus`, `deepseek/deepseek-v3.2`, `deepseek/deepseek-v3.2-exp`, `minimax/minimax-m2`, `minimax/minimax-m2.1`, `minimax/minimax-m2.5`, `moonshotai/kimi-k2-0905`, `moonshotai/kimi-k2-instruct`, `moonshotai/kimi-k2-thinking`, `moonshotai/kimi-k2.5`, `qwen/qwen3-235b-a22b-thinking-2507`, `qwen/qwen3-coder-480b-a35b-instruct`, `qwen/qwen3-coder-next`, `qwen/qwen3-next-80b-a3b-instruct`, `qwen/qwen3-next-80b-a3b-thinking`, `xiaomimimo/mimo-v2-flash`, `zai-org/glm-4.6`, `zai-org/glm-4.6v`, `zai-org/glm-4.7`, `zai-org/glm-5`

### OpenRouter

- **Docs:** [OpenRouter Claude Code integration](https://openrouter.ai/docs/guides/guides/claude-code-integration)
- **Base URL:** `https://openrouter.ai/api`
- **API key:** Get one at [openrouter.ai/keys](https://openrouter.ai/keys)
- **Default models:** None — models are fetched from the OpenRouter API based on your account. The model list shows pricing, context length, and capability details.

OpenRouter validates your API key when you add or edit a provider.

### Poe

- **Docs:** [Poe Anthropic-compatible API](https://creator.poe.com/docs/external-applications/anthropic-compatible-api)
- **Base URL:** `https://api.poe.com`
- **API key:** Get one at [poe.com](https://poe.com)
- **Default models:** `claude-haiku-3`, `claude-haiku-3.5`, `claude-haiku-4.5`, `claude-opus-4`, `claude-opus-4.1`, `claude-opus-4.5`, `claude-sonnet-3.7`, `claude-sonnet-4`, `claude-sonnet-4.5`

### Requesty

- **Docs:** [Requesty Claude Code integration](https://docs.requesty.ai/integrations/claude-code)
- **Base URL:** `https://router.requesty.ai`
- **API key:** Get one at [requesty.ai](https://requesty.ai)
- **Default models:** None — add your own model IDs

### Z.AI

- **Docs:** [Z.AI Claude Code manual configuration](https://docs.z.ai/devpack/tool/claude#manual-configuration)
- **Base URL:** `https://api.z.ai/api/anthropic`
- **API key:** Get one at [z.ai](https://z.ai)
- **Default models:** `GLM-4-32B-0414-128K`, `GLM-4.5`, `GLM-4.5-Air`, `GLM-4.5-AirX`, `GLM-4.5-Flash`, `GLM-4.5-X`, `GLM-4.6`, `GLM-4.7`, `GLM-4.7-Flash`, `GLM-4.7-FlashX`, `GLM-5`, `GLM-5-Code`

**Coding Plan:** Subscription tiers with a rolling 5-hour window and weekly limits. All plans include GLM-4.7; Pro and Max also support GLM-5 (uses 3× quota during peak hours 14:00–18:00 UTC+8, 2× off-peak). Quarterly saves 10%, yearly saves 30%.

| Tier | Price | Prompts / 5h | Prompts / week | Features |
|------|-------|-------------|---------------|----------|
| Lite | $10/mo | ~80 | ~400 | 3× Claude Pro usage, 20+ coding tools |
| Pro | $30/mo | ~400 | ~2,000 | 5× Lite, 40–60% faster, GLM-5, Vision/Web Search/Web Reader MCP |
| Max | $80/mo | ~1,600 | ~8,000 | 4× Pro, GLM-5, first access to new models, guaranteed peak-hour performance |

[Subscribe here](https://z.ai/subscribe).

### LiteLLM Proxy

- **Docs:** [LiteLLM documentation](https://docs.litellm.ai/docs/) | [Claude Code integration](https://docs.litellm.ai/docs/tutorials/claude_responses_api)
- **Base URL:** `http://localhost:4000` (configurable — edit the provider to point to your proxy)
- **API key:** Your LiteLLM master key or virtual key
- **Default models:** None — models are fetched from the LiteLLM proxy via `/model/info`. Configure them in your LiteLLM `config.yaml`.

LiteLLM acts as a unified proxy for 100+ LLM providers (Anthropic, AWS Bedrock, Azure, Vertex AI, etc.), providing centralized authentication, cost tracking, and rate limiting. Run the proxy anywhere (local or remote) and point multi-claude to it.

### Local Providers

These providers run locally on your machine — no API key is required (a placeholder is used automatically).

#### @Lordymine/opencode-go-cli

- **Docs:** [opencode-go-cli on GitHub](https://github.com/Lordymine/opencode-go-cli)
- **Base URL:** `http://localhost:8080` (configurable — edit the provider to point to any local or remote URL)
- **Default models:** `MiniMax-M2.5`, `MiniMax-M2.7`, `Kimi-K2.5`, `GLM-5`

Local Anthropic API proxy that translates requests to OpenAI-compatible format. Enables access to OpenCode Go and OpenAI models through Claude Code. Install and run the proxy separately, then add it as a provider in multi-claude.

#### llama.cpp

- **Docs:** [llama.cpp on GitHub](https://github.com/ggml-org/llama.cpp)
- **Base URL:** `http://127.0.0.1:8080`
- **Default models:** None — depends on the model you load locally

#### LM Studio

- **Docs:** [LM Studio Claude Code integration](https://lmstudio.ai/docs/integrations/claude-code)
- **Base URL:** `http://localhost:1234`
- **Default models:** None — depends on the model you load in LM Studio

#### Ollama

- **Docs:** [Ollama Claude Code support](https://ollama.com/blog/claude)
- **Base URL:** `http://localhost:11434`
- **Default models:** None — depends on the model you pull with Ollama

#### OmniRoute

- **Docs:** [OmniRoute on GitHub](https://github.com/diegosouzapw/OmniRoute)
- **Base URL:** `http://localhost:20128/v1` (configurable)
- **Default models:** None — depends on the models configured in your OmniRoute instance

Self-hosted AI gateway with Anthropic API support. Run OmniRoute separately, then add it as a provider in multi-claude.

## Provider Management

All provider management is done inside the TUI. From the main menu, select **Manage providers** to:

- **Add a provider** — pick a provider template, enter a name and API key (or complete OAuth login for Anthropic)
- **Edit a provider** — change name, API key, re-authenticate OAuth, or remove it
- **Manage models** — add custom model IDs or remove models from a provider. Custom models appear alongside the provider's default models.

## Installation Management

Installations are isolated Claude Code configuration directories. Each installation has its own settings, MCP servers, history, and project data — stored in `~/.multi-claude/installations/<id>/`.

By default, Claude Code uses `~/.claude/`. Custom installations let you keep separate configurations for different contexts (work, personal, client projects, etc.).

From the main menu, select **Manage installations** to:

- **Add an installation** — enter a name and a new isolated directory is created
- **Edit an installation** — rename or remove it
- **Remove an installation** — deletes the configuration and its directory

### Auto-selection rules

- **API providers with no custom installations:** Default (`~/.claude/`) is used automatically
- **API providers with custom installations:** You pick which installation to use
- **Anthropic (OAuth):** Always requires a custom installation (created during onboarding if none exist)

## Multiple Anthropic Accounts (OAuth)

multi-claude lets you manage multiple Anthropic accounts simultaneously using isolated OAuth credentials:

1. Add a new Anthropic (OAuth) provider and give it a name (e.g. "Work", "Personal")
2. If no installations exist, you'll be prompted to create one (required for OAuth)
3. Complete the OAuth login in your browser
4. Credentials are stored in `~/.multi-claude/accounts/<provider-id>/`
5. Each account uses its own installation — fully isolated settings, history, and MCP servers

If a session expires, you can re-authenticate from **Edit provider → Re-authenticate**.

## Security — Credential Encryption

All API keys are encrypted at rest using **AES-256-GCM**. Credentials are never stored in plain text.

### How it works

On first launch, mclaude generates two files in `~/.multi-claude/`:

- **`.key`** — a random 256-bit encryption key (base64)
- **`.salt`** — a random 32-byte salt (base64)

Both files are created with `chmod 0600` (owner-only on Unix). API keys in `config.json` are encrypted with the `.key` file before writing to disk and decrypted transparently when loaded.

### Master password (optional)

For additional security, you can set a master password in **Settings → Set master password**. When enabled:

1. The `.key` file itself is encrypted (wrapped) using a key derived from your password via PBKDF2-HMAC-SHA512 (600,000 iterations)
2. You'll be prompted for the password each time you launch mclaude
3. Disabling the master password unwraps the `.key` file back to its original state

**In headless mode**, pass the master password via flag or environment variable:

```bash
# Via flag (more practical)
mclaude --provider deepseek --master-password yourPassword -p "hello"

# Via environment variable (more secure in shared environments)
MCLAUDE_MASTER_PASSWORD=yourPassword mclaude --provider deepseek -p "hello"
```

The `--master-password` flag takes priority over the environment variable.

### What is protected

| Threat | Protected? |
|--------|-----------|
| Config file shared/copied without `.key` | Yes — credentials are encrypted |
| Backup leaks (cloud sync of dotfiles) | Yes — if `.key` is excluded |
| Casual browsing of `config.json` | Yes — API keys are opaque JSON blobs |
| Attacker with full access to `~/.multi-claude/` | Without master password: No (`.key` readable). With master password: Yes |

### Migration

Existing plain-text credentials are automatically encrypted on the first launch after updating. No action needed.

## Configuration

- **Config file:** `~/.multi-claude/config.json`
- **Encryption key:** `~/.multi-claude/.key`
- **Encryption salt:** `~/.multi-claude/.salt`
- **OAuth accounts:** `~/.multi-claude/accounts/`
- **Installations:** `~/.multi-claude/installations/`
- **Supported languages:** English, Português (BR), Español — change in **Settings → Change language**

## Status Line

mclaude injects a customizable status line into Claude Code that shows real-time session information. Configure it from **Settings > Status line** in the TUI.

### Templates

| Template | Lines | Focus |
|----------|-------|-------|
| **none** | — | Disabled |
| **default** (default) | 4 | Model + git, tokens I/O + cache, session + API time + cost + burn rate, context bar (status) |
| **full** | 4 | Model + git, tokens I/O + cache, session + API time + cost + burn rate, context detail (ctx/left/win) + status |
| **slim** | 3 | Model + git, tokens I/O + cost + session, context bar (status) |
| **mini** | 2 | Model + git, context % (status) + cost + duration |
| **cost** | 4 | Model + git, in/out cost breakdown, burn rate + hourly projection + session, context bar (status) |
| **perf** | 4 | Model + git, cache hit + I/O ratio + API time %, output throughput + session + cost, context bar (status) |
| **context** | 4 | Model + git, input/output/total token breakdown, cache create/read detail, context bar (status) |

Context status indicators: `(approaching)` at 61%+, `(imminent)` at 70%+, `(/compact)` at 80%+.

### Preview

**default:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Cache:20.6M
Session:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left (imminent)
```

**full:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Cache:20.6M
Session:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min
Ctx:153.9k/77% | Left:46.1k/23% | Win:200k       | (imminent)
```

**slim:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Cost:$11.15    | Session:3h31m
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left (imminent)
```

**mini:**
```
Provider/Opus (master +45 -7)
Ctx 77% (imminent) | $11.15 | 3h31m
```

**cost:**
```
Provider/Opus (master +45 -7)
Input:$3.40    | Output:$7.75   | Cost:$11.15
$0.19/min      | ~$11.40/h      | Session:3h31m
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left (imminent)
```

**perf:**
```
Provider/Opus (master +45 -7)
Cache:71% hit  | I/O 1.3:1      | API:47% time
Output:~297tok/s | Session:3h31m  | $11.15
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left (imminent)
```

**context:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Total:167.6k/200k
CacheCreate:2.1k | CacheRead:18.5k | Cache:20.6M
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left (imminent)
```

Color-coded indicators change from green to yellow to red based on context usage, cost, and cache hit rates.

## Changelog

### v1.0.29 (current)

- **feat:** added CLAUDE_CODE_NO_FLICKER toggle on launch screen for fullscreen flicker-free rendering

### v1.0.28

- **feat:** added @Lordymine/opencode-go-cli as a new provider (local Anthropic API proxy with configurable URL)
- **feat:** added OmniRoute as a new provider (self-hosted AI gateway with Anthropic API support)

### v1.0.27

- **fix:** removed `--resume` flag from launch screen (available via `/resume` within Claude Code)
- **fix:** updated ZAI and MiniMax models

### v1.0.26

- **fix:** Session usage bar now only appears for default and OAuth provider launches, not for API key providers

### v1.0.25

- **fix:** Fixed crash when installations config is undefined (defensive fallback)
- **fix:** Updated smoke tests for new menu layout and added missing mocks

### v1.0.24

- **feat:** Added `--enable-auto-mode` flag to TUI launch options (auto-approves safe actions, blocks risky ones)
- **feat:** Added mutual exclusion between `--enable-auto-mode` and `--dangerously-skip-permissions` in launch options

### v1.0.23

- **refactor:** Changelog viewer now uses version list with sidebar panel for consistency with other TUI pages
- **fix:** Fixed changelog sidebar showing stale entries when scrolling between versions
- **fix:** Fixed invisible items in changelog list by replacing ink-select-input with custom non-looping scroll
- **fix:** Fixed last item not visible in changelog list by reserving space for scroll indicators

### v1.0.22

- **feat:** Added changelog viewer in TUI with scrollable display and NEW badge indicator on main menu

### v1.0.21

- **feat:** Added Kimi Code provider with `kimi-for-coding` model and `ENABLE_TOOL_SEARCH=false` env var

### v1.0.20

- **fix:** Preserved essential Claude Code env vars (`CLAUDE_CODE_GIT_BASH_PATH`, `CLAUDE_CODE_SHELL`, `CLAUDE_CODE_TMPDIR`) during provider env cleanup
- **refactor:** Centralized `CLAUDE_CODE_*` env var cleanup into single `cleanupClaudeCodeVars()` function

### v1.0.19

- **fix:** Status line 5h usage data now uses distributed cache (lock file) and fresh OAuth token reading to prevent stale data from rate limiting and expired tokens
- **fix:** Usage cache TTL increased to 240s to reduce API calls
- **docs:** Added changelog section to README and maintenance instructions to CLAUDE.md

### v1.0.18

- **docs:** Added multi-account proxy feasibility report for Claude Code
- **feat:** Added Anthropic usage limits (5h/7d) to status line with 30s cache

### v1.0.17

- **feat:** Changed header icon from sparkles to octopus
- **docs:** Added coding plan pricing info for Z.AI, Alibaba, MiniMax, BytePlus

### v1.0.16

- **fix:** Fixed diacritics in pt-BR and es locale files
- **fix:** Blocked provider selection when API key is invalid
- **feat:** Added invalid API key warning in main menu and sidebar

### v1.0.15

- **fix:** Fixed critical vulnerability — master password hash was identical to encryption key (domain separation)
- **fix:** Fixed master password confirmation field pre-filled
- **feat:** Added option to remove master password from login screen (force-reset)
- **fix:** Translated master password prompt using i18n
- **fix:** Unified flow for LiteLLM, Ollama, llama.cpp, and LM Studio providers (URL + optional API key)

### v1.0.14

- **feat:** Created Remotion project for demo video (7 scenes, 1920x1080, ~31s)
- **feat:** Added Remotion best practices skill

### v1.0.13

- **feat:** Added context status indicators in status line (approaching/imminent/compact)
- **refactor:** Standardized all status line templates (full, slim, cost, perf, context) to follow default template layout and colors
- **refactor:** Removed unused "Dev" status line template

### v1.0.12

- **feat:** Added AES-256-GCM credential encryption with optional master password
- **feat:** Added master password support in headless mode (flag + env var)
- **docs:** Documented credential encryption and master password in README

### v1.0.11

- **feat:** Added NanoGPT provider with model listing and API key validation
- **feat:** Added LiteLLM Proxy provider
- **feat:** Added base URL editing for cloud providers
- **feat:** Added BytePlus ModelArk provider
- **refactor:** Renamed Alibaba provider to "alibaba-coding"

### v1.0.10

- **feat:** Status line templates consolidated from 12 to 7 focused layouts (none/default/full/slim/mini/cost/perf/context)
- **feat:** Status line env vars passed via `--settings` instead of `process.env`
- **feat:** Added specialized status line templates: cost, perf, and context
- **refactor:** Extracted status line script from inline string to separate `statusline-script.mjs`

### v1.0.9

- **feat:** Added auto-return loop to TUI after Claude Code exits
- **feat:** Added strategic flag selection step before Claude Code launch (resume, skip-permissions, verbose, worktree)
- **feat:** Flag selection persisted between sessions
- **feat:** Terminal title set to provider/model during Claude Code session

### v1.0.8

- **feat:** Added option to launch Claude Code without a provider (default Anthropic account)
- **fix:** Robust terminal size detection with fallbacks for Windows
- **fix:** Terminal resize handling via polling (Windows fix)

### v1.0.7

- **feat:** Session-based debug logging with per-PID files and automatic cleanup
- **feat:** Added auto-update check in main menu
- **fix:** Fixed OAuth spawn crash on Windows (UV_EPIPE)

### v1.0.6

- **feat:** Added headless mode for non-interactive CLI usage (`--provider`, `--model`, `--installation`)
- **feat:** Added `--list` flag for provider/model/installation discovery
- **feat:** Added mclaude-headless skill for AI agents
- **feat:** Added complete Claude Code CLI reference

### v1.0.5

- **feat:** Installation directory names changed to readable format (`{8hex}-{slug}`)
- **feat:** Added custom URL field for local providers (Ollama, LM Studio, llama.cpp)

### v1.0.4

- **feat:** Added mclaude version in app header
- **feat:** Global error handling with debug.log output

### v1.0.3

- **feat:** Added i18n support (English, Português BR, Español)
- **feat:** Added configuration reset option

### v1.0.0

- Initial release — TUI for managing multiple API providers and launching Claude Code
- Supported providers: Anthropic (OAuth), Alibaba Cloud, DeepSeek, MiniMax, Moonshot AI, Novita AI, OpenRouter, Poe, Requesty, Z.AI, Ollama, LM Studio, llama.cpp
- Installation management with isolated Claude Code config directories
- Multiple Anthropic account support via OAuth

## Development

```bash
bun install && bun link
mclaude                  # run the CLI
bunx tsc --noEmit        # type check
bun test                 # run smoke tests
```
