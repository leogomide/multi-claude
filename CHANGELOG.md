## Changelog

### v2.2.0 (current)

- **feat:** a Flatt sponsor line now sits above the shortcuts on every screen, with a clickable link to flatt.com.br

### v2.1.0

- **feat:** Flatt is now a built-in provider — pick it first in the list, paste your key and the model list, context window and output cap load from the API

### v2.0.0

- **feat:** mclaude now runs on Node.js 22+ and installs with `npm i -g @leogomide/multi-claude` (pnpm and Bun also work) — Bun is no longer required
- **feat:** the in-app update detects whether mclaude was installed with npm, pnpm, Bun, Yarn or Volta and updates with the same tool, and explains what to do when the global folder needs administrator rights
- **fix:** Claude Code installed through npm on Windows (`claude.cmd`) now launches, including provider and model names with characters like `&`
- **fix:** a failure to start Claude Code during an Anthropic account login no longer reads as a rejected login
- **fix:** auto-compact on third-party models no longer kicks in early — the budget now uses the full context window (Claude Code already keeps its own reply headroom), so a 200k model compacts at ~84% instead of ~64%

### v1.0.40

- **feat:** the in-app update checks for Node.js 22+ before installing mclaude 2.x, which runs on Node.js instead of Bun — without it, the update stops and explains how to install Node.js or run mclaude with `bunx`

### v1.0.39

- **feat:** the model ID is now optional when adding a Custom Provider — leave it empty to take the model list from the gateway's `/v1/models`, and the launch flow stops with a clear message when neither the API nor the saved list has any model
- **fix:** model fetching and its error messages named the provider template instead of the provider, so two gateways built from the same template were indistinguishable

### v1.0.38

- **feat:** the context window can now be set by hand per model, for any provider — gateways whose API does not report it no longer fall back to the 200k Claude Code assumes for unknown models
- **feat:** the Custom Provider now fetches its model list from `/v1/models`, reading the context window from any of the field names gateways use, and falls back to the model you typed when the endpoint does not answer
- **fix:** headless launches resolved the context window from the built-in table only, so OpenRouter, Requesty, LiteLLM, LM Studio and llama.cpp got no window outside the TUI

### v1.0.37

- **feat:** third-party models now report their real context window to Claude Code, which previously assumed 200k for every unrecognized model — sourced from the provider API when available, from a built-in per-model table otherwise
- **feat:** the auto-compact budget is now derived from the model context window instead of being hardcoded per provider
- **feat:** the Z.AI provider now fetches its model list from the provider API, falling back to the built-in list when the API is unreachable
- **fix:** a failed model fetch no longer dead-ends on an error screen when a saved model list is available
- **fix:** confirming with Enter right after an arrow key no longer selects the item above the highlighted one, in the main menu, the model list and the launch options
- **fix:** headless launches (`--provider` / `--model`) did not pass the model context window, so only the TUI benefited from it

### v1.0.36

- **feat:** added a Custom Provider template — set your own base URL, token and model for any Anthropic-compatible gateway, and pick whether the token is sent as `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY`
- **fix:** custom base URLs were ignored when launching from the TUI, so providers like Ollama, LM Studio, llama.cpp, LiteLLM, OmniRoute and 9Router fell back to the template default unless launched with `--provider`
- **fix:** the main menu sidebar showed the template base URL instead of the one configured on the provider
- **fix:** editing an API key validated it against the template URL instead of the provider custom URL

### v1.0.35

- **fix:** updated the Z.AI provider to the current GLM Coding Plan lineup — `GLM-5.3`, `GLM-5-Turbo` and `GLM-4.7`, dropping the discontinued GLM-4.5/4.6 models
- **fix:** the Z.AI provider now sets `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, as recommended by Z.AI's official configuration
- **refactor:** renamed the Z.AI provider to `Z.AI Coding Plan`, making it explicit that it targets the Coding Plan endpoint rather than the pay-as-you-go API

### v1.0.34

- **feat:** added 9Router as a local provider — self-hosted proxy for 40+ AI providers, with models fetched automatically from the local instance

### v1.0.33

- **feat:** new `Load .env variables` option in the launch screen — reads `.env` from the current directory and injects its variables into Claude Code (empty values are skipped; precedence is `.env` < provider < user-selected)
- **refactor:** removed the experimental `No Flicker` option from the launch screen

### v1.0.32

- **fix:** `default` statusline template now renders two stacked progress bars (5h session and 7d weekly), each with its own percentage and reset time
- **fix:** `full` statusline template now shows a dedicated `reset:7d_time` cell next to the weekly usage percentage

### v1.0.31

- **refactor:** dropped Anthropic API call for 5-hour and weekly usage limits — statusline now reads `rate_limits` directly from Claude Code's native JSON (also removes the on-disk cache and rate-limit lock)
- **feat:** added `effort.level` and `thinking.enabled` indicators in the statusline header across all templates
- **feat:** added `200k+` warning tag in the `default` and `full` statusline templates when `exceeds_200k_tokens` is true

### v1.0.30

- **refactor:** removed `--enable-auto-mode` flag from launch screen (auto-mode is now native in Claude Code)
- **refactor:** removed `--verbose` flag from launch screen (rarely used; can be set inside Claude Code)
- **refactor:** removed `@Lordymine/opencode-go-cli` provider (does not provide the Anthropic-compatible proxy required)

### v1.0.29

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

