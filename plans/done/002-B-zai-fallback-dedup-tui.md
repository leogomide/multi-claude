# 002-B - Fallback no fetch + dedup case-insensitive + i18n

## Prompt base

No projeto multi-claude, faça `StartClaudeFlow.loadModelsForProvider` cair na lista local (user + defaults) com aviso visível quando o fetch de modelos falhar, em vez de mandar o usuário para a tela `error` sem saída, e torne o merge API × local case-insensitive com a entrada da API vencendo. Adicione a string de aviso nos 3 locales e no tipo do i18n. Não mexa em `src/services/` — isso é o step 002-A.

## Descricao

Dois problemas no fluxo atual (`src/components/app/StartClaudeFlow.tsx:194-231`):

1. **Sem fallback** — `if (!result.ok) { setFetchError(...); setStep("error"); return; }`. Uma queda de rede vira beco sem saída mesmo com lista local perfeitamente utilizável. Como **todos** os providers hoje em `MODEL_FETCHING_PROVIDERS` têm `defaultModels: []` (verificado), a nova regra é no-op para eles, salvo quando o usuário salvou modelos próprios — caso em que poder lançar é estritamente melhor que a tela de erro (RN-08).

2. **Dedup case-sensitive** — `effectiveNames.has(meta.id)` compara `"GLM-4.7"` (default) com `"glm-4.7"` (API) e não casa, então a tela mostraria os dois. A correção inverte a precedência: **o que a API retorna é representado pela entrada da API** (id canônico + metadata), e a lista local contribui só com o que a API não trouxe (RN-05, RN-06).

## Checklist de Implementacao

### 1. `src/components/app/StartClaudeFlow.tsx` — estado do aviso

- [x] Ao lado de `const [fetchError, setFetchError] = useState<ApiModelError | null>(null);` (~linha 98):
  ```ts
  const [fallbackError, setFallbackError] = useState<ApiModelError | null>(null);
  ```

### 2. `src/components/app/StartClaudeFlow.tsx` — merge e fallback

- [x] Substituir o corpo do ramo `if (hasApiModelFetching(provider.templateId))` em `loadModelsForProvider` (~linha 195):
  ```ts
  setStep("loading-models");
  setFallbackError(null);
  const result = await fetchApiModels(
      provider.templateId,
      provider.apiKey,
      getProviderBaseUrl(provider),
  );

  const effective = getEffectiveModelsWithSource(provider);

  if (!result.ok) {
      // Falling back to the local list beats a dead-end error screen (RN-03).
      if (effective.length > 0) {
          setFallbackError(result.error);
          setModelItems(effective);
          setStep("select-model");
          return;
      }
      setFetchError(result.error);
      setStep("error");
      return;
  }

  // The API list is canonical: it carries the real model id plus metadata.
  const apiIds = new Set(result.models.map((m) => m.id.toLowerCase()));
  const localOnly = effective.filter((m) => !apiIds.has(m.name.toLowerCase()));
  const apiItems = result.models.map(
      (meta): ModelWithSource => ({ name: meta.id, source: "api", meta }),
  );
  const all = [...localOnly, ...apiItems];

  if (all.length === 0) {
      setStep("no-models");
  } else {
      setModelItems(all);
      setStep("select-model");
  }
  ```
- [x] O ramo `else` (providers sem fetch) fica **intocado**.
- [x] Conferir que `ModelWithSource` já está importado de `../../providers.ts` (está, linha 16).

### 3. `src/components/app/StartClaudeFlow.tsx` — render do aviso

- [x] No bloco `if (step === "select-model" && selectedProvider)` (~linha 683), logo após o `<StatusMessage variant="info">` do provider label:
  ```tsx
  {fallbackError && (
      <StatusMessage variant="warning">
          {t("apiModels.fallbackNotice", { provider: providerLabel })}
      </StatusMessage>
  )}
  ```
  - `providerLabel` já existe no componente (usado nas mensagens de erro).
  - `variant="warning"` já é usado no `step === "auth-expired"`, logo o componente suporta.

