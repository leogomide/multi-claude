# 006-F - Auto-update por gerenciador de pacotes

## Prompt base

No projeto multi-claude, depois do 006-D, reescreva o auto-update (exit code 4 em `cli.ts`) para detectar qual gerenciador instalou o pacote (npm, pnpm, Bun, Yarn ou Volta) e rodar o comando de update desse gerenciador. Execuções efêmeras (npx, bunx, pnpm dlx) e o link de desenvolvimento não se atualizam. As mensagens passam a vir do i18n, com o comando manual interpolado, e há mensagens próprias para falta de permissão e para arquivo travado. **Não** mexa no fluxo da TUI que decide oferecer o update (`useUpdateCheck`).

## Descricao

Hoje o update roda `spawnSync(process.execPath, ["install","-g","@leogomide/multi-claude@latest"])` (`cli.ts:273-279`). No Bun isso é `bun install -g`. No Node vira `node install -g` e quebra.

O `npm_config_user_agent` não resolve: ele só existe quando o processo roda via scripts ou via npx/bunx, e não quando o bin global é chamado direto. A fonte confiável é o **realpath do próprio bundle** (`dist/cli.js`), que fica dentro do diretório onde o gerenciador instalou o pacote.

Regra de ordem: os caminhos efêmeros e os mais específicos vêm primeiro. O npm é o que sobra (**por exclusão**), porque os prefixes dele variam demais: `%APPDATA%\npm`, `C:\Program Files\nodejs` (o desta máquina), nvm-windows, fnm, scoop, `/usr/local/lib`, `/opt/homebrew/lib`, `/usr/lib`, `~/.nvm`, asdf, mise e `~/.npm-global`.

A saída de erro do gerenciador passa por um "tee": os bytes vão para o terminal e são inspecionados ao mesmo tempo. Assim dá para reconhecer `EACCES`/`EPERM` (prefix do sistema) e `EBUSY` (o shim `.exe` do Bun travado enquanto roda) sem esconder nada do usuário.

## Checklist de Implementacao

### 1. `src/services/install-detect.ts` (novo) — função pura

- [ ] Tipos e função:
  ```ts
  export const PACKAGE_SPEC = "@leogomide/multi-claude@latest";

  export type InstallSource =
  	| { kind: "npm" | "pnpm" | "bun" | "yarn" | "volta"; command: string; args: string[] }
  	| { kind: "ephemeral"; runner: "npx" | "bunx" | "pnpm-dlx" }
  	| { kind: "dev-link" };

  export function detectInstallSource(
  	realPath: string,
  	env: NodeJS.ProcessEnv,
  	platform: NodeJS.Platform,
  ): InstallSource;
  ```
