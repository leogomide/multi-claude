# Relatorio de Viabilidade: Extensao VS Code para mclaude

## Contexto

O **multi-claude** e uma CLI (Bun + TypeScript) que gerencia multiplos provedores de API e lanca o Claude Code com as environment variables corretas. O usuario quer avaliar a viabilidade tecnica de criar uma extensao VS Code que replique ou integre as funcionalidades do mclaude.

---

## 1. Analise da Arquitetura Atual

### 1.1 Camadas do Projeto

| Camada | Arquivos | Acoplamento |
|--------|----------|-------------|
| **CLI/Processo** | `cli.ts`, `src/runner.ts`, `src/tui-process.ts` | Bun runtime, spawn de processos, stdio inherit |
| **TUI (Ink/React)** | `src/app.tsx`, `src/components/**` | 100% acoplado ao Ink (Box, Text, useInput) |
| **Logica de Negocio** | `src/config.ts`, `src/schema.ts`, `src/providers.ts` | **Desacoplada** - puro TypeScript/Zod |
| **Servicos/APIs** | `src/services/*` | **Desacoplada** - fetch padrao |
| **i18n** | `src/i18n/*` | **Desacoplada** - Rosetta (framework-agnostic) |
| **Debug** | `src/debug.ts` | **Desacoplada** - fs/path padrao |
| **FFI Windows** | `src/utils/win32-console-size.ts` | Bun-only (`bun:ffi` + kernel32.dll) |

### 1.2 Fluxo de Dados Atual

```
mclaude CLI
  -> Spawn tui-process.ts (subprocesso)
    -> Ink React App (terminal alternativo)
      -> Usuario seleciona provider/modelo/instalacao/flags
      -> Resultado escrito em ~/.multi-claude/last-selection.json
  -> cli.ts le selecao
  -> runner.ts constroi env vars (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, etc.)
  -> spawn("claude", args, { stdio: "inherit", env })
  -> Claude Code assume o terminal
```

### 1.3 O que e Reaproveitavel (sem modificacao)

- **`src/schema.ts`** — Schemas Zod, tipos TypeScript, constantes
- **`src/config.ts`** — Leitura/escrita de `~/.multi-claude/config.json`, migrations, helpers
- **`src/providers.ts`** — Templates de provedores, `buildClaudeEnv()`, resolucao de modelos
- **`src/services/*`** — Fetch de modelos de APIs externas (OpenRouter, Requesty, Ollama, etc.)
- **`src/i18n/*`** — Sistema de traducao completo
- **`src/debug.ts`** — Logging para arquivo

### 1.4 O que NAO e Reaproveitavel

- **Toda a camada TUI** (`src/components/**`, `src/app.tsx`) — Ink e exclusivo para terminal
- **`cli.ts`** — Logica de processo/spawn especifica para CLI
- **`src/tui-process.ts`** — Bridge CLI<->TUI
- **`src/utils/win32-console-size.ts`** — `bun:ffi` nao existe no Node/VS Code

---

## 2. Abordagens Possiveis

### Abordagem A: Extensao VS Code Nativa (Recomendada)

**Descricao:** Extensao TypeScript pura para VS Code que reimplementa a UI usando APIs nativas do VS Code (QuickPick, TreeView, Webview) e reutiliza a logica de negocio do mclaude.

**Arquitetura proposta:**
```
vscode-multi-claude/
  src/
    extension.ts          # Ativacao, comandos, lifecycle
    ui/
      providerPicker.ts   # QuickPick para selecao de provider
      modelPicker.ts      # QuickPick com busca para modelos
      flagsPicker.ts      # QuickPick multi-select para flags
      settingsWebview.ts  # Webview para config avancada (opcional)
      statusBar.ts        # StatusBarItem com provider/modelo ativo
      sidebar.ts          # TreeView para providers e instalacoes
    core/                 # IMPORTADO DO MCLAUDE (reuso direto)
      schema.ts
      config.ts
      providers.ts
      services/
      i18n/
    terminal/
      launcher.ts         # Cria VS Code Terminal com env vars
```

**Como lanca o Claude Code:**
```typescript
// Usa a API de terminal do VS Code
const env = buildClaudeEnv(provider, model, installationId);
const terminal = vscode.window.createTerminal({
  name: `Claude (${provider.name})`,
  env: env,  // VS Code injeta as env vars no terminal
});
terminal.sendKeys("claude --model " + model);
terminal.show();
```

