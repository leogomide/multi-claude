# 005-C - UI: utils, i18n, wizard de adicionar provider e Gerenciar modelos

## Prompt base

No projeto multi-claude, exponha a janela de contexto por modelo na TUI em dois pontos: um campo opcional no fim do wizard de adicionar provider (so para templates com `promptModel`) e, em "Gerenciar modelos", um campo ao adicionar modelo mais uma nova opcao "Definir janela de contexto" que cobre tambem os modelos default do template. Extraia `formatContextLength` para um util compartilhado, crie o validador numerico e adicione as chaves de i18n nos tres idiomas. Depende do 005-A (`resolveModelSpec` e o campo `modelSpecs` no provider).

## Descricao

Quatro grupos de arquivo: dois utils novos, i18n nos tres locales, e os dois fluxos.

Pontos de atencao:

1. **`TextPrompt` nao tem campo numerico.** `src/components/common/TextPrompt.tsx` e um `ink-text-input` com `validate?: (value: string) => string | undefined`, sem prop de tipo. Campo numerico = `TextPrompt` normal cujo `validate` rejeita nao-numero e cujo `onSubmit` converte. Mesmo padrao do `validateBaseUrl`.

2. **A validacao roda so no Enter** (`TextPrompt.tsx:35-42`) e o erro some na proxima tecla (`:47-50`). Nao adianta tentar mascarar a digitacao.

3. **`AddProviderFlow` empilha varios `TextPrompt` numa unica tela** (`step === "details"`), com `activeField` decidindo o foco; os nao-focados renderizam um resumo `dimColor + ✓ valor`. O campo novo entra nessa pilha, nao numa tela nova.

4. **`lastField` controla o rodape** (`AddProviderFlow.tsx:318`): e o que troca o label de "next" para "confirm". Precisa acompanhar o campo novo, senao o rodape mente.

5. **Os tres locales sao tipados contra `TranslationDictionary`.** Faltar uma chave em qualquer um deles quebra o `tsc`. Inserir na mesma posicao relativa nos tres.

## Checklist de Implementacao

### 1. `src/utils/format-tokens.ts` (NOVO)

`formatContextLength` esta hoje local (nao exportada) em `StartClaudeFlow.tsx:69-76`. O `ManageModelsFlow` precisa dela.

- [ ] Criar o arquivo movendo a funcao **sem alterar o corpo**:
  ```ts
  /** 1_048_576 -> "1M", 204_800 -> "205K". Shared by the model list and the model manager. */
  export function formatContextLength(tokens: number): string {
  	if (tokens >= 1_000_000) {
  		const m = tokens / 1_000_000;
  		return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  	}
  	const k = tokens / 1_000;
  	return `${Number.isInteger(k) ? k : k.toFixed(0)}K`;
  }
  ```
- [ ] Em `StartClaudeFlow.tsx`: apagar a funcao local (linhas 69-76) e importar de `../../utils/format-tokens.ts`. `formatPricePerMillion` (linhas 78-81) **fica onde esta** — so o `StartClaudeFlow` usa.

### 2. `src/utils/validate-context.ts` (NOVO)

Segue o par `validateX(value, t)` + `normalizeX` de `src/utils/validate-url.ts`.

- [ ] Criar:
  ```ts
  /** Anything below this is a typo, not a context window. */
  const MIN_CONTEXT_TOKENS = 1024;
  /** Guards against a slipped zero; the auto-compact clamp lives in buildClaudeEnv. */
  const MAX_CONTEXT_TOKENS = 10_000_000;

  /**
   * Accepts "128000", "128_000", "128.000", "128k" and "1M".
   * Returns undefined for an empty or unparseable value — the caller decides
   * whether empty means "skip" or "clear".
   */
  export function parseContextWindow(value: string): number | undefined {
  	const raw = value.trim().toLowerCase().replace(/[\s_.,]/g, "");
  	if (!raw) return undefined;

  	const match = raw.match(/^(\d+)([km])?$/);
  	if (!match) return undefined;

  	const digits = Number(match[1]);
  	if (!Number.isFinite(digits) || digits <= 0) return undefined;

  	const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  	return digits * multiplier;
  }

  export function validateContextWindow(
  	value: string,
  	t: (key: string) => string,
  ): string | undefined {
  	// Optional everywhere: empty means "no override" (RN-04).
  	if (!value.trim()) return undefined;

  	const parsed = parseContextWindow(value);
  	if (parsed === undefined) return t("validation.contextInvalid");
  	if (parsed < MIN_CONTEXT_TOKENS || parsed > MAX_CONTEXT_TOKENS) {
  		return t("validation.contextRange");
  	}
  	return undefined;
  }

  /** Claude Code ignores CLAUDE_CODE_MAX_CONTEXT_TOKENS for these ids (see plan 004). */
  export function ignoresContextWindow(model: string): boolean {
  	return model.trim().toLowerCase().startsWith("claude-");
  }
  ```
  - Atencao ao `replace(/[\s_.,]/g, "")`: e o que faz `1.048.576` e `1,048,576` funcionarem. Como roda **antes** do regex, `1.5M` vira `15m` — aceitavel, e um caso que ninguem digita; o formato canonico e o numero cheio.

