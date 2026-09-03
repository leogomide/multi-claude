# 005-B - Service `custom.ts` + busca de modelos no Custom Provider

## Prompt base

No projeto multi-claude, crie o service `src/services/custom.ts` que busca os modelos de um gateway Anthropic/OpenAI-compativel arbitrario em `GET ${baseUrl}/v1/models`, normalizando os varios nomes que os gateways dao ao campo de janela de contexto, e registre o template `custom` em `MODEL_FETCHING_PROVIDERS` com o `case` correspondente em `fetchRaw`. **Nao** registre o `custom` em `API_KEY_VALIDATION_PROVIDERS`. Nao mexa na TUI nem em i18n — isso e o step 005-C.

## Descricao

Dois arquivos. O service segue o molde de `src/services/zai.ts` (67 linhas), que ja resolve os dois problemas chatos de gateway Anthropic-compativel:

1. **Auth duplo** — envia `Authorization: Bearer`, `x-api-key` e `anthropic-version`. Mandar os tres cobre gateway que so aceita um dos dois. O `provider.authVar` sozinho **nao** cobre: ele decide a var de ambiente que o Claude Code usa no launch, nao necessariamente o que o `/v1/models` do gateway aceita.
2. **Erro no corpo, nao no status** — o endpoint Anthropic-compat da Z.AI devolve HTTP 200 com `{"code":401,...}`. Gateways que copiam esse comportamento sao comuns; um `if (!response.ok)` sozinho classificaria como sucesso com lista vazia.

O que e **novo** em relacao ao `zai.ts`:

3. **Normalizador de aliases de contexto.** Um gateway arbitrario pode ser um proxy de qualquer coisa, entao vale ler todos os nomes que ja aparecem no proprio repo hoje. Os seis services que reportam janela usam **cinco nomes diferentes** (ver a matriz no INDEX). Ler todos e barato e transforma "sem janela" em "janela correta" para a maioria dos gateways reais (LiteLLM, vLLM, LM Studio e llama.cpp por tras de um proxy).
4. **Fallback de rota.** Alguns gateways expoem `/models` sem o prefixo `/v1` (quando a base URL ja termina em `/v1`, caso do OmniRoute e do 9Router). Se `/v1/models` devolver 404, tentar `/models` antes de desistir.

### Por que o custom NAO entra em `API_KEY_VALIDATION_PROVIDERS`

Se entrar, o wizard passa pelo step `validating-key` (`AddProviderFlow.tsx:310-316`) e **bloqueia o cadastro** quando a validacao falha. Um gateway arbitrario pode:

- nao implementar `/v1/models`;
- exigir um header proprietario;
- responder 404/500 por qualquer motivo nao relacionado a chave.

Qualquer um desses viraria "chave invalida" e impediria o usuario de cadastrar um provider que funciona perfeitamente no launch. Buscar modelo falha suave (RN-09, cai na lista local); validar chave, nao. Por isso: **so `MODEL_FETCHING_PROVIDERS`**.

## Checklist de Implementacao

### 1. `src/services/custom.ts` (NOVO)

- [ ] Tipos, cobrindo as duas shapes de resposta e o erro-no-corpo:
  ```ts
  import type {
  	ApiFetchResult,
  	ApiKeyValidation,
  	ApiModelError,
  	ApiModelMeta,
  } from "./api-models.ts";

  interface CustomModelRaw {
  	id: string;
  	name?: string;
  	display_name?: string;
  	// Gateways disagree on how to name the context window; read them all.
  	context_length?: number;
  	context_window?: number;
  	max_context_length?: number;
  	max_input_tokens?: number;
  	max_model_len?: number;
  	max_output_tokens?: number;
  	max_tokens?: number;
  	max_completion_tokens?: number;
  	top_provider?: { context_length?: number; max_completion_tokens?: number };
  	meta?: { n_ctx_train?: number };
  	model_info?: Record<string, number | undefined>;
  }

  interface CustomModelsResponse {
  	data?: CustomModelRaw[];
  	// Some Anthropic-compatible gateways answer auth failures with HTTP 200
  	// and the error inside the body (verified on Z.AI, plan 002-A).
  	code?: string | number;
  	msg?: string;
  	success?: boolean;
  	error?: { code?: string | number; message?: string };
  }
  ```

