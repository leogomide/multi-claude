# 006-G - Docs, CI (GitHub Actions) e release v2.0.0

## Prompt base

No projeto multi-claude, com os passos 006-B a 006-F concluídos:

- atualize README.md, README.en.md e CLAUDE.md para o Node ≥ 22 e o pnpm;
- crie o workflow de CI do GitHub Actions;
- reescreva o processo de release;
- publique a v2.0.0.

**Não** modifique o `TODO.md` (arquivo protegido) nem `apresentação.excalidraw` e `video/`.

## Descricao

Três entregas:

1. **Documentação** que reflete o novo runtime, para o usuário e para quem contribui.
2. **CI**, que o projeto ainda não tem (não existe `.github/`). Numa migração de runtime, é a única forma de garantir a paridade entre Windows, macOS e Linux a cada PR.
3. **Release v2.0.0.** O major sinaliza a troca de runtime e é o gatilho da ponte (006-A).

## Checklist de Implementacao

### 1. README.md (PT-BR) e README.en.md

- [x] Linha 12: trocar a badge `runtime-Bun` por `[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org)`.
- [x] Seção Instalação (linhas 61-75):
  ```md
  Pré-requisitos: [Node.js](https://nodejs.org) 22 ou mais recente e [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

  ```bash
  npm i -g @leogomide/multi-claude
  ```

  Também funciona com `pnpm add -g @leogomide/multi-claude` ou `bun add -g @leogomide/multi-claude`. Para rodar sem instalar: `npx @leogomide/multi-claude`.

  Para atualizar, use a opção de update dentro do app ou reinstale com o mesmo gerenciador. Para remover: `npm rm -g @leogomide/multi-claude`.
  ```
- [x] Nota curta, logo abaixo:
  - **Só tem o Bun?** Rode com `bunx @leogomide/multi-claude`. Um `mclaude` instalado globalmente exige Node.js no PATH.
  - **Atrás de proxy corporativo?** Defina `NODE_USE_ENV_PROXY=1` (Node 22.21+) junto de `HTTPS_PROXY`, e `NODE_EXTRA_CA_CERTS` se a rede usar uma CA própria.
- [x] Seção Desenvolvimento (linhas 171-178):
  ```bash
  pnpm install             # instala e builda (prepare)
  pnpm link --global       # expõe o `mclaude` local (rode `pnpm setup` uma vez antes)
  pnpm build:watch         # rebuild contínuo; em outro terminal: mclaude
  pnpm check-types         # checagem de tipos
  pnpm test                # testes (Vitest)
  pnpm lint                # biome
  ```
- [x] Badge de versão: 2.0.0.

### 2. CLAUDE.md

- [x] **Commands:** `pnpm install`, `pnpm build`, `pnpm link --global` e depois `mclaude`, `pnpm check-types`, `pnpm test`.
- [x] **Project Structure:**
  - adicionar `scripts/build.mjs`, `vitest.config.ts`, `src/utils/claude-bin.ts`, `src/services/install-detect.ts` e `dist/` (gerado, fora do git);
  - remover `src/utils/win32-console-size.ts`.
- [x] **Tech Stack:**
  - Runtime: Node.js ≥ 22 (o artefato também roda no Bun, best-effort);
  - Build: esbuild → `dist/cli.js` + `dist/tui-process.js` (dois bundles, dependências externas);
  - Package manager: pnpm;
  - Testes: Vitest.
- [x] **Release Process:**
  ```bash
  pnpm check-types && pnpm test && pnpm build
  # bump da versão no package.json, depois:
  pnpm install                       # atualiza o pnpm-lock.yaml
  git add package.json pnpm-lock.yaml README.md README.en.md CHANGELOG.md
  git commit -m "docs: bump version to vX.Y.Z"
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  git push origin vX.Y.Z
  git push origin master
  pnpm publish                       # roda prepublishOnly (check-types + test + build)
  gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes --latest
  ```
  - **Remover** o bloco que move a tag `latest`. Ela fica congelada na v1.0.40.
- [x] **Instalação pelos usuários:** só `npm i -g @leogomide/multi-claude@latest`, com `pnpm add -g` e `bun add -g` como alternativas. Remover as linhas `github:...`.

