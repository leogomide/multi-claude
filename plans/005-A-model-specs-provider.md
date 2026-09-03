# 005-A - `modelSpecs` no provider persistido + `resolveModelSpec` + cadeia de dados

## Prompt base

No projeto multi-claude, adicione ao `ConfiguredProvider` persistido um campo opcional `modelSpecs` com a janela de contexto por modelo, crie o resolvedor unico `resolveModelSpec(provider, model)` com precedencia override > API > tabela do template, e ligue-o nos dois caminhos existentes (`getEffectiveModelsWithSource` e o preenchimento pos-API em `api-models.ts`) mais no modo headless. **Nao** crie nenhuma UI nova nem chave de i18n — isso e o step 005-C. **Nao** mexa no template `custom` nem crie service novo — isso e o 005-B.

## Descricao

Cinco arquivos. A ideia e a mesma do 004-A: a UI e o launch nao precisam saber de nada disso — o `context_length` chega no `ApiModelMeta` e a cadeia do plano 001 cuida do resto. A diferenca e que agora existe uma terceira fonte, e ela tem a **maior** precedencia.

Dois pontos de atencao:

1. **Precedencia invertida em relacao ao 004.** A RN-01 do plano 004 dizia "a API e autoritativa; a tabela so preenche o que faltou". Isso continua verdade **entre API e template**. O override do usuario entra **acima dos dois** — digitar um numero e um ato deliberado, e nao faria sentido a API sobrescrever. O comentario em `fillFromTemplate` (`api-models.ts:88`) precisa ser atualizado para nao mentir.

2. **`fetchApiModels` precisa do provider.** Hoje recebe `(templateId, apiKey, customBaseUrl)`. O override so existe no `ConfiguredProvider`, entao a assinatura passa a `(provider)` e a funcao deriva os tres valores internamente via `getProviderBaseUrl`. `validateApiKey` **nao muda** — nao precisa de spec nenhuma.

## Checklist de Implementacao

### 1. `src/schema.ts` — o campo persistido

- [ ] Em `configuredProviderSchema` (linha 27-37), apos `models`, adicionar:
  ```ts
  	/**
  	 * Per-model context window entered by the user. Keys are lowercase model ids.
  	 * Wins over both the provider API and the template table.
  	 */
  	modelSpecs: z
  		.record(
  			z.string(),
  			z.object({
  				context: z.number().int().positive(),
  				maxOutput: z.number().int().positive().optional(),
  			}),
  		)
  		.optional(),
  ```
  - `.optional()` de proposito, **nao** `.default({})`: evita gravar `"modelSpecs": {}` em todo provider do config.json e dispensa migracao (RN-10).
  - Mesmo formato do `ProviderTemplate.modelSpecs` (linha 18) para o retorno de `getModelSpec` ser reusado sem conversao.
  - `maxOutput` entra no schema por simetria; **a UI do 005-C nao pergunta esse campo** — so `context`.

### 2. `src/providers.ts` — o resolvedor unico

- [ ] Logo apos `getModelSpec` (linha 488-496), exportar:
  ```ts
  /**
   * Single resolution point for a model context window.
   * The user override wins over the provider API and over the template table:
   * typing a number is a deliberate act, so nothing may overwrite it.
   */
  export function resolveModelSpec(
  	provider: ConfiguredProvider,
  	model: string,
  ): { context: number; maxOutput?: number } | undefined {
  	return provider.modelSpecs?.[model.toLowerCase()] ?? getModelSpec(provider.templateId, model);
  }
  ```
  - Lookup em minusculas (RN-03), mesma convencao do `getModelSpec`.
  - `getModelSpec` **continua exportada** — `api-models.ts` ainda a usa como camada de template.

### 3. `src/providers.ts` — modelos default/user (RN-01, RN-02, RN-06)

