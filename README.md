> *Gerar código é fácil. Transformar ideias em software real é o desafio.*

Quer ir além de prompts e dominar a **Engenharia de Contexto** — a habilidade que elimina a tentativa e erro e te dá controle total do projeto? Conheça a comunidade Ai Coders Academy:

**[Entrar na comunidade](https://kiwify.app/kBV4r4X?afid=Xox2vMps)**

<h1 align="center">multi-claude</h1>

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.14-blue)](https://github.com/leogomide/multi-claude/releases)
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
mclaude --provider openrouter --model anthropic/claude-sonnet-4 -p --max-turns 5 "fix the failing tests"

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

### BytePlus ModelArk

- **Docs:** [BytePlus ModelArk Claude Code integration](https://docs.byteplus.com/en/docs/ModelArk/1928262)
- **Base URL:** `https://ark.ap-southeast.bytepluses.com/api/coding`
- **API key:** Get one at [BytePlus ModelArk Console](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey)
- **Default models:** `ark-code-latest`, `bytedance-seed-code`, `glm-4.7`, `gpt-oss-120b`, `kimi-k2-thinking`, `kimi-k2.5`

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

### LiteLLM Proxy

- **Docs:** [LiteLLM documentation](https://docs.litellm.ai/docs/) | [Claude Code integration](https://docs.litellm.ai/docs/tutorials/claude_responses_api)
- **Base URL:** `http://localhost:4000` (configurable — edit the provider to point to your proxy)
- **API key:** Your LiteLLM master key or virtual key
- **Default models:** None — models are fetched from the LiteLLM proxy via `/model/info`. Configure them in your LiteLLM `config.yaml`.

LiteLLM acts as a unified proxy for 100+ LLM providers (Anthropic, AWS Bedrock, Azure, Vertex AI, etc.), providing centralized authentication, cost tracking, and rate limiting. Run the proxy anywhere (local or remote) and point multi-claude to it.

### Local Providers

These providers run locally on your machine — no API key is required (a placeholder is used automatically).

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
- **Supported languages:** English, Portugues (BR), Espanol — change in **Settings → Change language**

## Status Line

mclaude injects a customizable status line into Claude Code that shows real-time session information. Configure it from **Settings > Status line** in the TUI.

### Templates

| Template | Lines | Focus |
|----------|-------|-------|
| **none** | — | Disabled |
| **default** (default) | 4 | Model + git, tokens I/O + cache, session + API time + cost + burn rate, context bar |
| **full** | 4 | Model + git, context detail (ctx/left/win), tokens I/O + cache, session + API time + cost |
| **slim** | 3 | Model + git, tokens I/O + cost + session, context bar |
| **mini** | 2 | Model + git, context % + cost + duration |
| **cost** | 4 | Model + git, in/out cost breakdown, burn rate + hourly projection + session, context bar |
| **perf** | 4 | Model + git, cache hit + I/O ratio + API time %, output throughput + session + cost, context bar |
| **context** | 4 | Model + git, input/output/total token breakdown, cache create/read detail, context bar |

### Preview

**default:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Cache:20.6M
Session:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left
```

**full:**
```
Provider/Opus (master +45 -7)
Ctx:153.9k/77% | Left:46.1k/23% | Win:200k
Input:84.2k    | Output:62.8k   | Cache:20.6M
Session:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min
```

**slim:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Cost:$11.15    | Session:3h31m
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left
```

**mini:**
```
Provider/Opus (master +45 -7)
Ctx 77% | $11.15 | 3h31m
```

**cost:**
```
Provider/Opus (master +45 -7)
Input:$3.40    | Output:$7.75   | Cost:$11.15
$0.19/min      | ~$11.40/h      | Session:3h31m
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left
```

**perf:**
```
Provider/Opus (master +45 -7)
Cache:71% hit  | I/O 1.3:1      | API:47% time
Output:~297t/s | Session:3h31m  | $11.15
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left
```

**context:**
```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Total:167.6k/200k
CacheCreate:2.1k | CacheRead:18.5k | Cache:20.6M
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left
```

Color-coded indicators change from green to yellow to red based on context usage, cost, and cache hit rates.

## Development

```bash
bun install && bun link
mclaude                  # run the CLI
bunx tsc --noEmit        # type check
bun test                 # run smoke tests
```
