# 006-H - Test cases manuais (matriz SO × gerenciador)

## Prompt base

No projeto multi-claude, antes de publicar a v2.0.0, execute os test cases manuais abaixo. Eles cobrem o que a suíte automática e o CI não alcançam: a TUI interativa, o launch real do Claude Code, o terminal do Windows, os gerenciadores de pacotes e a transição a partir das versões em Bun. Registre cada resultado (PASS / FAIL / N/A) com observações.

## Descricao

Step de verificação, sem código novo. Os cenários partem do tarball (`npm pack`) instalado globalmente, e não do link de dev, para exercitar o artefato publicado de verdade.

Nesta máquina:
- o Claude Code é `claude.exe` (instalador nativo);
- o prefix do npm (`C:\Program Files\nodejs`) exige terminal elevado;
- o mclaude 1.0.39 está instalado via Bun. Remover antes dos cenários de instalação, exceto no CT-02.

Ambientes: Windows 10 (Windows Terminal, conhost/`cmd.exe` e PowerShell); macOS e Linux, se houver acesso (senão, o CI cobre o automatizado e os cenários manuais ficam N/A).

## Checklist de Implementacao

### Transição (006-A)

- [ ] **CT-01** Ponte sem Node: v1.0.40 via `bun add -g`, com `node` fora do PATH (renomear temporariamente ou usar um PATH reduzido) e `checkForUpdate` apontando para 2.0.0 (mock). Resultado esperado: a mensagem `nodeMissing` + `nodeHowTo` no idioma configurado, exit 1 e a v1.0.40 continua funcionando.
- [ ] **CT-02** Da v1.0.39 para a v2.0.0 via Bun, com Node presente: pela TUI da 1.0.39, escolher Update. Resultado: `bun install -g` instala a 2.0.0 e o `mclaude` seguinte abre a TUI no Node.
- [ ] **CT-03** Da v1.0.39 para a v2.0.0 via Bun, **sem** Node (Windows): anotar o comportamento do shim `mclaude.exe` do Bun com o shebang `node` (informativo, R-01).

### Instalação e artefato (006-D)

- [x] **CT-04** `npm i -g ./leogomide-multi-claude-2.0.0.tgz` (terminal elevado):
  - `mclaude --version`, `mclaude --help`;
  - `mclaude --list | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"`;
  - `mclaude --logs last | Measure-Object -Character` com a contagem igual ao tamanho do arquivo de log (R-05 do stdout).
- [ ] **CT-05** `pnpm add -g ./leogomide-multi-claude-2.0.0.tgz` e depois `mclaude --version`.
- [ ] **CT-06** `bun add -g ./leogomide-multi-claude-2.0.0.tgz` e depois `mclaude` (Bun best-effort, RN-02).
- [ ] **CT-07** `npx ./leogomide-multi-claude-2.0.0.tgz` (ou `npx @leogomide/multi-claude` depois do publish) abre a TUI.
- [ ] **CT-08** Tempo de inicialização (R-04), 5 execuções cada, anotando a mediana de `Measure-Command { mclaude --version }` e o tempo até o menu da TUI aparecer:
  - antes: a 1.0.39 no Bun;
  - depois: a 2.0.0 no Node.

### TUI no Windows (006-B)

- [ ] **CT-09** Menu → Gerenciar providers → adicionar e remover um provider → Settings → Changelog (lista versões, v2.0.0 como current). Repetir no Windows Terminal, no conhost e no PowerShell.
- [ ] **CT-10** Redimensionar a janela com a TUI aberta: o layout se ajusta em até 2s, sem lixo na tela (R-03).
- [ ] **CT-11** Primeiro uso, com `USERPROFILE` apontando para um diretório vazio: o seletor de idioma aparece e funciona.
- [ ] **CT-12** Com senha mestra configurada, digitar a senha rápido e já pressionar setas: nenhuma tecla se perde e a TUI abre. Senha errada → `R` → confirmação funciona.
- [ ] **CT-13** Ctrl+C na TUI, no prompt de senha mestra e dentro do Claude Code: o comportamento é o mesmo da 1.0.39, sem processo órfão e sem terminal em modo raw.

### Launch do Claude Code (006-E)