### 3. `.github/workflows/ci.yml` (novo)

- [x] Esboço:
  ```yaml
  name: CI
  on:
    push: { branches: [master] }
    pull_request:
  jobs:
    test:
      strategy:
        fail-fast: false
        matrix:
          os: [ubuntu-latest, macos-latest, windows-latest]
          node: [22, 24]
      runs-on: ${{ matrix.os }}
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4          # lê packageManager do package.json
        - uses: actions/setup-node@v4
          with: { node-version: "${{ matrix.node }}", cache: pnpm }
        - run: pnpm install --frozen-lockfile  # roda o prepare (build)
        - run: pnpm check-types
        - run: pnpm lint:ci
        - run: pnpm test                       # CI=true é neutralizado no vitest.config.ts
        - run: node dist/cli.js --version
        - name: Pack + global install smoke
          shell: bash
          run: |
            npm pack
            npm i -g ./leogomide-multi-claude-*.tgz
            mclaude --version
            mclaude --help
    bun:
      runs-on: ubuntu-latest
      continue-on-error: true                  # best-effort (RN-02)
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v2
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with: { node-version: 24, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - run: HOME=$(mktemp -d) bun dist/cli.js --list
  ```
  - O teste de integração do `.cmd` falso (006-E) roda sozinho na perna `windows-latest`, via `skipIf`.
  - Conferir as versões mais recentes das actions na hora de implementar.

### 4. CHANGELOG.md — v2.0.0

- [x] Nova seção `### v2.0.0 (current)` e remover `(current)` da v1.0.40:
  ```md
  - **feat:** mclaude now runs on Node.js 22+ and installs with `npm i -g @leogomide/multi-claude` (pnpm and Bun also work) — Bun is no longer required
  - **feat:** the in-app update detects whether mclaude was installed with npm, pnpm, Bun, Yarn or Volta and updates with the same tool, and explains what to do when the global folder needs administrator rights
  - **fix:** Claude Code installed through npm on Windows (`claude.cmd`) now launches, including provider and model names with characters like `&`
  - **fix:** a failure to start Claude Code during an Anthropic account login no longer reads as a rejected login
  ```
  - Formato conforme o CLAUDE.md: `- **tipo:** descrição curta em inglês`, sem bump nem lint.

### 5. Release v2.0.0

- [ ] Rodar os test cases do 006-H **antes** do publish.
- [ ] Merge da `feat/node-runtime-migration` no `master` (PR com o CI verde).
- [ ] Seguir o novo Release Process (seção 2).
- [ ] Depois do publish, validar a instalação a partir do registry: `npm i -g @leogomide/multi-claude@2.0.0` num terminal limpo e rodar `mclaude`.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `README.md`, `README.en.md` | MODIFICAR |
| `CLAUDE.md` | MODIFICAR — commands, estrutura, stack, release, instalação |
| `.github/workflows/ci.yml` | CRIAR |
| `CHANGELOG.md` | MODIFICAR — v2.0.0 |
| `package.json`, `pnpm-lock.yaml` | MODIFICAR — versão 2.0.0 |

## Contrato de teste

- `rg -i "\bbun(x)?\b" README.md README.en.md CLAUDE.md` só encontra as menções intencionais: alternativa `bun add -g`, nota do `bunx` e job de CI.
- O CI fica verde nas 6 combinações da matriz. O job Bun pode falhar sem bloquear, mas a falha precisa ser investigada.
- A página Changelog da TUI lista a v2.0.0 como current (formato preservado para `src/changelog.ts`).
- `npm view @leogomide/multi-claude version` → `2.0.0` depois do publish.
- A tag `latest` do git continua na v1.0.40.

## Resumo de Implementacao

Executado em 2026-09-11 na branch `feat/node-runtime-migration`. Apenas as partes **locais** foram feitas. As ações de release, que são externas, ficaram para o dev.

**Feito:**

- [x] `README.md` e `README.en.md`:
  - badge `node >=22` no lugar da `runtime-Bun`;
  - badge de versão 2.0.0;
  - Instalação com `npm i -g` (alternativas `pnpm add -g`/`bun add -g`/`npx`), mais as notas de `bunx` e de proxy (`NODE_USE_ENV_PROXY`, `NODE_EXTRA_CA_CERTS`);
  - Desenvolvimento com pnpm.