- [ ] Em `getEffectiveModelsWithSource`, no helper `withSpec` (linha 504-512), trocar a unica chamada:
  ```diff
  -		const spec = getModelSpec(provider.templateId, name);
  +		const spec = resolveModelSpec(provider, name);
  ```
  - E o que faz o override valer tambem para modelos **default do template** (RN-06): `withSpec` e chamado tanto para `provider.models` quanto para `template.defaultModels`.

### 4. `src/services/api-models.ts` — modelos vindos da API (RN-01)

- [ ] Trocar o import da linha 1 para trazer tambem o tipo do provider:
  ```ts
  import { getModelSpec, getProviderBaseUrl, getTemplate } from "../providers.ts";
  import type { ConfiguredProvider } from "../schema.ts";
  ```
  - `getTemplate` continua necessario para os `case` do `fetchRaw`.
  - Nao ha ciclo de import: `providers.ts` ja importa `ApiModelMeta` de `api-models.ts` como **type-only**.

- [ ] Renomear `fillFromTemplate` (linha 83-99) para `applyModelSpecs` e reescrever com a precedencia de tres niveis:
  ```ts
  function applyModelSpecs(provider: ConfiguredProvider, result: ApiFetchResult): ApiFetchResult {
  	if (!result.ok) return result;
  	return {
  		ok: true,
  		models: result.models.map((m) => {
  			// The user override wins over everything, including a value the API reported.
  			const override = provider.modelSpecs?.[m.id.toLowerCase()];
  			if (override) {
  				return {
  					...m,
  					context_length: override.context,
  					max_output_tokens: override.maxOutput ?? m.max_output_tokens,
  				};
  			}
  			// Between API and table the API is authoritative; the table only fills gaps.
  			if (m.context_length !== undefined) return m;
  			const spec = getModelSpec(provider.templateId, m.id);
  			if (!spec) return m;
  			return {
  				...m,
  				context_length: spec.context,
  				max_output_tokens: m.max_output_tokens ?? spec.maxOutput,
  			};
  		}),
  	};
  }
  ```

- [ ] Trocar a assinatura publica de `fetchApiModels` (linha 101-107):
  ```ts
  export async function fetchApiModels(provider: ConfiguredProvider): Promise<ApiFetchResult> {
  	return applyModelSpecs(
  		provider,
  		await fetchRaw(provider.templateId, provider.apiKey, getProviderBaseUrl(provider)),
  	);
  }
  ```
  - `fetchRaw` (linha 109-156) fica **exatamente como esta** — continua recebendo os tres primitivos.
  - `validateApiKey` (linha 158-193) fica **exatamente como esta**.

### 5. `src/components/app/StartClaudeFlow.tsx` — o unico chamador

- [ ] Em `loadModelsForProvider` (linha 205-209), reduzir a chamada:
  ```diff
  -			const result = await fetchApiModels(
  -				provider.templateId,
  -				provider.apiKey,
  -				getProviderBaseUrl(provider),
  -			);
  +			const result = await fetchApiModels(provider);
  ```
- [ ] Remover `getProviderBaseUrl` do import de `../../providers.ts` (linha 18). **Ja conferido:** as unicas duas ocorrencias no arquivo sao a linha 18 (import) e a 208 (a chamada que sai), entao o import fica orfao e o `biome` acusa.

### 6. `src/headless.ts` — paridade com a TUI (RN-12)

Hoje a linha 358 e:
```ts
const contextWindowTokens = getModelSpec(provider.templateId, model)?.context;
```

Isso tem **duas** limitacoes: ignora o override novo, e nunca consulta a API. Consequencia atual, ja existente e nao intencional: OpenRouter/Requesty/LiteLLM/LM Studio/llama.cpp recebem janela real pela TUI e **nenhuma** em headless.

- [ ] Ajustar o import da linha 25:
  ```ts
  import { getEffectiveModels, resolveModelSpec } from "./providers.ts";
  ```
  (`getModelSpec` deixa de ser usado neste arquivo — conferir e remover do import.)

