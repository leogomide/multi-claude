> *Gerar código é fácil. Transformar ideias em software real é o desafio.*

Quer ir além de prompts e dominar a **Engenharia de Contexto** — a habilidade que elimina a tentativa e erro e te dá controle total do projeto? Conheça a comunidade Ai Coders Academy:

**[Entrar na comunidade](https://kiwify.app/kBV4r4X?afid=Xox2vMps)**

# multi-claude

CLI tool to manage multiple API providers and launch [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with the correct environment variables.

Run `mclaude` to open a terminal UI where you can select a provider and model, manage your provider configurations, and launch Claude Code — all in one place.

## Prerequisites

- [Bun](https://bun.sh)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## Installation

```bash
bun install -g @leogomide/multi-claude
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

The `--model` / `-m` flag is intercepted and replaced by the model you select in the TUI.

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

A bundled skill at `.claude/skills/mclaude-headless/` teaches AI agents how to use mclaude in headless mode. It includes:

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

### Alibaba Cloud Model Studio

- **Docs:** [Alibaba Cloud Coding Plan](https://www.alibabacloud.com/help/en/model-studio/coding-plan#79cb18916c1fl)
- **Base URL:** `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic`
- **API key:** Get a coding plan key (`sk-sp-xxxxx`) at [Alibaba Cloud Model Studio](https://bailian.console.alibabacloud.com/)
- **Default models:** `qwen3-coder-next`, `qwen3-coder-plus`, `qwen3.5-plus`, `qwen3-max-2026-01-23`, `glm-4.7`, `kimi-k2.5`

### DeepSeek

- **Docs:** [DeepSeek Anthropic API guide](https://api-docs.deepseek.com/guides/anthropic_api)
- **Base URL:** `https://api.deepseek.com/anthropic`
- **API key:** Get one at [platform.deepseek.com](https://platform.deepseek.com)
- **Default models:** `deepseek-chat`, `deepseek-reasoner`

### MiniMax

- **Docs:** [MiniMax Claude Code integration](https://platform.minimax.io/docs/coding-plan/claude-code)
- **Base URL:** `https://api.minimax.io/anthropic`
- **API key:** Get one at [platform.minimax.io](https://platform.minimax.io)
- **Default models:** `MiniMax-M2.5-highspeed`, `MiniMax-M2.5`, `MiniMax-M2.1`, `MiniMax-M2`

### Moonshot AI

- **Docs:** [Moonshot Claude Code support](https://platform.moonshot.ai/docs/guide/agent-support#configure-environment-variables-1)
- **Base URL:** `https://api.moonshot.ai/anthropic`
- **API key:** Get one at [platform.moonshot.ai](https://platform.moonshot.ai)
- **Default models:** `kimi-k2.5`, `kimi-k2-0905-preview`, `kimi-k2-0711-preview`, `kimi-k2-turbo-preview`, `kimi-k2-thinking`, `kimi-k2-thinking-turbo`

### Novita AI

- **Docs:** [Novita AI Claude Code guide](https://novita.ai/docs/guides/claude-code) | [Supported models](https://novita.ai/docs/guides/llm-anthropic-compatibility#supported-models)
- **Base URL:** `https://api.novita.ai/anthropic`
- **API key:** Get one at [novita.ai](https://novita.ai)
- **Default models:** `deepseek/deepseek-v3.2`, `deepseek/deepseek-v3.2-exp`, `deepseek/deepseek-v3.1-terminus`, `deepseek/deepseek-v3.1`, `deepseek/deepseek-v3-0324`, `minimax/minimax-m2.5`, `minimax/minimax-m2.1`, `minimax/minimax-m2`, `moonshotai/kimi-k2.5`, `moonshotai/kimi-k2-thinking`, `moonshotai/kimi-k2-0905`, `moonshotai/kimi-k2-instruct`, `qwen/qwen3-coder-next`, `qwen/qwen3-coder-480b-a35b-instruct`, `qwen/qwen3-next-80b-a3b-instruct`, `qwen/qwen3-next-80b-a3b-thinking`, `qwen/qwen3-235b-a22b-thinking-2507`, `zai-org/glm-5`, `zai-org/glm-4.7`, `zai-org/glm-4.6v`, `zai-org/glm-4.6`, `xiaomimimo/mimo-v2-flash`

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
- **Default models:** `claude-sonnet-4.5`, `claude-opus-4.5`, `claude-haiku-4.5`, `claude-opus-4.1`, `claude-sonnet-4`, `claude-opus-4`, `claude-sonnet-3.7`, `claude-haiku-3.5`, `claude-haiku-3`

### Requesty

- **Docs:** [Requesty Claude Code integration](https://docs.requesty.ai/integrations/claude-code)
- **Base URL:** `https://router.requesty.ai`
- **API key:** Get one at [requesty.ai](https://requesty.ai)
- **Default models:** None — add your own model IDs

### Z.AI

- **Docs:** [Z.AI Claude Code manual configuration](https://docs.z.ai/devpack/tool/claude#manual-configuration)
- **Base URL:** `https://api.z.ai/api/anthropic`
- **API key:** Get one at [z.ai](https://z.ai)
- **Default models:** `GLM-5`, `GLM-5-Code`, `GLM-4.7`, `GLM-4.7-FlashX`, `GLM-4.6`, `GLM-4.5`, `GLM-4.5-X`, `GLM-4.5-Air`, `GLM-4.5-AirX`, `GLM-4-32B-0414-128K`, `GLM-4.7-Flash`, `GLM-4.5-Flash`

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

## Configuration

- **Config file:** `~/.multi-claude/config.json`
- **OAuth accounts:** `~/.multi-claude/accounts/`
- **Installations:** `~/.multi-claude/installations/`
- **Supported languages:** English, Portugues (BR), Espanol — change in **Settings → Change language**

## Development

```bash
bun install && bun link
mclaude                  # run the CLI
bunx tsc --noEmit        # type check
bun test                 # run smoke tests
```
