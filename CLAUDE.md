# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**multi-claude** — CLI tool para gerenciar multiplos provedores de API e iniciar o Claude Code com as environment variables corretas. O usuario roda `mclaude` para selecionar um provedor (o gerenciamento de providers e feito dentro da TUI).

## Commands

- **Install dependencies:** `bun install`
- **Run:** `mclaude` (apos `bun link`)
- **Type check:** `bunx tsc --noEmit`

## Project Structure

```
cli.ts                  # Entry point da CLI (bin: mclaude)
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
├── logs-viewer.ts      # Visualizador de logs de debug
├── services/
│   ├── api-models.ts   # Fetch de modelos de APIs externas
│   ├── openrouter.ts   # Integracao OpenRouter
│   ├── requesty.ts     # Integracao Requesty
│   ├── ollama.ts       # Integracao Ollama
│   ├── lmstudio.ts     # Integracao LM Studio
│   ├── llamacpp.ts     # Integracao llama.cpp
│   ├── litellm.ts      # Integracao LiteLLM Proxy
│   ├── nanogpt.ts      # Integracao NanoGPT
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
│   └── win32-console-size.ts # Deteccao de tamanho do console no Windows
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
    │   └── StatusLinePage.tsx      # Pagina de configuracao da status line
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

- **Runtime:** Bun (not Node.js)
- **Language:** TypeScript with strict mode enabled
- **Module system:** ESNext with bundler module resolution (`noEmit: true`, no build step — Bun runs `.ts` directly)

## Protected Files

**NEVER modify the following files:**

- `TODO.md` - Developer's personal notes and task tracking file

## Release Process

Checklist completo para lançar uma nova versão:

### 1. Validação

```bash
bunx tsc --noEmit
bun test
```

### 2. Bump de versão

Atualizar o campo `version` no `package.json` e rodar `bun install` para atualizar o `bun.lock`.

### 3. Atualizar README.md

- **Badge de versão:** atualizar o número na badge `[![Version](https://img.shields.io/badge/version-X.Y.Z-blue)]`
- **Changelog:** adicionar nova seção `### vX.Y.Z (current)` com as entradas da versão e remover `(current)` da versão anterior

### 4. Formato do changelog

- Use o formato: `- **tipo:** descricao curta em ingles`
- Tipos: `feat`, `fix`, `refactor`, `docs`
- Nao documente bumps de versao, lint, ou alteracoes internas sem impacto ao usuario

### 5. Commit, tags e release

```bash
# Commitar as alterações de versão
git add package.json bun.lock README.md
git commit -m "docs: bump version to vX.Y.Z"

# Criar tag da versão
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z

# Mover a tag latest para o commit atual
git tag -d latest
git push origin --delete latest
git tag -a latest -m "Latest release"
git push origin latest

# Push do commit
git push origin master

# Criar GitHub Release a partir da tag
# --generate-notes gera release notes automaticamente a partir dos commits desde a ultima release
gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes --latest
```

### Instalação pelos usuários

- `bun install -g @leogomide/multi-claude@latest` (última versão via npm)
- `bun install -g github:leogomide/multi-claude#latest` (última versão via git)
- `bun install -g github:leogomide/multi-claude#vX.Y.Z` (versão específica via git)

## Descricao automática para commits

Após cada modificação ou plano criado, gere no console uma descrição para usar no commit das modificações realizadas.

Use os tipos padrão: 'feat', 'fix', 'refactor', 'docs', 'chore'.

Se várias alterações diferentes forem feitas, gere uma linha para cada uma.

O texto deve ser no tempo verbal passado, ou seja, a descrição deve indicar o que foi feito:

ERRADO: `[feat] adicionar cores padronizadas para novo componente`
CORRETO: `[feat] adicionadas cores padronizadas para o novo componente`