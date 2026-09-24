# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**multi-claude** — CLI tool para gerenciar multiplos provedores de API e iniciar o Claude Code com as environment variables corretas. O usuario roda `mclaude` para selecionar um provedor (o gerenciamento de providers e feito dentro da TUI).

## Commands

- **Install dependencies:** `pnpm install` (roda o `prepare`, que builda para `dist/`)
- **Build:** `pnpm build` (ou `pnpm build:watch`)
- **Run:** `mclaude` (apos `pnpm link --global`; rode `pnpm setup` uma vez antes)
- **Type check:** `pnpm check-types`
- **Test:** `pnpm test` (Vitest)
- **Lint:** `pnpm lint` (biome; `pnpm lint:ci` no CI)

## Project Structure

```
cli.ts                  # Entry point da CLI (buildado para dist/cli.js, bin: mclaude)
scripts/
└── build.mjs           # Build com esbuild -> dist/cli.js + dist/tui-process.js
vitest.config.ts        # Config do Vitest (neutraliza CI=true para o Ink)
.github/workflows/
└── ci.yml              # CI: matriz SO x Node 22/24 + job Bun best-effort
dist/                   # Gerado pelo build (fora do git, publicado no npm)
src/
├── schema.ts           # Schemas Zod e tipos TypeScript
├── providers.ts        # Templates dos provedores suportados
├── config.ts           # Leitura/escrita de ~/.multi-claude/config.json
├── runner.ts           # Spawn do claude com env vars
├── tui-process.ts      # Processo da TUI (setup e resultado)
├── app.tsx             # Render do UnifiedApp com Ink
├── debug.ts            # Utilitarios de debug
├── headless.ts         # Modo headless (non-interactive CLI)
├── credential-store.ts # Gerenciamento de credenciais encriptadas
├── crypto.ts           # Operacoes criptograficas (AES-256-GCM)
├── keystore.ts         # Gerenciamento de chaves de encriptacao
├── statusline.ts       # Renderizacao da status line do Claude Code
├── statusline-script.mjs # Script da status line (copiado para dist/ e ~/.multi-claude/)
├── logs-viewer.ts      # Visualizador de logs de debug
├── changelog.ts        # Parser do CHANGELOG.md para a tela Changelog da TUI
├── language-selector.tsx # Seletor de idioma inicial
├── services/
│   ├── api-models.ts   # Fetch de modelos de APIs externas
│   ├── install-detect.ts # Deteccao do gerenciador que instalou o mclaude (auto-update)
│   ├── dotenv-loader.ts # Leitura de .env
│   ├── flatt.ts        # Integracao Flatt (patrocinador)
│   ├── openrouter.ts   # Integracao OpenRouter
│   ├── requesty.ts     # Integracao Requesty
│   ├── ollama.ts       # Integracao Ollama
│   ├── lmstudio.ts     # Integracao LM Studio
│   ├── llamacpp.ts     # Integracao llama.cpp
│   ├── litellm.ts      # Integracao LiteLLM Proxy
│   ├── nanogpt.ts      # Integracao NanoGPT
│   ├── ninerouter.ts   # Integracao 9Router
│   ├── omniroute.ts    # Integracao OmniRoute
│   ├── zai.ts          # Integracao Z.AI
│   ├── custom.ts       # Integracao Provedor personalizado
│   └── version-check.ts # Verificacao de atualizacoes
├── i18n/
│   ├── index.ts        # Setup do i18n (rosetta)
│   ├── types.ts        # Tipos das traducoes
│   ├── context.tsx     # Context provider do i18n (React)
│   └── locales/
│       ├── en.ts       # Ingles
│       ├── pt-BR.ts    # Portugues (BR)
│       └── es.ts       # Espanhol
├── hooks/
│   ├── useTerminalSize.ts  # Hook de tamanho do terminal
│   ├── useBreadcrumb.tsx   # Hook de breadcrumbs para navegacao
│   └── useUpdateCheck.ts   # Hook de verificacao de atualizacoes
├── utils/
│   ├── claude-bin.ts       # Resolucao e spawn do claude sem shell (shims .cmd no Windows)
│   ├── format-tokens.ts    # Formatacao de contagem de tokens
│   ├── validate-context.ts # Validacao da janela de contexto
│   └── validate-url.ts     # Validacao de URLs
└── components/
    ├── types.ts             # Tipos compartilhados dos componentes
    ├── common/
    │   ├── StatusMessage.tsx    # Mensagens de status com icone e cor
    │   ├── Note.tsx             # Box decorado com titulo e conteudo
    │   ├── ConfirmPrompt.tsx    # Prompt de confirmacao Yes/No
    │   ├── TextPrompt.tsx       # Input de texto com validacao e mask
    │   ├── GroupedSelect.tsx    # Select com grupos e sidebar
    │   ├── SearchableSelect.tsx # Select com busca
    │   ├── ChecklistSelect.tsx  # Select com checkboxes (multi-selecao)
    │   ├── CyanSelectInput.tsx  # Select estilizado com tema cyan
    │   └── LanguageSelector.tsx # Seletor de idioma
    ├── layout/
    │   ├── AppShell.tsx    # Shell principal (header + content + footer)
    │   ├── Header.tsx      # Header com titulo e versao
    │   ├── Footer.tsx      # Footer com breadcrumbs e atalhos
    │   └── Sidebar.tsx     # Sidebar com informacoes contextuais
    ├── app/
    │   ├── UnifiedApp.tsx          # Router principal da aplicacao
    │   ├── MainMenu.tsx            # Menu principal
    │   ├── StartClaudeFlow.tsx     # Fluxo: provider -> modelo -> instalacao -> launch
    │   ├── ManageProvidersPage.tsx  # Pagina de gerenciamento de providers
    │   ├── ManageInstallationsPage.tsx # Pagina de gerenciamento de instalacoes
    │   ├── SettingsPage.tsx        # Pagina de configuracoes
    │   ├── StatusLinePage.tsx      # Pagina de configuracao da status line
    │   ├── ChangelogPage.tsx       # Pagina de changelog
    │   └── ChangelogSidebar.tsx    # Sidebar da pagina de changelog
    └── config-wizard/
        ├── AddProviderFlow.tsx     # Fluxo: template -> nome -> api key
        ├── EditProviderFlow.tsx    # Fluxo: selecionar -> editar
        ├── AddInstallationFlow.tsx # Fluxo: nome -> criar diretorio
        ├── EditInstallationFlow.tsx # Fluxo: renomear / remover
        └── ManageModelsFlow.tsx    # Fluxo: gerenciar modelos
```

