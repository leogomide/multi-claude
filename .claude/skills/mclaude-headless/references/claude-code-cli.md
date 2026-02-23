# Claude Code CLI Reference

Source: https://code.claude.com/docs/en/cli-reference

## Commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive REPL |
| `claude "query"` | Start REPL with initial prompt |
| `claude -p "query"` | Non-interactive mode (print and exit) |
| `cat file \| claude -p "query"` | Process piped content |
| `claude -c` | Continue most recent conversation |
| `claude -c -p "query"` | Continue in non-interactive mode |
| `claude -r "<session>" "query"` | Resume session by ID or name |
| `claude update` | Update to latest version |
| `claude agents` | List configured subagents |
| `claude mcp` | Configure MCP servers |

## All CLI Flags

### Session Management

| Flag | Description | Example |
|------|-------------|---------|
| `-p`, `--print` | Non-interactive mode: print response and exit | `claude -p "query"` |
| `-c`, `--continue` | Continue most recent conversation | `claude -c` |
| `-r`, `--resume` | Resume session by ID or name | `claude -r "auth-refactor"` |
| `--session-id` | Use specific session UUID | `claude --session-id "550e..."` |
| `--fork-session` | Fork instead of reusing session (with --resume/--continue) | `claude --resume abc --fork-session` |
| `--from-pr` | Resume sessions linked to a GitHub PR | `claude --from-pr 123` |
| `--no-session-persistence` | Don't save session to disk (print mode) | `claude -p --no-session-persistence "query"` |

### Model & Output

| Flag | Description | Example |
|------|-------------|---------|
| `--model` | Set model (alias: `sonnet`, `opus`, or full name) | `claude --model claude-sonnet-4-6` |
| `--fallback-model` | Fallback when default overloaded (print mode) | `claude -p --fallback-model sonnet "query"` |
| `--output-format` | Output format: `text`, `json`, `stream-json` (print mode) | `claude -p --output-format json "query"` |
| `--input-format` | Input format: `text`, `stream-json` (print mode) | `claude -p --input-format stream-json` |
| `--json-schema` | Validate output against JSON Schema (print mode) | `claude -p --json-schema '{...}' "query"` |
| `--include-partial-messages` | Include streaming events (print mode + stream-json) | `claude -p --output-format stream-json --include-partial-messages "query"` |
| `--verbose` | Full turn-by-turn logging | `claude --verbose` |

### Limits & Budget

| Flag | Description | Example |
|------|-------------|---------|
| `--max-turns` | Limit agentic turns (print mode). Error on limit. | `claude -p --max-turns 3 "query"` |
| `--max-budget-usd` | Max dollar spend before stopping (print mode) | `claude -p --max-budget-usd 5.00 "query"` |

### Permissions & Tools

| Flag | Description | Example |
|------|-------------|---------|
| `--permission-mode` | Set permission mode (`plan`, etc.) | `claude --permission-mode plan` |
| `--dangerously-skip-permissions` | Skip ALL permission prompts | `claude --dangerously-skip-permissions` |
| `--allow-dangerously-skip-permissions` | Enable skip as option (compose with --permission-mode) | `claude --permission-mode plan --allow-dangerously-skip-permissions` |
| `--allowedTools` | Tools that run without permission prompt | `claude --allowedTools "Bash(git *)" "Read"` |
| `--disallowedTools` | Tools completely removed from context | `claude --disallowedTools "Edit"` |
| `--tools` | Restrict which tools are available | `claude --tools "Bash,Edit,Read"` |
| `--permission-prompt-tool` | MCP tool to handle permission prompts | `claude -p --permission-prompt-tool mcp_tool "query"` |

### System Prompt

| Flag | Behavior | Modes |
|------|----------|-------|
| `--system-prompt` | Replace entire system prompt | Interactive + Print |
| `--system-prompt-file` | Replace with file contents | Print only |
| `--append-system-prompt` | Append to default prompt | Interactive + Print |
| `--append-system-prompt-file` | Append file contents to default | Print only |

