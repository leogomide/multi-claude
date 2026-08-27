# 001-D - Test cases (execução manual)

> Preencher os resultados após executar manualmente. Este arquivo permanece em `plans/` até a execução; INDEX + steps A/B/C seguem para `plans/done`.

## Pré-requisitos

- Deps instaladas na raiz e no subprojeto video (`bun install` / `cd video && bun install`)
- Provider OpenRouter configurado com API key válida
- Debug ativado: `$env:MCLAUDE_LOG_LEVEL = "debug"` (o log da linha `env=` é nível debug)

## TC-01 — Injeção automática do contexto (RN-01)

**Passos**

1. Rodar `mclaude`
2. Start Claude → provider OpenRouter → selecionar modelo com `context_length` conhecido e alto (ex.: um modelo 1M exibido na sidebar)
3. Confirmar opções e lançar
4. Abrir o log mais recente em `~/.multi-claude/logs/`, logger `runner`, linha `env=`

**Esperado**

- `"CLAUDE_CODE_MAX_CONTEXT_TOKENS":"<context_length>"` presente, valor idêntico ao exibido na sidebar da TUI

**Resultado:** ☐

## TC-02 — Override manual via .env (RN-02/RN-06)

**Passos**

1. Criar `.env` no cwd com `CLAUDE_CODE_MAX_CONTEXT_TOKENS=500000`
2. Repetir o TC-01 marcando "Carregar variáveis de .env"
3. Conferir a linha `env=` no log; remover o `.env` de teste ao final

**Esperado**

- Prevalece `"500000"` (manual vence o automático); o cleanup não apaga o valor

**Resultado:** ☐

## TC-03 — Janela efetiva dentro do Claude Code

**Passos**

1. No claude aberto pelo TC-01, rodar `/context`

**Esperado**

- Janela assumida ≈ o valor injetado (não ~200k)
- Sem aviso de "unknown model window"

**Resultado:** ☐

## TC-04 — Modelo sem metadata (RN-03)

**Passos**

1. Lançar um modelo default de provider sem fetch de API (sem meta) ou limpar os modelos fetched

**Esperado**

- Log NÃO contém `CLAUDE_CODE_MAX_CONTEXT_TOKENS`; comportamento idêntico ao atual (~200k default)

**Resultado:** ☐

## TC-05 — OAuth e launch default (RN-04)

**Passos**

1. Lançar via provider OAuth e depois via launch default

**Esperado**

- Log não contém `CLAUDE_CODE_MAX_CONTEXT_TOKENS` em nenhum dos dois; nenhum comportamento novo

**Resultado:** ☐

## TC-06 — Compatibilidade do last-selection.json (RN-05)

**Passos**

1. Lançar um modelo SEM metadata e inspecionar `~/.multi-claude/last-selection.json`
2. Lançar um modelo COM metadata e inspecionar novamente

**Esperado**

- Caso 1: campo `contextWindowTokens` ausente no JSON
- Caso 2: campo presente e numérico

**Resultado:** ☐