- [ ] Adicionar um helper no topo do arquivo, junto dos outros helpers de modulo:
  ```ts
  // Same window the TUI resolves: user override, then the template table, then the
  // provider API. Headless used to read the static table only, so every provider whose
  // API reports a context length was stuck on the 200k Claude Code assumes.
  async function resolveContextWindow(
  	provider: ConfiguredProvider,
  	model: string,
  ): Promise<number | undefined> {
  	const spec = resolveModelSpec(provider, model);
  	if (spec) return spec.context;
  	if (!model || !hasApiModelFetching(provider.templateId)) return undefined;

  	// A hung gateway must not hold the launch. The dangling fetch is harmless:
  	// runClaude outlives it, and the timer is unref'd so it never keeps the loop alive.
  	const timeout = new Promise<null>((resolve) => {
  		const timer = setTimeout(() => resolve(null), 3000);
  		timer.unref?.();
  	});
  	const result = await Promise.race([fetchApiModels(provider).catch(() => null), timeout]);
  	if (!result || !result.ok) return undefined;
  	return result.models.find((m) => m.id.toLowerCase() === model.toLowerCase())?.context_length;
  }
  ```
  - **Ja conferido:** `headless.ts` **nao** importa nada de `./services/api-models.ts` hoje — adicionar o import novo:
    ```ts
    import { fetchApiModels, hasApiModelFetching } from "./services/api-models.ts";
    ```
  - `type ConfiguredProvider` **ja esta importado** (linha 26), nao mexer.
  - `timer.unref?.()` com optional call: o `Timer` do Bun/Node tem `unref`, mas o tipo pode resolver para o `number` do DOM dependendo do `lib` do tsconfig — o `?.` evita ter que anotar.

- [ ] Trocar a linha 358 por:
  ```ts
  const contextWindowTokens = await resolveContextWindow(provider, model);
  ```
  - O restante do bloco (linhas 360-369, `runClaude(...)`) fica inalterado.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/schema.ts` | MODIFICAR — campo `modelSpecs` em `configuredProviderSchema` |
| `src/providers.ts` | MODIFICAR — `resolveModelSpec` + troca em `withSpec` |
| `src/services/api-models.ts` | MODIFICAR — `applyModelSpecs`, nova assinatura de `fetchApiModels` |
| `src/components/app/StartClaudeFlow.tsx` | MODIFICAR — chamada de `fetchApiModels` + import |
| `src/headless.ts` | MODIFICAR — `resolveContextWindow` + imports |

## Contrato de teste

Com um provider `zai` cujo `modelSpecs` seja `{ "glm-4.7": { context: 500_000 } }`:

- `resolveModelSpec(prov, "GLM-4.7")` -> `{ context: 500000 }` — override vence a tabela (RN-01)
- `resolveModelSpec(prov, "glm-4.7")` -> identico ao anterior (RN-03)
- `resolveModelSpec(prov, "GLM-5.3")` -> `{ context: 1048576, maxOutput: 131072 }` — sem override, cai na tabela (RN-02)
- `resolveModelSpec(prov, "glm-9")` -> `undefined` (RN-02, sem fonte)
- `resolveModelSpec(providerDeepseek, "deepseek-chat")` -> `undefined` (nenhum provider sem override/tabela muda)
- `getEffectiveModelsWithSource(prov)` -> o item `GLM-4.7`, que e **default do template**, volta com `meta.context_length === 500000` (RN-06)
- `applyModelSpecs` com um modelo que a API trouxe com `context_length: 204800` e override de `500000` -> vence `500000` (RN-01)
- `applyModelSpecs` com modelo que a API trouxe e **sem** override -> valor da API intacto (RN-02)
- `fetchApiModels(provider)` compila com um unico argumento; `validateApiKey` inalterada
- Provider sem `modelSpecs` no config.json carrega sem erro de zod (RN-10)
- `bunx tsc --noEmit` limpo e `bun test` continua 7 pass

## Resumo de Implementacao

(preencher apos a execucao)
