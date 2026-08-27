# 004-A - `modelSpecs` no template + tabela Z.AI + preenchimento nos dois caminhos

## Prompt base

No projeto multi-claude, adicione ao `ProviderTemplate` um campo opcional `modelSpecs` com a janela de contexto e o max output por modelo, popule-o para o template `zai`, e faça esse dado preencher o `ApiModelMeta.context_length` tanto para modelos vindos da API quanto para os das listas fixa/do usuário — sem nunca sobrescrever o que a API já trouxe. Não mexa em `buildClaudeEnv` nem no template `env` — isso é o step 004-B.

## Descricao

Três arquivos. A ideia é que a TUI e o launch não precisem saber de nada disso: o `context_length` chega no `ApiModelMeta` e a cadeia do plano 001 já cuida do resto.

Ponto de atenção: `getEffectiveModelsWithSource` hoje devolve `{ name, source }` sem `meta`. Anexar um `meta` só com `context_length` é seguro — o painel lateral do `StartClaudeFlow` (`if (meta)`, ~linha 502) monta cada linha condicionalmente (`meta.name ?? item.name`, `meta.context_length !== undefined ? [...] : []`), então um meta parcial renderiza Nome + Context e nada mais.

## Checklist de Implementacao

### 1. `src/providers.ts` — o campo

- [x] Na interface `ProviderTemplate`, após `defaultModels`:
  ```ts
  /**
   * Static per-model metadata for providers whose API does not expose it.
   * Keys are lowercase model ids; the API always wins when it reports a value.
   */
  modelSpecs?: Record<string, { context: number; maxOutput?: number }>;
  ```

### 2. `src/providers.ts` — a tabela do Z.AI

- [x] No template `zai`, após `defaultModels`:
  ```ts
  // Z.AI's /v1/models does not report context length. Sourced from the OpenRouter
  // model API (z-ai/*) and cross-checked against Z.AI's docs: GLM-5.3 and
  // GLM-5.3-Flash are documented at 1M context / 128K output, GLM-5 at 200K.
  modelSpecs: {
      "glm-5.3": { context: 1_048_576, maxOutput: 131_072 },
      "glm-5.3-flash": { context: 1_048_576, maxOutput: 131_072 },
      "glm-5.2": { context: 1_048_576, maxOutput: 131_072 },
      "glm-5.1": { context: 204_800, maxOutput: 131_072 },
      "glm-5": { context: 204_800, maxOutput: 128_000 },
      "glm-5-turbo": { context: 202_752, maxOutput: 131_072 },
      "glm-4.7": { context: 204_800, maxOutput: 131_072 },
      "glm-4.6": { context: 204_800, maxOutput: 16_384 },
      "glm-4.5": { context: 131_072, maxOutput: 98_304 },
      "glm-4.5-air": { context: 131_072, maxOutput: 98_304 },
  },
  ```
  - Modelos fora da tabela ficam de fora de propósito (RN-03): sem fonte, sem valor.

### 3. `src/providers.ts` — helper de lookup

- [x] Exportar, perto de `getEffectiveModels`:
  ```ts
  export function getModelSpec(
      templateId: string,
      model: string,
  ): { context: number; maxOutput?: number } | undefined {
      const specs = getTemplate(templateId)?.modelSpecs;
      if (!specs) return undefined;
      // Default lists use "GLM-5.3" while the API returns "glm-5.3".
      return specs[model.toLowerCase()];
  }
  ```

### 4. `src/providers.ts` — modelos default/user (RN-05)

- [x] Em `getEffectiveModelsWithSource`, trocar os dois `result.push` para anexar o meta quando houver spec. Extrair um helper local no topo da função:
  ```ts
  const withSpec = (name: string, source: ModelWithSource["source"]): ModelWithSource => {
      const spec = getModelSpec(provider.templateId, name);
      if (!spec) return { name, source };
      return {
          name,
          source,
          meta: { id: name, context_length: spec.context, max_output_tokens: spec.maxOutput },
      };
  };
  ```
  - `for (const m of provider.models)` passa a `result.push(withSpec(m, defaultSet.has(m) ? "default" : "user"))`
  - o laço de `template.defaultModels` passa a `result.push(withSpec(m, "default"))`

### 5. `src/services/api-models.ts` — modelos da API (RN-01, RN-02)

