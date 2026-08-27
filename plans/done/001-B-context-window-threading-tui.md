# 001-B - Threading TUI → launch (contextWindowTokens pela cadeia existente)

## Prompt base

No projeto multi-claude, faça o valor `context_length` do metadata do modelo selecionado chegar até `runClaude`, atravessando a mesma cadeia que `selectedEnvVars`/`loadDotenv` já usam: StartClaudeFlow → UnifiedApp → app.tsx → tui-process.ts → cli.ts → runner. Todos os campos novos são opcionais (`contextWindowTokens?: number`). Não altere lógica de exibição, OAuth nem launch default.

## Descricao

Cinco hops de passagem de valor, cada um com 1–3 linhas. A origem do dado é o lookup do modelo selecionado na lista `modelItems` do StartClaudeFlow (que já carrega `meta?: ApiModelMeta` por item).

## Checklist de Implementacao

### 1. src/components/app/StartClaudeFlow.tsx — origem

- [x] No tipo do prop `onComplete` (~linha 51), adicionar campo opcional:
  ```ts
  contextWindowTokens?: number;
  ```
- [x] Em `handleOptionsConfirm` (~linha 351), resolver o valor ANTES do `onComplete`:
  ```ts
  const selectedMeta = modelItems.find((m) => m.name === selectedModel)?.meta;
  const contextWindowTokens = selectedMeta?.context_length;
  ```
- [x] Incluir no objeto do `onComplete({...})` (~linha 368):
  ```ts
  contextWindowTokens: contextWindowTokens,
  ```
- [x] NÃO criar estado novo — o lookup no confirm evita tocar em `goToFlagsStep`, resets e handlers de seleção.

### 2. src/components/app/UnifiedApp.tsx — tipo do callback

- [x] No tipo inline do `onStartClaude` (~linhas 45–52), adicionar:
  ```ts
  contextWindowTokens?: number;
  ```

### 3. src/app.tsx — AppResult e passthrough

- [x] Na variante `"start-claude"` do tipo `AppResult` (~linhas 11–20), adicionar:
  ```ts
  contextWindowTokens?: number;
  ```
- [x] No handler `onStartClaude={(result) => {...}}` (~linha 59), repassar:
  ```ts
  contextWindowTokens: result.contextWindowTokens,
  ```

### 4. src/tui-process.ts — persistência no last-selection.json

- [x] No objeto `selection` (~linhas 283–295), adicionar:
  ```ts
  contextWindowTokens: result.contextWindowTokens,
  ```
  - `JSON.stringify` omite campos `undefined` → arquivo antigo/novo permanece compatível (RN-05).

### 5. cli.ts — leitura e repasse final

- [x] Na interface `TuiSelection` (~linhas 30–45), adicionar:
  ```ts
  contextWindowTokens?: number;
  ```
- [x] Na chamada `runClaude(...)` (~linhas 355–362), passar como último argumento:
  ```ts
  selection.contextWindowTokens,
  ```

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/app/StartClaudeFlow.tsx` | MODIFICAR — tipo do prop + lookup + payload |
| `src/components/app/UnifiedApp.tsx` | MODIFICAR — tipo do `onStartClaude` |
| `src/app.tsx` | MODIFICAR — `AppResult` + passthrough |
| `src/tui-process.ts` | MODIFICAR — objeto selection |
| `cli.ts` | MODIFICAR — `TuiSelection` + chamada `runClaude` |

## Contrato de teste

- Selecionar modelo OpenRouter com `context_length` conhecido → `last-selection.json` contém `contextWindowTokens` numérico (RN-01)
- Modelo sem meta (ex. default models sem fetch) → campo omitido no JSON; launch segue igual (RN-03, RN-05)
- Fluxo OAuth / default → `contextWindowTokens` ausente em todos os hops; nenhum comportamento muda (RN-04)

## Resumo de Implementacao

Concluído conforme planejado, com um ajuste menor:

- **`StartClaudeFlow.tsx`**: campo `contextWindowTokens?: number` no tipo do prop `onComplete`; em `handleOptionsConfirm`, o lookup foi feito inline (uma constante) em vez de duas constantes do plano: `modelItems.find((m) => m.name === selectedModel)?.meta?.context_length` — o encadeamento opcional duplo (`?.meta?.`) foi necessário porque `ModelWithSource.meta` é opcional e o `strict` do projeto rejeita o acesso direto (`TS2532`). Payload do `onComplete` inclui o campo. Nenhum estado novo criado.
- **`UnifiedApp.tsx`** / **`app.tsx`**: campo opcional adicionado ao tipo do `onStartClaude` e à variante `"start-claude"` de `AppResult`; passthrough no handler.
- **`tui-process.ts`**: `contextWindowTokens: result.contextWindowTokens` no objeto `selection` (omitido no JSON quando undefined — RN-05).
- **`cli.ts`**: campo na interface `TuiSelection` e repasse como 7º argumento de `runClaude`.

Validação: `bunx tsc --noEmit` — zero erros; `bun test` — 5 pass / 0 fail. Contratos da camada launch (RN-01/02/03/04/06) verificados via script temporário contra `buildClaudeEnv`: 6/6 PASS (script removido após execução). Smoke test end-to-end via TUI fica para a 001-C.
