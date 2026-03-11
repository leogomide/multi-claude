# Relatório de Análise - multi-claude

**Data:** 2026-03-10
**Modelo:** GLM-5
**Título:** Análise Completa para Apresentação em Live de Comunidade de IA

---

# Parte 1: Análise de Arquitetura Técnica

*Agente: Tech Lead*

---

## 1. Estrutura do Projeto

### Organização de Pastas

O projeto segue uma **separação clara de responsabilidades** com modularidade exemplar:

```
multi-claude/
├── cli.ts                    # Entry point (thin, delega para processos)
├── src/
│   ├── schema.ts             # Schemas Zod + tipos TypeScript
│   ├── providers.ts          # Templates de provedores (data-driven)
│   ├── config.ts             # Leitura/escrita de configuração
│   ├── runner.ts             # Spawn do Claude com env vars
│   ├── tui-process.ts        # Processo isolado para TUI
│   ├── app.tsx               # Render do Ink com providers
│   ├── debug.ts              # Sistema de logging estruturado
│   ├── hooks/                # Hooks customizados React
│   ├── i18n/                 # Sistema de internacionalização
│   ├── services/             # Integrações com APIs externas
│   └── components/           # Componentes React/Ink organizados por função
```

### Pontos Fortes da Organização

1. **Separação CLI/TUI**: O `cli.ts` spawn um processo separado (`tui-process.ts`) para a interface Ink. Isso evita problemas de estado residual do React entre sessões.

2. **Componentes por categoria**: `common/`, `layout/`, `app/`, `config-wizard/` - cada pasta tem um propósito claro.

3. **Serviços isolados**: Cada integração externa (OpenRouter, Ollama, LM Studio) tem seu próprio arquivo em `services/`.

---

## 2. Stack Tecnológica

### Bun como Runtime (vs Node.js)

**Arquivo**: `src/hooks/useTerminalSize.ts`

```typescript
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,           // Bun roda .ts diretamente!
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

**Vantagens observadas**:
- **Zero build step**: Bun executa TypeScript diretamente (`noEmit: true`)
- **FFI nativo**: O hook `useTerminalSize.ts` usa FFI para kernel32.dll no Windows
- **Startup rápido**: Processo TUI spawnado instantaneamente

### TypeScript Strict Mode

O projeto usa flags rigorosas:
- `strict: true`
- `noUncheckedIndexedAccess: true` - arrays retornam `T | undefined`
- `noImplicitOverride: true` - exige `override` explícito

### Ink (React para Terminal)

**Arquivo**: `src/components/layout/AppShell.tsx`

```typescript
export function AppShell({ children, sidebar, footerItems = [] }: AppShellProps) {
  const { columns, rows } = useTerminalSize();

  // Layout responsivo adaptativo
  if (columns < MIN_COLS || rows < MIN_ROWS) {
    return (
      <Box height={rows} width={columns} alignItems="center" justifyContent="center">
        <Text color="yellow">
          {t("terminal.tooSmall", { current: `${columns}x${rows}`, min: `${MIN_COLS}x${MIN_ROWS}` })}
        </Text>
      </Box>
    );
  }

  const showSidebar = sidebar && columns >= MIN_SIDEBAR_WIDTH;
  // ... layout com header, content, sidebar opcional, footer
}
```

**Destaque**: UI totalmente **responsiva** no terminal - sidebar aparece/desaparece baseado no tamanho.

### Zod para Validação

**Arquivo**: `src/schema.ts`

```typescript
export const configuredProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  templateId: z.string(),
  type: z.enum(["api", "oauth"]).default("api"),
  apiKey: z.string().default(""),
  models: z.array(z.string()).default([]),
  baseUrl: z.string().optional(),
});

export type ConfiguredProvider = z.infer<typeof configuredProviderSchema>;
```

**Pattern**: Schema-first development - tipos são inferidos dos schemas Zod.

### Rosetta para i18n

**Arquivo**: `src/i18n/types.ts`

O tipo `TranslationDictionary` define **todas as strings** da aplicação com tipagem forte:

```typescript
export interface TranslationDictionary {
  common: { loading: string; yes: string; no: string; ... };
  validation: { nameRequired: string; apiKeyRequired: string; ... };
  mainMenu: { title: string; startClaude: string; ... };
  // ... 20+ namespaces organizados
}
```

**Uso**:
```typescript
const { t } = useTranslation();
t("mainMenu.defaultLaunch")
t("apiModels.fetchSuccess", { count: 5 })  // interpolação tipada
```

---

## 3. Padrões de Código

### Componentes React Funcionais com Estado Local

**Arquivo**: `src/components/app/MainMenu.tsx`

```typescript
export function MainMenu({ onSelect, onEscape, lastMessage }: MainMenuProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ConfiguredProvider[]>([]);
  const [highlightedValue, setHighlightedValue] = useState<string | null>(null);
  const { latestVersion } = useUpdateCheck(pkg.version);

  useEffect(() => {
    loadConfig().then((config) => {
      setProviders(config.providers);
    });
  }, []);

  const groups = useMemo(() => {
    // Building grouped menu items
    const providerItems: GroupedSelectItem[] = [
      defaultItem,
      ...providers.map((p) => ({
        label: p.name,
        value: `provider:${p.id}`,
        icon: p.type === "oauth" ? "🔐" : "🚀",
      })),
    ];
    // ...
  }, [providers, t, latestVersion]);
```

**Padrão**: Estado local + callbacks + memoização - sem biblioteca de estado global.

### Hooks Customizados

**Arquivo**: `src/hooks/useBreadcrumb.tsx`

```typescript
interface BreadcrumbContextValue {
  crumbs: string[];
  setCrumbs: (crumbs: string[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  crumbs: [],
  setCrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext);
}
```

**Arquivo**: `src/hooks/useTerminalSize.ts`

```typescript
export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(readTerminalSize);
  const sizeRef = useRef(size);

  useEffect(() => {
    const check = () => {
      const next = readTerminalSize();
      if (next.columns !== sizeRef.current.columns || next.rows !== sizeRef.current.rows) {
        process.stdout.write("\x1b[2J\x1b[H");  // Clear screen on resize
        sizeRef.current = next;
        setSize(next);
      }
    };

    process.stdout.on("resize", check);
    const timer = setInterval(check, 2000);  // Fallback polling

    return () => {
      process.stdout.off("resize", check);
      clearInterval(timer);
    };
  }, []);

  return size;
}
```

**Destaque**: FFI para kernel32.dll no Windows + fallbacks múltiplas plataformas.

### Discriminated Unions para Tipos de Resultado

**Arquivo**: `src/services/api-models.ts`

```typescript
export type ApiFetchResult =
  | { ok: true; models: ApiModelMeta[] }
  | { ok: false; error: ApiModelError };

export type ApiKeyValidation =
  | { valid: true }
  | { valid: false; error: ApiModelError };
```

**Uso**:
```typescript
const result = await fetchApiModels(templateId, apiKey);
if (!result.ok) {
  // TypeScript sabe que result.error existe aqui
  setFetchError(result.error);
  return;
}
// TypeScript sabe que result.models existe aqui
```

---

## 4. Arquitetura de Componentes

### Sistema de Roteamento Declarativo

**Arquivo**: `src/components/app/UnifiedApp.tsx`

```typescript
type AppView =
  | "main-menu"
  | "select-model"
  | "manage-providers"
  | "edit-provider"
  | "manage-models"
  | "add-provider"
  | "manage-installations"
  | "add-installation"
  | "edit-installation"
  | "settings"
  | "change-language"
  | "statusline";

function UnifiedAppInner({ cliArgs, onStartClaude, onOAuthLogin, onRunUpdate }: UnifiedAppProps) {
  const [view, setView] = useState<AppView>("main-menu");
  const [flowKey, setFlowKey] = useState(0);  // Força remount
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const goTo = useCallback((nextView: AppView, crumbs: string[] = [], message?: FlowMessage) => {
    setLastMessage(message ?? null);
    setCrumbs(crumbs);
    setFlowKey((k) => k + 1);  // Reset componente
    setView(nextView);
  }, [setCrumbs]);

  return (
    <>
      {view === "main-menu" && <MainMenu key={flowKey} onSelect={handleMainMenuSelect} ... />}
      {view === "select-model" && <StartClaudeFlow key={flowKey} ... />}
      {view === "manage-providers" && <ManageProvidersPage key={flowKey} ... />}
      {/* ... outros views */}
    </>
  );
}
```

**Pattern**: State-based routing - cada view é um componente condicional.

### Componente Shell (Layout Composicional)

**Arquivo**: `src/components/layout/AppShell.tsx`

```typescript
interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;      // Slot para sidebar
  footerItems?: FooterShortcut[];  // Slot para atalhos
}