### 3. i18n — 11 chaves novas

Ordem de insercao (a mesma nos quatro arquivos):

**`src/i18n/types.ts`** — em `validation` (apos `nameDuplicate`, linha 17):
```ts
		contextInvalid: string;
		contextRange: string;
```
em `addFlow` (apos `defaultModels`, linha 51):
```ts
		contextLabel: string;
		contextClaudeWarning: string;
```
em `modelsFlow` (apos `defaultTag`, linha 82):
```ts
		setContext: string;
		selectModelForContext: string;
		noModelsForContext: string;
		contextLabel: string;
		contextEditLabel: string;
		contextUpdated: string;
		contextCleared: string;
```

**`src/i18n/locales/en.ts`**
```ts
// validation
		contextInvalid: "Context window must be a number (e.g. 128000, 128k, 1M).",
		contextRange: "Context window must be between 1024 and 10000000 tokens.",
// addFlow
		contextLabel: "Context window in tokens (optional - Enter to skip)",
		contextClaudeWarning:
			'Claude Code ignores this value for model ids starting with "claude-".',
// modelsFlow
		setContext: "Set context window",
		selectModelForContext: "Select a model to set the context window",
		noModelsForContext: "No models to configure.",
		contextLabel: "Context window in tokens (optional - Enter to skip)",
		contextEditLabel: "Context window in tokens (empty to clear)",
		contextUpdated: 'Context window for "{{name}}" set to {{value}}.',
		contextCleared: 'Context window for "{{name}}" cleared.',
```

**`src/i18n/locales/pt-BR.ts`**
```ts
// validation
		contextInvalid: "A janela de contexto deve ser um número (ex.: 128000, 128k, 1M).",
		contextRange: "A janela de contexto deve estar entre 1024 e 10000000 tokens.",
// addFlow
		contextLabel: "Janela de contexto em tokens (opcional - Enter para pular)",
		contextClaudeWarning:
			'O Claude Code ignora este valor para ids de modelo que começam com "claude-".',
// modelsFlow
		setContext: "Definir janela de contexto",
		selectModelForContext: "Selecione um modelo para definir a janela de contexto",
		noModelsForContext: "Nenhum modelo para configurar.",
		contextLabel: "Janela de contexto em tokens (opcional - Enter para pular)",
		contextEditLabel: "Janela de contexto em tokens (vazio para limpar)",
		contextUpdated: 'Janela de contexto de "{{name}}" definida em {{value}}.',
		contextCleared: 'Janela de contexto de "{{name}}" removida.',
```

**`src/i18n/locales/es.ts`**
```ts
// validation
		contextInvalid: "La ventana de contexto debe ser un número (ej.: 128000, 128k, 1M).",
		contextRange: "La ventana de contexto debe estar entre 1024 y 10000000 tokens.",
// addFlow
		contextLabel: "Ventana de contexto en tokens (opcional - Enter para omitir)",
		contextClaudeWarning:
			'Claude Code ignora este valor para ids de modelo que comienzan con "claude-".',
// modelsFlow
		setContext: "Definir ventana de contexto",
		selectModelForContext: "Seleccione un modelo para definir la ventana de contexto",
		noModelsForContext: "No hay modelos para configurar.",
		contextLabel: "Ventana de contexto en tokens (opcional - Enter para omitir)",
		contextEditLabel: "Ventana de contexto en tokens (vacío para limpiar)",
		contextUpdated: 'Ventana de contexto de "{{name}}" definida en {{value}}.',
		contextCleared: 'Ventana de contexto de "{{name}}" eliminada.',
```

Nao ha chave para a etiqueta na lista: o sufixo e renderizado como `— 128K ctx`, igual ao que o `StartClaudeFlow.tsx:771-776` ja faz sem i18n.

### 4. `src/components/config-wizard/AddProviderFlow.tsx`

- [ ] Imports:
  ```ts
  import {
  	ignoresContextWindow,
  	parseContextWindow,
  	validateContextWindow,
  } from "../../utils/validate-context.ts";
  ```

