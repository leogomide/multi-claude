# 005-D - Testes automatizados, README e bump de versao

## Prompt base

No projeto multi-claude, cubra com testes automatizados a resolucao da janela de contexto e a derivacao das env vars, atualize o README (Custom Provider, Gerenciar modelos e changelog) e faca o bump de versao. Depende dos steps 005-A, 005-B e 005-C concluidos.

## Descricao

Tres frentes. A de teste fecha uma lacuna que os planos 001 e 004 deixaram em aberto: **hoje nao existe nenhum teste para `buildClaudeEnv`, `getModelSpec` ou `fillFromTemplate`** — as verificacoes dos dois planos foram todas manuais, e `src/smoke.test.tsx` e o unico arquivo de teste do repo (7 testes de TUI com `ink-testing-library`).

Como agora o valor passa a vir do usuario, um erro de precedencia e silencioso e caro (R-01 do INDEX: superestimar faz a requisicao estourar na API). Testar a cascata deixa de ser opcional.

## Checklist de Implementacao

### 1. `src/context-window.test.ts` (NOVO)

Teste puro de funcao, sem Ink. Nao precisa mockar `config.ts` — todas as funcoes sob teste sao puras, bastando montar `ConfiguredProvider` literais.

- [ ] Fixtures no topo:
  ```ts
  import { describe, expect, test } from "bun:test";
  import { buildClaudeEnv, getModelSpec, resolveModelSpec } from "./providers.ts";
  import type { ConfiguredProvider } from "./schema.ts";
  import { ignoresContextWindow, parseContextWindow } from "./utils/validate-context.ts";

  const base: ConfiguredProvider = {
  	id: "p1",
  	name: "Test",
  	templateId: "zai",
  	type: "api",
  	apiKey: "k",
  	apiKeyValid: true,
  	models: [],
  };
  const withOverride: ConfiguredProvider = {
  	...base,
  	modelSpecs: { "glm-4.7": { context: 500_000 } },
  };
  ```

- [ ] `describe("parseContextWindow")` — a tabela do contrato do 005-C:

  | Entrada | Esperado |
  |---------|----------|
  | `"128000"` | `128000` |
  | `"128k"` / `"128K"` | `128000` |
  | `"1M"` / `"1m"` | `1000000` |
  | `"128_000"` | `128000` |
  | `"1.048.576"` | `1048576` |
  | `""` / `"   "` | `undefined` |
  | `"abc"` / `"12x"` / `"-5"` | `undefined` |

- [ ] `describe("resolveModelSpec")`:
  - override vence a tabela: `resolveModelSpec(withOverride, "GLM-4.7").context === 500_000` (RN-01)
  - case-insensitive nos dois sentidos: `"GLM-4.7"` e `"glm-4.7"` dao o mesmo (RN-03)
  - sem override cai na tabela: `resolveModelSpec(base, "GLM-5.3").context === 1_048_576` (RN-02)
  - override nao vaza para outro modelo: `resolveModelSpec(withOverride, "GLM-5.3").context === 1_048_576`
  - sem fonte nenhuma: `resolveModelSpec(base, "glm-9") === undefined`
  - provider sem tabela: `resolveModelSpec({ ...base, templateId: "deepseek" }, "deepseek-chat") === undefined`
  - **override em provider sem tabela funciona** — o caso central do plano:
    `resolveModelSpec({ ...base, templateId: "custom", modelSpecs: { "my-model": { context: 262_144 } } }, "my-model").context === 262_144`

- [ ] `describe("buildClaudeEnv context window")` — a lacuna dos planos 001/004:
  - com `contextWindowTokens = 1_048_576`: `CLAUDE_CODE_MAX_CONTEXT_TOKENS === "1048576"` e `CLAUDE_CODE_AUTO_COMPACT_WINDOW === "838861"` (round(0.8x))
  - clamp inferior: `65_536` -> `AUTO_COMPACT_WINDOW === "100000"`
  - clamp superior: `2_000_000` -> `AUTO_COMPACT_WINDOW === "1000000"`
  - sem janela (`undefined`): **nenhuma das duas vars** esta no env retornado (RN-04/RN-07)
  - janela `0`: idem, nenhuma var
  - override manual pre-existente vence (RN-08): setar `process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = "123456"` antes da chamada e conferir que o retorno mantem `"123456"`; restaurar o valor no fim do teste
  - provider `type: "oauth"` com janela: nenhuma das duas vars (o branch de OAuth retorna cedo, `providers.ts:431`)

- [ ] `describe("ignoresContextWindow")`:
  - `"claude-sonnet-4.5"` e `"Claude-Opus-4.5"` -> `true` (RN-11)
  - `"glm-5.3"`, `"my-model"`, `""` -> `false`

- [ ] `package.json`: o script `test` hoje aponta para um arquivo so (linha 34). Trocar para incluir o novo:
  ```json
  "test": "bun test src/smoke.test.tsx src/context-window.test.ts",
  ```

### 2. `src/smoke.test.tsx` — conferir, provavelmente sem mudanca

- [ ] O mock de `fetchApiModels` (linha 44) e `async () => ({ ... })`, **sem parametros declarados**. A nova assinatura `(provider)` do 005-A nao quebra o mock. Rodar `bun test` e confirmar 7 pass; so ajustar se o `tsc` reclamar do tipo do mock.

