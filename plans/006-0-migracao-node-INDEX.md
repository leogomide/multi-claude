# 006 - Migração do runtime Bun → Node.js

## Prompt base

"vamos migrar o runtime do sistema, visando uma melhor adoção pela comunidade"

"ja estamos na branch correta e ja foi gerado o relatorio em `reports/migracao-bun-para-node.html`, quero que analise a fundo, entenda o estado atual do projeto e vamos criar todos os planos de ação necessários para realizar essa migração de runtime"

Aprovação do dev (gate zero, 2026-09-11), quatro decisões:

| Pergunta | Resposta escolhida |
|----------|--------------------|
| Toolchain de desenvolvimento | **pnpm** (`pnpm-lock.yaml`, campo `packageManager`) |
| Node mínimo (`engines` + CI) | **>= 22**. O Node 20 chegou ao fim de vida em abril/2026. O CI testa o 22 e o 24. |
| Usuários que têm só o Bun | **Versão ponte v1.0.40 + docs** |
| Canal de instalação | **Só npm registry** |

## Descricao

O multi-claude (v1.0.39) publica `.ts/.tsx` crus no npm (`files: ["cli.ts","src/"]`, `bin: ./cli.ts`, shebang `#!/usr/bin/env bun`) e depende do Bun para executá-los. Isso limita a adoção: quem chega do ecossistema Node precisa instalar outro runtime só para usar a CLI.

O relatório `reports/migracao-bun-para-node.html` conclui que a migração é viável e de esforço baixo a médio. Esta análise o validou contra o código com uma revisão técnica independente. O resultado: **3 correções** às recomendações dele e **9 riscos** que ele não cobre.

**Resultado esperado:**
- `npm i -g @leogomide/multi-claude` funcionando com Node ≥ 22;
- um único artefato JS compilado (`dist/`), que também roda no Bun (best-effort);
- desenvolvimento com pnpm;
- nenhuma migração de dados para quem já usa.

### Correções ao relatório

1. **`shell: true` para o `.cmd` do claude quebraria o launch.** O `runner.ts:110,241` passa `--settings <JSON>`, com aspas e espaços, e o `cmd.exe` reprocessa esse JSON. O `cross-spawn` sozinho também não basta: ele só aplica o escape duplo para `node_modules/.bin/*.cmd` (`isCmdShimRegExp`), e o shim global `%APPDATA%\npm\claude.cmd` reparseia `%*`. Um provider chamado `R&D` executaria um segundo comando. Solução no 006-E.
2. **O login OAuth tem o mesmo problema** (`cli.ts:242`, `spawnSync(claudePath, [])`). No Node, o spawn de um `.cmd` sem shell dá EINVAL e o `status` volta `null`. O código entende que o login falhou e **apaga o provider recém-criado** (`cli.ts:254-258`). O `runner.ts:148,271` compara a string `"Failed to spawn"`, que é a mensagem do Bun. No Node, o EINVAL cai no `reject(err)` e derruba o processo.
3. **Versão v2.0.0, e não v1.1.0.** A troca de runtime exigido quebra quem tem só o Bun, e a ponte (006-A) usa `major >= 2` como gatilho.

### Achados que o relatório não cobre

- **Layout do esbuild.** Com `entryPoints: ["cli.ts","src/tui-process.ts"]`, o esbuild calcula o `outbase` como a raiz e gera `dist/src/tui-process.js`. Isso quebra o spawn da TUI, o `changelog.ts:20` (`join(__dirname,"..","CHANGELOG.md")`) e o `statusline.ts:40`. Solução: entradas como objeto (saída plana) e `splitting: false`.
- **Ink no CI.** O Ink pula a escrita de frames quando `is-in-ci` detecta `CI` (`ink/build/ink.js:262-269`). O GitHub Actions define `CI=true`, então o `lastFrame()` volta vazio e os smoke tests falham.
- **Escopo do tsc.** O tsconfig não tem `include` e usa `allowJs: true` (`tsconfig.json:9`). Hoje ele já checa `video/remotion.config.ts`, e depois do build passaria a checar `dist/*.js`.
- **Truncamento de stdout.** `process.exit` logo após escrever muito no stdout: `--logs last` (`logs-viewer.ts:63-64` → `cli.ts:178`) e `--list` (`headless.ts:434` → `cli.ts:185`). Em pipe no POSIX, o Node escreve de forma assíncrona e a saída é cortada.
- **Prompt da senha mestra.** `resume()` sem `pause()` depois de remover o listener (`tui-process.ts:72,106`). No Node o stdin fica em flowing mode sem consumidor, e as teclas digitadas antes do Ink montar se perdem.
- **Proxy.** O `fetch` do Bun respeita `HTTP(S)_PROXY`/`NO_PROXY`. O do Node só respeita com `NODE_USE_ENV_PROXY=1`, disponível a partir do Node 22.21 e 24.0.
- **package.json:**
  - o script `"publish": "npm publish"` colide com o hook de lifecycle `publish`, e o `npm publish` chama a si mesmo de novo;
  - `peerDependencies.typescript` faz o npm 7+ instalar o TypeScript em todo usuário;
  - `@types/bun: latest`.