**Vantagens:**
- ~60% da logica de negocio reutilizada diretamente
- UX nativa do VS Code (QuickPick e rapido, familiar, acessivel)
- Integra com terminal integrado do VS Code (sem spawn externo)
- StatusBar mostra provider/modelo ativo
- Sidebar com TreeView para gerenciar providers
- Atalhos de teclado personalizaveis
- Marketplace do VS Code para distribuicao

**Desvantagens:**
- UI precisa ser reimplementada (~40% do trabalho)
- QuickPick e mais limitado que a TUI atual (sem sidebar rica, sem layout flexbox)
- Precisa trocar Bun por Node.js (runtime do VS Code)

**Impacto da troca Bun -> Node.js:**
- `bun:ffi` nao existe — mas nao e necessario (VS Code gerencia terminal)
- `fetch` disponivel no Node 18+ (VS Code usa Node 18+)
- Zod, Rosetta funcionam identicamente
- `fs`, `path`, `crypto` sao Node.js padrao (ja compativel)
- **Unico breaking change real:** remover `bun:ffi` do `win32-console-size.ts` — irrelevante pois VS Code gerencia tamanho de terminal

### Abordagem B: Wrapper Fino (Minima)

**Descricao:** Extensao minimalista que apenas invoca `mclaude` como processo externo no terminal do VS Code.

```typescript
// Simplesmente abre mclaude no terminal
const terminal = vscode.window.createTerminal("mclaude");
terminal.sendKeys("mclaude\n");
terminal.show();
```

**Vantagens:**
- Implementacao trivial (~50 linhas)
- Zero duplicacao de logica
- Funciona imediatamente

**Desvantagens:**
- Nenhuma integracao real com VS Code
- Ink TUI dentro do terminal do VS Code pode ter problemas de renderizacao
- Sem QuickPick, sem StatusBar, sem sidebar
- Depende do mclaude estar instalado globalmente
- Valor agregado minimo vs rodar mclaude direto

### Abordagem C: Hibrida (Webview + Core)

**Descricao:** Usa Webview do VS Code para renderizar uma UI web completa, reutilizando a logica de negocio.

**Vantagens:**
- UI mais rica que QuickPick (HTML/CSS completo)
- Pode replicar a TUI fielmente com design web

**Desvantagens:**
- Overhead significativo de desenvolvimento (HTML/CSS/JS para Webview)
- Webviews sao lentas para abrir vs QuickPick
- Nao segue convencoes UX do VS Code
- Complexidade de comunicacao Webview <-> Extension Host (postMessage)
- Over-engineering para o caso de uso

---

## 3. Analise de Viabilidade Tecnica

### 3.1 Mapeamento de Funcionalidades TUI -> VS Code

| Funcionalidade mclaude | Componente VS Code | Complexidade |
|------------------------|-------------------|-------------|
| Menu principal (GroupedSelect) | QuickPick com separadores | Baixa |
| Selecao de provider | QuickPick com icones e descricao | Baixa |
| Selecao de modelo (com busca) | QuickPick com filtro nativo | Baixa |
| Sidebar com metadata do modelo | QuickPick `detail` field + tooltip | Media |
| Selecao de flags (checklist) | QuickPick `canPickMany: true` | Baixa |
| Selecao de instalacao | QuickPick | Baixa |
| Adicionar provider (wizard) | InputBox sequencial + QuickPick | Media |
| Editar provider | InputBox + QuickPick | Media |
| Gerenciar modelos | QuickPick + InputBox | Media |
| Configuracoes | VS Code Settings API (`contributes.configuration`) | Baixa |
| Selecao de idioma | QuickPick | Baixa |
| Status line | StatusBarItem | Baixa |
| Breadcrumbs de navegacao | N/A (QuickPick e modal, nao precisa) | N/A |
| OAuth login | Terminal externo + callback | Alta |

### 3.2 Desafios Tecnicos

**1. OAuth Flow (Complexidade Alta)**
- Atualmente: cli.ts spawna `claude` puro para login, monitora credenciais
- VS Code: Pode usar `vscode.authentication` API ou abrir terminal dedicado
- Solucao: Abrir terminal temporario para `claude` login, monitorar `~/.multi-claude/accounts/` para detectar conclusao