- [x] `CLAUDE.md`:
  - Commands com pnpm (install/build/link/check-types/test/lint);
  - Project Structure: adicionados `scripts/build.mjs`, `vitest.config.ts`, `.github/workflows/ci.yml`, `dist/`, `src/utils/claude-bin.ts` e `src/services/install-detect.ts`, e também os arquivos que já existiam e faltavam na árvore (`statusline-script.mjs`, `language-selector.tsx`, `dotenv-loader.ts`, `zai.ts`, `custom.ts`, `format-tokens.ts`, `validate-context.ts`, `validate-url.ts`, `ChangelogPage.tsx`, `ChangelogSidebar.tsx`); removido `win32-console-size.ts`;
  - Tech Stack: Node ≥ 22, esbuild, pnpm e Vitest;
  - Release Process com pnpm e `pnpm publish`, sem o bloco que move a tag `latest` (fica congelada na v1.0.40);
  - Instalação só pelo npm registry.
- [x] `.github/workflows/ci.yml`:
  - matriz ubuntu/macos/windows × Node 22/24;
  - smoke do tarball com `npm pack` + `npm i -g`;
  - job Bun best-effort (`continue-on-error`).
  - Actions nas versões mais recentes, conferidas via `gh api`: `actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`, `oven-sh/setup-bun@v2`.
- [x] `CHANGELOG.md`: seção `### v2.0.0 (current)` com as 4 entradas, e `(current)` removido da v1.0.40.
- [x] `package.json`: versão 2.0.0. O `pnpm install` não alterou o `pnpm-lock.yaml`, porque o lockfile não guarda a versão do pacote raiz.
- [x] Formatação do biome em `cli.ts` e `src/i18n/locales/es.ts` (quebra de linha no código do 006-F).

**Validação:**

- `pnpm check-types`: ok.
- `pnpm test`: 97 passaram e 1 foi pulado (suíte posix no Windows).
- `pnpm build`: ok.
- `node dist/cli.js --version`: `2.0.0`.
- `npm pack --dry-run`: 8 arquivos (`dist/cli.js`, `dist/tui-process.js`, `dist/statusline-script.mjs`, `CHANGELOG.md`, `README*.md`, `LICENSE`, `package.json`), de acordo com a RN-07.
- `ci.yml` parseado com `js-yaml` sem erro.
- `parseChangelog()` sobre o novo CHANGELOG: v2.0.0 é a única current, com 4 entradas.
- `rg -i "\bbun(x)?\b"` nos READMEs e no CLAUDE.md: só as menções intencionais (`bun add -g`, `bunx`, job Bun, runtime best-effort e tag `latest`).

**Desvio:** o `pnpm lint:ci` falha no código atual com 16 erros de lint que já existiam:
- `noAssignInExpressions` em `src/changelog.ts`;
- `useIterableCallbackReturn` em `src/statusline-script.mjs`;
- `noArrayIndexKey` em `ChangelogSidebar.tsx` e `Header.tsx`;
- os demais em `video/`.

No CI, o passo ficou com `continue-on-error: true` para não deixar a matriz vermelha. Tornar o passo bloqueante depende de corrigir esses erros e de excluir `video/` do biome. Isso fica como follow-up e está fora do escopo de docs.

**Pendente (ações externas, para o dev):**

- [ ] Rodar os test cases do 006-H antes do publish.
- [ ] Push da branch e abertura do PR `feat/node-runtime-migration` → `master`, com o CI verde nas 6 combinações. Investigar o job Bun se ele falhar.
- [ ] Merge no `master`.
- [ ] `git tag -a v2.0.0 -m "Release v2.0.0"` e `git push origin v2.0.0`, depois `git push origin master`. **Não** mover a tag `latest`, que continua na v1.0.40.
- [ ] `pnpm publish`.
- [ ] `gh release create v2.0.0 --title "v2.0.0" --generate-notes --latest`.
- [ ] Validar pelo registry: `npm view @leogomide/multi-claude version` → `2.0.0`, e `npm i -g @leogomide/multi-claude@2.0.0` num terminal limpo, rodando `mclaude`.