- **Chaves i18n `update.failed` sem uso** (`en.ts:326`, `es.ts:334`, `pt-BR.ts:330`): o `cli.ts:287` imprime em inglês fixo.
- **pnpm: nenhuma dependência fantasma.** Todo import bare de `src/` (ink, react, rosetta, zod, dotenv, ink-*, @inkjs/ui) está declarado no `package.json`. O esbuild precisa entrar em `pnpm.onlyBuiltDependencies`.

### Já validado (sem ação)

- `import rosetta from "rosetta"` e `import { parse } from "dotenv"` (CJS) resolvem para função no Node.
- O `crypto` global existe no Node 20+ (`cli.ts:55`, `config.ts:125`, `AddProviderFlow.tsx:81,309`).
- O top-level await só aparece nas entradas (`cli.ts:127`, `tui-process.ts:49`).
- O `cli.ts` nunca alcança o Ink, nem por imports estáticos nem pelos dinâmicos de headless, runner, providers, api-models e credential-store.
- O `execSync` de `UnifiedApp.tsx:212-218` (explorer) e o de `Header.tsx:10` (`claude -v`) passam por shell, então funcionam com `.cmd`.
- O ciclo `config.ts` → `credential-store.ts` → `debug.ts` → `config.ts` é inofensivo, porque `LOGS_DIR` só é lido dentro de `ensureInit()` (`debug.ts:72`).
- Config, credenciais encriptadas (`node:crypto`, AES-256-GCM/PBKDF2), `.key`/`.salt` e instalações do Claude são compatíveis byte a byte.

## Decisoes de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Bundler | **esbuild direto** (`scripts/build.mjs`) | Uma dependência pequena e estável, sem camada de config. O tsup está em modo de manutenção. |
| Code splitting | **`splitting: false`** (dois bundles autocontidos) | Os bundles rodam em processos separados, então módulo duplicado não muda comportamento. Sem chunks, o `__dirname` de todo módulo é `dist/`. |
| Layout de saída | `entryPoints` como objeto → `dist/cli.js` e `dist/tui-process.js` | Mantém válidos os caminhos relativos já existentes (`statusline-script.mjs`, `../CHANGELOG.md`) |
| Shebang | No fonte (`cli.ts:1`), **sem `banner`** | O esbuild preserva o hashbang da entrada. O `banner` iria para os dois arquivos e, somado ao do fonte, geraria dois `#!` (SyntaxError). |
| Dependências | `packages: "external"` | O npm instala as dependências; o bundle leva só o código do projeto |
| Typecheck | `tsc --noEmit` com `module: Preserve` e `moduleResolution: bundler` mantidos | O tsc só checa tipos; quem emite é o esbuild |
| Testes | **Vitest** | O `vi.mock` mapeia quase 1:1 com o `mock.module`. O `node:test` só tem `mock.module` experimental. |
| Spawn do claude | Resolvedor próprio (PATH + PATHEXT + leitura do shim `.cmd`), com `cross-spawn` só como fallback | RN-03: argumentos byte a byte |
| Settings da status line | Arquivo por sessão (`--settings <path>`) | O argumento mais frágil deixa de carregar aspas e metacaracteres |
| Auto-update | Detecção do gerenciador pelo realpath do bundle | O `npm_config_user_agent` não existe quando o bin global roda direto |
| Proxy | `NODE_USE_ENV_PROXY=1` injetado no spawn da TUI quando há `HTTP(S)_PROXY` | Paridade com o Bun sem nova dependência (`undici`) |
| Versão | **v2.0.0** | Mudança de runtime exigido. Gatilho da ponte. |
| Tag git `latest` | Congelada na v1.0.40 | Quem instalou via `github:...#latest` continua recebendo uma versão que roda do fonte no Bun |

## Estrutura do Plano

| Arquivo | Descrição | Onde | Dependência |
|---------|-----------|------|-------------|
| 006-A | Versão ponte v1.0.40 | `master`, Bun | - |
| 006-B | Desacoplar do Bun e paridade de runtime (continua rodando no Bun) | branch | 006-A publicada |
| 006-C | Toolchain: pnpm, @types/node, Vitest, tsconfig, higiene do package.json | branch | 006-B |
| 006-D | Build e empacotamento (esbuild → `dist/`) | branch | 006-C |
| 006-E | Lançamento do claude no Windows (`claude-bin.ts`) | branch | 006-D |
| 006-F | Auto-update por gerenciador de pacotes | branch | 006-D |
| 006-G | Docs, CI (GitHub Actions) e release v2.0.0 | branch | 006-E, 006-F |
| 006-H | Test cases manuais (matriz SO × gerenciador) | - | 006-A..G |

## Regras de Negocio