## Key Dependencies

- **zod** — validacao de schemas de configuracao
- **ink** — React para terminal (UI declarativa)
- **react** — renderizacao de componentes
- **ink-text-input** — input de texto para terminal
- **ink-select-input** — menu de selecao para terminal
- **@inkjs/ui** — componentes UI adicionais para Ink

## Config Storage

Configuracoes sao salvas em `~/.multi-claude/config.json`.

## Tech Stack

- **Runtime:** Node.js >= 22 (o artefato tambem roda no Bun, best-effort)
- **Build:** esbuild (`scripts/build.mjs`) -> `dist/cli.js` + `dist/tui-process.js` (dois bundles, dependencias externas)
- **Package manager:** pnpm (`pnpm-lock.yaml`, campo `packageManager`)
- **Tests:** Vitest (`src/**/*.test.ts(x)`)
- **Language:** TypeScript with strict mode enabled
- **Module system:** ESNext with bundler module resolution (`tsc --noEmit` so checa tipos; quem emite e o esbuild)

## Protected Files

**NEVER modify the following files:**

- `TODO.md` - Developer's personal notes and task tracking file

## Release Process

Checklist completo para lançar uma nova versão:

### 1. Validação

```bash
pnpm check-types && pnpm test && pnpm build
```

### 2. Bump de versão

Atualizar o campo `version` no `package.json` e rodar `pnpm install` para atualizar o `pnpm-lock.yaml`.

### 3. Atualizar README.md, README.en.md e CHANGELOG.md

- **Badge de versão:** atualizar o número na badge `[![Version](https://img.shields.io/badge/version-X.Y.Z-blue)]` nos dois READMEs (`README.md` em PT-BR e `README.en.md` em inglês)
- **Changelog:** no `CHANGELOG.md`, adicionar nova seção `### vX.Y.Z (current)` com as entradas da versão e remover `(current)` da versão anterior
- A tela Changelog da TUI le o `CHANGELOG.md` (`src/changelog.ts`): mantenha o titulo `## Changelog` e o formato `### vX.Y.Z` / `- **tipo:** ...`

### 4. Formato do changelog

- Use o formato: `- **tipo:** descricao curta em ingles`
- Tipos: `feat`, `fix`, `refactor`, `docs`
- Nao documente bumps de versao, lint, ou alteracoes internas sem impacto ao usuario

### 5. Commit, tags e release

```bash
# Commitar as alterações de versão
git add package.json pnpm-lock.yaml README.md README.en.md CHANGELOG.md
git commit -m "docs: bump version to vX.Y.Z"

# Criar tag da versão
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z

# Push do commit
git push origin master

# Publicar no npm (roda o prepublishOnly: check-types + test + build)
pnpm publish

# Criar GitHub Release a partir da tag
# --generate-notes gera release notes automaticamente a partir dos commits desde a ultima release
gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes --latest
```

- A tag git `latest` fica **congelada na v1.0.40** (ultima versao que roda do fonte no Bun, para quem instalou via `github:...#latest`). Nao mova essa tag.

### Instalação pelos usuários

- `npm i -g @leogomide/multi-claude@latest`
- Alternativas: `pnpm add -g @leogomide/multi-claude` ou `bun add -g @leogomide/multi-claude`

## Descricao automática para commits

Após cada modificação ou plano criado, gere no console uma descrição para usar no commit das modificações realizadas.

Use os tipos padrão: 'feat', 'fix', 'refactor', 'docs', 'chore'.

Se várias alterações diferentes forem feitas, gere uma linha para cada uma.

O texto deve ser no tempo verbal passado, ou seja, a descrição deve indicar o que foi feito:

ERRADO: `[feat] adicionar cores padronizadas para novo componente`
CORRETO: `[feat] adicionadas cores padronizadas para o novo componente`