export function AppShell({ children, sidebar, footerItems = [] }: AppShellProps) {
  const showSidebar = sidebar && columns >= MIN_SIDEBAR_WIDTH;

  return (
    <Box flexDirection="column" height={rows} width={columns} overflow="hidden">
      <Header />

      <Box flexGrow={1} flexDirection="row" overflow="hidden">
        <Box flexDirection="column" width={showSidebar ? halfWidth : undefined}>
          {children}
        </Box>
        {showSidebar && (
          <>
            <Text color="gray">{"│"}</Text>
            <Box flexDirection="column" width={halfWidth}>
              {sidebar}
            </Box>
          </>
        )}
      </Box>

      <Footer items={footerItems} />
    </Box>
  );
}
```

### Componentes Comuns Reutilizáveis

**StatusMessage** (`src/components/common/StatusMessage.tsx`):
```typescript
type Variant = "success" | "warning" | "info" | "error";

const ICONS: Record<Variant, string> = {
  success: "\u2714",  // ✔
  warning: "\u26A0",  // ⚠
  info: "\u2139",     // ℹ
  error: "\u2718",    // ✘
};

export function StatusMessage({ variant, children }: StatusMessageProps) {
  return (
    <Text>
      <Text color={COLORS[variant]}>{ICONS[variant]} </Text>
      <Text>{children}</Text>
    </Text>
  );
}
```

**GroupedSelect** (`src/components/common/GroupedSelect.tsx`):
- Lista com grupos, scroll virtual, indicadores de scroll
- Suporta highlight tracking para sidebar contextual

---

## 5. Sistema de Configuração

### Schema-First com Zod

**Arquivo**: `src/schema.ts`

```typescript
export const configSchema = z.object({
  providers: z.array(configuredProviderSchema),
  installations: z.array(installationSchema).default([]),
  language: z.string().optional(),
  lastFlags: z.array(z.string()).optional(),
  lastEnvVars: z.array(z.string()).optional(),
  statusLine: statusLineConfigSchema.optional(),
});