- [ ] Helpers de header e de classificacao de erro (copiados do `zai.ts:23-34`):
  ```ts
  function customHeaders(apiKey: string): Record<string, string> {
  	const headers: Record<string, string> = { "anthropic-version": "2023-06-01" };
  	// Gateways disagree on the auth header; sending both covers either one.
  	if (apiKey) {
  		headers.Authorization = `Bearer ${apiKey}`;
  		headers["x-api-key"] = apiKey;
  	}
  	return headers;
  }

  function classifyErrorCode(code: string | number | undefined): ApiModelError {
  	const n = Number(code);
  	return n === 401 || n === 403 ? "auth" : "unknown";
  }
  ```
  - Guardar o `if (apiKey)`: o Custom Provider aceita chave vazia (a doc do README diz "press Enter to skip it if your gateway does not require authentication"). Mandar `Bearer ` vazio pode fazer um gateway sem auth responder 401.

- [ ] O normalizador — o pedaco que justifica o service:
  ```ts
  function firstPositive(...values: Array<number | undefined>): number | undefined {
  	for (const v of values) {
  		if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  	}
  	return undefined;
  }

  function readContextLength(m: CustomModelRaw): number | undefined {
  	return firstPositive(
  		m.context_length,          // OpenRouter, NanoGPT-like
  		m.context_window,          // Requesty
  		m.max_context_length,      // LM Studio
  		m.max_input_tokens,        // LiteLLM
  		m.max_model_len,           // vLLM
  		m.top_provider?.context_length,
  		m.meta?.n_ctx_train,       // llama.cpp
  		m.model_info?.max_input_tokens, // LiteLLM behind /v1/models
  	);
  }

  function readMaxOutput(m: CustomModelRaw): number | undefined {
  	return firstPositive(
  		m.max_output_tokens,
  		m.max_completion_tokens,
  		m.top_provider?.max_completion_tokens,
  		m.max_tokens,
  		m.model_info?.max_output_tokens,
  	);
  }
  ```

- [ ] O fetch, com fallback de rota e o gotcha do corpo:
  ```ts
  async function requestModels(url: string, apiKey: string): Promise<Response | null> {
  	try {
  		return await fetch(url, { headers: customHeaders(apiKey) });
  	} catch {
  		return null;
  	}
  }

  export async function fetchCustomModels(baseUrl: string, apiKey: string): Promise<ApiFetchResult> {
  	const root = baseUrl.replace(/\/+$/, "");

  	let response = await requestModels(`${root}/v1/models`, apiKey);
  	if (response === null) return { ok: false, error: "network" };

  	// Base URLs that already end in /v1 expose the list at /models (OmniRoute, 9Router).
  	if (response.status === 404) {
  		const alt = await requestModels(`${root}/models`, apiKey);
  		if (alt !== null) response = alt;
  	}

  	if (response.status === 401 || response.status === 403) {
  		return { ok: false, error: "auth" };
  	}

  	const json = (await response.json().catch(() => null)) as CustomModelsResponse | null;

  	if (!json || !Array.isArray(json.data)) {
  		if (!response.ok) return { ok: false, error: "unknown" };
  		return { ok: false, error: classifyErrorCode(json?.code ?? json?.error?.code) };
  	}

  	const models = json.data
  		.filter((m) => typeof m?.id === "string" && m.id.length > 0)
  		.map((m): ApiModelMeta => ({
  			id: m.id,
  			name: m.display_name ?? m.name ?? m.id,
  			context_length: readContextLength(m),
  			max_output_tokens: readMaxOutput(m),
  		}));
  	models.sort((a, b) => a.id.localeCompare(b.id));
  	return { ok: true, models };
  }
  ```
  - **Nao exportar** um `validateCustomApiKey`. Se ninguem chamar, ninguem registra por engano.

### 2. `src/services/api-models.ts` — registro

- [ ] Importar o service junto dos demais (ordem alfabetica no bloco de imports, `custom` entra antes de `litellm`):
  ```ts
  import { fetchCustomModels } from "./custom.ts";
  ```

- [ ] Adicionar `"custom"` a `MODEL_FETCHING_PROVIDERS` (linha 49-60). **Nao** adicionar a `API_KEY_VALIDATION_PROVIDERS` (linha 40-48) — ver justificativa na Descricao.

- [ ] Novo `case` em `fetchRaw` (linha 109-156), junto dos que dependem de base URL:
  ```ts
  		case "custom": {
  			// No template fallback: the custom template's baseUrl is "" by design.
  			if (!customBaseUrl) return { ok: false, error: "unknown" };
  			return fetchCustomModels(customBaseUrl, apiKey);
  		}
  ```
  - Diferente dos outros `case`, **nao** faz `customBaseUrl || getTemplate(templateId)?.baseUrl`: o template `custom` tem `baseUrl: ""` (`providers.ts:303`), entao o fallback so produziria uma URL vazia.

