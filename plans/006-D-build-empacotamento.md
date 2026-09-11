# 006-D - Build e empacotamento (esbuild → `dist/`)

## Prompt base

No projeto multi-claude, depois do 006-C, crie o build com esbuild. Ele gera `dist/cli.js` (com shebang `node`) e `dist/tui-process.js` como dois bundles ESM autocontidos, com as dependências externas, e copia `statusline-script.mjs` para o `dist/`. Aponte o `bin` e o `files` do `package.json` para o `dist/`, adicione o guard de versão do Node e ajuste o spawn da TUI. **Não** mexa na resolução do claude (006-E) nem no auto-update (006-F).

## Descricao

Esta é a mudança principal da migração. O Node não executa `.tsx` e não remove tipos de arquivos dentro de `node_modules`, então o pacote passa a publicar JS compilado.

Três armadilhas do esbuild, todas confirmadas na revisão:

1. **Layout.** Com `entryPoints` como array, o `outbase` vira a raiz do repo e a TUI sai em `dist/src/tui-process.js`. Isso quebra o spawn e os `__dirname` de `statusline.ts:40` e `changelog.ts:20`. Com `entryPoints` como **objeto**, a saída é plana (`dist/cli.js` e `dist/tui-process.js`), e os caminhos relativos existentes continuam valendo sem mudança:
   - o código de `statusline.ts` entra nos dois bundles e resolve `dist/statusline-script.mjs`;
   - o de `changelog.ts` só entra no bundle da TUI e resolve `dist/../CHANGELOG.md`, que é a raiz do pacote.
2. **Shebang.** O `banner` do esbuild vai para todos os arquivos, e o esbuild também preserva o hashbang da entrada. Os dois juntos dão um `#!` duplicado, que é SyntaxError. A regra é: shebang só no fonte `cli.ts:1`, sem `banner`.
3. **`splitting: false`.** Com dois bundles autocontidos não há chunks, então o `__dirname` de todo módulo é `dist/`. O único custo é que o `tui-process.js` passa a carregar o Ink antes do prompt de senha, o que é irrelevante.

## Checklist de Implementacao

### 1. `scripts/build.mjs` (novo)

- [ ] Adicionar `esbuild` em `devDependencies`.
- [ ] Criar:
  ```js
  import { cp, readFile, rm } from "node:fs/promises";
  import * as esbuild from "esbuild";

  const watch = process.argv.includes("--watch");

  /** @type {import("esbuild").BuildOptions} */
  const options = {
  	// Object form keeps the output flat: dist/cli.js and dist/tui-process.js.
  	entryPoints: { cli: "cli.ts", "tui-process": "src/tui-process.ts" },
  	outdir: "dist",
  	bundle: true,
  	splitting: false,
  	format: "esm",
  	platform: "node",
  	target: "node22",
  	packages: "external",
  	jsx: "automatic",
  	keepNames: true,
  	logLevel: "info",
  	// No banner: esbuild keeps cli.ts's own hashbang, and a banner would add a second one.
  };

  async function postBuild() {
  	await cp("src/statusline-script.mjs", "dist/statusline-script.mjs");
  	const cli = await readFile("dist/cli.js", "utf-8");
  	if (!cli.startsWith("#!/usr/bin/env node")) throw new Error("dist/cli.js lost its shebang");
  	if (/from\s+["'](ink|react)["']/.test(cli)) {
  		throw new Error("dist/cli.js imports Ink/React: the CLI process must stay TUI-free");
  	}
  }

  await rm("dist", { recursive: true, force: true });
  if (watch) {
  	const ctx = await esbuild.context({
  		...options,
  		plugins: [{ name: "post", setup: (b) => b.onEnd((r) => r.errors.length || postBuild()) }],
  	});
  	await ctx.watch();
  } else {
  	await esbuild.build(options);
  	await postBuild();
  }
  ```

### 2. `cli.ts`

