# 005 - Janela de contexto informada pelo usuario (por modelo, em qualquer provider)

## Prompt base

"quero adicionar a opcao de informar o tamanho da janela de contexto do modelo nos provedores personalizados, assim conseguimos ter uma janela de contexto real usando o claude code, nao a janela padrao de 200k"

"similar ao que ja fizemos no provedor z.ai por exemplo, para buscar os modelos disponiveis e suas janelas de contexto"

Aprovacao do dev (gate zero, 2026-09-03), quatro decisoes:

| Pergunta | Resposta escolhida |
|----------|--------------------|
| Escopo | **Qualquer provider** (nao so o custom) |
| Granularidade | **Por modelo** |
| Auto-fetch no Custom Provider | **Sim, com fallback manual** |
| Pontos de UI | **Wizard de adicionar provider** + **Gerenciar modelos** |

## Descricao

O plano 004 resolveu a janela de contexto para a Z.AI com uma tabela estatica em codigo (`ProviderTemplate.modelSpecs`). O plano 001 ja levava o valor ate `CLAUDE_CODE_MAX_CONTEXT_TOKENS` / `CLAUDE_CODE_AUTO_COMPACT_WINDOW`. Falta a terceira fonte: **o proprio usuario**.

Hoje a janela so chega ao Claude Code por dois caminhos, ambos fora do alcance de quem usa:

1. A API do provider, quando ela expoe o campo — so `openrouter`, `requesty`, `litellm`, `lmstudio` e `llamacpp` expoem (ver matriz abaixo).
2. `ProviderTemplate.modelSpecs`, que **so o template `zai` preenche** (`src/providers.ts:180-206`).

O **Custom Provider** (`src/providers.ts:299-310`) nao tem nenhum dos dois: esta fora de `MODEL_FETCHING_PROVIDERS` e de `API_KEY_VALIDATION_PROVIDERS` (`src/services/api-models.ts:40-60`), e `ConfiguredProvider.models` e um `z.array(z.string())` puro (`src/schema.ts:34`) — **nao existe slot para metadata por modelo no config.json**. Resultado: todo modelo de um gateway custom cai no default de 200.000 tokens do Claude Code, mesmo quando o gateway serve um modelo de 1M.

### Matriz: quem reporta `context_length` hoje

| Provider | Campo de origem | Reporta? |
|----------|-----------------|----------|
| OpenRouter | `context_length` (`services/openrouter.ts:4`) | Sim |
| Requesty | `context_window` (`services/requesty.ts:13,36`) | Sim |
| LiteLLM | `info.max_input_tokens` (`services/litellm.ts:29`) | Sim |
| LM Studio | `max_context_length` (`services/lmstudio.ts:20,42`) | Sim |
| llama.cpp | `meta.n_ctx_train` (`services/llamacpp.ts:36`) | Sim |
| NanoGPT | so `{ id }` (`services/nanogpt.ts:15-19`) | **Nao** |
| Ollama | so parameter_size/quantization (`services/ollama.ts:24-33`) | **Nao** |
| OmniRoute | so `{ id, name }` (`services/omniroute.ts:15-20`) | **Nao** |
| 9Router | so `{ id, name }` (`services/ninerouter.ts:15-20`) | **Nao** |
| Z.AI | so `{ id, display_name }` (`services/zai.ts:53`) | Nao -> coberto pelo 004 |
| **Custom** | *(nao ha service)* | **Nao busca nada** |

Cinco providers ficam sem janela mesmo com a API no ar. E por isso que a decisao do gate zero foi **escopo = qualquer provider**, e nao so o custom: o mesmo campo resolve os cinco.

### Achado que muda a UX (evidencia do binario)

`plans/done/004-0-context-window-provider-INDEX.md:19-25` documenta o `claude.exe 2.1.246` decompilado:

```js
let r = c.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
if (r !== void 0 && r > 0 && !P(X(e)).startsWith("claude-")) return r;
return CE;  // CE = 200000
```

**A variavel e ignorada para ids que comecam com `claude-`.** Um gateway custom que sirva `claude-sonnet-4.5` nunca vai honrar a janela informada. Isso precisa virar um **aviso** no proprio prompt (nao um erro — o id pode ser so um alias do gateway) e uma linha no README, senao o usuario digita o valor e nunca entende por que nao surtiu efeito. Ver RN-11.

## Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Onde mora o valor | Campo `modelSpecs` no `ConfiguredProvider` persistido | Espelha o `modelSpecs` do `ProviderTemplate`; o tipo de retorno de `getModelSpec` e reusado sem conversao |
| Formato | `Record<string, { context: number; maxOutput?: number }>`, chaves minusculas | Identico ao do template. `maxOutput` fica no schema mas **a UI so pergunta `context`** — evita um segundo prompt para um dado que so aparece na sidebar |
| `.optional()` e nao `.default({})` | `.optional()` | Nao escreve `"modelSpecs": {}` em todo provider do config.json; zod aceita o campo ausente, entao **nao ha migracao** |
| Granularidade | Por modelo | Um gateway custom serve varios modelos com janelas diferentes; um valor unico por provider erra no segundo modelo |
| Precedencia | **Override do usuario > API > tabela do template** | Inverte a RN-01 do plano 004 **apenas** para modelos anotados a mao. Digitar um numero e um ato deliberado; a API nao pode vencer isso |
| Ponto unico de resolucao | `resolveModelSpec(provider, model)` | Os dois consumidores atuais (`getEffectiveModelsWithSource` e `fillFromTemplate`) passam a chamar a mesma funcao. `getModelSpec` continua exportada como a camada de template |
| Assinatura de `fetchApiModels` | Passa a receber o `provider` inteiro | Precisa do override, que so existe no provider. Chamador unico hoje (`StartClaudeFlow.tsx:205-209`) |
| Fetch no Custom Provider | Sim, `/v1/models` no molde do `zai` | Pedido do dev. Reaproveita o fallback que ja existe em `loadModelsForProvider` |
| Validacao de chave no Custom | **Nao** | A semantica de erro de um gateway arbitrario produziria "chave invalida" falso e **bloquearia o cadastro** no passo `validating-key`. Buscar modelo falha suave; validar chave, nao |
| Campo opcional em toda UI | Enter vazio nao grava nada | Preserva a RN-03/RN-07 do plano 004: sem fonte, sem valor. Subestimar so compacta cedo; **superestimar faz o Claude Code estourar na API** |
| UI no "Editar provider" | Fora de escopo | Decisao do gate zero: fica so em "Gerenciar modelos", que ja e o lugar de mexer em modelo |
| `AUTO_COMPACT_WINDOW` | Sem mudanca | Continua derivado em `buildClaudeEnv` (`0.8`, clamp `[100k, 1M]`), plano 004-B |

## Estrutura do Plano

| Arquivo | Descricao | Dependencia |
|---------|-----------|-------------|
| 005-A | `modelSpecs` no provider persistido + `resolveModelSpec` + cadeia de dados (TUI e headless) | - |
| 005-B | Service `custom.ts` + registro do template `custom` no fetch de modelos | 005-A |
| 005-C | UI: utils, i18n, wizard de adicionar provider, Gerenciar modelos | 005-A |
| 005-D | Testes automatizados + README + bump de versao | 005-A, 005-B, 005-C |
| 005-E | Test cases manuais | 005-A..D |

## Regras de Negocio

- **RN-01**: override do usuario vence a API **e** a tabela do template
- **RN-02**: sem override, mantem a cascata atual — API > `template.modelSpecs` > nada
- **RN-03**: lookup case-insensitive; chaves sempre gravadas em minusculo
- **RN-04**: campo opcional em toda UI — Enter vazio nao grava nada e nao seta var nenhuma
- **RN-05**: remover um modelo remove tambem o override dele (nada de entrada orfa no config.json)
- **RN-06**: o override vale tambem para modelos **default do template** (permite corrigir a tabela do `zai` sem editar codigo)
- **RN-07**: `CLAUDE_CODE_AUTO_COMPACT_WINDOW` continua derivado da janela — sem mudanca no 004-B
- **RN-08**: valor manual em `.env`/shell continua vencendo (`PRESERVED_CLAUDE_CODE_VARS`)
- **RN-09**: falha no fetch de modelos do custom nunca bloqueia — cai na lista local com o banner de aviso que ja existe
- **RN-10**: `config.json` sem `modelSpecs` continua valido, sem migracao
- **RN-11**: modelo cujo id comeca com `claude-` recebe aviso na UI — o Claude Code ignora a var nesse caso
- **RN-12**: o modo headless resolve a mesma janela que a TUI, incluindo a vinda da API

## Cadeia de Dados

```
provider.modelSpecs (NOVO, config.json)   template.modelSpecs (004)   API do provider
        |                                          |                        |
        +------------------+-----------------------+------------------------+
                           |
                  resolveModelSpec(provider, model)          (005-A, RN-01/RN-02)
                           |
        +------------------+---------------------------------+
        |                                                    |
getEffectiveModelsWithSource                        applyModelSpecs (api-models)
  -> meta.context_length  (RN-06)                     -> meta.context_length (RN-01)
        |                                                    |
        +--------------------------+-------------------------+
                                   |
              TUI: StartClaudeFlow -> contextWindowTokens  (ja existe, 001)
              HEADLESS: resolveModelSpec + fetch opcional  (005-A, RN-12)
                                   |
                            buildClaudeEnv
                                   |
              CLAUDE_CODE_MAX_CONTEXT_TOKENS = janela        (ja existe, 001)
              CLAUDE_CODE_AUTO_COMPACT_WINDOW = derivado     (ja existe, 004-B)
```

## Riscos

- **R-01**: usuario superestimar a janela -> o Claude Code nao compacta e a requisicao estoura na API. **Nao ha mitigacao automatica possivel** (o valor e do usuario, por definicao). Mitigado parcialmente pelo limite superior de 10M na validacao. Documentar no README que o valor deve bater com o que o gateway aceita.
- **R-02**: override envelhece quando o usuario troca o modelo por tras do mesmo id. Aceito — e a natureza de um override manual; a UI permite limpar com Enter vazio.
- **R-03**: `fetchApiModels` muda de assinatura. Chamador unico (`StartClaudeFlow.tsx:205-209`); o mock do `smoke.test.tsx:44` e `async () => (...)` sem parametros, entao **nao quebra**.
- **R-04**: fetch do custom contra um gateway lento trava o launch headless. Mitigado pelo `Promise.race` com timer de 3s no 005-A.
- **R-05**: gateway custom que exige um header proprietario nao responde `/v1/models`. Cai na RN-09 (fallback para a lista local + entrada manual), que e exatamente o caminho pedido pelo dev.
