# 002 - Modelos do Z.AI vindos da API (com fallback para a lista fixa)

## Prompt base

"no provedor z.ai temos uma lista de modelos, aparentemente ela eh fixa e nao traz modelos trazidos pela api, verifique a possibilidade de adicionarmos uma lista vinda da api do provedor em vez de uma lista fixa, porem com fallback"

Aprovação do dev: "aprovado, pode implementar" (gate zero, 2026-08-26)

## Descricao

Hoje o template `zai` (`src/providers.ts:181`) expõe apenas `defaultModels: ["GLM-5.3", "GLM-5-Turbo", "GLM-4.7"]` e **não** está em `MODEL_FETCHING_PROVIDERS` (`src/services/api-models.ts`) — logo a TUI nunca consulta a API do provider e a lista fica desatualizada a cada lançamento de modelo pela Z.AI.

**Viabilidade confirmada ao vivo** (probe com a chave real do dev, `2026-08-26`): o endpoint Coding Plan responde a `GET /v1/models` a partir do próprio `baseUrl` já configurado:

```
GET https://api.z.ai/api/anthropic/v1/models   ->  HTTP 200
{"data":[{"created_at":"...","display_name":"GLM-4.5","id":"glm-4.5","type":"model"}, ...],
 "firstId":"glm-4.5","hasMore":false,"lastId":"glm-5.3-flash"}
```

Retornou 10 modelos: `glm-4.5`, `glm-4.5-air`, `glm-4.6`, `glm-4.7`, `glm-5`, `glm-5-turbo`, `glm-5.1`, `glm-5.2`, `glm-5.3`, `glm-5.3-flash` — contra os 3 fixos de hoje. Funciona tanto com `Authorization: Bearer <key>` quanto com `x-api-key`.

Além do service novo, o plano corrige a **ausência de fallback** no fluxo atual: hoje `StartClaudeFlow.loadModelsForProvider` manda o usuário para a tela `error` (beco sem saída) quando o fetch falha, mesmo havendo lista local utilizável. Como **todos** os providers hoje em `MODEL_FETCHING_PROVIDERS` têm `defaultModels: []` (verificado), a regra de fallback é genérica e não altera comportamento de nenhum deles.

## Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Endpoint | `${baseUrl}/v1/models` (Anthropic-compat) | Deriva do `baseUrl` já configurado (respeita base URL customizada); é o único dos três que devolve `display_name` legível (`GLM-5.3`) junto do id canônico (`glm-5.3`) |
| Endpoints descartados | `/api/coding/paas/v4/models`, `/api/paas/v4/models` | Funcionam (shape OpenAI), mas exigiriam hardcode de host à parte do `baseUrl` do template e não trazem `display_name` |
| Header de auth | `Authorization: Bearer` **e** `x-api-key` + `anthropic-version` | Ambos aceitos; enviar os dois cobre base URLs customizadas (proxy/gateway) sem custo |
| Detecção de erro | Inspecionar o **corpo**, não só o status | ⚠️ Gotcha verificado: com chave inválida o endpoint Anthropic devolve **HTTP 200** com `{"code":401,"msg":"token expired or incorrect","success":false}`. Confiar no status classificaria chave inválida como sucesso com lista vazia |
| Parser | Tolerante às duas shapes (`data[].display_name` e `data[].id`) | Mesma função serve se o dev apontar a base URL para `/api/paas/v4` |
| Lista fixa (`defaultModels`) | **Mantida como está** (`GLM-5.3`, `GLM-5-Turbo`, `GLM-4.7`) | É exatamente o fallback pedido; ids em maiúsculas continuam aceitos pela Z.AI. Não lowercasear evita diff desnecessário |
| Dedup API × local | Case-insensitive, **API vence** | Sem isso a tela mostraria `GLM-4.7` (default) *e* `glm-4.7` (API) duplicados. API vence porque traz o id canônico + metadata |
| Fallback no fetch | Regra genérica em `loadModelsForProvider` | Falha de fetch + lista efetiva não-vazia ⇒ usa a lista local com aviso, em vez da tela `error`. No-op para os demais providers (todos com `defaultModels: []`) |
| Validação de API key | `zai` entra em `API_KEY_VALIDATION_PROVIDERS` | Mesmo endpoint, custo zero; alinha com os pares. ⚠️ Trade-off explicitado no step 002-A |
| `context_length` | Fora do escopo | O endpoint não retorna janela de contexto, então o plano 001 (`CLAUDE_CODE_MAX_CONTEXT_TOKENS`) não recebe valor para Z.AI — igual a hoje, sem regressão |

## Estrutura do Plano

| Arquivo | Descricao | Dependencia |
|---------|-----------|-------------|
| 002-A | Service `src/services/zai.ts` + registro em `api-models.ts` (fetch + validate) | - |
| 002-B | Fallback + dedup case-insensitive em `StartClaudeFlow` + i18n (3 locales) | 002-A |
| 002-C | Docs (README) + verificacao (`tsc --noEmit`, `bun test`) | 002-A, 002-B |
| 002-D | Test Cases: validacao funcional e regras de negocio | 002-A a 002-C |

## Regras de Negocio