- [ ] Linha 1: `#!/usr/bin/env node`.
- [ ] Guard de versão, logo depois dos imports:
  ```ts
  // engines is only advisory: fail with a readable message instead of a syntax or API error.
  const nodeMajor = Number.parseInt(process.versions.node, 10);
  if (!process.versions.bun && nodeMajor < 22) {
  	console.error(`mclaude requires Node.js 22 or newer (found ${process.version}).`);
  	process.exit(1);
  }
  ```
- [ ] Spawn da TUI (a linha que o 006-B deixou apontando para `src/tui-process.ts`):
  ```ts
  const tuiPath = fileURLToPath(new URL("./tui-process.js", import.meta.url));
  ```
  - O fonte deixa de ser executável direto: o dev passa a rodar o `dist` (ver scripts).

### 3. `package.json`

- [ ] Campos:
  ```json
  "bin": { "mclaude": "dist/cli.js" },
  "files": ["dist/", "CHANGELOG.md"],
  ```
  - O npm inclui `README.md`, `LICENSE` e `package.json` por conta própria (RN-07).
- [ ] `scripts`:
  ```json
  "build": "node scripts/build.mjs",
  "build:watch": "node scripts/build.mjs --watch",
  "dev": "node scripts/build.mjs && node dist/cli.js",
  "prepare": "node scripts/build.mjs",
  "prepublishOnly": "pnpm check-types && pnpm test && pnpm build",
  "link": "pnpm link --global",
  ```
  - O `prepare` usa `node` direto, e não `pnpm build`, para funcionar também num `npm i -g github:...` sem suporte oficial.
  - O `prepare` não roda em instalações a partir do registry, só no repo e em instalações via git e local.

### 4. Imports de `package.json` nos componentes

- [ ] Nenhuma mudança obrigatória: `Header.tsx:4`, `MainMenu.tsx:3` e `ChangelogPage.tsx:3` fazem `import pkg from "../../../package.json"`, que o esbuild inlina.
- [ ] Conferir no bundle que a versão aparece certa na TUI.

### 5. Fluxo de dev local

- [ ] Documentado no 006-G, mas validado aqui:
  1. `bun remove -g @leogomide/multi-claude` (a 1.0.39 instalada via Bun);
  2. `pnpm setup` (o bin global do pnpm não está no PATH);
  3. `pnpm install` (roda o `prepare`, que builda);
  4. `pnpm link --global`;
  5. `mclaude`.
- [ ] Para iterar: `pnpm build:watch` num terminal e `mclaude` no outro.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `scripts/build.mjs` | CRIAR |
| `cli.ts` | MODIFICAR — shebang, guard, caminho da TUI |
| `package.json` | MODIFICAR — `bin`, `files`, scripts, esbuild |

## Contrato de teste

- `pnpm build`:
  - gera `dist/cli.js`, `dist/tui-process.js` e `dist/statusline-script.mjs`, sem `dist/src/` e sem `chunk-*`;
  - `head -1 dist/cli.js` mostra `#!/usr/bin/env node` (uma única vez);
  - as asserções do `build.mjs` passam.
- Com `HOME`/`USERPROFILE` apontando para um diretório temporário:
  - `node dist/cli.js --version` → `1.0.40` (ou a versão corrente);
  - `node dist/cli.js --help` → o texto de ajuda completo;
  - `node dist/cli.js --list | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"` → JSON válido.
- `node dist/cli.js`: abre a TUI, a página Changelog lista versões (prova o `__dirname` do `changelog.ts`), um launch mostra a status line (prova o `statusline-script.mjs` no dist) e a volta à TUI funciona.
- `npm pack --dry-run` lista **só** `dist/*`, `CHANGELOG.md`, `README.md`, `LICENSE` e `package.json` (RN-07).
- `npm pack`, depois `npm i -g ./leogomide-multi-claude-*.tgz` (terminal elevado ou com prefix de usuário) e `mclaude --version` num shell novo.
- `bun dist/cli.js --list` funciona (RN-02).
- Com Node 20 no PATH (via nvm/fnm, se disponível), `node dist/cli.js` mostra a mensagem do guard e sai com 1.
- `pnpm check-types`, `pnpm test` e `pnpm lint:ci` continuam limpos.

## Resumo de Implementacao

_(preencher após a execução)_