- [ ] `type Field` (linha 26) ganha `"context"`:
  ```ts
  type Field = "name" | "url" | "auth" | "key" | "model" | "context";
  ```

- [ ] Estado novo, junto de `pendingModels` (linha 47):
  ```ts
  const [pendingModel, setPendingModel] = useState("");
  ```
  (guarda o id digitado para montar a chave do `modelSpecs` e para decidir o aviso da RN-11.)

- [ ] `persistProvider` (linha 59-75) ganha o terceiro parametro:
  ```diff
  -	const persistProvider = async (effectiveKey: string, models: string[]) => {
  +	const persistProvider = async (
  +		effectiveKey: string,
  +		models: string[],
  +		modelSpecs?: ConfiguredProvider["modelSpecs"],
  +	) => {
  ```
  e o campo entra no objeto, seguindo o padrao ja usado ali de so persistir o que diverge do template:
  ```diff
   			baseUrl: baseUrl && baseUrl !== template?.baseUrl ? baseUrl : undefined,
   			authVar: template?.promptAuthVar ? authVar : undefined,
  +			modelSpecs,
  ```

- [ ] O `useEffect` de `validating-key` (linha 102-127) chama `persistProvider(apiKey, pendingModels)`. Para nao perder a janela quando o template valida chave **e** pede modelo, guardar tambem o spec pendente:
  ```ts
  const [pendingSpecs, setPendingSpecs] = useState<ConfiguredProvider["modelSpecs"]>(undefined);
  ```
  e no efeito: `persistProvider(apiKey, pendingModels, pendingSpecs).catch(() => {});`
  - Hoje nenhum template tem `promptModel` **e** validacao de chave ao mesmo tempo (o `custom` nao valida, por decisao do 005-B), mas deixar correto evita uma armadilha silenciosa se um template futuro combinar os dois.

- [ ] `lastField` (linha 318):
  ```diff
  -	const lastField: Field = template?.promptModel ? "model" : "key";
  +	const lastField: Field = template?.promptModel ? "context" : "key";
  ```

- [ ] Helper para o encerramento, logo apos `proceedAfterKey` (linha 333-346), evitando duplicar o if de validacao:
  ```ts
  const finishWithModels = (models: string[], specs?: ConfiguredProvider["modelSpecs"]) => {
  	if (hasApiKeyValidation(templateId)) {
  		setPendingModels(models);
  		setPendingSpecs(specs);
  		setValidationError(null);
  		setStep("validating-key");
  	} else {
  		persistProvider(apiKey, models, specs).catch(() => {});
  	}
  };
  ```

- [ ] O bloco do campo `model` (linhas 459-483) deixa de persistir e passa a avancar:
  ```diff
   					onSubmit={(model) => {
  -						const models = [model.trim()];
  -						if (hasApiKeyValidation(templateId)) {
  -							setPendingModels(models);
  -							setValidationError(null);
  -							setStep("validating-key");
  -						} else {
  -							persistProvider(apiKey, models).catch(() => {});
  -						}
  +						setPendingModel(model.trim());
  +						setActiveField("context");
   					}}
  ```

- [ ] Bloco novo do campo `context`, **depois** do bloco de `model`, ainda dentro do `AppShell`:
  ```tsx
  			{template?.promptModel && (
  				<Box marginTop={1} flexDirection="column">
  					<TextPrompt
  						label={t("addFlow.contextLabel")}
  						focus={activeField === "context"}
  						validate={(val) => validateContextWindow(val, t)}
  						onSubmit={(val) => {
  							const tokens = parseContextWindow(val);
  							const models = [pendingModel];
  							finishWithModels(
  								models,
  								tokens ? { [pendingModel.toLowerCase()]: { context: tokens } } : undefined,
  							);
  						}}
  						onCancel={() => {
  							setActiveField("model");
  						}}
  					/>
  					{activeField === "context" && ignoresContextWindow(pendingModel) && (
  						<StatusMessage variant="warning">{t("addFlow.contextClaudeWarning")}</StatusMessage>
  					)}
  				</Box>
  			)}
  ```
  - `StatusMessage` ja esta importado no arquivo (linha 17).
  - Enter vazio -> `tokens` e `undefined` -> `modelSpecs` fica `undefined` -> nada e gravado (RN-04).

- [ ] Conferir o resumo do `authVar` (linhas 409-417): a condicao e `activeField === "key" || activeField === "model"`. Adicionar `|| activeField === "context"`, senao o `✓ Bearer token` some da tela quando o foco chega no campo novo.

### 5. `src/components/config-wizard/ManageModelsFlow.tsx`

