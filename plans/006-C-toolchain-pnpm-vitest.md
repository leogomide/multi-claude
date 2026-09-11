# 006-C - Toolchain: pnpm, @types/node, Vitest e higiene do package.json

## Prompt base

No projeto multi-claude, depois do 006-B, troque o toolchain de desenvolvimento do Bun para o pnpm:
- lockfile `pnpm-lock.yaml`;
- `@types/node` no lugar de `@types/bun`;
- tsconfig com `include` explícito;
- testes portados de `bun:test` para Vitest;
- correção dos três problemas do `package.json` (script `publish`, `typescript` em `peerDependencies`, `@types/bun: latest`).

**Não** crie o build nem mude `bin`/`files`; isso é o 006-D. O app ainda roda do fonte neste passo.

## Descricao

Depois deste passo, quem contribui só precisa do Node e do pnpm para instalar, checar tipos e rodar os testes. Os testes passam a rodar no Node (Vitest), o que também valida que o fonte ficou neutro de runtime no 006-B.

Três cuidados do Vitest que o `bun:test` não tinha:

1. **`CI=true` desliga os frames do Ink.** O `is-in-ci` faz o Ink pular a escrita de frames (`ink/build/ink.js:262-269`), e o `lastFrame()` volta vazio. O GitHub Actions define `CI=true`, então a config força `CI: "false"`.
2. **Mock parcial.** O Vitest lança erro quando o código lê um export que a factory do mock não define. O Bun devolvia `undefined`. Por isso cada `vi.mock` espalha o módulo original (`importOriginal`).
3. **Logger real.** Sem `MCLAUDE_LOG_LEVEL` desligado, o logger (`debug.ts:11`) escreve em `~/.multi-claude/logs` durante os testes, e o `cleanOldLogs` (`debug.ts:41-57`) apaga logs reais além do vigésimo.

## Checklist de Implementacao

### 1. `package.json`

- [x] Remover `@types/bun`. Adicionar em `devDependencies`: `@types/node@^22`, `vitest` e `typescript@^5.9` (vindo de `peerDependencies`).
- [x] Remover o bloco `peerDependencies`. Hoje ele faz o npm 7+ instalar o TypeScript na máquina de todo usuário.
- [x] Adicionar:
  ```json
  "packageManager": "pnpm@10.34.3",
  "engines": { "node": ">=22" },
  "pnpm": { "onlyBuiltDependencies": ["esbuild"] },
  ```
  - O esbuild entra como dependência transitiva do Vitest já neste passo, e o pnpm 10 bloqueia o `postinstall` dele sem essa lista.
- [x] `scripts`:
  ```json
  "check-types": "tsc --noEmit",
  "lint": "biome check --fix .",
  "lint:ci": "biome ci .",
  "test": "vitest run",
  ```
  - **Remover** `"publish": "npm publish"`, que colide com o hook de lifecycle `publish`.
  - **Remover** `"prepare": "bun link"` e `"link": "bun link"`. O 006-D recria os dois.
  - `"dev": "bun run cli.ts"` fica até o 006-D.

### 2. Lockfile

- [x] Apagar `bun.lock`. Rodar `pnpm install`, que gera o `pnpm-lock.yaml`, e commitar.
  - As versões diretas já estão fixadas no `package.json`, então só as transitivas podem se mover.

### 3. `tsconfig.json`

- [x] Adicionar em `compilerOptions`: `"types": ["node"]`.
- [x] Adicionar no nível raiz: `"include": ["cli.ts", "src", "scripts", "vitest.config.ts"]`.
  - Isso tira `video/` (hoje checado) e o futuro `dist/` do typecheck.
- [x] `module: Preserve`, `moduleResolution: bundler`, `allowImportingTsExtensions`, `verbatimModuleSyntax` e `noEmit` ficam como estão.
- [x] Se o tsc reclamar do `crypto` global (`cli.ts:55`, `config.ts:125`, `AddProviderFlow.tsx:81,309`), importar `randomUUID` de `node:crypto` nesses pontos.

### 4. `vitest.config.ts` (novo)

- [x] Criar:
  ```ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
  	esbuild: { jsx: "automatic" },
  	test: {
  		include: ["src/**/*.test.{ts,tsx}"],
  		environment: "node",
  		testTimeout: 10_000,
  		env: {
  			// Ink skips frame writes under CI (is-in-ci), leaving lastFrame() empty.
  			CI: "false",
  			// The real logger would write to ~/.multi-claude/logs and prune old files.
  			MCLAUDE_LOG_LEVEL: "off",
  		},
  	},
  });
  ```
  - Conferir em `debug.ts:11` qual valor desliga o logger e usar esse.
  - Se a versão instalada do Vitest usar oxc em vez de esbuild para JSX, trocar a chave `esbuild` pela equivalente.

### 5. `src/context-window.test.ts`

- [x] Linha 1: `import { afterEach, describe, expect, test } from "vitest";`. Nada mais muda: o stub de `globalThis.fetch` e o `Response` global funcionam no Node.

### 6. `src/smoke.test.tsx`

- [x] Linha 1: `import { afterEach, describe, expect, test, vi } from "vitest";`.
- [x] `fakeProviders` (linha 5-20) dentro de `vi.hoisted`:
  ```ts
  const { fakeProviders } = vi.hoisted(() => ({
  	fakeProviders: [ /* mesmo conteúdo */ ],
  }));
  ```
