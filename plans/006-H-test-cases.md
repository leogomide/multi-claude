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

- [ ] **CT-04** `npm i -g ./leogomide-multi-claude-2.0.0.tgz` (terminal elevado):
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

_(preencher após a execução, com a tabela CT × ambiente × resultado)_
