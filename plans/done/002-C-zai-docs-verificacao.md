# 002-C - Docs (README) + verificacao

## Prompt base

No projeto multi-claude, atualize a seção Z.AI Coding Plan do README para refletir que os modelos passam a vir da API do provider com fallback para a lista fixa, e rode a verificação (`bunx tsc --noEmit`, `bun test`).

## Descricao

Fecha o plano: documentação de usuário + gates automatizados. Nenhuma mudança de comportamento aqui.

A seção Z.AI do README (`README.md:323`) hoje anuncia `**Default models:** GLM-5.3, GLM-5-Turbo, GLM-4.7` como se fosse a lista completa. Após 002-A/002-B ela vira fallback. O padrão de redação para provider com fetch já existe no README — ver 9Router (`README.md:384`): *"None — fetched from `/v1/models`, depending on..."*.

## Checklist de Implementacao

### 1. `README.md` — seção Z.AI Coding Plan

- [x] Substituir a linha `- **Default models:** ...` (~linha 328) por:
  ```md
  - **Models:** Fetched from `/v1/models` on the configured base URL — falls back to `GLM-5.3`, `GLM-5-Turbo`, `GLM-4.7` if the API is unreachable
  ```
- [x] Não alterar a tabela de tiers nem o parágrafo do Coding Plan (informação de produto, fora do escopo).

### 2. `README.md` — changelog

- [x] Nova entrada na seção da versão corrente, em inglês, no formato `- **tipo:** descricao`:
  ```md
  - **feat:** the Z.AI provider now fetches its model list from the provider API, falling back to the built-in list when the API is unreachable
  - **fix:** a failed model fetch no longer dead-ends on an error screen when a saved model list is available
  ```
- [x] Bump de versão e badge **não** fazem parte deste plano (seguem o Release Process do `CLAUDE.md`, em commit próprio).

### 3. Verificacao

- [x] `bunx tsc --noEmit` — sem erros (cobre principalmente os 3 locales × `Translations`)
- [x] `bun test` — `src/smoke.test.tsx` verde. ⚠️ O mock de `./services/api-models.ts` (linha 39) lista as funções exportadas explicitamente; se o step 002-A tiver adicionado export novo consumido pela TUI, o mock precisa acompanhar. Como 002-A só adiciona `case`s às funções existentes, **espera-se nenhuma alteração no mock** — confirmar em vez de presumir.
- [x] Probe manual de sanidade (opcional, requer chave real):
  ```bash
  curl -s -m 20 "https://api.z.ai/api/anthropic/v1/models" -H "Authorization: Bearer $ZAI_KEY" | head -c 400
  ```

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `README.md` | MODIFICAR — seção Z.AI + changelog |

## Contrato de teste

- `bunx tsc --noEmit` sai com código 0
- `bun test` sai com código 0
- README não menciona mais a lista fixa como se fosse a lista completa de modelos do Z.AI

## Resumo de Implementacao

Concluído conforme planejado, com uma ressalva registrada.

- **`README.md`**: linha `**Default models:**` da seção Z.AI substituída por `**Models:** Fetched from /v1/models ... falls back to ...`, no mesmo padrão do 9Router; duas entradas (`feat` + `fix`) no topo do changelog da v1.0.35. O arquivo usa **CRLF** — replaces com `
` literal não casam.
- **`bunx tsc --noEmit`**: exit 0.
- **`bunx biome check --write`** nos 7 arquivos tocados: 1 arquivo reformatado (`zai.ts`), `zai.ts` e `api-models.ts` limpos. Os 9 warnings restantes são `useExhaustiveDependencies` pré-existentes em `StartClaudeFlow.tsx`.
- **O mock de `./services/api-models.ts` no smoke test não precisou de alteração**, como previsto (002-A só adicionou `case`s a funções já exportadas).

### Ressalva — resolvida pelo plano 003

> **Atualização:** o diagnóstico abaixo estava certo quanto a *não ser regressão do 002*, mas **errado quanto à causa**. Não era drift na contagem de `DOWN` — era o Enter agindo em índice defasado no `GroupedSelect`. Ver `plans/done/003-0-select-stale-index-INDEX.md`. `bun test` está em **7 pass / 0 fail**. O teste 5 precisou ter a asserção atualizada: ela codificava a precedência antiga, anterior ao RN-05 do 002-B.

<details><summary>Diagnóstico original (mantido para histórico)</summary>

#### `bun test`: 2 pass / 3 fail (pré-existente, não regressão)

`bun test` **não** está verde, mas as falhas **não vêm deste plano**. Comprovado com `git worktree add .baseline-wt HEAD`: em `HEAD` (d59bc65) falham **exatamente os mesmos 3 testes**:

- `2. Navigate to Manage Providers`
- `3. Navigate to Settings`
- `5. Select OpenRouter → fetches models and shows list`

Causa: `src/smoke.test.tsx` navega o menu por contagem fixa de `DOWN` (comentário "Current menu order" nas linhas 113-121) e o menu ganhou itens desde que o teste foi escrito — o teste 3 cai na lista de modelos do "My MiniMax" em vez de Settings. Worktree removido após a checagem.

**Consequência para este plano:** o teste 5 seria o cobertor natural do merge do 002-B, mas está cego pelo mesmo drift. O merge foi validado empiricamente contra a API real (ver Resumo do 002-B) e os TC-01/02/03 do 002-D cobrem manualmente. **Consertar o smoke test é trabalho à parte, fora do escopo do 002.**

</details>
