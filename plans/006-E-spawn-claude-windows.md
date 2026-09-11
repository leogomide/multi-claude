# 006-E - Lançamento do claude no Windows (`claude-bin.ts`)

## Prompt base

No projeto multi-claude, depois do 006-D, crie `src/utils/claude-bin.ts` como ponto único para resolver e lançar o binário do Claude Code. O objetivo é que o launch funcione no Node com o `claude.exe` do instalador nativo e com o `claude.cmd` do npm, e que os argumentos cheguem byte a byte, **sem** `shell: true` (RN-03). Passe as settings da status line por arquivo de sessão. Substitua as três cópias da resolução e trate a falha de spawn no login OAuth (RN-10).

## Descricao

Hoje a resolução do claude está triplicada (`cli.ts:92-101`, `runner.ts:83-93` e `runner.ts:210-221`): roda `where claude` e pega a linha `[0]`. No Windows, isso tem três problemas no Node:

1. O `where` pode listar primeiro o script sh **sem extensão** que o npm cria ao lado do `.cmd`.
2. O Node recusa `spawn` de `.cmd`/`.bat` sem shell (EINVAL, desde a CVE-2024-27980). O Bun tolerava.
3. Com `shell: true`, o `cmd.exe` reprocessaria o JSON do `--settings`. O `cross-spawn` só aplica o escape duplo para `node_modules/.bin/*.cmd`. Com o shim global `%APPDATA%\npm\claude.cmd`, o `%*` é reparseado, e `&`, `|`, `<`, `>` e `^` num nome de provider ou de modelo (que vão no `--settings` via `statusline.ts:76-81`) quebram o comando ou executam outro.

A solução é não passar pelo `cmd.exe`:

- achar o executável percorrendo o PATH com o PATHEXT;
- se for um shim `.cmd`, ler o alvo dele e lançar esse alvo direto (`.exe`, ou `node <script>`);
- deixar o `cross-spawn` só como último recurso.

As settings da status line passam a ir por arquivo, e o argumento mais frágil deixa de carregar aspas e metacaracteres.

Formato do shim do npm (`cmd-shim`), para referência:
```
IF EXIST "%dp0%\node.exe" ( SET "_prog=%dp0%\node.exe" ) ELSE ( SET "_prog=node" ... )
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\node_modules\@anthropic-ai\claude-code\cli.js" %*
```
Pacotes com binário nativo apontam direto para um `.exe` dentro de `node_modules`. O pnpm e o yarn usam `%~dp0`.

## Checklist de Implementacao

### 1. Dependência

- [ ] `pnpm add cross-spawn` e `pnpm add -D @types/cross-spawn`.

### 2. `src/utils/claude-bin.ts` (novo)

- [ ] API pública:
  ```ts
  export interface ResolvedCommand {
  	command: string;
  	prefixArgs: string[]; // e.g. the shim's script when the target is JavaScript
  	via: "posix" | "exe" | "shim-exe" | "shim-node" | "cross-spawn" | "fallback";
  }

  export function resolveClaude(
  	env?: NodeJS.ProcessEnv,
  	platform?: NodeJS.Platform,
  ): ResolvedCommand;

  export function spawnClaude(args: string[], options: SpawnOptions): ChildProcess;
  export function spawnClaudeSync(args: string[], options: SpawnSyncOptions): SpawnSyncReturns<Buffer>;
  ```
- [ ] `findOnPath(name, env, platform)`:
  - **win32**: para cada diretório do `PATH`, testar `name + ext` para cada `ext` do `PATHEXT` (padrão `.COM;.EXE;.BAT;.CMD`), na ordem do PATHEXT, e ignorar o arquivo sem extensão;
  - **posix**: testar `name` com `accessSync(X_OK)`.
  - Sem processo filho (`where`/`which`).
