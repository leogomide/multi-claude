# 002-A - Service `zai.ts` + registro em `api-models.ts`

## Prompt base

No projeto multi-claude, crie o service `src/services/zai.ts` que busca os modelos do Z.AI Coding Plan em `GET ${baseUrl}/v1/models` e valida a API key no mesmo endpoint, e registre o template `zai` em `MODEL_FETCHING_PROVIDERS` e `API_KEY_VALIDATION_PROVIDERS` com os respectivos `case` em `fetchApiModels`/`validateApiKey`. Não mexa na TUI nem em i18n — isso é o step 002-B.

## Descricao

Dois arquivos. O service segue o molde de `src/services/ninerouter.ts` (baseUrl + apiKey, `fetch` + `validate`), com **duas diferenças obrigatórias**:

1. **Auth duplo** — envia `Authorization: Bearer` e `x-api-key` + `anthropic-version`. Ambos verificados funcionando; enviar os dois cobre base URLs customizadas.
2. **Erro no corpo, não no status** — ⚠️ verificado ao vivo: com chave inválida, `https://api.z.ai/api/anthropic/v1/models` devolve **HTTP 200** com corpo `{"code":401,"msg":"token expired or incorrect","success":false}`. Um `if (!response.ok)` sozinho classificaria isso como sucesso com lista vazia (RN-07).

Shapes de resposta a suportar (as duas têm `data[].id`):

```jsonc
// Anthropic-compat (/api/anthropic/v1/models) — a que usamos
{"data":[{"id":"glm-5.3","display_name":"GLM-5.3","type":"model","created_at":"..."}],"hasMore":false}
// OpenAI-compat (/api/paas/v4/models) — se o dev customizar a base URL
{"object":"list","data":[{"id":"glm-5.3","object":"model","created":1786636800,"owned_by":"z-ai"}]}
```

## Checklist de Implementacao

### 1. `src/services/zai.ts` (NOVO)

- [x] Tipos das duas shapes:
  ```ts
  import type { ApiFetchResult, ApiKeyValidation, ApiModelError, ApiModelMeta } from "./api-models.ts";

  interface ZaiModelRaw {
      id: string;
      // Anthropic-compat only; absent on the OpenAI-compat endpoint
      display_name?: string;
  }

  interface ZaiModelsResponse {
      data?: ZaiModelRaw[];
      // Error payloads arrive with HTTP 200 on the Anthropic-compat endpoint
      code?: string | number;
      msg?: string;
      success?: boolean;
      error?: { code?: string | number; message?: string };
  }
  ```
- [x] Helper compartilhado por `fetch` e `validate` (evita duplicar o tratamento do gotcha):
  ```ts
  function zaiHeaders(apiKey: string): Record<string, string> {
      return {
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
      };
  }

  function classifyErrorCode(code: string | number | undefined): ApiModelError {
      const n = Number(code);
      return n === 401 || n === 403 ? "auth" : "unknown";
  }
  ```
- [x] `fetchZaiModels(baseUrl, apiKey)`:
  ```ts
  export async function fetchZaiModels(baseUrl: string, apiKey: string): Promise<ApiFetchResult> {
      try {
          const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
          const response = await fetch(url, { headers: zaiHeaders(apiKey) });

          if (response.status === 401 || response.status === 403) {
              return { ok: false, error: "auth" };
          }

          const json = (await response.json().catch(() => null)) as ZaiModelsResponse | null;

          // Z.AI answers auth failures with HTTP 200 and the error inside the body.
          if (!json || !Array.isArray(json.data)) {
              if (!response.ok) return { ok: false, error: "unknown" };
              return { ok: false, error: classifyErrorCode(json?.code ?? json?.error?.code) };
          }

          const models = json.data.map(
              (m): ApiModelMeta => ({ id: m.id, name: m.display_name ?? m.id }),
          );
          models.sort((a, b) => a.id.localeCompare(b.id));
          return { ok: true, models };
      } catch {
          return { ok: false, error: "network" };
      }
  }
  ```
  - `response.json().catch(() => null)` cobre corpo não-JSON (proxy/HTML de erro).
  - `!response.ok` antes do `classifyErrorCode` preserva a semântica dos endpoints que erram de verdade no status (`/api/paas/v4` devolve 401 real).
