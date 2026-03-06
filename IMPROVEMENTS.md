# Plano de Melhorias - multi-claude

> **Data de análise:** 2026-03-05
> **Análise feita por:** 3 agentes Explore em paralelelo (Agent Teams experimental)
> **Escopo:** 30+ arquivos analisados (~4000 linhas de código)

---

## 📊 Resumo Executivo

| Categoria | Quantidade |
|-----------|------------|
| Problemas críticos | 4 |
| Problemas médios | 10 |
| Problemas menores | 4 |
| Oportunidades de melhoria | 15+ |
| Boas práticas identificadas | 30+ |

---

## 🎯 FASE 1 - Correções Críticas (Imediato)

### 1.1 Remover `process.exit()` do SettingsPage

**Arquivo:** `src/components/app/SettingsPage.tsx:32`

**Problema:**
```typescript
process.exit(1); // Quebra o ciclo de vida do React
```

**Solução:**
```typescript
onCancel?.(); // Usar callback para notificar componente pai
```

**Impacto:** Previne memory leaks e comportamento indefinido

---

### 1.2 Adicionar logging nos catch blocks das APIs

**Arquivos:**
- `src/services/openrouter.ts`
- `src/services/requesty.ts`
- `src/services/ollama.ts`
- `src/services/lmstudio.ts`
- `src/services/llamacpp.ts`

**Problema:**
```typescript
} catch {
    return { ok: false, error: "network" };
}
```

**Solução:**
```typescript
} catch (err) {
    log.debug("fetch failed", err);
    return { ok: false, error: "network" };
}
```

**Impacto:** Permite debug de problemas de rede

---

### 1.3 Adicionar timeout em fetch de APIs

**Arquivos:** Todos os serviços de API

**Problema:** Chamadas `fetch()` podem travar indefinidamente

**Solução:** Criar `src/services/fetch-timeout.ts`:
```typescript
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 30000
) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw err;
    }
}
```

**Impacto:** Previne congelamento da UI

---

## 🔧 FASE 2 - Refatoração de Código Duplicado (Curto Prazo)

### 2.1 Criar arquivo de validators compartilhado

**Novo arquivo:** `src/utils/validators.ts`

**Problema:** Validações duplicadas em 20+ locais

**Solução:**
```typescript
export const validators = {
    name: (value: string): string | undefined => {
        if (!value.trim()) return "validation.nameRequired";
        return undefined;
    },

    apiKey: (value: string): string | undefined => {
        if (!value.trim()) return "validation.apiKeyRequired";
        return undefined;
    },

    url: (value: string): string | undefined => {
        if (!value.trim()) return "validation.urlInvalid";
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return "validation.urlMustBeHttp";
        }
        try {
            new URL(value);
        } catch {
            return "validation.urlInvalid";
        }
        return undefined;
    },
};
```

**Benefícios:** Manutenção centralizada, consistência garantida

---

### 2.2 Criar helper para `updateConfig`

**Arquivo:** `src/config.ts`

**Problema:** Padrão repetido 20+ vezes:
```typescript
loadConfig().then((config) => {
    config.providers.push(newProvider);
    saveConfig(config);
});
```

**Solução:**
```typescript
export async function updateConfig(
    fn: (config: Config) => void | Promise<void>
): Promise<void> {
    const config = await loadConfig();
    await fn(config);
    await saveConfig(config);
}
```

**Uso:**
```typescript
await updateConfig((config) => {
    config.providers.push(newProvider);
});
```

---

### 2.3 Criar helpers para `footerItems`

**Novo arquivo:** `src/utils/footer-items.ts`

**Problema:** Arrays de footer criados manualmente em cada componente

**Solução:**
```typescript
import type { FooterItem } from "../components/layout/Footer.tsx";

export function createNavigationFooter(t): FooterItem[] {
    return [
        { key: "↑↓", label: t("footer.navigate") },
        { key: "⏎", label: t("footer.select") },
    ];
}

export function createWithEscapeFooter(t): FooterItem[] {
    return [
        ...createNavigationFooter(t),
        { key: "esc", label: t("footer.back") },
    ];
}

export function createToggleFooter(t): FooterItem[] {
    return [
        { key: "↑↓", label: t("footer.navigate") },
        { key: "space", label: t("footer.toggle") },
        { key: "⏎", label: t("footer.launch") },
        { key: "esc", label: t("footer.back") },
    ];
}
```

---

## 🔒 FASE 3 - Melhorias de Segurança e Robustez (Médio Prazo)

### 3.1 Validar `selectedEnvVars` antes de aplicar

**Arquivo:** `src/runner.ts:87-91`

**Problema:** Variáveis de ambiente aplicadas sem validação

**Solução:**
```typescript
const DANGEROUS_ENV_KEYS = new Set([
    "PATH", "NODE_OPTIONS", "ELECTRON_RUN_AS_NODE",
    "APPDATA", "HOME", "USERPROFILE", "PWD",
]);

if (selectedEnvVars) {
    for (const [key, value] of Object.entries(selectedEnvVars)) {
        if (DANGEROUS_ENV_KEYS.has(key)) {
            console.warn(`Skipping dangerous env var: ${key}`);
            continue;
        }
        env[key] = value;
    }
}
```

