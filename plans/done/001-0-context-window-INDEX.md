# 001 - Context Window Correta no Claude Code (CLAUDE_CODE_MAX_CONTEXT_TOKENS)

## Prompt base

"preciso que verifique para mim o que podemos fazer para trazer corretamente o tamanho da janela de contexto no openrouter, ou se temos um helper para isso para todos os providers, temos que ver de onde vem essa informacao no openrouter por exemplo, estou testando um modelo que tem 1mi de janela de contexto, porem no claude code esta aparecendo uns 200k tokens apenas, verifique se quando o modelo no openrouter esta gratuito se eles limitam a janela de contexto tambem"

Aprovação do dev: "sim" na proposta cirúrgica (sem helper novo; threading de campo opcional pela cadeia de launch existente).

## Descricao

O Claude Code assume **200.000 tokens** (hardcoded no binário, constante `f2r`) como janela de contexto para qualquer model id que não reconheça — ou seja, todos os modelos de providers terceiros (OpenRouter, DeepSeek, Z.AI, etc.). O multi-claude **já busca** o tamanho real da janela (`ApiModelMeta.context_length`) de todos os services, mas usa essa info apenas para exibição na sidebar da TUI.

Este plano injeta o valor real no launch via `CLAUDE_CODE_MAX_CONTEXT_TOKENS` — a única variável que o Claude Code respeita para model ids não-Anthropic (verificado por engenharia reversa do binário 2.1.241). Sem helper novo e sem service novo: um campo opcional atravessa a cadeia de launch existente (mesmo caminho que `selectedEnvVars`/`loadDotenv`).

## Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Fonte do valor | `ApiModelMeta.context_length` (já buscado) | Zero novas chamadas de rede; reflete o valor efetivo inclusive em modelos `:free` do OpenRouter |
| Mecanismo no Claude Code | `CLAUDE_CODE_MAX_CONTEXT_TOKENS` env var | Única via aplicável a ids não-`claude-*`; o próprio CC recomenda no aviso de modelo desconhecido |
| Sufixo `[1m]` no nome do modelo | Descartado | Só funciona para modelos Anthropic reconhecidos (`supports_1m_suffix`); para terceiros iria literal para o upstream e quebraria requests |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` sozinho | Insuficiente | É clampeado por `min(janela_do_modelo, configurado)`; com janela default 200k, não passa disso |
| Template Z.AI (`AUTO_COMPACT_WINDOW=1000000`) | Intocado | O clamp atual resulta em 200k efetivos, coincidindo com a janela real dos GLM; reavaliar se o plano ampliar |
| Escape hatch manual | Adicionar var à `PRESERVED_CLAUDE_CODE_VARS` | Hoje `cleanupClaudeCodeVars` apagaria valor vindo de `.env`/shell; preservando, usuário avançado tem override manual |
| Precedência automático vs manual | Manual vence (`!env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"]`) | Usuário pode capar abaixo da janela real se quiser |
| `headless.ts` | Fora do escopo | Modo headless não busca metadata de modelos hoje |

## Estrutura do Plano

| Arquivo | Descricao | Dependencia |
|---------|-----------|-------------|
| 001-A | Core: preservar a var no cleanup + parâmetro `contextWindowTokens` em `buildClaudeEnv`/`runClaude` | - |
| 001-B | Threading TUI → launch: StartClaudeFlow → UnifiedApp → app.tsx → tui-process → cli.ts | 001-A |
| 001-C | Verificação: typecheck + smoke test end-to-end com debug logs | 001-A, 001-B |
| 001-D | Test Cases: validacao funcional e regras de negocio | 001-A a 001-C |

## Regras de Negocio

- RN-01: modelo selecionado com `meta.context_length > 0` → o processo do claude recebe `CLAUDE_CODE_MAX_CONTEXT_TOKENS=<valor>`
- RN-02: valor definido manualmente (`.env` ou shell export) **prevalece** sobre o automático
- RN-03: sem metadata ou valor inválido (`undefined`/`<= 0`) → nenhuma var é setada (comportamento atual preservado)
- RN-04: fluxos OAuth e launch default (template `__default__`) permanecem intocados
- RN-05: todos os campos novos são opcionais → `last-selection.json` antigo continua válido (retrocompatível)
- RN-06: `CLAUDE_CODE_MAX_CONTEXT_TOKENS` deve sobreviver ao `cleanupClaudeCodeVars`

## Cadeia de Dados (mapa da implementação)

```
StartClaudeFlow.handleOptionsConfirm   (meta.context_length do modelo selecionado)
  └─ UnifiedApp.onStartClaude          (tipo do callback)
      └─ app.tsx AppResult             (result "start-claude")
          └─ tui-process.ts            (grava last-selection.json)
              └─ cli.ts TuiSelection   (lê selection)
                  └─ runner.runClaude  (novo param opcional)
                      └─ buildClaudeEnv (seta env após cleanup, se ausente)
```

## Riscos

- R-01: provider retornar `context_length` maior que o real → CC não compacta e estoura erro upstream. Mitigação: RN-02 (override manual via `.env`).
- R-02: variantes `:free` do OpenRouter têm contexto reduzido vs pago — o metadata já reflete o valor efetivo, correto por construção (verificado ao vivo: ex. `z-ai/glm-5.2:free` = 256k vs paga = 1.048.576).

## Resumo de Implementacao

(Preencher ao final)