- [ ] Imports novos:
  ```ts
  import { getEffectiveModels, getTemplate, resolveModelSpec } from "../../providers.ts";
  import { formatContextLength } from "../../utils/format-tokens.ts";
  import { parseContextWindow, validateContextWindow } from "../../utils/validate-context.ts";
  ```

- [ ] `type Step` (linha 13):
  ```ts
  type Step =
  	| "loading"
  	| "menu"
  	| "add-model"
  	| "add-model-context"
  	| "remove-model"
  	| "set-context-select"
  	| "set-context-value";
  ```

- [ ] Estado novo:
  ```ts
  const [pendingModel, setPendingModel] = useState("");
  ```
  (serve tanto para o `add-model` -> `add-model-context` quanto para o `set-context-select` -> `set-context-value`.)

- [ ] `useInput` (linhas 30-38): todo step que nao seja `menu` volta para `menu`. Trocar a lista fixa por:
  ```ts
  		if (key.escape) {
  			if (step === "menu") onCancel();
  			else if (step !== "loading") setStep("menu");
  		}
  ```

- [ ] Helper de escrita, junto de `refreshProvider` (linha 52-56), para nao repetir a cadeia `loadConfig -> mutar -> saveConfig -> refresh -> mensagem` quatro vezes:
  ```ts
  const mutateProvider = async (
  	mutate: (prov: ConfiguredProvider) => void,
  	msg: { text: string; variant: "success" | "warning" | "info" },
  ) => {
  	const config = await loadConfig();
  	const prov = config.providers.find((p) => p.id === providerId);
  	if (prov) mutate(prov);
  	await saveConfig(config);
  	await refreshProvider();
  	setMessage(msg);
  	setStep("menu");
  };
  ```

- [ ] Lista do menu (linhas 79-87) passa a mostrar a janela resolvida:
  ```ts
  const specTag = (m: string) => {
  	const spec = resolveModelSpec(provider, m);
  	return spec ? ` — ${formatContextLength(spec.context)} ctx` : "";
  };

  const modelLines: string[] = [];
  for (const m of defaultModels) {
  	modelLines.push(`  ${m} ${t("modelsFlow.defaultTag")}${specTag(m)}`);
  }
  for (const m of userOnlyModels) {
  	modelLines.push(`  ${m}${specTag(m)}`);
  }
  ```

- [ ] Item novo no menu (linhas 88-92), entre "Adicionar" e "Remover":
  ```ts
  const menuItems = [
  	{ label: `➕ ${t("modelsFlow.addModel")}`, value: "add" },
  	{ label: `📐 ${t("modelsFlow.setContext")}`, value: "set-context" },
  	{ label: `🗑️ ${t("modelsFlow.removeModel")}`, value: "remove" },
  	{ label: `↩ ${t("modelsFlow.back")}`, value: "back" },
  ];
  ```
  e o `onSelect` (linhas 105-133) ganha, no mesmo estilo do guard de "remove":
  ```ts
  if (item.value === "set-context") {
  	if (getEffectiveModels(provider).length === 0) {
  		setMessage({ text: t("modelsFlow.noModelsForContext"), variant: "warning" });
  		return;
  	}
  	setStep("set-context-select");
  	return;
  }
  ```

- [ ] `add-model` (linhas 137-171): o `onSubmit` deixa de gravar e passa a encadear:
  ```ts
  onSubmit={(modelName) => {
  	setPendingModel(modelName.trim());
  	setStep("add-model-context");
  }}
  ```

- [ ] Step novo `add-model-context`, mesmo layout do `add-model`:
  ```tsx
  <TextPrompt
  	label={t("modelsFlow.contextLabel")}
  	validate={(val) => validateContextWindow(val, t)}
  	onSubmit={(val) => {
  		const tokens = parseContextWindow(val);
  		mutateProvider(
  			(prov) => {
  				prov.models.push(pendingModel);
  				if (tokens) {
  					prov.modelSpecs = { ...prov.modelSpecs, [pendingModel.toLowerCase()]: { context: tokens } };
  				}
  			},
  			{ text: t("modelsFlow.modelAdded", { name: pendingModel }), variant: "success" },
  		);
  	}}
  />
  ```

- [ ] Step novo `set-context-select` — usa `getEffectiveModels` para cobrir tambem os defaults do template (RN-06):
  ```tsx
  const items = getEffectiveModels(provider).map((m) => {
  	const spec = resolveModelSpec(provider, m);
  	return { label: spec ? `${m} — ${formatContextLength(spec.context)} ctx` : m, value: m };
  });
  // <Text bold color="cyan">{t("modelsFlow.selectModelForContext")}</Text>
  // <CyanSelectInput items={items} onSelect={(item) => { setPendingModel(item.value); setStep("set-context-value"); }} />
  ```