### 3. Verificar o efeito colateral na sidebar do menu principal

`MainMenu.tsx:181-184` faz:
```ts
const modelsValue =
	hasApiModelFetching(provider.templateId) && modelCount === 0
		? t("sidebar.modelsViaApi")
		: String(modelCount);
```

- [ ] Conferir que nada regride: um Custom Provider sempre tem pelo menos 1 modelo (o wizard exige, `AddProviderFlow.tsx:463-466`), entao `modelCount === 0` e falso e a sidebar continua mostrando o numero. Se o usuario remover todos os modelos em "Gerenciar modelos", passa a mostrar "via API" — o que agora e **verdade**, entao esta correto.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/services/custom.ts` | **CRIAR** — fetch generico + normalizador de aliases |
| `src/services/api-models.ts` | MODIFICAR — import, `MODEL_FETCHING_PROVIDERS`, `case "custom"` |

## Contrato de teste

- `hasApiModelFetching("custom")` -> `true`
- `hasApiKeyValidation("custom")` -> **`false`** (o wizard nao pode bloquear)
- `validateApiKey("custom", ...)` -> `{ valid: false, error: "unknown" }` pelo `default` do switch — e nunca chamado, porque `hasApiKeyValidation` e false
- `fetchCustomModels` contra um LM Studio local -> modelos com `context_length` vindo de `max_context_length`
- `fetchCustomModels` contra um llama.cpp local -> `context_length` vindo de `meta.n_ctx_train`
- `fetchCustomModels` contra uma URL inexistente -> `{ ok: false, error: "network" }`
- `fetchCustomModels` contra um host que responde HTML -> `{ ok: false, error: "unknown" }` (o `json()` falha, `json` vira `null`, `response.ok` decide)
- `fetchCustomModels` com chave vazia -> nao envia `Authorization` nem `x-api-key`
- `fetchRaw("custom", key, undefined)` -> `{ ok: false, error: "unknown" }` sem lancar
- Modelo sem nenhum dos aliases de contexto -> `context_length: undefined`, e o item continua na lista
- `bunx tsc --noEmit` limpo e `bun test` continua 7 pass

## Resumo de Implementacao

Concluido conforme planejado, sem desvios funcionais.

- **`src/services/custom.ts`** (novo, 113 linhas): headers duplos condicionados a `apiKey` nao-vazio, `classifyErrorCode` para o erro-no-corpo, `firstPositive` + `readContextLength`/`readMaxOutput` cobrindo os oito aliases, `requestModels` com fallback de rota `/v1/models` -> `/models` no 404.
- **`src/services/api-models.ts`**: import de `fetchCustomModels`, `"custom"` em `MODEL_FETCHING_PROVIDERS` (e **nao** em `API_KEY_VALIDATION_PROVIDERS`), `case "custom"` sem fallback de template.

### Desvio unico

`ApiKeyValidation` **nao** foi importado no `custom.ts`. O plano o listava no bloco de tipos, mas nada no arquivo o usa (a decisao foi justamente nao expor `validateCustomApiKey`), e o `biome` marca `lint/correctness/noUnusedImports`.

### Efeito colateral conferido (item 3)

`MainMenu.tsx:181` e `ManageProvidersPage.tsx:115` usam o mesmo `hasApiModelFetching(...) && modelCount === 0`. Um Custom Provider sempre sai do wizard com 1 modelo, entao a sidebar segue mostrando o numero; se o usuario remover todos em "Gerenciar modelos", passa a mostrar "via API" — o que agora e verdade. Sem regressao nos dois arquivos.

`AddProviderFlow`, na sidebar do template `custom`, continua mostrando `sidebar.modelsUserDefined` porque o ramo e decidido por `promptModel`, nao por `hasApiModelFetching` — segue correto, o wizard ainda pede um id.

### Contrato verificado

15 testes em `src/context-window.test.ts` com `globalThis.fetch` stubado: os oito aliases de contexto na ordem de precedencia, os cinco de saida, modelo sem alias nenhum (fica na lista com `context_length: undefined`), valor `0`/negativo tratado como ausente, ordenacao por id e descarte de entradas sem id, headers com e sem chave, barra final duplicada, fallback de rota no 404, host inalcancavel (`network`), HTTP 401 (`auth`), `{code:401}` em HTTP 200 (`auth`), HTML (`unknown`) e HTTP 500 (`unknown`).