- [ ] Normalização: `\` → `/` e, em win32, minúsculas.
- [ ] Ordem de decisão:

  | Condição no caminho normalizado | Resultado |
  |---|---|
  | contém `/_npx/` | `ephemeral` / `npx` |
  | contém `/bunx-` | `ephemeral` / `bunx` |
  | contém `/dlx/` ou `/dlx-` | `ephemeral` / `pnpm-dlx` |
  | contém `/.bun/install/global/` ou começa com `${BUN_INSTALL}/install/global/` | `bun`: `bun add -g <spec>` |
  | contém `/.pnpm/` ou `/pnpm/global/` | `pnpm`: `pnpm add -g <spec>` |
  | contém `/yarn/global/` ou `/yarn/data/global/` | `yarn`: `yarn global add <spec>` |
  | contém `/volta/tools/image/packages/` | `volta`: `volta install <spec>` |
  | contém `/node_modules/@leogomide/multi-claude/` | `npm`: `npm i -g <spec>` |
  | qualquer outro (sem `node_modules`) | `dev-link` |

- [ ] Função auxiliar `formatCommand(source)`, que devolve a string exibida ao usuário (ex.: `npm i -g @leogomide/multi-claude@latest`).

### 2. i18n — bloco `update` (`types.ts:311` e os 3 locales)

- [ ] O `failed` deixa de ter o comando fixo: `"Update failed. Try manually: {{command}}"`, traduzido nos 3 locales.
- [ ] Chaves novas:
  - `permission`: "The global folder of {{manager}} needs administrator rights. Run in an elevated terminal (Windows) or with sudo, or point the prefix to a user folder, then: {{command}}";
  - `busy`: "mclaude files are in use. Close other mclaude windows and run: {{command}}";
  - `ephemeral`: "Running through {{runner}}: the next run already fetches the latest version.";
  - `devLink`: "Development install (linked): update with git pull && pnpm build."
- [ ] Conferir quem consome `update.success` (TUI ou CLI) e manter a interpolação de `{{version}}` compatível com esse uso.

### 3. `cli.ts` — exit code 4 (linha 270-291)

- [ ] Substituir o bloco inteiro:
  ```ts
  		if (tuiExitCode === 4) {
  			resetTerminal();
  			const dict = getLocaleDict();
  			const selfPath = realpathSync(fileURLToPath(import.meta.url));
  			const source = detectInstallSource(selfPath, process.env, process.platform);
  			log.info("update source=" + source.kind + " path=" + selfPath);
  			if (source.kind === "ephemeral") { console.log(`\n${dict.update.ephemeral.replace(...)}\n`); process.exit(0); }
  			if (source.kind === "dev-link") { console.log(`\n${dict.update.devLink}\n`); process.exit(0); }

  			console.log(`\n\u2B06\uFE0F  ${dict.update.updating}\n`);
  			const { status, stderrText } = runTee(source.command, source.args); // cross-spawn.sync, stderr tee
  			if (status === 0) { /* dict.update.success */ process.exit(0); }
  			const command = formatCommand(source);
  			const msg = /EACCES|EPERM/.test(stderrText) ? dict.update.permission
  				: /EBUSY/.test(stderrText) ? dict.update.busy
  				: dict.update.failed;
  			console.error(`\n\u2717 ${msg.replace("{{command}}", command).replace("{{manager}}", source.kind)}\n`);
  			process.exit(1);
  		}
  ```
  - `runTee`: `crossSpawn.sync(command, args, { stdio: ["inherit", "inherit", "pipe"] })`. Como o `sync` não faz streaming, usar a versão assíncrona com `child.stderr.on("data", c => { process.stderr.write(c); buf += c; })` e aguardar o `close`. Os argumentos são fixos, sem metacaracteres, então o `cross-spawn` basta para `npm.cmd`/`pnpm.cmd`/`yarn.cmd`.
- [ ] A guarda de Node da ponte (006-A) **sai**: na v2 o próprio processo já é Node ≥ 22 (guard do 006-D) ou Bun.

### 4. Testes — `src/services/install-detect.test.ts`

- [ ] Tabela de fixtures (entrada → `kind`):
  - `C:\Users\u\AppData\Roaming\npm\node_modules\@leogomide\multi-claude\dist\cli.js` → npm;
  - `C:\Program Files\nodejs\node_modules\@leogomide\multi-claude\dist\cli.js` → npm;
  - `/usr/local/lib/node_modules/@leogomide/multi-claude/dist/cli.js` → npm;
  - `/home/u/.nvm/versions/node/v22.21.0/lib/node_modules/@leogomide/multi-claude/dist/cli.js` → npm;
  - `C:\Users\u\.bun\install\global\node_modules\@leogomide\multi-claude\dist\cli.js` → bun;
  - `/home/u/.bun/install/global/node_modules/@leogomide/multi-claude/dist/cli.js` → bun;
  - `C:\Users\u\AppData\Local\pnpm\global\5\.pnpm\@leogomide+multi-claude@2.0.0\node_modules\@leogomide\multi-claude\dist\cli.js` → pnpm;
  - `/Users/u/Library/pnpm/global/5/.pnpm/.../dist/cli.js` → pnpm;
  - `C:\Users\u\AppData\Local\Yarn\Data\global\node_modules\@leogomide\multi-claude\dist\cli.js` → yarn;
  - `C:\Users\u\AppData\Local\Volta\tools\image\packages\@leogomide\multi-claude\...` → volta;
  - `C:\Users\u\AppData\Local\npm-cache\_npx\abc123\node_modules\@leogomide\multi-claude\dist\cli.js` → ephemeral/npx;
  - `/tmp/bunx-1000-@leogomide/multi-claude@latest/node_modules/.../dist/cli.js` → ephemeral/bunx;
  - `D:\Users\Usuario\Desktop\GITHUB\multi-claude\dist\cli.js` → dev-link;
  - `BUN_INSTALL=/opt/bun` + `/opt/bun/install/global/node_modules/...` → bun.
- [ ] `formatCommand` para cada `kind`.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/services/install-detect.ts` | CRIAR |
| `src/services/install-detect.test.ts` | CRIAR |
| `cli.ts` | MODIFICAR — exit 4 reescrito, sem a guarda da ponte |
| `src/i18n/types.ts`, `locales/en.ts`, `pt-BR.ts`, `es.ts` | MODIFICAR — `failed` interpolado + 4 chaves |

## Contrato de teste

- `rg "bun install -g" src cli.ts` sem resultados (RN-04).
- `rg "process.execPath,\s*\[\s*\"install\"" cli.ts` sem resultados.
- Os testes de tabela passam.
- Manual (006-H): update pela TUI a partir de uma instalação `npm i -g` do tarball de uma versão antiga, `pnpm add -g` e `bun add -g`. Em cada caso, o log mostra o `source=` certo e o comando certo é executado.
- Manual: `npx @leogomide/multi-claude` → a opção de update mostra a mensagem `ephemeral` e não instala nada (RN-05).
- Manual: `pnpm link --global` → mensagem `devLink`.
- Manual: com o prefix `C:\Program Files\nodejs` num terminal **não** elevado → mensagem `permission` com o comando.

## Resumo de Implementacao

_(preencher após a execução)_