- [x] Os quatro `mock.module` (linha 23-62) viram `vi.mock` com mock parcial. Exemplo:
  ```ts
  vi.mock("./config.ts", async (importOriginal) => ({
  	...(await importOriginal<typeof import("./config.ts")>()),
  	loadConfig: async () => ({ providers: fakeProviders, language: "en", installations: [] }),
  	saveConfig: async () => {},
  	CONFIG_DIR: "/tmp/test-mclaude",
  	isAccountAuthenticated: () => false,
  }));
  ```
  - Aplicar o mesmo padrão em `./services/version-check.ts`, `./changelog.ts` e `./services/api-models.ts`.
- [x] Trocar todos os `mock(() => {})` por `vi.fn()`. Os timeouts no terceiro argumento de `test(...)` mantêm a mesma assinatura.

### 7. `biome.json`

- [x] Em `files.includes`, trocar `"!bun.lock"` por `"!**/bun.lock"` (o `video/` tem o dele) e adicionar `"!pnpm-lock.yaml"`.

### 8. `.gitignore`

- [x] Linha 1: trocar o comentário `# dependencies (bun install)` por `# dependencies`.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `package.json` | MODIFICAR — deps, engines, packageManager, pnpm, scripts |
| `bun.lock` | REMOVER |
| `pnpm-lock.yaml` | CRIAR (via `pnpm install`) |
| `tsconfig.json` | MODIFICAR — `types`, `include` |
| `vitest.config.ts` | CRIAR |
| `src/smoke.test.tsx`, `src/context-window.test.ts` | MODIFICAR — Vitest |
| `biome.json`, `.gitignore` | MODIFICAR |

## Contrato de teste

- `pnpm install` sem aviso de "Ignored build scripts".
- `pnpm check-types` limpo, sem nenhum arquivo de `video/` na saída de `pnpm exec tsc --listFilesOnly`.
- `pnpm test`: os 7 smoke tests e todos os de `context-window` passam.
- `CI=true pnpm test` (PowerShell: `$env:CI="true"; pnpm test`) passa igual, provando o override.
- Nenhum arquivo novo em `~/.multi-claude/logs` depois do `pnpm test`.
- `pnpm lint:ci` sem erros novos.
- `bun cli.ts` continua abrindo a TUI, porque o fonte ainda é executável pelo Bun.

## Resumo de Implementacao

Executado em 2026-09-11, na branch `feat/node-runtime-migration`.

**Versões instaladas:** vitest 5.0.0 (Vite 8.3 / rolldown), @types/node 22.20.2, typescript 5.9.3. O `pnpm add -D` gravou os ranges `^22.20.2`, `^5.9.3` e `^5.0.0`.

**Desvios do plano:**
- **`oxc` em vez de `esbuild` no `vitest.config.ts`.** O Vitest 5 usa o Vite 8, que transforma com oxc. A chave `esbuild: { jsx }` nem passa no tsc (`ESBuildOptions` não tem `jsx`), e o Vite avisa que ignora `esbuild` quando `oxc` está definido. Ficou `oxc: { jsx: { runtime: "automatic" } }`, como o próprio checklist previa.
- **O esbuild não entra mais como transitiva** (`pnpm why esbuild` volta vazio). Mesmo assim, `pnpm.onlyBuiltDependencies: ["esbuild"]` ficou, porque o 006-D adiciona o esbuild direto.
- **O `randomUUID` de `node:crypto` não foi necessário.** Com `types: ["node"]`, o `crypto` global tipou sem erro.
- **Diretório `scripts/`** ainda não existe e ficou no `include` (o 006-D cria). O tsc não reclama.
- **Formatação:** a troca `mock(() => {})` → `vi.fn()` deixou as props do `<UnifiedApp>` curtas o bastante para uma linha. O `biome format` juntou essas linhas no `smoke.test.tsx`.

**Validação (contrato de teste):**
- `pnpm install`: sem aviso de "Ignored build scripts". Só apareceram os avisos da troca de gerenciador, que movem os pacotes do Bun para `node_modules/.ignored`, e o de substituição de `.EXE` em `node_modules/.bin`.
- `pnpm check-types`: limpo. `pnpm exec tsc --listFilesOnly` sem nenhum arquivo de `video/` ou `dist/`.
- `pnpm test`: 2 arquivos, 67 testes passando (7 smoke + 60 de `context-window`).
- `$env:CI="true"; pnpm test`: 67/67, mesmo resultado.
- `~/.multi-claude/logs`: 20 arquivos antes e depois, e o mais recente é anterior aos testes. Nenhum log foi criado.
- `pnpm lint:ci`: os arquivos deste passo passam sem erro. O repositório continua com 17 erros de lint/format pré-existentes em arquivos não tocados, além do aviso de schema `2.4.2` ≠ CLI `2.4.9` no `biome.json`, que já existia. Por isso o `lint:ci` ainda sai com código 1.
- `bun cli.ts --version`: imprime `1.0.40`. O fonte continua executável pelo Bun.

**Pendente (manual):** abrir a TUI com `bun cli.ts` e navegar pelos menus.