- [ ] **CT-14** Com o `claude.exe`, `MCLAUDE_LOG_LEVEL=debug`: launch de provider API, de conta OAuth e Default Launch. Em cada um, a status line aparece e a volta à TUI funciona. O log mostra `via=exe` e a linha `env=` com as vars esperadas.
- [ ] **CT-15** Com o Claude Code instalado via npm num prefix separado e primeiro no PATH: repetir o CT-14. O log mostra `via=shim-node` ou `shim-exe`.
- [ ] **CT-16** Provider renomeado para `R&D <teste> "x" ^%PATH%`: o launch funciona nos dois tipos de instalação do claude, e a status line mostra o nome literal.
- [ ] **CT-17** Login OAuth novo com o claude fora do PATH: aparece a mensagem de "claude not found", e não "login failed" (RN-10).
- [ ] **CT-18** Depois de fechar o Claude Code, `~/.multi-claude/sessions/` fica vazio. Matar o mclaude à força no meio de uma sessão e abrir de novo: o arquivo órfão some.
- [ ] **CT-19** Headless: `mclaude --provider <x> --model <y> -p "diga oi"` responde, e `mclaude --provider <x> -p "a & b"` passa o prompt literal.

### Rede (006-B)

- [ ] **CT-20** Provider Ollama ou LM Studio escutando só em `127.0.0.1`, com a base URL `http://localhost:...`: a lista de modelos carrega (R-06).
- [ ] **CT-21** Com `HTTPS_PROXY` apontando para um proxy local (mitmproxy ou similar), abrir a TUI e carregar os modelos do OpenRouter: as requisições passam pelo proxy (Node ≥ 22.21) (R-05).

### Auto-update (006-F)

- [ ] **CT-22** Instalar via `npm i -g` o tarball de uma versão anterior falsa (1.9.9, só com o bump) e atualizar pela TUI (com o registry já na 2.0.0): o log mostra `source=npm`, roda `npm i -g` e o resultado é a 2.0.0.
- [ ] **CT-23** O mesmo que o CT-22, com `pnpm add -g` → `source=pnpm`.
- [ ] **CT-24** O mesmo que o CT-22, com `bun add -g` → `source=bun`. Se o shim travar, aparece a mensagem `busy` (R-07).
- [ ] **CT-25** Update num terminal **não** elevado com o prefix `C:\Program Files\nodejs` → mensagem `permission` com o comando (R-08).
- [ ] **CT-26** Update via `npx` → mensagem `ephemeral`, nada é instalado. Via `pnpm link --global` → mensagem `devLink` (RN-05).

### Dados existentes (RN-01)

- [ ] **CT-27** Com um `~/.multi-claude` real da 1.0.39 (providers com chave encriptada, senha mestra e instalações customizadas), abrir a 2.0.0: tudo é lido, um launch com provider de chave encriptada funciona e nenhum arquivo muda de formato (comparar o `config.json` antes e depois de apenas abrir e fechar).

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| (nenhum) | Verificação apenas |

## Contrato de teste

- Todos os CTs em PASS ou N/A justificado. Qualquer FAIL bloqueia o publish da v2.0.0 e volta para o passo correspondente (006-B a 006-F).
- Os tempos do CT-08 ficam registrados no Resumo, para referência futura.

## Resumo de Implementacao

Execução parcial em 2026-09-11, só com o que roda de forma segura e não interativa nesta máquina (Windows 10, Node v22.17.0, npm 11.10.0, pnpm 10.34.3). Nada tocou os globais reais, o `~/.multi-claude` real ou APIs pagas. O tarball foi instalado com `npm i -g <tgz> --prefix <temp>`, sem elevação, e o `HOME`/`USERPROFILE` apontava para um diretório temporário. O temp e o `.tgz` foram removidos no fim.

Pré-validação: `pnpm build` ok (`dist/cli.js` 149.6kb, `dist/tui-process.js` 289.3kb). `npm pack` gerou 8 arquivos. `pnpm test`: 4 arquivos, 97 testes passaram e 1 foi pulado.