- [x] `validateZaiApiKey(baseUrl, apiKey)` — mesma requisição, retorno `ApiKeyValidation`:
  ```ts
  export async function validateZaiApiKey(baseUrl: string, apiKey: string): Promise<ApiKeyValidation> {
      const result = await fetchZaiModels(baseUrl, apiKey);
      return result.ok ? { valid: true } : { valid: false, error: result.error };
  }
  ```
  - Reusa o `fetch` em vez de duplicar (o custo é a mesma chamada de rede que os pares já fazem).

### 2. `src/services/api-models.ts` — registro

- [x] Import no topo, em ordem alfabética (depois de `requesty.ts`):
  ```ts
  import { fetchZaiModels, validateZaiApiKey } from "./zai.ts";
  ```
- [x] Adicionar `"zai"` a `API_KEY_VALIDATION_PROVIDERS` (~linha 38).
  - ⚠️ **R-02**: isto faz falha de rede bloquear o cadastro do provider em `AddProviderFlow`. É o comportamento já vigente para openrouter/requesty/nanogpt/litellm/omniroute/9router. Se o dev vetar no gate zero, remover **apenas** este item + o `case` do `validateApiKey`; o resto do plano segue.
- [x] Adicionar `"zai"` a `MODEL_FETCHING_PROVIDERS` (~linha 46).
- [x] Em `fetchApiModels`, novo `case` no mesmo formato dos que derivam baseUrl:
  ```ts
  case "zai": {
      const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
      if (!baseUrl) return { ok: false, error: "unknown" };
      return fetchZaiModels(baseUrl, apiKey);
  }
  ```
- [x] Em `validateApiKey`, `case` equivalente devolvendo `{ valid: false, error: "unknown" }` sem baseUrl.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/services/zai.ts` | CRIAR — fetch + validate do Coding Plan |
| `src/services/api-models.ts` | MODIFICAR — import, dois `Set`s, dois `case` |

## Contrato de teste

- Chave válida → `{ ok: true }` com ≥ 3 modelos, ids em minúsculas (`glm-5.3`) e `name` em `display_name` (`GLM-5.3`) (RN-01, RN-02)
- Chave inválida (HTTP 200 + `{"code":401,...}`) → `{ ok: false, error: "auth" }` (RN-07) — **este é o caso que quebra uma implementação ingênua**
- Host inalcançável → `{ ok: false, error: "network" }`
- Corpo não-JSON com status 200 → `{ ok: false, error: "unknown" }`
- baseUrl com barra final (`.../anthropic/`) → URL sem `//` duplicada
- `hasApiModelFetching("zai") === true` e `hasApiKeyValidation("zai") === true`
- Nenhum outro `templateId` muda de resultado nessas duas funções (RN-08)

## Resumo de Implementacao

Concluído conforme planejado, sem desvios.

- **`src/services/zai.ts`** (novo): `fetchZaiModels(baseUrl, apiKey)` bate em `${baseUrl}/v1/models` com `zaiHeaders()` (Bearer + x-api-key + anthropic-version). O gotcha do HTTP 200 é tratado pelo guard `!json || !Array.isArray(json.data)`, que só então cai em `classifyErrorCode(json?.code ?? json?.error?.code)` — preservando `unknown` para respostas que erram de verdade no status. `validateZaiApiKey` reusa o fetch.
- **`src/services/api-models.ts`**: import de `./zai.ts`, `"zai"` nos dois `Set`s e um `case "zai"` em `fetchApiModels` e `validateApiKey` (+13 linhas, nenhuma removida).

**Contrato verificado ao vivo** contra `api.z.ai` (7/7):

| Caso | Esperado | Obtido |
|------|----------|--------|
| Chave válida | `ok`, ids minúsculos + `display_name` | ok, 10 modelos (`glm-5.3`=`GLM-5.3`) |
| Chave inválida (HTTP 200 + `code:401`) | `auth` | `auth` |
| Host inalcançável | `network` | `network` |
| Corpo não-JSON (HTTP 200) | `unknown` | `unknown` |
| baseUrl com barra final | sem `//` duplicada | ok, 10 modelos |
| `hasApiModelFetching/hasApiKeyValidation("zai")` | `true` | `true` |
| Demais templateIds | inalterados | inalterados (RN-08) |