- RN-01: provider `zai` com chave válida → tela de seleção lista os modelos vindos de `GET ${baseUrl}/v1/models`
- RN-02: modelo exibido usa `display_name` (`GLM-5.3`); o id lançado em `ANTHROPIC_MODEL` é o canônico da API (`glm-5.3`)
- RN-03: fetch falha (rede/auth/erro) **e** lista efetiva (user + defaults) não-vazia → lista local é usada com aviso visível; o launch continua possível
- RN-04: fetch falha **e** lista efetiva vazia → tela `error` atual, preservada
- RN-05: modelo presente na API e também na lista local (comparação case-insensitive) aparece **uma única vez**, na versão da API
- RN-06: modelo salvo pelo usuário que a API não retorna (ex.: `GLM-5-Code`) continua listado — dado do usuário não é apagado
- RN-07: chave inválida deve ser classificada como `auth` mesmo com HTTP 200, lendo `code`/`msg` do corpo
- RN-08: nenhum provider já existente em `MODEL_FETCHING_PROVIDERS` muda de comportamento

## Cadeia de Dados (mapa da implementação)

```
StartClaudeFlow.loadModelsForProvider
  └─ hasApiModelFetching("zai") -> true            (002-A: MODEL_FETCHING_PROVIDERS)
      └─ fetchApiModels("zai", key, getProviderBaseUrl(provider))
          └─ fetchZaiModels(baseUrl, apiKey)       (002-A: src/services/zai.ts)
              └─ GET ${baseUrl}/v1/models
                  ok    -> merge dedup case-insensitive (API vence)   (002-B, RN-05)
                  falha -> getEffectiveModelsWithSource + aviso       (002-B, RN-03)
```

## Riscos

- R-01: HTTP 200 mascarando erro de auth → classificaria chave inválida como "0 modelos". Mitigação: RN-07 (parse do corpo) + contrato de teste no 002-A.
- R-02: `zai` em `API_KEY_VALIDATION_PROVIDERS` faz falha de rede **bloquear** o cadastro do provider (`AddProviderFlow` volta para `details` com erro). Comportamento já existente para os pares; se o dev preferir, o item é destacável do 002-A sem afetar o resto.
- R-03: ids canônicos em minúsculas passam a ser lançados no lugar de `GLM-5.3`. Verificado que a Z.AI aceita ambos; o dedup (RN-05) evita duplicata visual.
- R-04: Z.AI descontinuar `/v1/models` → cai no fallback (RN-03), sem quebra.

## Resumo de Implementacao

Steps A, B e C concluídos sem desvios do plano. Step D (test cases manuais) permanece em `plans/` aguardando execução.

### Efeito observado

Com a config real do dev, a tela de seleção do Z.AI passou de **3 modelos fixos** para **17 itens** — 10 vindos da API (`glm-4.5`, `glm-4.5-air`, `glm-4.6`, `glm-4.7`, `glm-5`, `glm-5-turbo`, `glm-5.1`, `glm-5.2`, `glm-5.3`, `glm-5.3-flash`) mais os 7 modelos salvos que a API não retorna. Sem o dedup case-insensitive seriam 25 itens, com `GLM-4.7`/`glm-4.7` e mais dois pares duplicados.

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/services/zai.ts` | CRIADO |
| `src/services/api-models.ts` | +13 linhas (import, 2 Sets, 2 `case`) |
| `src/components/app/StartClaudeFlow.tsx` | fallback + dedup + aviso |
| `src/i18n/types.ts`, `locales/{en,pt-BR,es}.ts` | `apiModels.fallbackNotice` |
| `README.md` | seção Z.AI + changelog |

### Regras de negocio verificadas

| RN | Como foi verificado | Status |
|----|---------------------|--------|
| RN-01 | `fetchApiModels("zai", ...)` contra a API real → 10 modelos | OK |
| RN-02 | `display_name` no `name`, id canônico no `id` | OK |
| RN-03 | baseUrl inalcançável + 15 itens locais → `select-model` com aviso | OK |
| RN-04 | lista efetiva vazia → tela `error` preservada | OK |
| RN-05 | merge real: 17 itens, zero duplicatas case-insensitive | OK |
| RN-06 | 7 modelos salvos ausentes da API preservados | OK |
| RN-07 | chave inválida (HTTP 200 + `code:401`) → `auth` | OK |
| RN-08 | `hasApiModelFetching` conferido para os 11 templateIds | OK |

### Riscos — situacao final

- **R-01** (HTTP 200 mascarando auth): mitigado e testado; é o caso que quebraria uma implementação ingênua.
- **R-02** (validação bloqueando cadastro em falha de rede): mantido conforme aprovado; comportamento igual ao dos pares. TC-06 cobre.
- **R-03** (ids minúsculos): confirmado que a Z.AI aceita ambas as capitalizações; dedup evita duplicata visual.
- **R-04** (endpoint sumir): cai no fallback do RN-03.

### Pendencia herdada — resolvida no plano 003

`bun test` ficou em 2 pass / 3 fail ao final deste plano — **falhas pré-existentes**, comprovadas idênticas em `HEAD` (d59bc65) via worktree. A causa registrada aqui (drift na contagem de `DOWN` do smoke test) **estava errada**: era o Enter agindo em índice defasado no `GroupedSelect`, corrigido em `plans/done/003-0-select-stale-index-INDEX.md`. Hoje: **7 pass / 0 fail**.

O teste 5 (`Select OpenRouter → fetches models`) agora cobre o merge do 002-B, com a asserção atualizada para a precedência da API (RN-05) — ela codificava o comportamento anterior.
