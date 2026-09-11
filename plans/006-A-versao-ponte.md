# 006-A - Versão ponte v1.0.40 (ainda Bun)

## Prompt base

No projeto multi-claude, na branch `master` e ainda com o runtime Bun, faça o fluxo de auto-update da TUI (exit code 4 em `cli.ts`) verificar se existe Node.js ≥ 22 no PATH antes de instalar uma versão cujo major seja ≥ 2. Se não existir, não instale: mostre a mensagem traduzida com as instruções e saia com 1. Avise da mudança no CHANGELOG e nos READMEs e publique a v1.0.40. **Não** mude o runtime, o build nem o empacotamento; isso é do 006-B em diante.

## Descricao

A v2.0.0 vai trocar o shebang para `#!/usr/bin/env node`. Quem tem só o Bun e atualiza pela TUI da v1.0.39 roda `bun install -g @leogomide/multi-claude@latest` (`cli.ts:273-279`). Isso instala a v2.0.0 com sucesso, mas o `mclaude` seguinte falha com `node: not found`, pelo menos no macOS e no Linux.

A ponte fecha esse buraco para quem atualizar para a v1.0.40 antes da v2.0.0 sair:

- enquanto o `latest` do registry for 1.x, nada muda: o update segue normal;
- quando o `latest` virar 2.x, o update só roda se houver Node ≥ 22.

Ela reutiliza dois pontos que já existem:
- `checkForUpdate()` (`src/services/version-check.ts:21`), que devolve o `latestVersion` do registry;
- `getLocaleDict()` (`cli.ts:18-27`), que já traduz as mensagens do OAuth no processo da CLI, fora da TUI.

**Se o registry não responder** (offline), a ponte não bloqueia: o `bun install` falharia sozinho de qualquer jeito, e bloquear sem saber a versão alvo impediria updates legítimos da série 1.x.

## Checklist de Implementacao

### 1. `src/i18n/types.ts` — chaves novas no bloco `update` (linha 311)

- [ ] Adicionar ao tipo `update`:
  ```ts
  		nodeMissing: string;
  		nodeTooOld: string;
  		nodeHowTo: string;
  ```

### 2. `src/i18n/locales/{en,pt-BR,es}.ts` — textos

- [ ] `en.ts` (bloco `update`, linha 321-328):
  ```ts
  		nodeMissing: "mclaude v{{version}} runs on Node.js 22 or newer, and Node.js was not found.",
  		nodeTooOld: "mclaude v{{version}} runs on Node.js 22 or newer, and the installed one is {{current}}.",
  		nodeHowTo:
  			"Install Node.js 22+ (https://nodejs.org) and run: npm i -g @leogomide/multi-claude\nOr run it without installing: bunx @leogomide/multi-claude",
  ```
- [ ] `pt-BR.ts` e `es.ts`: as mesmas três chaves, traduzidas. O comando e a URL não se traduzem.

### 3. `cli.ts` — helper de versão do Node

- [ ] Ao lado de `resolveClaudePath` (linha 92), adicionar:
  ```ts
  // Major version of the `node` on PATH, or null when there is none. The bridge
  // release still runs on Bun, so process.versions.node says nothing about it.
  function getPathNodeMajor(): { major: number; raw: string } | null {
  	try {
  		const raw = execSync("node --version", { encoding: "utf-8", timeout: 5000 }).trim();
  		const major = Number.parseInt(raw.replace(/^v/, ""), 10);
  		return Number.isFinite(major) ? { major, raw } : null;
  	} catch {
  		return null;
  	}
  }
  ```

### 4. `cli.ts` — guarda no exit code 4 (linha 270-291)

- [ ] Logo depois de `resetTerminal();`, antes do `spawnSync`:
  ```ts
  			// v2 dropped the Bun runtime: installing it where there is no Node.js 22+
  			// would leave `mclaude` failing to start. Only a 2.x target is gated, and
  			// an unreachable registry never blocks (the install would fail on its own).
  			const { version: currentVersion } = await import("./package.json");
  			const { checkForUpdate } = await import("./src/services/version-check.ts");
  			const target = await checkForUpdate(currentVersion);
  			if (target.updateAvailable && Number.parseInt(target.latestVersion, 10) >= 2) {
  				const node = getPathNodeMajor();
  				if (!node || node.major < 22) {
  					const dict = getLocaleDict();
  					const reason = node
  						? dict.update.nodeTooOld.replace("{{current}}", node.raw)
  						: dict.update.nodeMissing;
  					console.error(`\n✗ ${reason.replace("{{version}}", target.latestVersion)}`);
  					console.error(`\n${dict.update.nodeHowTo}\n`);
  					log.info("update blocked: node " + (node?.raw ?? "missing"));
  					process.exit(1);
  				}
  			}
  ```
  - `Number.parseInt("2.0.0", 10)` devolve `2`, então não precisa de parser de semver.
  - A mensagem de sucesso e a de falha continuam como estão; o 006-F é que as reescreve.

### 5. CHANGELOG.md, README.md e README.en.md

- [ ] CHANGELOG: nova seção `### v1.0.40 (current)` e remover `(current)` da v1.0.39:
  ```md
  - **feat:** the in-app update checks for Node.js 22+ before installing mclaude 2.x, which runs on Node.js instead of Bun — without it, the update stops and explains how to install Node.js or run mclaude with `bunx`
  ```
- [ ] README.md e README.en.md: na seção Instalação, logo depois dos pré-requisitos, uma nota curta:
  > A próxima versão maior (2.x) roda em Node.js 22+ e passa a ser instalada com `npm i -g @leogomide/multi-claude`.
- [ ] Badge de versão: 1.0.40.

### 6. Release (processo atual do CLAUDE.md, no `master`)

- [ ] `bunx tsc --noEmit` e `bun test`.
- [ ] Bump de `package.json` para 1.0.40 e `bun install`.
- [ ] Commit, tag `v1.0.40`, **mover a tag `latest` pela última vez** (ela fica congelada aqui), push, `npm publish` e `gh release create`.
- [ ] Mergear o `master` na `feat/node-runtime-migration`.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/i18n/types.ts` | MODIFICAR — 3 chaves em `update` |
| `src/i18n/locales/en.ts`, `pt-BR.ts`, `es.ts` | MODIFICAR — textos |
| `cli.ts` | MODIFICAR — `getPathNodeMajor` + guarda no exit 4 |
| `CHANGELOG.md`, `README.md`, `README.en.md` | MODIFICAR — v1.0.40 e aviso |
| `package.json`, `bun.lock` | MODIFICAR — versão |

## Contrato de teste

- Com o `latest` do registry em 1.x: o update roda como hoje, com ou sem Node no PATH.
- Com `checkForUpdate` forçado a devolver `{ updateAvailable: true, latestVersion: "2.0.0" }` (edição temporária ou mock):
  - sem `node` no PATH: mensagem `nodeMissing` + `nodeHowTo`, exit 1, **nenhum** `bun install` executado (RN-09);
  - com `node` v20.x: mensagem `nodeTooOld` com a versão atual, exit 1;
  - com `node` v22.x: segue para o `bun install -g` normalmente.
- Registry inacessível (rede desligada): nada bloqueia, e o `bun install` falha com a mensagem de hoje.
- Mensagens nos 3 idiomas, conforme `config.language`.
- `bunx tsc --noEmit` limpo e `bun test` sem regressão.

## Resumo de Implementacao

_(preencher após a execução)_
