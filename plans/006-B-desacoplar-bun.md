# 006-B - Desacoplar do Bun e paridade de runtime

## Prompt base

No projeto multi-claude, na branch `feat/node-runtime-migration` (já com a v1.0.40 mergeada), remova do código-fonte tudo o que só funciona no Bun e corrija as diferenças de comportamento entre Bun e Node. Tudo deve continuar rodando no Bun. **Não** mexa em build, empacotamento, toolchain ou testes; isso é do 006-C/D. **Não** reescreva a resolução do binário do claude; isso é o 006-E.

## Descricao

Depois deste passo, o código-fonte fica neutro de runtime: `bun cli.ts` funciona como antes, e o mesmo código compilado roda no Node sem mudanças. São seis frentes pequenas e independentes:

1. **FFI.** O `bun:ffi` em `src/utils/win32-console-size.ts` só existia porque o `process.stdout.columns` do Bun fica em cache no Windows. No Node, `getWindowSize()` chama `GetConsoleScreenBufferInfo` via libuv a cada leitura, a mesma syscall da FFI.
2. **APIs exclusivas do Bun no `cli.ts`:** `import.meta.dir` (linha 199).
3. **Status line.** O comando fixo é `bun "<path>"` (`statusline.ts:60`). Passa a usar o runtime corrente (RN-06).
4. **Saída cortada em pipe.** No Node, `process.exit` logo depois de escrever muito no stdout corta a saída de `--list` e `--logs`.
5. **Stdin do prompt de senha.** Falta o `pause()` depois de remover o listener.
6. **Erros de spawn e proxy.** Os erros do runner passam a ser tratados pelo `err.code` do Node, e o spawn da TUI ganha paridade de proxy.

## Checklist de Implementacao

### 1. Remover a FFI

- [ ] Apagar `src/utils/win32-console-size.ts`.
- [ ] `src/hooks/useTerminalSize.ts`:
  - remover o import da linha 3, o `ffiAvailable` (linha 10-11) e o passo 1 (linha 14-22);
  - renumerar os comentários;
  - no passo 4 (`mode con`), trocar o comentário "(only if FFI failed to init)" por "(only when the TTY reports no size)".
  - O listener de `resize` e o `setInterval(check, 2000)` ficam como estão.

### 2. `cli.ts` — APIs do Bun e versão

- [ ] Linha 199: trocar por
  ```ts
  const tuiPath = join(dirname(fileURLToPath(import.meta.url)), "src", "tui-process.ts");
  ```
  Imports: `dirname` de `node:path` e `fileURLToPath` de `node:url`. O 006-D troca de novo para o arquivo do `dist`.
- [ ] Linhas 133 e 169: trocar o `await import("./package.json")` por um import estático no topo:
  ```ts
  import pkg from "./package.json";
  ```
  e usar `pkg.version`. Com `resolveJsonModule`, o tsc aceita; o esbuild inlina.

### 3. `cli.ts` — flush antes de sair

- [ ] Adicionar um helper perto de `resetTerminal`:
  ```ts
  // process.exit does not wait for pending stdout writes, and on POSIX pipes they
  // are async in Node: `mclaude --list | jq` would get a truncated document.
  async function exitAfterFlush(code: number): Promise<never> {
  	await new Promise<void>((resolve) => process.stdout.write("", () => resolve()));
  	process.exit(code);
  }
  ```
- [ ] Trocar `process.exit(0)` por `await exitAfterFlush(0)` nas linhas 164 (`--help`), 171 (`--version`), 178 (`--logs`) e 185 (`--list`).

### 4. `cli.ts` — proxy no spawn da TUI (linha 206-209)

- [ ] Antes do `do { ... }`:
  ```ts
  // Bun's fetch honours HTTP(S)_PROXY on its own; Node's only with NODE_USE_ENV_PROXY
  // (22.21+/24.0+), read at startup — so it has to be set on the child's env.
  const proxied = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"].some(
  	(k) => process.env[k],
  );
  const tuiEnv =
  	proxied && process.env["NODE_USE_ENV_PROXY"] === undefined
  		? { ...process.env, NODE_USE_ENV_PROXY: "1" }
  		: process.env;
  ```
  e passar `env: tuiEnv` no `spawnSync`.
  - O processo da CLI (headless) não recebe essa env. O fetch de modelos do headless já tem o fallback com timeout de 3s (plano 005, R-04), então degrada sem travar.

### 5. `src/statusline.ts` — runtime corrente (linha 52-68)

- [ ] Adicionar:
  ```ts
  // The status line runs on whatever runtime launched mclaude. An absolute path is
  // only used when it has no whitespace: Claude Code may hand the command to
  // `cmd /c`, which strips the outer quotes of a command that starts with one.
  function statusLineRuntime(): string {
  	const exec = process.execPath.replace(/\\/g, "/");
  	if (!/\s/.test(exec)) return `"${exec}"`;
  	return process.versions.bun ? "bun" : "node";
  }
  ```
- [ ] Linha 60: `command: \`${statusLineRuntime()} "${normalizedPath}"\``.
  - O valor vai via `--settings` a cada launch e não fica persistido, então não gera legado.

### 6. `src/tui-process.ts` — stdin do prompt de senha

- [ ] Em `promptPassword`, logo depois de `process.stdin.removeListener("data", onData);` (linha 72), adicionar `process.stdin.pause();`.
- [ ] Em `waitForSingleKey`, depois do `removeListener` da linha 106, adicionar `process.stdin.pause();`.
  - O Ink retoma o stdin por conta própria ao montar, e o `setEncoding` extra é inofensivo (`ink/build/components/App.js:123`).

### 7. `src/runner.ts` — erro de spawn pelo `code` (linhas 145-158 e 267-281)

- [ ] Nos dois handlers `child.on("error", ...)`:
  ```ts
  			const code = (err as NodeJS.ErrnoException).code;
  			if (
  				code === "ENOENT" ||
  				code === "EINVAL" ||
  				code === "EACCES" ||
  				err.message.includes("Failed to spawn") // Bun's wording
  			) {
  ```
  - O corpo (mensagem de instalação + `resolve(1)`) fica igual.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/utils/win32-console-size.ts` | REMOVER |
| `src/hooks/useTerminalSize.ts` | MODIFICAR — sem FFI |
| `cli.ts` | MODIFICAR — `import.meta.dir`, import da versão, `exitAfterFlush`, env de proxy |
| `src/statusline.ts` | MODIFICAR — `statusLineRuntime()` |
| `src/tui-process.ts` | MODIFICAR — `stdin.pause()` |
| `src/runner.ts` | MODIFICAR — tratamento por `err.code` |

## Contrato de teste

- Nenhum `bun:*`, `import.meta.dir` ou `Bun.` restante:
  ```
  rg "bun:|import\.meta\.dir|\bBun\." --glob "!node_modules" --glob "!plans" --glob "!reports" --glob "!video"
  ```
  O único resultado permitido são os imports de `bun:test` nos dois arquivos de teste, que saem no 006-C.
- `bunx tsc --noEmit` limpo e `bun test` sem regressão.
- `bun cli.ts` abre a TUI, lança um provider e volta.
- Com o terminal redimensionado, a TUI se ajusta em até 2s (Windows Terminal).
- O comando da status line no log do runner é `"C:/Users/Usuario/.bun/bin/bun.exe" ".../statusline.mjs"` (execPath sem espaço) e a status line aparece no Claude Code.
- `bun cli.ts --list > out.json` gera um JSON válido.

## Resumo de Implementacao

_(preencher após a execução)_