- [ ] `readCmdShimTarget(cmdPath)`:
  - ler o arquivo e coletar os caminhos entre aspas que começam com `%dp0%\` ou `%~dp0\`;
  - descartar `node.exe` e ficar com o **último**, resolvido contra `dirname(cmdPath)`;
  - devolver `null` se nada casar ou se o alvo não existir.
- [ ] `resolveClaude`:
  1. posix → `{ command: found ?? "claude", via: found ? "posix" : "fallback" }`;
  2. win32 com `.exe` → `via: "exe"`;
  3. win32 com `.cmd`/`.bat` e alvo `.exe` → `{ command: target, via: "shim-exe" }`;
  4. alvo `.js`/`.cjs`/`.mjs` → o runtime segue a lógica do shim: `<dir>\node.exe` se existir; senão `process.execPath` quando `!process.versions.bun`; senão `"node"`. Resultado: `{ command: runtime, prefixArgs: [target], via: "shim-node" }`;
  5. `.cmd` ilegível → `{ command: cmdPath, via: "cross-spawn" }`;
  6. nada encontrado → `{ command: "claude", via: "fallback" }`. O spawn emite ENOENT, e a mensagem de instalação que já existe aparece.
- [ ] `spawnClaude` / `spawnClaudeSync`:
  - `via === "cross-spawn"` → `crossSpawn(command, args, options)` (ou `.sync`);
  - senão → `spawn(command, [...prefixArgs, ...args], options)`, **sem** `shell`;
  - logar `claudePath` e `via` com o logger `claude-bin`.

### 3. `src/statusline.ts` — settings por arquivo de sessão

- [ ] Adicionar:
  ```ts
  const SESSION_DIR = join(CONFIG_DIR, "sessions");

  /** Writes the --settings payload to a per-session file; returns its path. */
  export async function writeSessionSettings(json: string): Promise<string>;

  /** Deletes session files whose owning mclaude process is gone (crash leftovers). */
  export async function cleanStaleSessionSettings(): Promise<void>;
  ```
  - Nome: `settings-<process.pid>-<8 hex aleatórios>.json`.
  - A limpeza extrai o pid do nome e apaga o arquivo quando `process.kill(pid, 0)` lança erro (processo morto). Funciona no Windows.
- [ ] `buildStatusLineSettingsJson` continua devolvendo a string; quem chama grava.

### 4. `src/runner.ts`

- [ ] `runClaude` e `runClaudeDefault`:
  - remover os blocos de resolução (linhas 82-94 e 210-221);
  - `await cleanStaleSessionSettings()` no início;
  - trocar `args.push("--settings", buildStatusLineSettingsJson(...))` por:
    ```ts
    const settingsPath = await writeSessionSettings(buildStatusLineSettingsJson(scriptPath, slEnvVars));
    args.push("--settings", settingsPath);
    ```
  - trocar `spawn(claudePath, args, {...})` por `spawnClaude(args, {...})`;
  - apagar o `settingsPath` no `close` e no `error` (`rm(..., { force: true })`, sem esperar).
  - O tratamento de erro por `err.code` do 006-B continua.

### 5. `cli.ts` — login OAuth (linha 239-263)

- [ ] Remover `resolveClaudePath` (linha 92-101) e o import de `execSync`, se ficar órfão.
- [ ] Trocar o spawn por `spawnClaudeSync([], { stdio: "inherit", env: { ...process.env, CLAUDE_CONFIG_DIR: accountDir } })`.
- [ ] RN-10: quando `loginResult.error` existir (spawn falhou), mostrar a mesma mensagem de "claude not found" do runner, e não `loginFailedNew`/`reAuthFailed`. O provider novo continua sendo removido, porque não há conta autenticada, mas o motivo na mensagem fica correto.

### 6. Testes

- [ ] `src/utils/claude-bin.test.ts` (Vitest), com diretórios temporários (`mkdtemp`), `PATH`/`PATHEXT` injetados e `platform` passado explicitamente (roda em qualquer SO):
  - dir com `claude` (sem extensão) e `claude.cmd` → nunca escolhe o sem extensão;
  - `claude.exe` e `claude.cmd` em dirs diferentes → vence o primeiro na ordem do PATH;
  - shim no formato do npm apontando para `cli.js` → `via: "shim-node"`, `prefixArgs: [<abs>/cli.js]`;
  - shim com `%~dp0` (pnpm) apontando para `.exe` → `via: "shim-exe"`;
  - shim sem alvo reconhecível → `via: "cross-spawn"`;
  - nada no PATH → `via: "fallback"`.
- [ ] Integração (roda só com `process.platform === "win32"`; `skipIf` nos outros):
  - um `claude.cmd` falso no formato do npm aponta para um `.js` que grava `process.argv.slice(2)` num arquivo;
  - chamar `spawnClaudeSync(["--model", "m", "-p", 'a & b "c" ^ %PATH%'], ...)` e conferir o argv idêntico.
- [ ] `writeSessionSettings` e `cleanStaleSessionSettings`: arquivo criado, conteúdo JSON íntegro; um arquivo com pid inexistente some e o do pid atual fica.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/utils/claude-bin.ts` | CRIAR |
| `src/utils/claude-bin.test.ts` | CRIAR |
| `src/statusline.ts` | MODIFICAR — arquivo de sessão |
| `src/runner.ts` | MODIFICAR — usa `spawnClaude` e settings por arquivo |
| `cli.ts` | MODIFICAR — OAuth via `spawnClaudeSync`, RN-10 |
| `package.json` | MODIFICAR — `cross-spawn`, `@types/cross-spawn` |

## Contrato de teste

- `rg "where claude|which claude"` sem resultados fora de `claude-bin.ts`.
- `rg "shell:\s*true"` sem resultados em `src/` e `cli.ts` (RN-03).
- Os testes unitários e o de integração (Windows) passam.
- Nesta máquina (`claude.exe`), com `MCLAUDE_LOG_LEVEL=debug`: log com `via=exe`, launch de provider API, OAuth e default funcionando, e a status line visível.
- Com o Claude Code instalado via npm num prefix separado e primeiro no PATH: log com `via=shim-node` ou `shim-exe`, e launch funcionando.
- Provider renomeado para `R&D <teste> "x"`: o launch funciona e a status line mostra o nome exato.
- Depois de fechar o Claude Code, `~/.multi-claude/sessions/` não tem arquivo da sessão.
- Com o claude fora do PATH: a mensagem de instalação aparece no launch e no OAuth, e nada derruba o processo.

## Resumo de Implementacao

_(preencher após a execução)_
