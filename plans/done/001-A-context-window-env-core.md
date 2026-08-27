# 001-A - Core: env var preservada + parâmetro em buildClaudeEnv/runClaude

## Prompt base

No projeto multi-claude, implemente a base da feature de janela de contexto correta: (1) faça `CLAUDE_CODE_MAX_CONTEXT_TOKENS` sobreviver ao cleanup de variáveis `CLAUDE_CODE_*` em `src/providers.ts`; (2) adicione parâmetro opcional `contextWindowTokens?: number` a `buildClaudeEnv` e `runClaude`, setando a env var no processo do claude quando houver valor válido e nenhum valor manual já presente. Não mexa na TUI nem no cli.ts — isso é o step 001-B.

## Descricao

Camada de launch da feature. Dois arquivos:

1. **`src/providers.ts`** — adicionar `"CLAUDE_CODE_MAX_CONTEXT_TOKENS"` à allowlist `PRESERVED_CLAUDE_CODE_VARS` (hoje o `cleanupClaudeCodeVars` apagaria um valor vindo de `.env`/shell, tornando impossível override manual) e aceitar novo parâmetro opcional em `buildClaudeEnv`, aplicando-o após o cleanup apenas se não houver valor já definido.
2. **`src/runner.ts`** — `runClaude` ganha o mesmo parâmetro opcional (última posição, após `loadDotenv`) e repassa ao `buildClaudeEnv`.

## Checklist de Implementacao

### 1. src/providers.ts — escape hatch manual

- [x] Em `PRESERVED_CLAUDE_CODE_VARS` (~linha 301), adicionar:
  ```ts
  "CLAUDE_CODE_MAX_CONTEXT_TOKENS", // Context window hint for third-party models
  ```
- [x] Em `buildClaudeEnv` (~linha 339), adicionar 4º parâmetro opcional:
  ```ts
  contextWindowTokens?: number,
  ```

### 2. src/providers.ts — injeção automática

- [x] Logo após a chamada `setModelEnvVars(env, model);` (~linha 399), inserir:
  ```ts
  // Claude Code defaults unknown models to a 200k context window; pass the real one when known.
  if (contextWindowTokens && contextWindowTokens > 0 && !env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]) {
      env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = String(contextWindowTokens);
  }
  ```
  - O guard `!env[...]` garante RN-02 (valor manual vence) — com a var na allowlist, um valor de `.env`/shell já estará em `env` neste ponto.

### 3. src/runner.ts — repasse

- [x] Em `runClaude` (~linha 18), adicionar parâmetro após `loadDotenv?: boolean`:
  ```ts
  contextWindowTokens?: number,
  ```
- [x] Na chamada de `buildClaudeEnv` (~linha 38), repassar:
  ```ts
  const env = buildClaudeEnv(provider, model, installationId, contextWindowTokens);
  ```
- [x] NÃO alterar `runClaudeDefault` (launch default é RN-04).

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/providers.ts` | MODIFICAR — allowlist + parâmetro + injeção condicional |
| `src/runner.ts` | MODIFICAR — parâmetro em `runClaude` + repasse |

## Contrato de teste

- Com `contextWindowTokens=1048576`: env resultante contém `CLAUDE_CODE_MAX_CONTEXT_TOKENS="1048576"` (RN-01)
- Com process.env já contendo `CLAUDE_CODE_MAX_CONTEXT_TOKENS=500000` e `contextWindowTokens=1048576`: env mantém `"500000"` (RN-02)
- Com `contextWindowTokens` undefined ou `0`: var ausente (RN-03)
- Provider OAuth (`provider.type === "oauth"`): retorno antecipado intocado, sem a var (RN-04)
- Valor vindo de `.env` (via opção existente) não é apagado pelo cleanup (RN-06)

## Resumo de Implementacao

Concluído conforme planejado, sem desvios.

- **`src/providers.ts`**: `"CLAUDE_CODE_MAX_CONTEXT_TOKENS"` adicionada à allowlist `PRESERVED_CLAUDE_CODE_VARS` (comentário: "Context window hint for third-party models"); `buildClaudeEnv` ganhou 4º parâmetro opcional `contextWindowTokens?: number`; bloco de injeção inserido logo após `setModelEnvVars(env, model)`, com guard `contextWindowTokens && contextWindowTokens > 0 && !env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]` (RN-01/02/03).
- **`src/runner.ts`**: `runClaude` ganhou parâmetro `contextWindowTokens?: number` na última posição e repassa ao `buildClaudeEnv`. `runClaudeDefault` intocado (RN-04).

Validação: `bunx tsc --noEmit` — zero erros; `bun test` — 5 pass / 0 fail.

Observação de ambiente (fora do escopo do step): o typecheck raiz só fica verde com as dependências do subprojeto `video/` instaladas (`cd video && bun install`) — sem elas, o tsc acusa módulos Remotion ausentes em `video/**`, erro pré-existente e alheio a esta feature.
