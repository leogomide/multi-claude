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
├── services/
│   ├── api-models.ts   # Fetch de modelos de APIs externas
│   ├── openrouter.ts   # Integracao OpenRouter
│   ├── requesty.ts     # Integracao Requesty
│   ├── ollama.ts       # Integracao Ollama
│   ├── lmstudio.ts     # Integracao LM Studio
│   └── llamacpp.ts     # Integracao llama.cpp
├── i18n/
│   ├── index.ts        # Setup do i18n (rosetta)
│   ├── types.ts        # Tipos das traducoes
│   └── locales/
│       ├── en.ts       # Ingles
│       ├── pt-BR.ts    # Portugues (BR)
│       └── es.ts       # Espanhol
├── hooks/
│   └── useTerminalSize.ts  # Hook de tamanho do terminal
└── components/
    ├── types.ts             # Tipos compartilhados dos componentes
    ├── common/
    │   ├── StatusMessage.tsx    # Mensagens de status com icone e cor
    │   ├── Note.tsx             # Box decorado com titulo e conteudo
    │   ├── ConfirmPrompt.tsx    # Prompt de confirmacao Yes/No
    │   ├── TextPrompt.tsx       # Input de texto com validacao e mask
    │   ├── GroupedSelect.tsx    # Select com grupos e sidebar
    │   ├── SearchableSelect.tsx # Select com busca
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
    │   └── SettingsPage.tsx        # Pagina de configuracoes
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

## Descricao automática para commits

Após cada modificação ou plano criado, gere no console uma descrição para usar no commit das modificações realizadas.

Use os tipos padrão: 'feat', 'fix', 'refactor', 'docs', 'chore'.

Se várias alterações diferentes forem feitas, gere uma linha para cada uma.

O texto deve ser no tempo verbal passado, ou seja, a descrição deve indicar o que foi feito:

ERRADO: `[feat] adicionar cores padronizadas para novo componente`
CORRETO: `[feat] adicionadas cores padronizadas para o novo componente`