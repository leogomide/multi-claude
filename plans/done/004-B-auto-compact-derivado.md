# 004-B - `CLAUDE_CODE_AUTO_COMPACT_WINDOW` derivado da janela

## Prompt base

No projeto multi-claude, faça o `buildClaudeEnv` derivar `CLAUDE_CODE_AUTO_COMPACT_WINDOW` da janela de contexto do modelo em vez de depender do valor fixo no template, e remova o `CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000"` do template `zai`. Não mexa em `modelSpecs` nem em `api-models.ts` — isso é o step 004-A.

## Descricao

Hoje o template `zai` fixa `CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000"` e **isso não faz nada**: o Claude Code aplica `min(janela do modelo, configurado)` e a janela assumida é 200.000. Depois do 004-A a janela passa a ser real (1.048.576 no `glm-5.3`), e aí aquele `1000000` passaria a valer de verdade — a sessão só compactaria no limite, exatamente o que o próprio binário desaconselha:

> *"The auto setting picks a window tuned for your model and is strongly recommended for the best cost and performance. Overriding auto may result in high token usage, especially when resuming long sessions."*

Trocamos o número fixo por um derivado da janela, que é o pedido do dev e vale para qualquer provider.

Limites do binário (`sL`, claude.exe 2.1.246): o valor de env é parseado com mínimo `THe = 1e5` e máximo `fCt = 1e6`, depois `Math.max(THe, ...)` e por fim `Math.min(janela, configurado)`. Ou seja, valor fora de [100.000, 1.000.000] é inútil — daí o clamp do nosso lado.

## Checklist de Implementacao

### 1. `src/providers.ts` — a constante e a derivação

- [x] Perto do bloco de injeção do plano 001 (~linha 403), adicionar acima de `buildClaudeEnv`:
  ```ts
  // Claude Code compacts as usage approaches this budget, so leave headroom for the
  // reply and for tool results already in flight. It only accepts 100k..1M.
  const AUTO_COMPACT_FRACTION = 0.8;
  const AUTO_COMPACT_MIN = 100_000;
  const AUTO_COMPACT_MAX = 1_000_000;
  ```
- [x] Logo após o bloco que seta `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, dentro do mesmo `if`:
  ```ts
  if (contextWindowTokens && contextWindowTokens > 0 && !env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]) {
      env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = String(contextWindowTokens);
  }

  // Derive the compaction budget from the window instead of hardcoding it per template.
  if (contextWindowTokens && contextWindowTokens > 0 && !env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]) {
      const derived = Math.round(contextWindowTokens * AUTO_COMPACT_FRACTION);
      const clamped = Math.min(AUTO_COMPACT_MAX, Math.max(AUTO_COMPACT_MIN, derived));
      env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"] = String(clamped);
  }
  ```
  - Os dois guards são independentes: um valor manual de `MAX_CONTEXT_TOKENS` não impede o auto-compact derivado, e vice-versa (RN-08).
  - ⚠️ O guard `!env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"]` **só funciona se o template não setar a var** — daí o item 2 ser obrigatório, não cosmético.

### 2. `src/providers.ts` — limpar o template `zai`

- [x] Remover a linha `CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000",` do `env` do template `zai`.
  - `API_TIMEOUT_MS` e `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` ficam.
  - Sem isso, o `env` do template é aplicado antes e o guard nunca deixaria o derivado entrar.

### 3. `src/providers.ts` — conferir a allowlist

- [x] Confirmar que `CLAUDE_CODE_AUTO_COMPACT_WINDOW` está em `PRESERVED_CLAUDE_CODE_VARS` (junto de `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, adicionada no plano 001). Se não estiver, adicionar — sem ela o `cleanupClaudeCodeVars` apaga o valor manual de `.env`/shell e a RN-08 quebra para essa var.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/providers.ts` | MODIFICAR — constantes, derivação, remoção da env fixa do `zai`, allowlist |

## Contrato de teste

| Janela | Esperado em `CLAUDE_CODE_AUTO_COMPACT_WINDOW` |
|--------|-----------------------------------------------|
| 1.048.576 (`glm-5.3`) | `838861` |
| 204.800 (`glm-4.7`) | `163840` |
| 131.072 (`glm-4.5`) | `104858` |
| 65.536 | `100000` (clamp mínimo) |
| 2.000.000 | `1000000` (clamp máximo) |
| ausente / `0` | var não setada (RN-07) |

- Com `CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000` vindo do `.env`/shell → o valor manual permanece (RN-08)
- `buildClaudeEnv` de um provider Z.AI com `glm-5.3` → `MAX_CONTEXT_TOKENS=1048576` **e** `AUTO_COMPACT_WINDOW=838861`
- Provider sem janela conhecida (ex.: `deepseek`) → nenhuma das duas vars (RN-03, RN-07, RN-09)
- O `env` do template `zai` não contém mais `CLAUDE_CODE_AUTO_COMPACT_WINDOW`
- `bunx tsc --noEmit` limpo e `bun test` continua 7 pass

## Resumo de Implementacao

Concluído conforme planejado, sem desvios.

- **`src/providers.ts`**: constantes `AUTO_COMPACT_FRACTION = 0.8`, `AUTO_COMPACT_MIN = 100_000`, `AUTO_COMPACT_MAX = 1_000_000`; derivação inserida logo após o bloco do plano 001, com guard próprio; `CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000"` removido do `env` do template `zai`; a var adicionada à `PRESERVED_CLAUDE_CODE_VARS`.

O item 3 do checklist **não era formalidade**: a var não estava na allowlist. Ela sobrevivia só porque o template a reaplicava depois do cleanup — ao remover do template, um valor manual de `.env`/shell passaria a ser apagado e a RN-08 quebraria. O teste de override cobre exatamente isso.

### Contrato verificado (13/13)

| Janela | Esperado | Obtido |
|--------|----------|--------|
| 1.048.576 (`glm-5.3`) | 838861 | 838861 |
| 204.800 (`glm-4.7`) | 163840 | 163840 |
| 131.072 (`glm-4.5`) | 104858 | 104858 |
| 65.536 | 100000 (clamp min) | 100000 |
| 2.000.000 | 1000000 (clamp max) | 1000000 |
| ausente / `0` | não setada | não setada |

Mais: as duas vars saem juntas no `glm-5.3`; o template não tem mais a env fixa e preserva `API_TIMEOUT_MS`/`DISABLE_NONESSENTIAL_TRAFFIC`; override manual vence nas duas (`500000`/`300000`); `deepseek` não recebe nenhuma das duas.
