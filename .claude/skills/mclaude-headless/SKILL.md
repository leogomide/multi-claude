---
name: mclaude-headless
description: Launch Claude Code via mclaude in headless (non-interactive) mode, bypassing the TUI. Use this skill when the user asks to run Claude Code with a specific provider, when automating Claude Code invocations, or when scripting with mclaude. Also use when the user asks how to use mclaude from the command line without the TUI, or wants to know available providers and models.
---

# mclaude Headless Mode

Launch Claude Code non-interactively via `mclaude`, skipping the TUI and going straight to execution.

## Discovery

Before running headless, discover available providers, models, and installations:

```bash
mclaude --list
```

Output is JSON:
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

Always run `mclaude --list` first to get valid `cliId` values before constructing headless commands.

## Usage

```
mclaude --provider <cliId> [--model <model>] [--installation <name>] [claude-code-flags...]
```

### Required

- `--provider <cliId>` - Provider to use (from `mclaude --list` output). Accepts: templateId, provider name, or slug.

### Optional

- `--model <model>` - Model name. Auto-selects first available if omitted.
- `--installation <name>` - Installation name. Uses "default" if omitted.

### Claude Code flags

All other flags pass through directly to Claude Code. Most important for headless/scripting:

| Flag | Description |
|------|-------------|
| `-p "query"` | Print mode (non-interactive, exits after response) |
| `-c` | Continue most recent conversation |
| `--resume <id>` | Resume specific session |
| `--max-turns N` | Limit agentic turns (print mode only) |
| `--max-budget-usd N` | Max dollar spend before stopping (print mode only) |
| `--output-format json` | JSON output for programmatic parsing |
| `--json-schema '{...}'` | Validate output against JSON Schema (print mode only) |
| `--allowedTools "..."` | Pre-approve specific tools without prompts |
| `--dangerously-skip-permissions` | Skip all permission prompts |
| `--append-system-prompt "..."` | Add instructions to system prompt |
| `--system-prompt "..."` | Replace entire system prompt |
| `-w <name>` | Run in isolated git worktree |

For the complete Claude Code CLI reference with all flags, see [references/claude-code-cli.md](references/claude-code-cli.md).

## Examples

```bash
# Interactive query via print mode
mclaude --provider deepseek --model deepseek-chat -p "explain this function"

# Continue last conversation
mclaude --provider ollama --model llama3 -c

# Scripting with JSON output
mclaude --provider deepseek --model deepseek-chat -p --output-format json "list all TODO comments"

# Autonomous agent with turn limit
mclaude --provider openrouter --model anthropic/claude-sonnet-4 -p --max-turns 5 "fix the failing tests"

# With specific installation
mclaude --provider anthropic --installation work -p "review this PR"

# Auto-select model (uses first available)
mclaude --provider deepseek -p "hello"
```

## Workflow for Agents

When an agent needs to invoke mclaude headless:

1. Run `mclaude --list` to get available providers and models
2. Parse the JSON output to find the target provider's `cliId` and pick a model from its `models` array
3. Construct the command with `--provider`, `--model`, and any Claude Code flags
4. Execute and capture output (use `-p` for non-interactive + `--output-format json` for structured output)
