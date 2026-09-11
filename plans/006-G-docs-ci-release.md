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

- [ ] Linha 12: trocar a badge `runtime-Bun` por `[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org)`.
- [ ] Seção Instalação (linhas 61-75):
  ```md
  Pré-requisitos: [Node.js](https://nodejs.org) 22 ou mais recente e [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

  ```bash
  npm i -g @leogomide/multi-claude
  ```

  Também funciona com `pnpm add -g @leogomide/multi-claude` ou `bun add -g @leogomide/multi-claude`. Para rodar sem instalar: `npx @leogomide/multi-claude`.

  Para atualizar, use a opção de update dentro do app ou reinstale com o mesmo gerenciador. Para remover: `npm rm -g @leogomide/multi-claude`.
  ```
- [ ] Nota curta, logo abaixo:
  - **Só tem o Bun?** Rode com `bunx @leogomide/multi-claude`. Um `mclaude` instalado globalmente exige Node.js no PATH.
  - **Atrás de proxy corporativo?** Defina `NODE_USE_ENV_PROXY=1` (Node 22.21+) junto de `HTTPS_PROXY`, e `NODE_EXTRA_CA_CERTS` se a rede usar uma CA própria.
- [ ] Seção Desenvolvimento (linhas 171-178):
  ```bash
  pnpm install             # instala e builda (prepare)
  pnpm link --global       # expõe o `mclaude` local (rode `pnpm setup` uma vez antes)
  pnpm build:watch         # rebuild contínuo; em outro terminal: mclaude
  pnpm check-types         # checagem de tipos
  pnpm test                # testes (Vitest)
  pnpm lint                # biome
  ```
- [ ] Badge de versão: 2.0.0.

### 2. CLAUDE.md

- [ ] **Commands:** `pnpm install`, `pnpm build`, `pnpm link --global` e depois `mclaude`, `pnpm check-types`, `pnpm test`.
- [ ] **Project Structure:**
  - adicionar `scripts/build.mjs`, `vitest.config.ts`, `src/utils/claude-bin.ts`, `src/services/install-detect.ts` e `dist/` (gerado, fora do git);
  - remover `src/utils/win32-console-size.ts`.
- [ ] **Tech Stack:**
  - Runtime: Node.js ≥ 22 (o artefato também roda no Bun, best-effort);
  - Build: esbuild → `dist/cli.js` + `dist/tui-process.js` (dois bundles, dependências externas);
  - Package manager: pnpm;
  - Testes: Vitest.
- [ ] **Release Process:**
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
- [ ] **Instalação pelos usuários:** só `npm i -g @leogomide/multi-claude@latest`, com `pnpm add -g` e `bun add -g` como alternativas. Remover as linhas `github:...`.

### 3. `.github/workflows/ci.yml` (novo)

- [ ] Esboço:
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

- [ ] Nova seção `### v2.0.0 (current)` e remover `(current)` da v1.0.40:
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

_(preencher após a execução)_