- **RN-01**: config, credenciais, `.key`/`.salt` e instalações não mudam e não precisam de migração.
- **RN-02**: o mesmo artefato roda no Node ≥ 22 (suporte oficial) e no Bun (best-effort).
- **RN-03**: o claude **nunca** é lançado com `shell: true`. Os argumentos chegam ao Claude Code byte a byte.
- **RN-04**: o auto-update usa o gerenciador que instalou o pacote. `process.execPath install` nunca é usado.
- **RN-05**: npx, bunx, pnpm dlx e link de dev nunca se autoatualizam.
- **RN-06**: o comando da status line usa o runtime corrente.
- **RN-07**: o tarball publicado contém só `dist/`, `CHANGELOG.md`, `README.md`, `LICENSE` e `package.json`.
- **RN-08**: o contrato de IPC continua igual: exit codes 0/2/3/4 e `~/.multi-claude/last-selection.json`.
- **RN-09**: a ponte nunca deixa o usuário sem um mclaude funcionando. Se o Node estiver ausente ou abaixo de 22, ela bloqueia o update para ≥ 2.0.0.
- **RN-10**: falha ao **lançar** o claude no login OAuth não é tratada como login recusado. A mensagem diz que o claude não foi encontrado.
- **RN-11**: `TODO.md`, `apresentação.excalidraw` e `video/` ficam fora de escopo. O `TODO.md` é protegido pelo CLAUDE.md.

## Cadeia de Artefatos

```
fonte (cli.ts, src/**/*.ts(x))
        |
        |  pnpm build  ->  scripts/build.mjs (esbuild, splitting:false, packages:external)
        v
dist/cli.js            #!/usr/bin/env node   (sem Ink/React; headless, runner, config)
dist/tui-process.js    (Ink/React; spawnado por cli.js via process.execPath)
dist/statusline-script.mjs  (copiado; ensureStatusLineScript -> ~/.multi-claude/statusline.mjs)
../CHANGELOG.md        (lido por changelog.ts via join(__dirname,"..") = raiz do pacote)
        |
        |  npm pack / pnpm publish  (files: dist/, CHANGELOG.md)
        v
npm i -g | pnpm add -g | bun add -g | npx | bunx
        |
        v
mclaude -> node dist/cli.js -> spawn node dist/tui-process.js -> exit code/IPC -> spawn claude (claude-bin.ts)
```

## Riscos

- **R-01**: usuário só com Bun, em Unix, que pular a ponte vê `env: 'node': No such file or directory`. Mitigação: README/CHANGELOG com `bunx @leogomide/multi-claude` (o `bunx` cria o alias `node` → bun quando o Node não existe) ou instalação do Node.
- **R-02**: variações de formato do shim `.cmd` (npm, pnpm, yarn). Mitigação: fixtures dos formatos conhecidos e `cross-spawn` como fallback.
- **R-03**: resize da TUI no Windows sem a FFI. No Node, `getWindowSize()` chama `GetConsoleScreenBufferInfo` via libuv a cada leitura, e o poll de 2s continua. No Bun/Windows a precisão diminui, o que é aceito. Teste manual.
- **R-04**: o Node inicia mais devagar que o Bun, e são 2 processos. Medir `mclaude --version` e a abertura da TUI antes e depois (006-H).
- **R-05**: no Node 22 abaixo de 22.21 o `NODE_USE_ENV_PROXY` não tem efeito, então quem usa proxy continua sem rede. Documentar.
- **R-06**: providers em `localhost` (Ollama, LM Studio) presos a 127.0.0.1 enquanto o `fetch` tenta `::1`. Teste manual.
- **R-07**: o shim `.exe` do Bun (`~/.bun/bin/mclaude.exe`) fica travado durante o `bun add -g` (EBUSY). Mensagem própria no 006-F.
- **R-08**: o prefix global do npm no sistema (`C:\Program Files\nodejs`, `/usr/lib`) exige admin ou sudo (EPERM/EACCES). Mensagem própria no 006-F.
- **R-09**: sem telemetria, não há como saber quantos usuários passaram pela ponte. Mitigação: manter a v1.0.40 publicada por um período antes da v2.0.0.

## Pre-requisitos na maquina do dev (2026-09-11)

- **Branch:** o `master` está 3 commits de docs atrás de `feat/node-runtime-migration` (relatório + TODO). A ponte vai no `master` e depois o `master` é mergeado na branch.
- **Instalação antiga:** mclaude 1.0.39 está instalado via Bun (`~/.bun/bin/mclaude.exe`). Antes de `pnpm link --global`, rodar `bun remove -g @leogomide/multi-claude`.
- **pnpm:** o bin global do pnpm (`%LOCALAPPDATA%\pnpm`) não está no PATH. Rodar `pnpm setup` uma vez.
- **npm:** o prefix global é `C:\Program Files\nodejs` e exige admin. Para testar o tarball, usar um terminal elevado ou `npm config set prefix` para um diretório do usuário.
- **Claude Code:** só existe o `claude.exe` (instalador nativo). Para testar o `.cmd`, instalar `@anthropic-ai/claude-code` via npm num prefix separado e colocá-lo primeiro no PATH.
- **Versões:** Node 22.17.0, npm 11.10.0, pnpm 10.34.3, Bun 1.3.11 e TypeScript 5.9.3.