### 3. `README.md`

- [ ] **Badge de versao** (topo): atualizar o numero.

- [ ] **Secao "Custom Provider"** (linhas 391-408): atualizar a linha de modelos e acrescentar o paragrafo da janela.
  - Trocar `- **Default models:** None — you enter one model ID when adding the provider, and can add more later in **Manage models**` por uma descricao que reflita o fetch novo: os modelos passam a ser buscados em `/v1/models` na base URL configurada, com o ID digitado no wizard servindo de fallback quando o endpoint nao responde.
  - Acrescentar, no mesmo estilo da linha 329 da secao Z.AI:
    > **Context window:** most gateways do not report it, so the wizard asks for it after the model ID and you can change it later in **Manage models**. Leave it empty to let Claude Code decide.
  - Acrescentar a ressalva da RN-11: a variavel e ignorada para ids que comecam com `claude-`.
  - Ajustar a frase da linha 399 ("The wizard asks for a name, the base URL, the authentication header, the token and one model ID") para incluir a janela.

- [ ] **Secao "Provider Management"** (linhas 410-416): a linha de **Manage models** passa a mencionar a janela de contexto por modelo, valendo para qualquer provider — nao so o custom.

- [ ] **Secao "Local Providers"**: uma frase avisando que Ollama, OmniRoute e 9Router nao reportam a janela e que da para informa-la em **Manage models**.

- [ ] **Changelog** — nova secao no topo, marcando a anterior sem `(current)`:
  ```markdown
  ### vX.Y.Z (current)

  - **feat:** the context window can now be set by hand per model, for any provider — gateways whose API does not report it no longer fall back to the 200k Claude Code assumes for unknown models
  - **feat:** the Custom Provider now fetches its model list from `/v1/models`, reading the context window from any of the field names gateways use, and falls back to the model you typed when the endpoint does not answer
  - **fix:** headless launches resolved the context window from the built-in table only, so OpenRouter, Requesty, LiteLLM, LM Studio and llama.cpp got no window outside the TUI
  ```
  - Seguir o formato do CLAUDE.md: `- **tipo:** descricao curta em ingles`. Nao documentar bump de versao nem refactor interno.

### 4. Bump de versao

- [ ] `package.json`: `version` de `1.0.37` para `1.0.38`.
- [ ] `bun install` para atualizar o `bun.lock`.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/context-window.test.ts` | **CRIAR** — testes de parse, resolucao e env |
| `package.json` | MODIFICAR — script `test` + `version` |
| `bun.lock` | MODIFICAR — via `bun install` |
| `README.md` | MODIFICAR — Custom Provider, Provider Management, Local Providers, badge, changelog |

## Contrato de teste

- `bunx tsc --noEmit` limpo
- `bun test` verde: 7 testes do smoke + os novos
- `biome check` sem aumento de contagem nos arquivos tocados em relacao ao HEAD
- README sem `(current)` duplicado e com a badge batendo com o `package.json`

## Resumo de Implementacao

Concluido, com o escopo de teste ampliado.

- **`src/context-window.test.ts`** (novo): **57 testes**, contra os ~30 do checklist. Alem de `parseContextWindow`, `resolveModelSpec`, `buildClaudeEnv` e `ignoresContextWindow`, cobre tambem `getEffectiveModelsWithSource` (RN-06, o caminho que leva o override ate a lista da TUI), `configuredProviderSchema` (RN-10 e rejeicao de `context: 0`) e os 15 testes de `fetchCustomModels` do 005-B, com `globalThis.fetch` stubado e restaurado no `afterEach`.
- **`src/smoke.test.tsx`**: sem alteracao, como previsto — o mock de `fetchApiModels` e `async () => (...)` e nao declara parametros. 7 pass.
- **`package.json`**: script `test` com os dois arquivos; `version` 1.0.37 -> 1.0.38; `bun install` nao mexeu no `bun.lock` (nenhuma dependencia mudou).
- **`README.md`**: badge, Custom Provider (modelos via `/v1/models` + janela no wizard), a ressalva `claude-` como bloco de citacao, Provider Management (janela por modelo em qualquer provider, formatos aceitos e semantica do valor vazio), Local Providers (quem reporta e quem nao reporta) e o changelog da v1.0.38.

### Sobre `fetchCustomModels` morar no mesmo arquivo de teste

`custom.ts` importa de `api-models.ts` **so tipos**, entao nao ha dependencia em runtime. Isso importa porque `smoke.test.tsx` faz `mock.module("./services/api-models.ts", ...)` e os module mocks do Bun sao globais entre arquivos: manter o teste novo sem import de runtime de `api-models.ts` o torna imune a ordem de execucao. Verificado rodando os dois na ordem do script.

### Contrato verificado

- `bunx tsc --noEmit` limpo
- `bun test`: **64 pass / 0 fail** (7 do smoke + 57 novos)
- `biome check` nos arquivos tocados: nenhuma diagnostic nova em relacao ao HEAD (comparado via `git stash`); as que restam — `useLiteralKeys`, `useTemplate`, `noUnusedImports` do `React`, `useExhaustiveDependencies` — ja existiam
- README com um unico `(current)` e a badge batendo com o `package.json`