**2. Deteccao de Claude Code Instalado**
- Atualmente: `which claude` / `where claude`
- VS Code: `child_process.execSync("claude -v")` funciona identicamente
- Baixo risco

**3. Compartilhamento de Config com CLI**
- Ambos leem/escrevem `~/.multi-claude/config.json`
- Zod schema garante compatibilidade
- File watcher do VS Code pode detectar mudancas externas
- **Beneficio:** usuario pode usar CLI e extensao intercambiavelmente

**4. Fetch de Modelos Async**
- VS Code suporta `fetch` nativo (Node 18+)
- QuickPick suporta `busy: true` para loading states
- Funciona sem modificacao

**5. Runtime Bun vs Node.js**
- Modulos core (`config.ts`, `schema.ts`, `providers.ts`, `services/*`) usam apenas:
  - `fs`, `path`, `crypto` (Node.js padrao)
  - `fetch` (Node 18+)
  - `zod` (universal)
  - `rosetta` (universal)
- **Unica incompatibilidade:** `bun:ffi` em `win32-console-size.ts` — nao necessario no VS Code
- **Conclusao:** Portabilidade para Node.js e trivial

### 3.3 Estimativa de Esforco (Abordagem A)

| Componente | Esforco |
|-----------|---------|
| Setup do projeto (extensao boilerplate, packaging) | Pequeno |
| Importar/adaptar core logic (config, schema, providers, services) | Pequeno (copiar + remover bun:ffi) |
| QuickPick flows (provider, modelo, flags, instalacao) | Medio |
| Wizard de adicionar/editar provider | Medio |
| Gerenciamento de modelos | Medio |
| StatusBar integration | Pequeno |
| TreeView sidebar (providers) | Medio |
| Terminal launcher (buildClaudeEnv + createTerminal) | Pequeno |
| OAuth flow adaptation | Medio-Alto |
| Settings integration | Pequeno |
| i18n integration | Pequeno |
| Testes | Medio |
| **Total estimado** | **Medio** |

---

## 4. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Ink TUI com bugs no terminal VS Code (Abordagem B) | Alta | Alto | Usar Abordagem A (nativa) |
| QuickPick limitado para UX complexa | Media | Baixo | `detail` field + multi-step flows |
| Divergencia de config entre CLI e extensao | Baixa | Medio | Schema Zod compartilhado + file watcher |
| OAuth flow complexo no VS Code | Media | Medio | Terminal dedicado + polling de credenciais |
| Atualizacoes do mclaude quebrarem extensao | Media | Alto | Versionamento do schema, testes de integracao |
| Bun-only features futuras no core | Baixa | Alto | Manter core compativel com Node.js (CI check) |

---

## 5. Conclusao e Recomendacao

### Viabilidade: ALTA

O projeto e **viavel e estrategicamente interessante** pelos seguintes motivos:

1. **~60% da logica de negocio e reutilizavel** sem modificacao (config, schema, providers, services, i18n)
2. **A unica incompatibilidade Bun/Node** (`bun:ffi`) e irrelevante para o contexto VS Code
3. **Todas as funcionalidades da TUI tem equivalentes nativos** no VS Code (QuickPick, InputBox, TreeView, StatusBar, Terminal API)
4. **Config compartilhado** permite uso simultaneo de CLI + extensao
5. **Distribuicao via Marketplace** amplia significativamente o alcance do projeto

### Recomendacao: Abordagem A (Extensao Nativa)

**Proximo passo recomendado:** Extrair a logica de negocio (`schema.ts`, `config.ts`, `providers.ts`, `services/*`, `i18n/*`) para um pacote `@multi-claude/core` compartilhado, garantindo compatibilidade Node.js. Isso permite que tanto a CLI quanto a extensao VS Code consumam o mesmo core sem duplicacao.

### Estrutura de Monorepo Sugerida

```
multi-claude/
  packages/
    core/           # schema, config, providers, services, i18n (Node+Bun)
    cli/            # cli.ts, runner.ts, tui (Ink), app.tsx (Bun)
    vscode/         # Extensao VS Code (Node.js)
```