| CT | Ambiente | Resultado | Observação |
|----|----------|-----------|------------|
| CT-01 | Win10 | PENDENTE (manual) | Exige Node fora do PATH e o mock do `checkForUpdate` na v1.0.40 |
| CT-02 | Win10 | PENDENTE (manual) | Exige a 1.0.39 instalada via Bun e o Update pela TUI (ver nota 1) |
| CT-03 | Win10 | PENDENTE (manual) | Exige a 1.0.39 e um ambiente sem Node |
| CT-04 | Win10, Git Bash, prefix temporário (sem elevação) | PASS | `--version` → `2.0.0` (exit 0). `--help` → `multi-claude v2.0.0` + uso (exit 0). `--list` com pipe para `JSON.parse` → JSON válido (`providers`, `installations`, `usage`). `--logs last` com um log sintético de 3.000.000 bytes → 3.000.001 caracteres no stdout (arquivo + `\n` do `console.log`), sem truncamento (R-05). Não rodou no prefix real `C:\Program Files\nodejs` |
| CT-05 | Win10 | PENDENTE (manual) | `pnpm add -g` mexe no global real do pnpm |
| CT-06 | Win10 | PENDENTE (manual) | `bun add -g` mexe no global real do Bun (hoje é um link de dev, ver nota 1) |
| CT-07 | Win10 | PENDENTE (manual) | Abre a TUI (interativo) |
| CT-08 | Win10, PowerShell `Measure-Command` | PARCIAL: só o `--version` | Mediana de 5 execuções, com 1 de aquecimento antes: 2.0.0 via `mclaude.cmd` (npm, Node) **116 ms** (116, 129, 118, 115, 114). 2.0.0 via `node dist/cli.js` direto **102 ms**. O shim `~/.bun/bin/mclaude.exe` fez **108 ms**, mas roda a 2.0.0 deste repo, e não a 1.0.39 (nota 1). **Antes (1.0.39 no Bun): N/A**, porque ela não está instalada. O tempo até o menu da TUI está PENDENTE (manual) |
| CT-09 a CT-13 | Win10 (WT, conhost, PowerShell) | PENDENTE (manual) | TUI interativa, redimensionamento, senha mestra, Ctrl+C |
| CT-14 a CT-16 | Win10 | PENDENTE (manual) | Sessões reais do Claude Code |
| CT-17 | Win10 | PENDENTE (manual) | O caminho OAuth só é alcançável pela TUI (exit 3). O código trata o erro de spawn com `printClaudeNotFound()` (cli.ts), mas o fluxo não foi executado |
| CT-18 | Win10, Node 22 `--experimental-strip-types`, dir temporário | PARCIAL: PASS na função | `cleanStaleSessionSettings()` removeu `settings-999999-*.json` (PID morto) e manteve o arquivo do PID vivo, o arquivo da própria sessão e um arquivo fora do padrão. O ciclo real (fechar o Claude Code, matar o mclaude à força) está PENDENTE (manual) |
| CT-19 | Win10 | PENDENTE (manual) | Chamada real à API do provider |
| CT-20, CT-21 | Win10 | PENDENTE (manual) | Ollama/LM Studio e proxy local. O CT-21 exige Node ≥ 22.21 e a máquina tem a v22.17.0 |
| CT-22 a CT-25 | Win10 | PENDENTE (manual) | Update real via npm/pnpm/bun e terminal não elevado |
| CT-26 | Vitest | PARCIAL: PASS nos unitários | `src/services/install-detect.test.ts` cobre a detecção `ephemeral`/`dev-link` e passou. A mensagem na TUI via `npx` e via `pnpm link --global` está PENDENTE (manual) |
| CT-27 | Win10 | PENDENTE (manual) | Dados reais da 1.0.39 |
| macOS / Linux | — | N/A | Sem acesso. O CI cobre o automatizado |

Nota 1: o pré-requisito "mclaude 1.0.39 instalado via Bun" não vale mais nesta máquina. `~/.bun/install/global/node_modules/@leogomide/multi-claude` é um symlink para este repositório (atualizado em 2026-09-11) e `mclaude --version` responde `2.0.0`. Antes do CT-02, do CT-03 e da medição "antes" do CT-08, reinstalar a 1.0.39 (`bun add -g @leogomide/multi-claude@1.0.39`).

Nenhum FAIL encontrado no que foi executado. O publish continua bloqueado pelos CTs pendentes.