export type Config = z.infer<typeof configSchema>;
```

### Config Storage

**Arquivo**: `src/config.ts`

```typescript
export const CONFIG_DIR = join(homedir(), ".multi-claude");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return configSchema.parse(parsed);  // Validação Zod!
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
```

### Provider Templates (Data-Driven Design)

**Arquivo**: `src/providers.ts`

```typescript
export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: "anthropic",
    description: "Anthropic (OAuth)",
    baseUrl: "",
    defaultModels: [],
    env: {},
    configureEnv() { /* OAuth: usa CLAUDE_CONFIG_DIR */ },
  },
  {
    id: "openrouter",
    description: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    defaultModels: [],
    env: {},
    configureEnv(env, apiKey, _model) {
      env["OPENROUTER_API_KEY"] = apiKey;
      env["ANTHROPIC_BASE_URL"] = this.baseUrl;
      env["ANTHROPIC_AUTH_TOKEN"] = apiKey;
    },
  },
  {
    id: "ollama",
    description: "Ollama (Local)",
    baseUrl: "http://localhost:11434",
    defaultApiKey: "ollama",  // API key não necessária
    env: { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
  },
];
```

**Pattern**: Cada provider tem sua estratégia de configuração via `configureEnv`.

### Build de Environment Variables

**Arquivo**: `src/providers.ts`

```typescript
export function buildClaudeEnv(
  provider: ConfiguredProvider,
  model: string,
  installationId?: string,
): Record<string, string> | null {
  const template = getTemplate(provider.templateId);
  if (!template) return null;

  const env: Record<string, string> = {};

  // Copia process.env
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  // OAuth: token especial
  if (provider.type === "oauth") {
    const creds = readOAuthCredentials(provider.id);
    if (creds) env["CLAUDE_CODE_OAUTH_TOKEN"] = creds.accessToken;
    // ...
  } else {
    // API: configura env vars do provider
    const configurator = template.configureEnv ?? defaultEnvConfigurator;
    configurator.call(template, env, provider.apiKey, model);
  }

  // Cleanup + model vars
  cleanupAndApplyTemplateEnv(env, template);
  setModelEnvVars(env, model);

  // Installation dir para multi-instâncias
  if (installationId && installationId !== DEFAULT_INSTALLATION_ID) {
    env["CLAUDE_CONFIG_DIR"] = getInstallationPath(installationId);
  }

  return env;
}
```

---

## 6. Integrações Externas

### Serviços de API

**Arquivo**: `src/services/api-models.ts`

```typescript
export async function fetchApiModels(
  templateId: string,
  apiKey: string,
  customBaseUrl?: string,
): Promise<ApiFetchResult> {
  switch (templateId) {
    case "openrouter": {
      const result = await fetchOpenRouterModels(apiKey);
      if (!result.ok) return result;
      return { ok: true, models: result.models.map(mapOpenRouterModel) };
    }
    case "requesty":
      return fetchRequestyModels(apiKey);
    case "ollama":
    case "lmstudio":
    case "llamacpp": {
      const baseUrl = customBaseUrl || getTemplate(templateId)?.baseUrl;
      if (templateId === "ollama") return fetchOllamaModels(baseUrl);
      if (templateId === "lmstudio") return fetchLMStudioModels(baseUrl);
      return fetchLlamaCppModels(baseUrl);
    }
  }
}
```

### OpenRouter Integration

**Arquivo**: `src/services/openrouter.ts`

```typescript
export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterFetchResult> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models/user", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "auth" };
    }

    const json = await response.json() as OpenRouterResponse;
    return { ok: true, models: json.data.sort((a, b) => a.id.localeCompare(b.id)) };
  } catch {
    return { ok: false, error: "network" };
  }
}
```

### Ollama Integration

**Arquivo**: `src/services/ollama.ts`

```typescript
export async function fetchOllamaModels(baseUrl: string): Promise<ApiFetchResult> {
  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/api/tags`;
    const response = await fetch(url);

    const json = await response.json() as OllamaTagsResponse;
    const models = (json.models ?? []).map(mapOllamaModel);
    return { ok: true, models: models.sort((a, b) => a.id.localeCompare(b.id)) };
  } catch {
    return { ok: false, error: "network" };
  }
}
```

---

## 7. Código Exemplar

### Fluxo de Add Provider

**Arquivo**: `src/components/config-wizard/AddProviderFlow.tsx`

```typescript
type Step = "template" | "details" | "validating-key" | "oauth-name" | "create-installation";

export function AddProviderFlow({ onDone, onOAuthLogin, onCancel }: AddProviderFlowProps) {
  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState("");
  const [activeField, setActiveField] = useState<"name" | "url" | "key">("name");

  // Sidebar contextual que muda baseado no template highlight
  const sidebarContent = useMemo(() => {
    const currentId = step === "template" ? highlightedTemplateId : templateId;
    const tmpl = PROVIDER_TEMPLATES.find((tp) => tp.id === currentId);
    if (!tmpl) return undefined;

    const items: SidebarItem[] = [{ label: t("sidebar.name"), value: tmpl.description }];

    if (isOAuthTemplate(tmpl.id)) {
      items.push({ label: t("sidebar.type"), value: "OAuth" });
    } else if (tmpl.defaultApiKey) {
      items.push({ label: t("sidebar.type"), value: "Local" });
    }

    return <Sidebar title={t("sidebar.providerInfo")} items={items} />;
  }, [step, highlightedTemplateId, templateId, t]);

  // Validação assíncrona de API key
  useEffect(() => {
    if (step !== "validating-key") return;
    let cancelled = false;

    validateApiKey(templateId, apiKey).then((result) => {
      if (cancelled) return;
      if (result.valid) {
        // Salva provider
        loadConfig().then((config) => {
          const provider: ConfiguredProvider = { /* ... */ };
          config.providers.push(provider);
          saveConfig(config).then(() => {
            onDone({ text: t("addFlow.success", { name }), variant: "success" });
          });
        });
      } else {
        setStep("details");  // Volta para correção
      }
    });

    return () => { cancelled = true; };
  }, [step]);
```

### Sistema de Logging

**Arquivo**: `src/debug.ts`

```typescript
const LOG_LEVELS = { off: -1, error: 0, warn: 1, info: 2, debug: 3 } as const;
const MAX_LOG_FILES = 20;

function writeLog(level: LogLevel, source: string, msg: string, err?: unknown): void {
  ensureInit();
  if (!logFile) return;
  if (LOG_LEVELS[level] > LOG_LEVELS[configuredLevel]) return;

  const tag = level.toUpperCase().padEnd(5);
  let line = `[${new Date().toISOString()}] [${tag}] [${source}] ${msg}`;
  if (err !== undefined) {
    line += "\n  " + formatError(err).replace(/\n/g, "\n  ");
  }

  appendFileSync(logFile, line + "\n");
}

export function createLogger(source: string): Logger {
  return {
    error: (msg, err?) => writeLog("error", source, msg, err),
    warn: (msg) => writeLog("warn", source, msg),
    info: (msg) => writeLog("info", source, msg),
    debug: (msg) => writeLog("debug", source, msg),
  };
}
```

---

## 8. Sugestões de Tópicos para a Live

### Tópicos Técnicos (Foco em Arquitetura)

1. **"React no Terminal com Ink"**
   - Componentes declarativos vs imperativo
   - Hooks para estado e efeitos
   - Responsividade no terminal

2. **"TypeScript Strict Mode na Prática"**
   - Discriminated unions para resultados
   - Schema-first com Zod
   - Tipos inferidos vs explícitos

3. **"Bun como Runtime Moderno"**
   - Zero build step
   - FFI nativo para Windows
   - Performance de startup

4. **"Padrão Wizard/Flow em React"**
   - State machine com steps
   - Navegação declarativa
   - Sidebar contextual

### Tópicos de Design

5. **"Data-Driven Configuration"**
   - Provider templates como dados
   - Estratégias de configuração por provider
   - Extensibilidade sem condicionais

6. **"Process Architecture para CLIs"**
   - Separação CLI/TUI em processos
   - Comunicação via arquivos JSON
   - Exit codes semânticos

7. **"Sistema de i18n Tipado"**
   - Rosetta + TypeScript
   - Interpolação type-safe
   - Organização por namespaces

### Demonstrações Práticas

8. **Ao vivo**: Adicionar um novo provider template
9. **Ao vivo**: Adicionar uma nova string de tradução
10. **Ao vivo**: Criar um novo componente comum

---

## 9. Pontos Fortes da Arquitetura

1. **Modularidade**: Cada arquivo tem uma responsabilidade única e clara.

2. **Type Safety**: TypeScript strict + Zod garante segurança em runtime e compile time.

3. **Developer Experience**: Hot reload com Bun, tipos inferidos, mensagens de erro claras.

4. **User Experience**: UI responsiva, sidebar contextual, navegação intuitiva.

5. **Extensibilidade**: Novos providers são adicionados no array `PROVIDER_TEMPLATES`.

6. **Resiliência**: Tratamento de erros robusto, fallbacks para diferentes cenários.

7. **Internacionalização**: Suporte nativo a múltiplas línguas com tipos.

8. **Debugging**: Sistema de logging estruturado com rotação de arquivos.

---

# Parte 2: Análise de UX/DX

*Agente: UX/DX Specialist*

---

## Visão Geral

O **multi-claude** é uma CLI TUI (Terminal User Interface) construída com **Ink** (React para terminal) que demonstra excelência em Developer Experience. A arquitetura baseada em componentes React permite uma interface rica, responsiva e intuitiva que transcende CLIs tradicionais baseadas em argumentos de linha de comando.

---

## 1. Fluxos que Impressionam (Para Demo ao Vivo)

### StartClaudeFlow

**Arquivo:** `src/components/app/StartClaudeFlow.tsx`

Este é o fluxo principal da aplicação e demonstra vários recursos avançados:

**Wizard Inteligente com Detecção de Contexto:**
```typescript
// Skip model selection for OAuth providers - vai direto para flags
if (provider.type === "oauth") {
    setSelectedModel("");
    if (config.installations.length === 1) {
        goToFlagsStep(provider, "", config.installations[0]!.dirName);
    }
}
```

**Search em Tempo Real para Listas Grandes:**
```typescript
const searchable = modelItems.length > 10;
// Ativa busca automaticamente quando há mais de 10 modelos
```

**Sidebar Contextual com Informações Ricas:**
- Context length (formatado: "200K tokens", "1M tokens")
- Pricing ($0.50/$2.00 per million tokens)
- Tools support (Yes/No)
- Reasoning support (Yes/No)
- Moderation status
- Parameter size, quantization, architecture (para modelos locais)

**Scroll Virtual Inteligente:**
```typescript
// Mantém item ativo sempre visível
const scrollOffset = useMemo(() => {
    if (filteredItems.length <= visibleLimit) return 0;
    const half = Math.floor(visibleLimit / 2);
    if (activeIndex <= half) return 0;
    // ...lógica de scroll
}, [activeIndex, filteredItems.length]);
```

**Por que impressiona:** O usuário não precisa decorar nomes de modelos - ele vê pricing, contexto, capacidades em tempo real enquanto navega.

---

### AddProviderFlow

**Arquivo:** `src/components/config-wizard/AddProviderFlow.tsx`

**Validação Assíncrona de API Key:**
```typescript
useEffect(() => {
    if (step !== "validating-key") return;
    validateApiKey(templateId, apiKey).then((result) => {
        if (result.valid) {
            // Salva provider
        } else {
            // Mostra erro específico: auth, network, ou fetch
        }
    });
}, [step]);
```

**Fluxo OAuth Guiado para Anthropic:**
- Detecta que Anthropic requer instalação customizada
- Cria instalação automaticamente
- Abre browser para autenticação
- Feedback visual com spinner durante processo

**Sidebar com Preview de Template:**
```typescript
const sidebarContent = useMemo(() => {
    const tmpl = PROVIDER_TEMPLATES.find((tp) => tp.id === currentId);
    // Mostra: nome, tipo (OAuth/Local/API), base URL, modelos default
}, [step, highlightedTemplateId, templateId]);
```

**Por que impressiona:** Adicionar um provider novo leva segundos, não minutos. O usuário nunca fica perdido - sidebar sempre explica o que está acontecendo.

---

### ChecklistSelect (Launch Options)

**Arquivo:** `src/components/common/ChecklistSelect.tsx`

**Checklist Interativo com Valores Aninhados:**
```typescript
// --worktree aceita valor customizado
{
    label: "--worktree",
    value: "--worktree",
    acceptsValue: true,
    valuePlaceholder: "Worktree name (leave empty for auto-generated)",
}
```

**Grupos Organizados:**
- Session: --resume
- Permissions: --dangerously-skip-permissions
- Development: --verbose, --worktree
- Integration: --chrome
- Experimental: Agent Teams

**Por que impressiona:** Em vez de decorar flags, o usuário vê todas as opções organizadas com descrições claras na sidebar.

---

## 2. Componentes que são Exemplos de Boa DX

### GroupedSelect

**Arquivo:** `src/components/common/GroupedSelect.tsx`

**Features:**
- Grupos com labels estilizados: `── Group Name ──`
- Scroll virtual com indicadores `↑ ...` e `↓ ...`
- Navegação circular (wrap-around)
- Callback `onHighlight` para preview em tempo real
- Ícones e cores customizáveis por item

**Uso exemplar:** Menu principal com grupos "Start Claude Code" e "Options"

---

### SearchableSelect

**Arquivo:** `src/components/common/SearchableSelect.tsx`

**Features:**
- Contador de resultados: `(5/100)`
- Filtro case-insensitive
- Limite de 10 itens visíveis
- Escape para cancelar

---

### TextPrompt

**Arquivo:** `src/components/common/TextPrompt.tsx`

**Features:**
- Validação em tempo real (limpa erro ao digitar)
- Mask para API keys (`mask="*"`)
- Estado de "completed" mostra `✓` verde
- Placeholder contextual

**Código que mostra atenção a detalhes:**
```typescript
const handleChange = (newValue: string) => {
    setValue(newValue);
    if (error) setError(undefined); // Limpa erro instantaneamente
};
```

---

### AppShell

**Arquivo:** `src/components/layout/AppShell.tsx`

**Features:**
- Layout consistente: Header + Content + Footer
- Sidebar condicional (esconde se < 60 colunas)
- Detecção de terminal pequeno com mensagem clara
- Divisor visual `│` entre conteúdo e sidebar

---

## 3. Detalhes de UX que Fazem Diferença

### Sistema de Cores Consistente

| Cor | Uso |
|-----|-----|
| Cyan | Item ativo/selecionado, títulos |
| Green | Sucesso, prompts de input (`>`) |
| Yellow | Warnings, updates disponíveis |
| Red | Erros |
| Magenta | Logo/título do app |
| Gray/Dim | Labels, hints, indicadores de scroll |

### StatusMessage com Ícones Unicode

**Arquivo:** `src/components/common/StatusMessage.tsx`

```typescript
const ICONS = {
    success: "✔",
    warning: "⚠",
    info: "ℹ",
    error: "✘",
};
```

### Breadcrumbs Navegacionais

**Arquivo:** `src/hooks/useBreadcrumb.tsx`

Mostra hierarquia: `Manage providers > Edit provider > Manage models`

### Footer Dinâmico

**Arquivo:** `src/components/layout/Footer.tsx`

Atalhos mudam por contexto:
- `↑↓ navigate | ⏎ select | esc back`
- `↑↓ navigate | space toggle | ⏎ launch | esc back`

### Responsividade Terminal

**Arquivo:** `src/hooks/useTerminalSize.ts`

- FFI direto para kernel32.dll no Windows (performance)
- Fallbacks para macOS/Linux
- Resize handler com clear automático
- Interval de 2s para detectar mudanças

```typescript
if (columns < MIN_COLS || rows < MIN_ROWS) {
    return (
        <Text color="yellow">
            Terminal too small ({{current}}). Minimum: {{min}}
        </Text>
    );
}
```

---

## 4. Sistema de Internacionalização (i18n)

**Arquivos:**
- `src/i18n/index.ts` - Setup com Rosetta
- `src/i18n/locales/en.ts`
- `src/i18n/locales/pt-BR.ts`
- `src/i18n/locales/es.ts`

**Features:**
- 3 idiomas: English, Português (BR), Español
- Interpolação de variáveis: `{{name}}`, `{{count}}`
- Pluralização: `modelCount: ({ count }) => \`${count} model${count === 1 ? "" : "s"}\``
- Contexto React com `useTranslation()`

**Código que permite troca em runtime:**
```typescript
export function initLocale(locale: string): void {
    i18n.locale(locale);
}
```

---

## 5. Comparação com CLIs Tradicionais

| Aspecto | CLIs Tradicionais | multi-claude |
|---------|------------------|--------------|
| **Navegação** | `--flag --value` | Setas + Enter visual |
| **Descoberta** | `--help` (texto longo) | Menu visual com grupos |
| **Busca** | Grep manual | Search inline instantâneo |
| **Validação** | Erro pós-execução | Tempo real com feedback |
| **Contexto** | Man pages separadas | Sidebar contextual |
| **Multi-idioma** | Raro | 3 idiomas built-in |
| **OAuth** | Manual, copiar tokens | Fluxo guiado com browser |
| **Responsividade** | Output quebrado | Layout adaptativo |
| **Feedback** | Stdout texto | Ícones, cores, spinners |

---

## 6. Sugestões de Demo para a Live

### Demo 1: Primeira Execução (2 min)
1. Rodar `mclaude` sem argumentos
2. Mostrar menu principal com "Default Launch" e providers vazios
3. Navegar pelo menu, mostrar sidebar contextual
4. Adicionar OpenRouter - validar API key em tempo real

### Demo 2: Seleção de Modelo (3 min)
1. Launch com provider que tem muitos modelos (OpenRouter/Novita)
2. Mostrar search em ação
3. Navegar e ver sidebar com pricing, context length, tools support
4. Selecionar modelo e ir para flags

### Demo 3: Launch Options (2 min)
1. Mostrar ChecklistSelect com grupos
2. Toggle algumas flags
3. Mostrar --worktree aceitando valor customizado
4. Explicar sidebar com descrições

### Demo 4: Multi-idioma (1 min)
1. Settings > Change language
2. Selecionar Português
3. Navegar pela interface totalmente traduzida

### Demo 5: OAuth Flow (2 min)
1. Adicionar Anthropic
2. Mostrar criação automática de instalação
3. Ver processo de autenticação com browser

---

## 7. Possíveis Melhorias Futuras

### Alta Prioridade
1. **Keyboard shortcuts numéricos**: `1-9` para seleção rápida
2. **Help contextual**: `?` ou `F1` para tooltips estendidos
3. **Persist state**: Lembrar posição em flows longos

### Média Prioridade
4. **Animações**: Transições suaves entre views (fade, slide)
5. **Undo**: Desfazer última ação
6. **Themes**: Cores customizáveis via config

### Baixa Prioridade
7. **Mouse support**: Click para seleção (quando terminal suporta)
8. **Accessibility**: Suporte a screen readers
9. **Export/Import config**: Backup de providers

---

## Arquivos-Chave para Referência

| Componente | Arquivo |
|------------|---------|
| Main Router | `src/components/app/UnifiedApp.tsx` |
| Start Flow | `src/components/app/StartClaudeFlow.tsx` |
| Add Provider | `src/components/config-wizard/AddProviderFlow.tsx` |
| Grouped Select | `src/components/common/GroupedSelect.tsx` |
| Checklist Select | `src/components/common/ChecklistSelect.tsx` |
| Text Prompt | `src/components/common/TextPrompt.tsx` |
| App Shell | `src/components/layout/AppShell.tsx` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| Terminal Size Hook | `src/hooks/useTerminalSize.ts` |
| i18n Context | `src/i18n/context.tsx` |
| i18n English | `src/i18n/locales/en.ts` |
| i18n Português | `src/i18n/locales/pt-BR.ts` |

---

## Conclusão

O **multi-claude** representa um excelente exemplo de como CLIs modernas podem oferecer uma experiência de usuário rica e intuitiva. A utilização de React/Ink permite componentes reutilizáveis e uma arquitetura limpa, enquanto atenção a detalhes como feedback visual, responsividade e internacionalização demonstram maturidade no design de DX.

**Pontos fortes para destacar na live:**
- Wizard inteligente com detecção de contexto
- Sidebar contextual que elimina necessidade de documentação externa
- Validação em tempo real com feedback visual
- Busca instantânea para listas grandes
- Suporte multi-idioma nativo
- Fluxo OAuth guiado (sem copiar tokens manualmente)

---

# Parte 3: Análise de Ecossistema e Casos de Uso

*Agente: Ecosystem Analyst*

---

## 1. PROVEDORES SUPORTADOS

### 1.1 Cloud Providers (API)

| Provedor | Tipo | Modelos | Destaque |
|----------|------|---------|----------|
| **Anthropic (OAuth)** | OAuth | Gerenciado nativamente | Múltiplas contas Claude Pro/Team/Enterprise |
| **DeepSeek** | API | deepseek-chat, deepseek-reasoner | Custo-benefício, reasoning |
| **OpenRouter** | Agregador | ~300+ modelos dinâmicos | Maior variedade, preços competitivos |
| **Requesty** | Agregador | Customizável | Roteamento inteligente |
| **Alibaba Cloud** | API | Qwen3, GLM-5, Kimi-K2.5 | Alternativa asiática |
| **MiniMax** | API | MiniMax-M2.5 | Alta velocidade |
| **Moonshot AI** | API | Kimi-K2.5, Kimi-K2-thinking | Modelos chineses |
| **Novita AI** | API | DeepSeek, Qwen, GLM, Kimi | Proxy multi-modelo |
| **Poe** | API | Claude, GPT, etc | Acesso via plataforma Poe |
| **Z.AI** | API | GLM-5, GLM-4.7 | Modelos Zhipu AI |

### 1.2 Local Providers (Sem API Key)

| Provedor | Porta | Uso |
|----------|-------|-----|
| **Ollama** | 11434 | Models locais via `ollama pull` |
| **LM Studio** | 1234 | GUI para carregar modelos GGUF |
| **llama.cpp** | 8080 | Servidor HTTP direto |

### 1.3 Funcionalidades por Provedor

**Com fetch automático de modelos:**
- OpenRouter: Busca ~300 modelos com preços, contexto, capacidades
- Requesty: Busca modelos configurados na conta
- Ollama/LM Studio/llama.cpp: Detecta modelos carregados localmente

**Com validação de API key:**
- OpenRouter: Valida chave antes de salvar
- Requesty: Valida chave antes de salvar

---

## 2. PROBLEMAS QUE RESOLVE

### 2.1 Problema Central
**Gestão de múltiplas API keys e ambientes para Claude Code**

### 2.2 Dores Específicas

1. **Alternância manual de ambiente**
   - Sem mclaude: Editar .env ou export ANTHROPIC_API_KEY toda vez
   - Com mclaude: Seleção interativa via TUI

2. **Modelos locais vs cloud**
   - Diferentes URLs base (localhost vs api.anthropic.com)
   - Diferentes timeouts e configurações
   - Mclaude abstrai todas as diferenças

3. **Múltiplas contas Anthropic**
   - Claude Pro pessoal + Claude Team trabalho
   - OAuth com isolamento de credenciais
   - Instalações separadas (config, history, MCP servers)

4. **Gestão de projeto por contexto**
   - Instalações isoladas: ~/.multi-claude/installations/work/
   - Cada instalação: settings, MCP, history, memory independentes

5. **Custos e comparação**
   - Status line mostra: custo, burn rate, cache hit, throughput
   - Alternar entre provedores para comparar qualidade/preço

---

## 3. CASOS DE USO CONCRETOS

### 3.1 Desenvolvedor Individual com Múltiplos Projetos

**Cenário:** Desenvolvedor que trabalha em projetos pessoais e freelance.

**Setup:**
```
Providers:
- deepseek-personal (para projetos pessoais - barato)
- openrouter-freelance (para clientes - variedade)
- ollama-local (para testes offline)

Installations:
- personal (~/.multi-claude/installations/personal/)
- freelance (~/.multi-claude/installations/freelance/)
```

**Workflow:** `mclaude` → seleciona provider → modelo → instalação → launch

---

### 3.2 Time Usando Diferentes Provedores

**Cenário:** Startup com orçamento limitado usando DeepSeek para tarefas simples e Claude para tarefas complexas.

**Setup:**
```
Providers:
- deepseek (coding diário)
- anthropic-work (refatoração complexa, arquitetura)
- openrouter (comparação de modelos)
```

**Demonstração:** Mostrar alternância rápida entre provedores na mesma sessão.

---

### 3.3 Comparação Cloud vs Local

**Cenário:** Testar se modelo local (Qwen 2.5 Coder 7B via Ollama) atende a necessidade antes de pagar API.

**Demo prática:**
1. Rodar `mclaude` com Ollama + Qwen local
2. Mesmo prompt com DeepSeek cloud
3. Comparar qualidade, latência, custo

---

### 3.4 Desenvolvimento Offline

**Cenário:** Desenvolvedor em viagem ou com internet instável.

**Setup:**
```bash
# Preparar
ollama pull qwen2.5-coder:7b
ollama pull deepseek-coder-v2:lite

# Usar offline
mclaude --provider ollama --model qwen2.5-coder:7b -p "refactor this function"
```

**Vantagem:** Zero dependência de conexão.

---

### 3.5 Economia de Custos

**Cenário:** Projeto com muitas iterações de coding.

**Comparativo de custos (estimado):**
- Claude Sonnet 4: ~$3/1M input, ~$15/1M output
- DeepSeek Chat: ~$0.27/1M input, ~$1.1/1M output
- Ollama local: $0 (custo de hardware)

**Demo:** Mostrar status line "cost" template com burn rate e projeção horária.

---

### 3.6 Múltiplas Contas Claude (OAuth)

**Cenário:** Consultor com cliente A e cliente B, cada um com Claude Team próprio.

**Setup:**
```
Providers:
- client-a (OAuth → conta cliente A)
- client-b (OAuth → conta cliente B)

Installations:
- client-a (MCP servers, settings do cliente A)
- client-b (MCP servers, settings do cliente B)
```

**Isolamento completo:** Nenhum risco de cross-contamination.

---

## 4. POSICIONAMENTO NO ECOSISTEMA

### 4.1 Comparação com Alternativas

| Solução | Pros | Contras |
|---------|------|---------|
| **mclaude** | TUI interativa, multi-provider, OAuth, instalações isoladas | Requer Bun |
| **Shell scripts** | Simples, sem dependências | Manual, propenso a erro |
| **.env manual** | Direto | Tedioso, sem UI |
| **direnv** | Auto-load por diretório | Complexo, não resolve OAuth |
| **AI SDK configs** | Integrado | Limitado ao SDK específico |

### 4.2 Vantagens Competitivas

1. **TUI completa** - Não precisa memorizar comandos
2. **OAuth nativo** - Múltiplas contas Anthropic sem API key
3. **Instalações isoladas** - Contexto por projeto/cliente
4. **Status line rico** - Métricas em tempo real
5. **Headless mode** - Integração em scripts e CI/CD
6. **i18n** - Inglês, Português, Espanhol

### 4.3 Público-Alvo

- **Desenvolvedores individuais** que usam IA para coding
- **Consultores** com múltiplos clientes
- **Times** com orçamento limitado
- **Experimentadores** que comparam modelos
- **Usuários offline** ou com privacidade como prioridade

---

## 5. OPORTUNIDADES FUTURAS

### 5.1 Provedores em Falta

| Provedor | Razão para adicionar |
|----------|---------------------|
| **Groq** | Ultra-low latency, modelos open source |
| **Together AI** | Modelos open source com fine-tuning |
| **Fireworks AI** | Deploy de modelos customizados |
| **Cerebras** | Inference rápido |
| **Mistral** | API nativa (atual via OpenRouter) |

### 5.2 Features em Falta

1. **Cost tracking histórico** - Gráfico de gastos ao longo do tempo
2. **Model comparison mode** - Rodar mesmo prompt em 2+ modelos
3. **Fallback provider** - Auto-switch se provider falhar
4. **Quota management** - Alertas de budget
5. **Team sync** - Compartilhar configs entre time
6. **MCP server presets** - Templates de MCP por provider

### 5.3 Integrações Possíveis

- **CI/CD** - Headless mode para automação
- **IDE extensions** - VS Code integration
- **Raycast/Alfred** - Quick launch extensions
- **Terraform/Pulumi** - Infrastructure as code para providers

---

## 6. SUGESTÕES DE DEMO PRÁTICAS

### Demo 1: "Setup em 60 segundos"
```
1. bun install -g @leogomide/multi-claude
2. mclaude
3. Add Provider → DeepSeek → colar API key
4. Launch com deepseek-chat
5. Mostrar status line com custo
```
**Narrativa:** "Do zero ao Claude Code rodando com provedor alternativo em menos de 1 minuto."

---

### Demo 2: "Múltiplas contas Claude"
```
1. Add Provider → Anthropic (OAuth)
2. Login no navegador
3. Criar instalação para essa conta
4. Add outro provider → Anthropic (OAuth) → conta diferente
5. Mostrar isolamento de configs
```
**Narrativa:** "Consultores podem gerenciar clientes com Claude Team separados."

---

### Demo 3: "Cloud vs Local"
```
1. Terminal 1: ollama serve (com modelo carregado)
2. mclaude → provider ollama → prompt simples
3. mclaude → provider deepseek → mesmo prompt
4. Comparar latência e resultado
```
**Narrativa:** "Teste modelos locais antes de pagar API, ou trabalhe offline."

---

### Demo 4: "Headless para automação"
```
mclaude --provider deepseek --model deepseek-chat -p --output-format json "list all TODO comments in this codebase"
```
**Narrativa:** "Integre mclaude em scripts de CI/CD ou agentes autônomos."

---

### Demo 5: "Status Line Templates"
```
1. Settings → Status Line
2. Mostrar templates: default, cost, perf, context
3. Launch Claude Code
4. Mostrar métricas em tempo real
```
**Narrativa:** "Visibilidade total de custos, performance e uso de contexto."

---

## 7. NARRATIVA PARA APRESENTAÇÃO (Storytelling)

### Abertura (30s)
"Quem aqui já trocou API keys manualmente, errou copiar, ou ficou confuso com variáveis de ambiente? O multi-claude resolve isso com uma TUI elegante que gerencia provedores, modelos e até múltiplas contas Claude."

### Problema (1min)
"Claude Code é incrível, mas foi feito para um cenário: uma conta Anthropic. A realidade é que temos DeepSeek mais barato, OpenRouter com 300 modelos, Ollama para rodar local. Cada um precisa de configurações diferentes."

### Solução (2min)
"mclaude é um middleware entre você e o Claude Code. Você roda `mclaude`, seleciona provider, modelo, e ele configura tudo automaticamente. OAuth para múltiplas contas, instalações isoladas, até status line customizado."

### Demo (3min)
[Executar demos 1, 2 e 5]

### Casos de uso (1min)
"Desenvolvedor individual economizando com DeepSeek. Consultor com clientes separados. Time comparando modelos. Desenvolvimento offline com Ollama."

### Encerramento (30s)
"Open source, MIT, Bun. Instale com `bun install -g @leogomide/multi-claude`. Contribuições bem-vindas no GitHub."

---

## 8. PERGUNTAS FREQUENTES (FAQ Esperado)

### Q: Funciona com Node.js?
**A:** Não, requer Bun. Mas Bun é fácil de instalar e o projeto roda diretamente em TypeScript sem build step.

### Q: Preciso de API key da Anthropic?
**A:** Não necessariamente. Você pode usar DeepSeek, OpenRouter, ou modelos locais via Ollama/LM Studio.

### Q: Como funciona o OAuth?
**A:** mclaude abre o navegador para login Anthropic, armazena o token de forma segura, e injeta na sessão do Claude Code. Suporta múltiplas contas com isolamento completo.

### Q: Posso usar em CI/CD?
**A:** Sim! Use `mclaude --provider <name> --model <model> -p "prompt"` para modo headless não-interativo.

### Q: Quanto custa?
**A:** mclaude é gratuito e open source (MIT). Você paga pelo uso dos provedores de API.

### Q: É seguro armazenar API keys?
**A:** As chaves ficam em `~/.multi-claude/config.json` com permissão de usuário. É equivalente a outros CLI tools. Para maior segurança, use variáveis de ambiente.

### Q: Posso contribuir?
**A:** Sim! O projeto aceita PRs para novos provedores, correções de bugs, traduções, etc. Repo: github.com/leogomide/multi-claude

### Q: Qual a diferença para o aider?
**A:** aider é um agente de coding. mclaude é um gerenciador de providers para o Claude Code. Eles resolvem problemas diferentes.

### Q: Funciona no Windows?
**A:** Sim, totalmente suportado. O projeto inclusive detecta shims .cmd do Windows para resolver o path do claude.

### Q: Como atualizo?
**A:** `bun install -g @leogomide/multi-claude@latest` ou `mclaude` mostra opção de update se versão nova disponível.

---

## 9. ARQUIVOS-CHAVE PARA REFERÊNCIA

| Arquivo | Propósito |
|---------|-----------|
| `src/providers.ts` | Templates de provedores e lógica de env vars |
| `src/services/openrouter.ts` | Integração OpenRouter com fetch de modelos |
| `src/services/ollama.ts` | Integração Ollama |
| `src/runner.ts` | Spawn do Claude Code com ambiente configurado |
| `src/schema.ts` | Schema Zod da configuração |
| `README.md` | Documentação completa |

---

## 10. RESUMO EXECUTIVO

**O que é:** CLI tool para gerenciar múltiplos provedores de API e iniciar Claude Code com ambiente correto.

**Para quem:** Desenvolvedores que usam Claude Code com múltiplos provedores (Anthropic, DeepSeek, OpenRouter, Ollama, etc).

**Valor principal:** Elimina fricção de alternar entre provedores, abstrai configurações complexas, permite múltiplas contas Anthropic via OAuth.

**Diferencial:** TUI completa, OAuth nativo, instalações isoladas, status line customizado, headless mode para automação.

**Adoção:** `bun install -g @leogomide/multi-claude` - pronto em 30 segundos.

---

# Plano de Apresentação Final

## Contexto

**Objetivo:** Apresentar o projeto multi-claude em uma live de comunidade de desenvolvimento com IA.

**Projeto:** CLI tool para gerenciar múltiplos provedores de API e iniciar o Claude Code com as environment variables corretas.

**Público-alvo:** Desenvolvedores "vibe code" - entusiastas que usam IA para coding de forma casual e experimental.

**Duração:** 30 minutos

---

## Estrutura da Apresentação (30 min)

### 1. Abertura (2 min)
- Quem já trocou API keys manualmente?
- Quem usa múltiplos provedores (DeepSeek, OpenRouter, Ollama)?
- Apresentar o problema: Claude Code foi feito para uma conta Anthropic

### 2. O Problema (3 min)
- Alternância manual de API keys (export ANTHROPIC_API_KEY=...)
- Configurações diferentes para cada provedor (base URL, env vars)
- Múltiplas contas Claude (pessoal + trabalho + clientes)
- Custo elevado sem alternativa para comparar modelos

### 3. A Solução (4 min)
- **Demonstrar**: `mclaude` → TUI interativa
- Seleção de provider → modelo → launch
- OAuth para múltiplas contas Anthropic
- Instalações isoladas por projeto/cliente

### 4. Demo Ao Vivo (12 min)
- **Demo 1:** Setup em 60 segundos (instalar + adicionar provider + launch) - 2 min
- **Demo 2:** Seleção de modelo com sidebar (pricing, contexto, capacidades) - 3 min
- **Demo 3:** OAuth flow (múltiplas contas Claude) - 2 min
- **Demo 4:** Cloud vs Local (Ollama local vs DeepSeek cloud) - 3 min
- **Demo 5:** Status line templates (custo, performance, contexto) - 2 min

### 5. Arquitetura Técnica (4 min)
- Bun como runtime (zero build step)
- Ink (React para terminal)
- TypeScript strict mode + Zod
- Sistema de i18n tipado (3 idiomas)

### 6. Casos de Uso (3 min)
- Desenvolvedor individual economizando com DeepSeek
- Consultor com múltiplos clientes
- Desenvolvimento offline com Ollama
- Comparação de modelos cloud vs local

### 7. Encerramento (2 min)
- `bun install -g @leogomide/multi-claude`
- Open source, MIT
- Contribuições bem-vindas
- Q&A rápido

---

## Provedores Suportados

### Cloud (API)
| Provedor | Destaque |
|----------|----------|
| Anthropic (OAuth) | Múltiplas contas Claude Pro/Team/Enterprise |
| DeepSeek | Custo-benefício, reasoning |
| OpenRouter | ~300+ modelos, preços competitivos |
| Requesty | Roteamento inteligente |
| Alibaba Cloud | Qwen3, GLM-5 |
| Poe | Acesso via plataforma Poe |
| MiniMax, Moonshot, Novita, Z.AI | Alternativas asiáticas |

### Local (Sem API Key)
| Provedor | Uso |
|----------|-----|
| Ollama | `ollama pull` + rodar local |
| LM Studio | GUI para modelos GGUF |
| llama.cpp | Servidor HTTP direto |

---

## Pontos Fortes para Destacar

### Arquitetura
1. **Zero build step** - Bun roda TypeScript diretamente
2. **React no terminal** - Ink permite componentes declarativos
3. **TypeScript strict** - `noUncheckedIndexedAccess`, discriminated unions
4. **Schema-first** - Tipos inferidos de Zod schemas
5. **Process isolation** - CLI/TUI em processos separados

### UX/DX
1. **TUI completa** - Não precisa memorizar comandos
2. **Sidebar contextual** - Informações em tempo real (pricing, contexto)
3. **Busca instantânea** - Para listas grandes de modelos
4. **Validação em tempo real** - API keys validadas antes de salvar
5. **OAuth guiado** - Login no browser, sem copiar tokens
6. **Multi-idioma** - EN, PT-BR, ES nativos

### Casos de Uso
1. **Economia** - DeepSeek ~10x mais barato que Claude
2. **Multi-contas** - Isolamento completo entre clientes
3. **Offline** - Ollama/LM Studio sem internet
4. **Comparação** - Testar modelos lado a lado
5. **Automação** - Headless mode para CI/CD

---

## Arquivos-Chave para Referência

| Arquivo | Propósito |
|---------|-----------|
| `cli.ts` | Entry point, delega para TUI |
| `src/providers.ts` | Templates de provedores |
| `src/schema.ts` | Schemas Zod + tipos |
| `src/runner.ts` | Spawn Claude com env vars |
| `src/components/app/UnifiedApp.tsx` | Router principal |
| `src/components/app/StartClaudeFlow.tsx` | Fluxo principal |
| `src/components/common/GroupedSelect.tsx` | Select com grupos |
| `src/components/common/SearchableSelect.tsx` | Select com busca |
| `src/services/openrouter.ts` | Integração OpenRouter |
| `src/services/ollama.ts` | Integração Ollama |
| `src/i18n/locales/pt-BR.ts` | Tradução PT-BR |

---

## FAQ Esperado

1. **Funciona com Node.js?** Não, requer Bun (mas fácil de instalar)
2. **Preciso de API key da Anthropic?** Não, pode usar DeepSeek, OpenRouter, Ollama
3. **Como funciona OAuth?** Abre browser, armazena token seguro, isola por instalação
4. **Posso usar em CI/CD?** Sim, `mclaude --provider x --model y -p "prompt"`
5. **É seguro armazenar API keys?** Fica em `~/.multi-claude/config.json` com permissão de usuário
6. **Funciona no Windows?** Sim, totalmente suportado (FFI para kernel32.dll)
7. **Qual a diferença para aider?** aider é agente de coding, mclaude é gerenciador de providers

---

## Comandos para Demo

```bash
# Instalar
bun install -g @leogomide/multi-claude

# Usar
mclaude

# Headless
mclaude --provider deepseek --model deepseek-chat -p "list TODOs"

# Atualizar
bun install -g @leogomide/multi-claude@latest
```

---

## Verificação

Para validar a apresentação:
1. Rodar `mclaude` e navegar pela TUI
2. Adicionar um provider OpenRouter com API key válida
3. Launch com modelo selecionado
4. Verificar status line com métricas
5. Testar troca de idioma em Settings

---

*Relatório gerado automaticamente pelo time de análise multi-agente.*
*Modelo: GLM-5*
*Data: 2026-03-10*