---

### 3.2 Adicionar retry com backoff em APIs

**Arquivo:** `src/services/api-models.ts`

**Solução:**
```typescript
async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000
): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries - 1) throw err;
            const delay = baseDelayMs * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error("Max retries exceeded");
}
```

---

### 3.3 Validar baseUrl em providers

**Arquivo:** `src/providers.ts`

**Solução:**
```typescript
function isValidBaseUrl(url: string): boolean {
    if (!url) return true;
    try {
        const parsed = new URL(url);
        return ["http:", "https:"].includes(parsed.protocol);
    } catch {
        return false;
    }
}
```

---

## 🏗️ FASE 4 - Refatoração de Componentes (Médio Prazo)

### 4.1 Dividir `StartClaudeFlow` em subcomponentes

**Arquivo:** `src/components/app/StartClaudeFlow.tsx`

**Problema:** 748 linhas em um único componente

**Solução:** Extrair para:
- `src/components/start-flow/ModelSelector.tsx`
- `src/components/start-flow/InstallationSelector.tsx`
- `src/components/start-flow/LaunchOptionsSelector.tsx`

---

### 4.2 Criar `ConfigProvider`

**Novo arquivo:** `src/contexts/ConfigContext.tsx`

**Problema:** Cada componente chama `loadConfig()` individualmente

**Solução:**
```typescript
export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(null);

    const refresh = async () => {
        const cfg = await loadConfig();
        setConfig(cfg);
    };

    const updateConfig = async (fn) => {
        const cfg = await loadConfig();
        fn(cfg);
        await saveConfig(cfg);
        await refresh();
    };

    useEffect(() => { refresh(); }, []);

    return (
        <ConfigContext.Provider value={{ config, updateConfig, refresh }}>
            {children}
        </ConfigContext.Provider>
    );
};
```

---

## 🌐 FASE 5 - Melhorias de Internacionalização (Baixa Prioridade)

### 5.1 Corrigir mensagens OAuth hardcoded

**Arquivo:** `cli.ts:228-241`

**Problema:** Mensagens em português fixo

**Solução:** Adicionar em `i18n/locales/*.ts`:
```typescript
cli: {
    oauthSuccess: 'Conta "{{name}}" autenticada com sucesso!',
    oauthFailed: 'Autenticação falhou.',
    oauthReauthFailed: 'Re-autenticação falhou.',
}
```

---

### 5.2 Atualizar versão no README

**Arquivo:** `README.md:11`

**Problema:** Badge mostra `v1.0.10` mas `package.json` tem `v1.0.11`

---

### 5.3 Corrigir título em espanhol

**Arquivo:** `src/i18n/locales/es.ts:139`

**Problema:** Título mistura inglês/português

**Correção:**
```typescript
title: "Seleccionar idioma",
```

---

## 📋 Checklist de Implementação

- [ ] 1.1 Remover `process.exit()` do SettingsPage
- [ ] 1.2 Adicionar logging em catch blocks das APIs
- [ ] 1.3 Implementar timeout em fetch de APIs
- [ ] 2.1 Criar `src/utils/validators.ts`
- [ ] 2.2 Criar helper `updateConfig()`
- [ ] 2.3 Criar `src/utils/footer-items.ts`
- [ ] 3.1 Validar `selectedEnvVars`
- [ ] 3.2 Implementar retry com backoff
- [ ] 3.3 Validar baseUrl em providers
- [ ] 4.1 Dividir StartClaudeFlow em subcomponentes
- [ ] 4.2 Criar ConfigProvider
- [ ] 5.1 Internacionalizar mensagens OAuth
- [ ] 5.2 Atualizar versão no README
- [ ] 5.3 Corrigir título em espanhol

---

## 🧪 Verificação

```bash
# Type check
bunx tsc --noEmit

# Smoke tests
bun test

# Testes manuais
# 1. Fluxo completo: mclaude → provider → modelo → launch
# 2. Validações: inputs vazios, URLs inválidas
# 3. API errors: desconectar rede
# 4. i18n: testar en, pt-BR, es
```

---

## ✅ Boas Práticas Identificadas (Manter)

- ✅ TypeScript strict mode com `noUncheckedIndexedAccess`
- ✅ Validação com Zod schemas
- ✅ Sistema de logging estruturado (`debug.ts`)
- ✅ AbortController para cancelamento
- ✅ Separação de concerns (services/, hooks/, components/)
- ✅ React Context para i18n e navegação
- ✅ Cleanup functions em useEffect
- ✅ Defensive programming (optional chaining)

---

**Total estimado:**
- Novos arquivos: 8
- Arquivos modificados: ~38
- Linhas adicionadas: ~500
- Linhas removidas: ~200 (com refatoração)