`--append-system-prompt` is recommended for most cases (preserves defaults).
`--system-prompt` and `--system-prompt-file` are mutually exclusive.

### Working Directories & Environment

| Flag | Description | Example |
|------|-------------|---------|
| `--add-dir` | Add extra working directories | `claude --add-dir ../apps ../lib` |
| `-w`, `--worktree` | Run in isolated git worktree | `claude -w feature-auth` |
| `--settings` | Load settings from JSON file or string | `claude --settings ./settings.json` |
| `--setting-sources` | Which setting sources to load | `claude --setting-sources user,project` |

### Subagents

| Flag | Description | Example |
|------|-------------|---------|
| `--agent` | Use a named agent for the session | `claude --agent my-agent` |
| `--agents` | Define subagents via JSON | See below |

Agents JSON format:
```json
{
  "agent-name": {
    "description": "When to use (required)",
    "prompt": "System prompt (required)",
    "tools": ["Read", "Edit"],
    "model": "sonnet",
    "maxTurns": 10
  }
}
```

### Integrations

| Flag | Description | Example |
|------|-------------|---------|
| `--chrome` | Enable Chrome browser integration | `claude --chrome` |
| `--no-chrome` | Disable Chrome integration | `claude --no-chrome` |
| `--mcp-config` | Load MCP servers from JSON | `claude --mcp-config ./mcp.json` |
| `--strict-mcp-config` | Only use servers from --mcp-config | `claude --strict-mcp-config --mcp-config ./mcp.json` |
| `--plugin-dir` | Load plugins from directory | `claude --plugin-dir ./my-plugins` |
| `--ide` | Auto-connect to IDE | `claude --ide` |
| `--teammate-mode` | Agent team display: `auto`, `in-process`, `tmux` | `claude --teammate-mode in-process` |

### Other

| Flag | Description | Example |
|------|-------------|---------|
| `--debug` | Debug mode with optional category filter | `claude --debug "api,mcp"` |
| `--betas` | Beta headers for API requests | `claude --betas interleaved-thinking` |
| `--disable-slash-commands` | Disable all skills/slash commands | `claude --disable-slash-commands` |
| `--init` | Run init hooks and start interactive | `claude --init` |
| `--init-only` | Run init hooks and exit | `claude --init-only` |
| `--maintenance` | Run maintenance hooks and exit | `claude --maintenance` |
| `--remote` | Create web session on claude.ai | `claude --remote "Fix the bug"` |
| `--teleport` | Resume web session locally | `claude --teleport` |
| `-v`, `--version` | Print version | `claude -v` |

## Key Patterns for Non-Interactive / Scripting Use

### Basic non-interactive query
```bash
claude -p "explain this function"
```

### JSON output for programmatic parsing
```bash
claude -p --output-format json "list all TODO comments"
```

### Autonomous agent with limits
```bash
claude -p --max-turns 10 --max-budget-usd 2.00 "fix the failing tests"
```

### Fully autonomous (no permission prompts)
```bash
claude -p --dangerously-skip-permissions "refactor the auth module"
```

### Pre-approve specific tools only
```bash
claude -p --allowedTools "Read" "Grep" "Glob" "Bash(git *)" "explain the project structure"
```

### Custom system prompt for specialized tasks
```bash
claude -p --append-system-prompt "Always respond in Portuguese" "explain this code"
```

### Piping input
```bash
cat error.log | claude -p "explain these errors and suggest fixes"
git diff | claude -p "review this diff"
```

### Structured output with JSON Schema
```bash
claude -p --json-schema '{"type":"object","properties":{"summary":{"type":"string"},"issues":{"type":"array","items":{"type":"string"}}}}' "analyze this code"
```

### Continue previous conversation
```bash
claude -c -p "now fix the issues you found"
```
