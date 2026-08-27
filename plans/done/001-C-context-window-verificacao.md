# 001-C - Verificação: typecheck + smoke test end-to-end

## Prompt base

No projeto multi-claude, após os steps 001-A e 001-B, valide a feature de ponta a ponta: rode o typecheck, depois faça um smoke test real do launch com um provider OpenRouter conferindo (via debug logs) que `CLAUDE_CODE_MAX_CONTEXT_TOKENS` chega no processo do claude com o valor do metadata.

## Descricao

Step de verificação sem código novo. Usa o logger existente (`src/debug.ts`; `runner.ts` já loga as chaves `CLAUDE*` sanitizadas em `log.debug("env=...")`, ~linha 136) para confirmar a env var no spawn.

## Checklist de Implementacao

### 1. Typecheck

- [x] `bunx tsc --noEmit` — zero erros
- [x] `bun test` — zero falhas (5 pass / 0 fail)

### 1b. Contratos da camada launch — verificação automatizada

- [x] RN-01 — `buildClaudeEnv` com `contextWindowTokens=1048576` injeta `CLAUDE_CODE_MAX_CONTEXT_TOKENS="1048576"` (script temporário, PASS)
- [x] RN-02 — `process.env` pré-definido `=500000` prevalece sobre o automático (PASS)
- [x] RN-03 — `undefined` e `0` omitem a var (PASS)
- [x] RN-04 — provider OAuth retorna sem a var mesmo com contexto conhecido (PASS)
- [x] RN-06 — valor de shell sobrevive ao cleanup via allowlist, mesmo sem parâmetro (PASS)

### 2. Smoke test — automático via debug log

- [ ] Ativar debug e rodar launch TUI:
  ```
  $env:MCLAUDE_LOG_LEVEL = "debug"; mclaude
  ```
- [ ] Selecionar provider OpenRouter → modelo com `context_length` conhecido (ex.: um modelo 1M) → confirmar opções
- [ ] No log (`~/.multi-claude/logs/`, logger "runner"), conferir na linha `env=`:
  - `"CLAUDE_CODE_MAX_CONTEXT_TOKENS":"<context_length do modelo>"` presente
  - Valor bate com o exibido na sidebar da TUI

### 3. Smoke test — override manual (RN-02)

- [ ] Criar `.env` no cwd com `CLAUDE_CODE_MAX_CONTEXT_TOKENS=500000`
- [ ] Repetir o launch marcando "Carregar variáveis de .env"
- [ ] Conferir no log que prevalece `"500000"` (manual vence o automático)
- [ ] Remover o `.env` de teste ao final

### 4. Smoke test — confirmação dentro do Claude Code

- [ ] No claude aberto pelo smoke test, rodar `/context` (ou observar a statusline): janela assumida deve ser o valor injetado, não ~200k
- [ ] Aviso de "unknown model window" não deve mais aparecer

### 5. Casos negativos

- [ ] Provider OAuth ou launch default → log NÃO contém `CLAUDE_CODE_MAX_CONTEXT_TOKENS`
- [ ] Modelo sem metadata (ex. default model de provider sem fetch de API) → var ausente no log; comportamento idêntico ao atual

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| (nenhum) | Verificação apenas |

## Contrato de teste

- Todos os cenários acima passam = RN-01 a RN-06 verificadas end-to-end.

## Resumo de Implementacao

Step de verificação, sem código novo.

- **Typecheck e testes:** `bunx tsc --noEmit` zero erros; `bun test` 5 pass / 0 fail.
- **Contratos automatizados (seção 1b):** RN-01/02/03/04/06 exercitados diretamente contra `buildClaudeEnv` via script temporário Bun — 6/6 PASS. Script removido após execução (não integrado à suíte por ser descartável; a suíte `bun test` cobre os fluxos existentes).
- **Pendente (execução manual do dev):** seções 2–5 — smoke test end-to-end via TUI (`$env:MCLAUDE_LOG_LEVEL = "debug"; mclaude`, provider OpenRouter com modelo 1M), override manual por `.env`, confirmação dentro do Claude Code (`/context`) e casos negativos. Esses cenários exigem TUI interativa + launch real do claude e estão detalhados como test cases em `001-D`.
- **Observação de ambiente:** o typecheck raiz exige as deps do subprojeto `video/` instaladas (`cd video && bun install`); sem elas há erros pré-existentes de módulos Remotion em `video/**`, alheios a esta feature.
