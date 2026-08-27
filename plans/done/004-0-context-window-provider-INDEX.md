# 004 - Janela de contexto por provider + compactacao derivada da janela

## Prompt base

"outra coisa que precisamos verificar eh em relacao a janela de contexto dos modelos glm dentro do claude, preciso passar a flag de contexto usando o z.ai"

"a janela de contexto tem de vir do provider ou alguma forma de pesquisarmos e montar uma tabela para repassar a flag correta para o claude code, e a flag de compactacao deve ser de acordo com a janela"

Aprovação do dev: "sim" (gate zero, 2026-08-26)

## Descricao

O plano 001 injeta `CLAUDE_CODE_MAX_CONTEXT_TOKENS` a partir de `ApiModelMeta.context_length`, mas **nenhum dos três endpoints da Z.AI devolve esse campo** (verificado ao vivo: `/api/anthropic/v1/models` traz só `created_at, display_name, id, type`). Resultado: hoje o Claude Code trata todo modelo GLM como desconhecido e assume 200.000 tokens.

Pior: o template Z.AI já seta `CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000"` (recomendação da doc da Z.AI), mas **esse valor não tem efeito nenhum** — é clampado pela janela assumida.

### Evidencia do binario (claude.exe 2.1.246, decompilado)

```js
function wE(e,t){                                    // resolve a janela do modelo
  ...
  let r = c.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (r !== void 0 && r > 0 && !P(X(e)).startsWith("claude-")) return r;
  return CE;                                         // CE = 200000
}

function sL(e,t,n){                                  // resolve o auto-compact
  let o = _m(e,n);                                   // janela do modelo
  if (process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW) {
    let l = Y0("CLAUDE_CODE_AUTO_COMPACT_WINDOW", ..., THe, fCt);   // THe=1e5, fCt=1e6
    let c = Math.max(THe, l.effective);
    return { window: Math.min(o, c), source: "env" }; // <- min(janela, configurado)
  }
  ...
}
```

Três fatos que o plano usa:

- `CLAUDE_CODE_MAX_CONTEXT_TOKENS` só é honrada para ids que **não** começam com `claude-` — os GLM qualificam
- `CE = 200000` é a janela assumida hoje para os GLM
- o auto-compact é sempre `min(janela do modelo, configurado)`, e o valor de env só é aceito em **[100.000, 1.000.000]**

### Fonte da tabela

O `context_length` vem do provider quando ele expõe (OpenRouter, Requesty e LiteLLM já preenchem). Para a Z.AI, que não expõe, a tabela foi levantada da **API do OpenRouter** (`z-ai/*`, dado programático e reconsultável) e **cruzada com a doc oficial da Z.AI**:

| modelo | context | max output | conferencia |
|--------|---------|-----------|-------------|
| `glm-5.3` | 1.048.576 | 131.072 | doc Z.AI: "1M-token context window and a maximum output length of 128K" |
| `glm-5.3-flash` | 1.048.576 | 131.072 | doc Z.AI: "a 1M-token context window" |
| `glm-5.2` | 1.048.576 | 131.072 | no Coding Plan é roteado para `glm-5.3` (a resposta volta com `"model":"glm-5.3"`) |
| `glm-5.1` | 204.800 | 131.072 | OpenRouter |
| `glm-5` | 204.800 | 128.000 | doc Z.AI GLM-5: "Context Length (Input): 200K" |
| `glm-5-turbo` | 202.752 | 131.072 | OpenRouter |
| `glm-4.7` | 204.800 | 131.072 | OpenRouter |
| `glm-4.6` | 204.800 | 16.384 | OpenRouter |
| `glm-4.5` | 131.072 | 98.304 | OpenRouter |
| `glm-4.5-air` | 131.072 | 98.304 | OpenRouter |

Terceira conferência independente: o max output de 131.072 bate exatamente com o range que a própria API da Z.AI devolve ao recusar um `max_tokens` alto — `[1210][The max_tokens parameter is illegal.: limite [1,131072]]`.

## Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Ordem das fontes | API do provider primeiro, tabela só preenche o que faltar | É o pedido do dev; a API é sempre mais atual que uma constante no código |
| Onde mora a tabela | Campo `modelSpecs` no `ProviderTemplate` | Fica ao lado de `defaultModels`/`env`, que já são metadata estática do provider; serve para qualquer provider de lista fixa (deepseek, minimax, moonshot, byteplus, poe, novita) sem retrabalho |
| Formato | `Record<string, { context: number; maxOutput?: number }>`, chaves minúsculas | `maxOutput` é só exibição na sidebar, mas já está apurado e com fonte |
| Lookup | Case-insensitive | `defaultModels` são maiúsculos (`GLM-5.3`) e a API devolve minúsculo (`glm-5.3`); sem isso o caminho de fallback não acha nada |
| Onde aplicar | Dois pontos: `fetchApiModels` (preenche o que a API não trouxe) e `getEffectiveModelsWithSource` (modelos default/user) | Cobre os dois caminhos — API no ar e fallback do RN-03 do plano 002 — sem lógica específica de provider na TUI |
| Modelo fora da tabela | Nenhum valor | Preserva o comportamento atual (200K). Subestimar só compacta cedo; **superestimar faz o Claude Code não compactar e estourar na API** |
| Compactacao | Derivada da janela em `buildClaudeEnv` | Pedido do dev. Também é mais previsível que a cascata do Claude Code para modelo não reconhecido |
| Fracao | `0.8` da janela, clampada em [100.000, 1.000.000] | Deixa ~20% de folga para a resposta e tool results em voo. Constante única e nomeada, trivial de ajustar |
| `AUTO_COMPACT_WINDOW` fixo no template Z.AI | **Removido** | Hoje é inerte (clampado a 200K) e, assim que a janela virar 1M, passaria a valer 1M — a sessão só compactaria no limite. O derivado substitui com vantagem |
| Precedencia manual | Preservada | Ambas as vars continuam na `PRESERVED_CLAUDE_CODE_VARS`; valor de `.env`/shell vence o automático |

