# 004-C - Test cases (execução manual)

> Preencher os resultados após executar manualmente. Este arquivo permanece em `plans/` até a execução; INDEX + steps A/B seguem para `plans/done`.

## Pré-requisitos

- `bun install` na raiz
- Provider Z.AI configurado com API key válida do Coding Plan
- Debug ativado: `$env:MCLAUDE_LOG_LEVEL = "debug"` (a linha `env=` do logger `runner` é nível debug)

## TC-01 — Janela real no launch (RN-02, RN-06)

**Passos**

1. `mclaude` → Start Claude → Z.AI → selecionar `GLM-5.3`
2. Confirmar opções e lançar
3. Abrir o log mais recente em `~/.multi-claude/logs/`, logger `runner`, linha `env=`

**Esperado**
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS=1048576`
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW=838861`

**Resultado:** (preencher)

## TC-02 — O Claude Code reconhece a janela

**Passos**

1. Dentro da sessão lançada no TC-01, rodar `/context`

**Esperado**
- A janela mostrada é ~1M, não 200K
- **Não** aparece mais o aviso `"glm-5.3" is not a model this version of Claude Code recognizes, so auto-compact will keep this session within 200k tokens`
  - (o binário suprime esse aviso justamente quando `CLAUDE_CODE_MAX_CONTEXT_TOKENS` está setada)

**Resultado:** (preencher)

## TC-03 — Auto-compact conferido pelo próprio Claude Code

**Passos**

1. Na mesma sessão, rodar `/config` e olhar a linha `Auto-compact window`

**Esperado**
- Mostra `838861 tokens (from CLAUDE_CODE_AUTO_COMPACT_WINDOW)`
- **Não** aparece o sufixo `· capped to ... by model` (que indicaria configurado > janela)

**Resultado:** (preencher)

## TC-04 — Sidebar da TUI (RN-05)

**Passos**

1. `mclaude` → Start Claude → Z.AI → navegar pelos modelos sem confirmar

**Esperado**
- `GLM-5.3`, `GLM-5.3-Flash` e `GLM-5.2` mostram `1M ctx` na lista e `Context: 1M tokens` na sidebar
- `GLM-4.7` e `GLM-4.6` mostram `205K ctx`
- `GLM-4.5` mostra `131K ctx`
- Modelos fora da tabela (ex.: os antigos salvos como `GLM-5-Code`) **não** mostram ctx

**Resultado:** (preencher)

## TC-05 — Modelo sem janela conhecida (RN-03, RN-07)

**Passos**

1. Start Claude → DeepSeek → `deepseek-chat` → lançar
2. Conferir a linha `env=` no log

**Esperado**
- Nenhuma das duas vars aparece — comportamento de hoje preservado

**Resultado:** (preencher)

## TC-06 — Override manual (RN-08)

**Passos**

1. `$env:CLAUDE_CODE_AUTO_COMPACT_WINDOW = "300000"` e `$env:CLAUDE_CODE_MAX_CONTEXT_TOKENS = "500000"`
2. `mclaude` → Z.AI → `GLM-5.3` → lançar
3. Conferir a linha `env=`

**Esperado**
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS=500000` (o manual vence)
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000` (o manual vence)
- Limpar as duas vars ao final

**Resultado:** (preencher)

## TC-07 — API vence a tabela (RN-01)

**Passos**

1. Start Claude → OpenRouter → escolher um modelo `z-ai/*` (ex.: `z-ai/glm-4.6`)
2. Conferir o ctx exibido na sidebar

**Esperado**
- O valor vem do OpenRouter, não da tabela do template `zai` (o `templateId` é `openrouter`, que não tem `modelSpecs`)
- Nenhuma regressão: os demais modelos do OpenRouter continuam mostrando o ctx da API

**Resultado:** (preencher)

## TC-08 — Fallback sem rede (RN-05 no caminho do plano 002)

**Passos**

1. Bloquear `api.z.ai` (firewall/hosts) ou desconectar a rede
2. `mclaude` → Start Claude → Z.AI

**Esperado**
- Aparece o aviso de fallback (RN-03 do plano 002) e a lista salva/fixa
- `GLM-5.3` **ainda mostra** `1M ctx` — a tabela vale também sem API
- Lançar e conferir no log que as duas vars foram setadas

**Resultado:** (preencher)

## TC-09 — Sessão longa de verdade (opcional, consome cota)

**Passos**

1. Sessão Z.AI com `GLM-5.3`, alimentar contexto até passar de 200K tokens (ex.: ler arquivos grandes)

**Esperado**
- A sessão **não** compacta em ~200K como antes
- Nenhum erro 400 da API por exceder contexto

**Resultado:** (preencher)