- [x] Importar `getModelSpec` junto de `getTemplate`.
- [x] Em `fetchApiModels`, envolver o retorno de sucesso num preenchimento genérico. Adicionar o helper antes do `switch`:
  ```ts
  function fillFromTemplate(templateId: string, result: ApiFetchResult): ApiFetchResult {
      if (!result.ok) return result;
      return {
          ok: true,
          models: result.models.map((m) => {
              // The API is authoritative; the table only fills what it left out.
              if (m.context_length !== undefined) return m;
              const spec = getModelSpec(templateId, m.id);
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
- [x] Aplicar no retorno da função. Menor diff: renomear o `switch` atual para uma função interna `fetchRaw` e deixar `fetchApiModels` como
  ```ts
  export async function fetchApiModels(
      templateId: string,
      apiKey: string,
      customBaseUrl?: string,
  ): Promise<ApiFetchResult> {
      return fillFromTemplate(templateId, await fetchRaw(templateId, apiKey, customBaseUrl));
  }
  ```
  - Genérico de propósito: nenhum `case "zai"` novo, e qualquer provider que ganhe `modelSpecs` passa a funcionar sozinho.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/providers.ts` | MODIFICAR — campo `modelSpecs`, tabela do `zai`, `getModelSpec`, meta em `getEffectiveModelsWithSource` |
| `src/services/api-models.ts` | MODIFICAR — `fillFromTemplate` + `fetchRaw` |

## Contrato de teste

- `getModelSpec("zai", "GLM-5.3")` e `getModelSpec("zai", "glm-5.3")` → ambos `{ context: 1048576, maxOutput: 131072 }` (RN-04)
- `getModelSpec("zai", "glm-9")` → `undefined` (RN-03)
- `getModelSpec("deepseek", "deepseek-chat")` → `undefined` (RN-09)
- `fetchApiModels("zai", ...)` → todo modelo da tabela volta com `context_length` preenchido; `glm-5.3` com 1.048.576
- Modelo que a API do OpenRouter já traz com `context_length` → valor **inalterado** pelo preenchimento (RN-01)
- `getEffectiveModelsWithSource` num provider Z.AI com `models: ["GLM-5.3"]` → item com `meta.context_length === 1_048_576` (RN-05)
- Provider sem `modelSpecs` → `getEffectiveModelsWithSource` devolve itens sem `meta`, como hoje (RN-09)
- `bunx tsc --noEmit` limpo e `bun test` continua 7 pass

## Resumo de Implementacao

Concluído conforme planejado, sem desvios.

- **`src/schema.ts`**: campo opcional `modelSpecs?: Record<string, { context: number; maxOutput?: number }>` no `ProviderTemplate`.
- **`src/providers.ts`**: tabela dos 10 modelos GLM no template `zai`; `getModelSpec(templateId, model)` com lookup em minúsculas; `getEffectiveModelsWithSource` passou a montar os itens por um helper `withSpec`, que anexa `meta` quando há spec.
- **`src/services/api-models.ts`**: o `switch` virou `fetchRaw` e `fetchApiModels` passou a envolvê-lo em `fillFromTemplate`, que só preenche `context_length` quando a API não trouxe. Genérico — nenhum `case "zai"` novo.

### Contrato verificado contra a API real (10/10)

| Regra | Verificação | Resultado |
|-------|-------------|-----------|
| RN-04 | `getModelSpec("zai","GLM-5.3")` == `("zai","glm-5.3")` | ambos `{context:1048576,maxOutput:131072}` |
| RN-03 | `glm-9` fora da tabela | `undefined` |
| RN-09 | `deepseek` sem `modelSpecs` | `undefined`, itens sem `meta` |
| RN-02 | `fetchApiModels("zai")` ao vivo | `glm-5.3` volta com `ctx=1048576 maxOut=131072`; **os 10 modelos da API ficaram cobertos**, nenhum sem ctx |
| RN-01 | `fetchApiModels("openrouter")` ao vivo | `z-ai/glm-4.6` manteve `204800` da API |
| RN-05 | `getEffectiveModelsWithSource` no provider real | `GLM-5.3` (source `default`) com `meta.context_length=1048576` |
| RN-03 | `GLM-5-Code` salvo pelo dev, fora da tabela | permanece listado, sem `meta` |