## Estrutura do Plano

| Arquivo | Descricao | Dependencia |
|---------|-----------|-------------|
| 004-A | `modelSpecs` no template + tabela Z.AI + preenchimento nos dois caminhos | - |
| 004-B | `CLAUDE_CODE_AUTO_COMPACT_WINDOW` derivado da janela + limpeza do template | 004-A |
| 004-C | Test cases: validacao funcional e regras de negocio | 004-A, 004-B |

## Regras de Negocio

- RN-01: modelo cujo provider expõe `context_length` usa **o valor da API**; a tabela nunca sobrescreve
- RN-02: modelo sem `context_length` na API e presente na tabela recebe o valor da tabela
- RN-03: modelo ausente da tabela e sem valor na API → nenhuma var é setada (comportamento atual, 200K assumido)
- RN-04: o lookup na tabela é case-insensitive (`GLM-5.3` e `glm-5.3` resolvem igual)
- RN-05: a tabela vale tanto para modelos vindos da API quanto para os das listas fixa/do usuário
- RN-06: havendo janela, `CLAUDE_CODE_AUTO_COMPACT_WINDOW = clamp(round(janela * 0.8), 100000, 1000000)`
- RN-07: sem janela, nenhuma das duas vars é setada
- RN-08: valor manual em `.env`/shell prevalece sobre o automático, para as duas vars
- RN-09: nenhum provider hoje sem `modelSpecs` muda de comportamento

## Cadeia de Dados

```
fetchApiModels(zai)                -> models sem context_length
  +- preenche pela template.modelSpecs                        (004-A, RN-02)
getEffectiveModelsWithSource       -> modelos default/user
  +- anexa meta.context_length pela template.modelSpecs       (004-A, RN-05)
      +- StartClaudeFlow: meta.context_length -> contextWindowTokens   (ja existe, plano 001)
          +- buildClaudeEnv
              +- CLAUDE_CODE_MAX_CONTEXT_TOKENS = janela      (ja existe, plano 001)
              +- CLAUDE_CODE_AUTO_COMPACT_WINDOW = derivado   (004-B, RN-06)
```

## Riscos

- R-01: superestimar a janela → o Claude Code não compacta e a requisição estoura na API. Mitigado pela RN-03 (só valor com fonte) e pela RN-08 (override manual).
- R-02: a tabela envelhece quando a Z.AI lança modelo novo. Mitigado pela RN-01 (API vence) e pela RN-03 (modelo novo simplesmente não recebe valor, sem quebrar).
- R-03: os números do OpenRouter são do roteamento deles, não necessariamente idênticos ao endpoint direto da Z.AI. Mitigado pela conferência cruzada com a doc oficial (`glm-5.3` 1M, `glm-5` 200K) e com o range de `max_tokens` da própria API.
- R-04: janela de 1M com compactação em 800K encarece sessões longas. É o trade-off explícito do pedido; a fração é uma constante nomeada, fácil de baixar.

## Resumo de Implementacao

Steps A e B concluídos sem desvios. Step C (test cases manuais) permanece em `plans/` aguardando execução.

### Prova end-to-end

Rodando o `claude -p` real com e sem a flag, contra a Z.AI:

```
SEM a flag (controle):
  "glm-5.3" is not a model this version of Claude Code recognizes,
  so auto-compact will keep this session within 200k tokens

COM a flag:
  (aviso ausente)

MAX_CONTEXT_TOKENS  = 1048576
AUTO_COMPACT_WINDOW = 838861
```

O desaparecimento do aviso é exatamente o que o binário faz — `if (i && l !== void 0 && l > 0) return null` suprime a notice quando `CLAUDE_CODE_MAX_CONTEXT_TOKENS` está setada.

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/schema.ts` | +5 — campo `modelSpecs` |
| `src/providers.ts` | +55/-3 — tabela, `getModelSpec`, meta nos efetivos, derivação, allowlist, limpeza do template |
| `src/services/api-models.ts` | +41/-1 — `fillFromTemplate` + `fetchRaw` |

### Regras de negocio verificadas

| RN | Como foi verificado | Status |
|----|---------------------|--------|
| RN-01 | `z-ai/glm-4.6` via OpenRouter manteve o ctx da API | OK |
| RN-02 | `fetchApiModels("zai")` ao vivo: 10/10 modelos com ctx | OK |
| RN-03 | `glm-9` e `GLM-5-Code` sem valor | OK |
| RN-04 | `GLM-5.3` e `glm-5.3` resolvem igual | OK |
| RN-05 | modelo de lista fixa/usuário com `meta.context_length` | OK |
| RN-06 | tabela de derivação, 7 casos incluindo os dois clamps | OK |
| RN-07 | janela ausente/`0` → nenhuma var | OK |
| RN-08 | override manual vence nas duas vars, sobrevive ao cleanup | OK |
| RN-09 | `deepseek` sem `modelSpecs` inalterado | OK |

`bunx tsc --noEmit` limpo, `bun test` 7 pass / 0 fail, `biome check` com contagem idêntica ao HEAD nos três arquivos (providers 20, schema 0, api-models 0).

### Nota sobre a fracao

`AUTO_COMPACT_FRACTION = 0.8` é o único número escolhido por julgamento, não por fonte. Baixá-lo compacta mais cedo e segura custo em sessão longa; subi-lo aproveita mais contexto. É uma constante nomeada em `src/providers.ts`.