### 4. i18n — tipo e 3 locales

- [x] `src/i18n/types.ts`, dentro de `apiModels` (~linha 183), após `networkError`:
  ```ts
  fallbackNotice: string;
  ```
- [x] `src/i18n/locales/en.ts` (~linha 191):
  ```ts
  fallbackNotice: "Could not reach {{provider}} — showing the saved model list.",
  ```
- [x] `src/i18n/locales/pt-BR.ts`:
  ```ts
  fallbackNotice: "Nao foi possivel acessar {{provider}} — exibindo a lista de modelos salva.",
  ```
- [x] `src/i18n/locales/es.ts`:
  ```ts
  fallbackNotice: "No se pudo acceder a {{provider}} — mostrando la lista de modelos guardada.",
  ```
- [x] Manter a chave na **mesma posição relativa** nos três locales (o projeto ordena por bloco, não alfabeticamente).

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/app/StartClaudeFlow.tsx` | MODIFICAR — estado, merge/fallback, render do aviso |
| `src/i18n/types.ts` | MODIFICAR — `fallbackNotice` em `apiModels` |
| `src/i18n/locales/en.ts` | MODIFICAR — string |
| `src/i18n/locales/pt-BR.ts` | MODIFICAR — string |
| `src/i18n/locales/es.ts` | MODIFICAR — string |

## Contrato de teste

- Fetch ok + local `["GLM-4.7"]` + API `["glm-4.7","glm-5.3"]` → 2 itens, ambos `source: "api"`, sem duplicata (RN-05)
- Fetch ok + local `["GLM-5-Code"]` (ausente na API) → item permanece na lista, `source` local (RN-06)
- Fetch falha + lista efetiva não-vazia → `step === "select-model"` com aviso renderizado; launch possível (RN-03)
- Fetch falha + lista efetiva vazia → `step === "error"`, texto inalterado (RN-04)
- Provider sem fetch (ex.: `deepseek`) → caminho `else` idêntico ao atual (RN-08)
- `bunx tsc --noEmit` limpo: os 3 locales satisfazem `Translations` (a omissão em um locale é erro de tipo)

## Resumo de Implementacao

Concluído conforme planejado, sem desvios.

- **`src/components/app/StartClaudeFlow.tsx`**: estado `fallbackError`; em `loadModelsForProvider` o `getEffectiveModelsWithSource` subiu para antes do teste `!result.ok`, permitindo o fallback para `select-model` com aviso quando há lista local (RN-03) e mantendo a tela `error` quando não há (RN-04). O merge passou a ser `localOnly + apiItems` com `apiIds` em minúsculas, invertendo a precedência a favor da API (RN-05/RN-06). Aviso `variant="warning"` renderizado acima do título da lista.
- **i18n**: `fallbackNotice` em `types.ts` + en/pt-BR/es, logo após `networkError`.

**Verificado com a config real do dev + API ao vivo** (provider Z.AI com 15 modelos salvos, API devolvendo 10):

- RN-05: merge produziu **17 itens sem nenhuma duplicata case-insensitive** — antes desta mudança a tela mostraria 25, com `GLM-4.7`/`glm-4.7`, `GLM-5.3`/`glm-5.3` e `GLM-5-Turbo`/`glm-5-turbo` duplicados
- RN-06: os 7 modelos salvos ausentes da API (`GLM-5-Code`, `GLM-4.7-FlashX`, `GLM-4.5-X`, `GLM-4.5-AirX`, `GLM-4-32B-0414-128K`, `GLM-4.7-Flash`, `GLM-4.5-Flash`) permaneceram listados
- RN-02: exibição usa `display_name` (`GLM-5.3`), launch usa o id canônico (`glm-5.3`)
- RN-03: com baseUrl inalcançável, erro `network` + 15 itens locais → `select-model` com aviso
- `bunx tsc --noEmit` limpo (os 3 locales satisfazem `Translations`)