- [ ] Step novo `set-context-value` — pre-preenchido com o valor resolvido; vazio limpa:
  ```tsx
  <TextPrompt
  	label={t("modelsFlow.contextEditLabel")}
  	initialValue={String(resolveModelSpec(provider, pendingModel)?.context ?? "")}
  	validate={(val) => validateContextWindow(val, t)}
  	onSubmit={(val) => {
  		const tokens = parseContextWindow(val);
  		const key = pendingModel.toLowerCase();
  		mutateProvider(
  			(prov) => {
  				const next = { ...prov.modelSpecs };
  				if (tokens) next[key] = { context: tokens };
  				else delete next[key];
  				prov.modelSpecs = Object.keys(next).length > 0 ? next : undefined;
  			},
  			tokens
  				? {
  						text: t("modelsFlow.contextUpdated", {
  							name: pendingModel,
  							value: formatContextLength(tokens),
  						}),
  						variant: "success",
  					}
  				: { text: t("modelsFlow.contextCleared", { name: pendingModel }), variant: "info" },
  		);
  	}}
  />
  ```
  - `prov.modelSpecs = ... : undefined` mantem o config.json limpo quando o ultimo override e removido.
  - Limpar um default do template faz o valor voltar para o da tabela (RN-02), nao para "sem janela" — e o comportamento certo.

- [ ] `remove-model` (linhas 173-202): apagar tambem o override (RN-05):
  ```ts
  mutateProvider(
  	(prov) => {
  		prov.models = prov.models.filter((m) => m !== item.value);
  		if (prov.modelSpecs) {
  			const next = { ...prov.modelSpecs };
  			delete next[item.value.toLowerCase()];
  			prov.modelSpecs = Object.keys(next).length > 0 ? next : undefined;
  		}
  	},
  	{ text: t("modelsFlow.modelRemoved", { name: item.value }), variant: "success" },
  );
  ```

- [ ] Importar `type ConfiguredProvider` ja existe (linha 7). Conferir que `getEffectiveModels` foi somado ao import de `providers.ts`, que hoje so traz `getTemplate`.

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/utils/format-tokens.ts` | **CRIAR** — `formatContextLength` extraida |
| `src/utils/validate-context.ts` | **CRIAR** — parse, validate e `ignoresContextWindow` |
| `src/i18n/types.ts` | MODIFICAR — 11 chaves |
| `src/i18n/locales/en.ts` | MODIFICAR — 11 valores |
| `src/i18n/locales/pt-BR.ts` | MODIFICAR — 11 valores |
| `src/i18n/locales/es.ts` | MODIFICAR — 11 valores |
| `src/components/app/StartClaudeFlow.tsx` | MODIFICAR — usa o util extraido |
| `src/components/config-wizard/AddProviderFlow.tsx` | MODIFICAR — campo `context` |
| `src/components/config-wizard/ManageModelsFlow.tsx` | MODIFICAR — 3 steps novos, tag na lista, cleanup |

## Contrato de teste

- `parseContextWindow`: `"128000"`->128000, `"128k"`->128000, `"1M"`->1000000, `"128_000"`->128000, `"1.048.576"`->1048576, `""`->undefined, `"abc"`->undefined, `"12x"`->undefined
- `validateContextWindow("", t)` -> `undefined` (vazio e valido, RN-04)
- `validateContextWindow("500", t)` -> mensagem de range
- `validateContextWindow("99999999999", t)` -> mensagem de range
- `ignoresContextWindow("claude-sonnet-4.5")` -> `true`; `ignoresContextWindow("glm-5.3")` -> `false`
- Wizard do Custom Provider: nome -> URL -> auth -> chave -> modelo -> **janela**; rodape mostra "confirm" so no ultimo; `✓ Bearer token` continua visivel no campo novo
- Wizard com Enter vazio na janela -> provider gravado **sem** `modelSpecs` no config.json
- Gerenciar modelos de um provider `zai`: "Definir janela de contexto" lista os defaults do template com a janela da tabela ao lado
- Definir `glm-4.7` em `500000` -> a lista do menu passa a mostrar `— 500K ctx`
- Limpar com Enter vazio -> volta a mostrar `— 205K ctx` (o valor da tabela, RN-02)
- Remover um modelo do usuario que tinha override -> a chave some do `modelSpecs` (RN-05)
- Ultimo override removido -> `modelSpecs` some do config.json (nao fica `{}`)
- `bunx tsc --noEmit` limpo (os tres locales com as 11 chaves) e `bun test` continua 7 pass

## Resumo de Implementacao

(preencher apos a execucao)
