# 005-E - Test cases (execucao manual)

> Preencher os resultados apos executar manualmente. Este arquivo permanece em `plans/` ate a execucao; INDEX + steps A/B/C/D seguem para `plans/done`.

## Status (005-A..D concluidos em 2026-09-03)

Nenhum TC abaixo foi executado — todos dependem de TUI, de um gateway no ar ou de um launch real do Claude Code.

O que **ja foi verificado automaticamente** e nao precisa ser reprovado aqui (`bun test`, 64 pass):

| Coberto por teste | Onde |
|-------------------|------|
| RN-01 override vence tabela e API | `resolveModelSpec`, `getEffectiveModelsWithSource` |
| RN-02 cascata sem override | idem |
| RN-03 lookup case-insensitive | idem |
| RN-06 override em modelo default do template | `getEffectiveModelsWithSource` |
| RN-07 auto-compact derivado + clamps | `buildClaudeEnv` (838861 / clamp 100k / clamp 1M) |
| RN-08 valor manual de `.env` vence | `buildClaudeEnv` |
| RN-10 config antigo sem `modelSpecs` | `configuredProviderSchema` |
| RN-11 deteccao do prefixo `claude-` | `ignoresContextWindow` |
| Fetch do custom: aliases, 404 -> `/models`, auth, HTML, 500, chave vazia | `fetchCustomModels` (15 testes) |

**R-04 (TC-10) medido fora da TUI:** a mesma logica do `resolveContextWindow` contra `http://10.255.255.1:1234` (IP nao roteavel) devolveu `undefined` em **2997 ms**; com override presente, **0 ms** e sem tocar a rede. O TC-10 continua valendo para confirmar o comportamento no launch real.

O que **so o TC manual cobre**: as telas do wizard e de "Gerenciar modelos", o conteudo real do `config.json`, a linha `env=` do log do `runner`, a status line e o `/context` dentro da sessao.

---

## Pre-requisitos

- `bun install` na raiz e `bun link` refeito
- Debug ativado: `$env:MCLAUDE_LOG_LEVEL = "debug"` (a linha `env=` do logger `runner` e nivel debug)
- Um servidor local respondendo `/v1/models` — LM Studio (`http://localhost:1234`) ou llama.cpp (`http://127.0.0.1:8080`) servem para o TC-01
- Provider Z.AI ja configurado (usado nos TCs de override sobre tabela)
- Backup do `~/.multi-claude/config.json` antes de comecar

---

## TC-01 — Custom Provider busca modelos e janela (RN-09 caminho feliz, 005-B)

**Passos**

1. Subir o LM Studio (ou llama.cpp) com um modelo carregado
2. `mclaude` -> Manage providers -> Add a provider -> **Custom Provider**
3. Nome `Custom LMS`; URL `http://localhost:1234`; auth Bearer; chave vazia (Enter); modelo: o id que o LM Studio expoe; janela: **Enter vazio**
4. Menu principal -> `Custom LMS` -> Start Claude

**Esperado**
- A lista de modelos vem do endpoint, nao so do id digitado
- Os modelos aparecem com `<n>K ctx` na lista e `Context Window` na sidebar
- Nenhum banner de erro de fetch

**Resultado:** (preencher)

---

## TC-02 — Fallback quando o endpoint nao responde (RN-09)

**Passos**

1. Add a provider -> Custom Provider -> URL `http://localhost:59999` (porta morta)
2. Modelo `meu-modelo`; janela `262144`
3. Selecionar o provider e ir ate a lista de modelos

**Esperado**
- Aparece o banner de fallback (o mesmo `fallbackError` que ja existe hoje)
- `meu-modelo` esta listado, com `262K ctx`
- **O cadastro nao foi bloqueado** em nenhum momento — nao existe passo de validacao de chave para o custom

**Resultado:** (preencher)

---

## TC-03 — Janela informada chega ao Claude Code (RN-01, RN-07)

**Passos**

1. Lancar o provider do TC-02 com `meu-modelo`
2. Abrir o log mais recente em `~/.multi-claude/logs/`, logger `runner`, linha `env=`

**Esperado**
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS=262144`
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW=209715` (round(262144 x 0.8))

**Resultado:** (preencher)

---

## TC-04 — Enter vazio nao seta nada (RN-04)

**Passos**

1. Add a provider -> Custom Provider -> URL morta -> modelo `sem-janela` -> janela **Enter vazio**
2. Conferir `~/.multi-claude/config.json`
3. Lancar com `sem-janela` e conferir a linha `env=`

**Esperado**
- O provider **nao** tem a chave `modelSpecs` no config.json
- Nenhuma das duas vars aparece no `env=`
- Comportamento identico ao de hoje (200K assumido)

**Resultado:** (preencher)

---

## TC-05 — Override vence a tabela do template (RN-01, RN-06)

**Passos**

1. Manage providers -> Z.AI -> Manage models
2. Conferir que `GLM-4.7` aparece na lista com `— 205K ctx` (valor da tabela do 004)
3. **Definir janela de contexto** -> `GLM-4.7` -> `500000`
4. Voltar ao menu de modelos e conferir a etiqueta
5. Start Claude -> Z.AI -> `GLM-4.7` -> lancar -> conferir a linha `env=`

**Esperado**
- Passo 4: a lista passa a mostrar `— 500K ctx`
- Passo 5: `CLAUDE_CODE_MAX_CONTEXT_TOKENS=500000` e `CLAUDE_CODE_AUTO_COMPACT_WINDOW=400000`
- Confirma que o override vale para um modelo **default do template**, nao so para os do usuario

**Resultado:** (preencher)

---

## TC-06 — Limpar o override volta para a tabela (RN-02)

**Passos**

1. Manage models do Z.AI -> Definir janela de contexto -> `GLM-4.7`
2. O campo vem pre-preenchido com `500000`; apagar tudo e Enter
3. Conferir a lista e o config.json

**Esperado**
- Mensagem de "janela removida"
- A lista volta a mostrar `— 205K ctx` (valor da tabela, nao "sem janela")
- Se era o unico override, a chave `modelSpecs` **some** do config.json (nao fica `{}`)

**Resultado:** (preencher)

---

## TC-07 — Remover modelo remove o override (RN-05)

**Passos**

1. Manage models de um provider custom -> Add model `temp-model` com janela `128000`
2. Conferir `modelSpecs["temp-model"]` no config.json
3. Remove model -> `temp-model`
4. Conferir o config.json de novo

**Esperado**
- Apos o passo 3, nem `temp-model` em `models` nem a chave em `modelSpecs`
- Nenhuma entrada orfa

**Resultado:** (preencher)

---

## TC-08 — Paridade headless (RN-12)

**Passos**

1. Com o override do TC-05 ativo (`GLM-4.7` = 500000), rodar:
   `mclaude --provider zai --model GLM-4.7 -p "oi"`
2. Conferir a linha `env=` do log

**Esperado**
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS=500000` — mesmo valor que a TUI resolveu
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW=400000`

**Resultado:** (preencher)

---

## TC-09 — Headless usando a API (correcao de lacuna, RN-12)

Este TC cobre o bug que **ja existia** antes deste plano.

**Passos**

1. Com um provider OpenRouter configurado, rodar:
   `mclaude --provider openrouter --model <um modelo com ctx conhecido> -p "oi"`
2. Conferir a linha `env=`

**Esperado**
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS` presente e igual ao `context_length` que a API do OpenRouter reporta
- Antes deste plano essa var **nao aparecia** em headless para o OpenRouter

**Resultado:** (preencher)

---

## TC-10 — Gateway lento nao trava o launch (R-04)

**Passos**

1. Criar um provider custom apontando para um IP nao roteavel (ex.: `http://10.255.255.1:1234`), com um modelo **sem** janela informada
2. `mclaude --provider <esse> --model <modelo> -p "oi"` e cronometrar

**Esperado**
- O launch prossegue em ate ~3s a mais que o normal (o `Promise.race` do 005-A corta)
- Nenhuma var de contexto e setada, e nenhum erro visivel

**Resultado:** (preencher)

---

## TC-11 — Aviso do prefixo `claude-` (RN-11)

**Passos**

1. Add a provider -> Custom Provider -> URL qualquer -> modelo `claude-sonnet-4.5` -> observar a tela no campo da janela
2. Informar `1000000` e concluir
3. Lancar e conferir a linha `env=`

**Esperado**
- Passo 1: aparece o aviso de que o Claude Code ignora o valor para ids `claude-*`
- Passo 2: o cadastro **conclui normalmente** (e aviso, nao erro)
- Passo 3: a var e setada no ambiente, mas dentro da sessao o `/context` mostra 200K — o binario a descarta
- Este TC existe para documentar o comportamento, nao para prova-lo errado

**Resultado:** (preencher)

---

## TC-12 — Status line reflete a janela

**Passos**

1. Com o template de status line `default`, lancar o provider do TC-03
2. Rodar `/context` dentro da sessao

**Esperado**
- A celula `Win:` mostra `262k`, nao `200k`
- O aviso `"..." is not a model this version of Claude Code recognizes` **nao** aparece
- `/context` mostra a janela nova

**Resultado:** (preencher)

---

## TC-13 — Compatibilidade com config antigo (RN-10)

**Passos**

1. Restaurar o backup do `config.json` feito nos pre-requisitos (sem nenhum `modelSpecs`)
2. Abrir a TUI, navegar por Manage providers e Manage models
3. Lancar qualquer provider

**Esperado**
- Nada quebra, nenhum `config.json.bak` e criado
- A lista de modelos aparece sem etiqueta de ctx onde nao ha fonte
- Providers com tabela (Z.AI) continuam mostrando a janela do 004

**Resultado:** (preencher)

---

## TC-14 — Regressao: providers sem relacao com o plano

**Passos**

1. Start Claude -> DeepSeek -> `deepseek-chat` -> lancar
2. Start Claude -> Default Launch -> lancar
3. Start Claude -> provider Anthropic (OAuth), se houver

**Esperado**
- DeepSeek: nenhuma var de contexto (sem tabela, sem override, API nao reporta)
- Default Launch: nenhuma var (esse caminho nao passa por `buildClaudeEnv`)
- OAuth: nenhuma var (o branch de OAuth retorna antes)

**Resultado:** (preencher)

---

## Regras de negocio — mapa de cobertura

| RN | TC |
|----|----|
| RN-01 override vence tudo | TC-03, TC-05 |
| RN-02 cascata sem override | TC-06 |
| RN-03 case-insensitive | teste automatizado (005-D) |
| RN-04 campo opcional | TC-04 |
| RN-05 remover limpa o override | TC-07 |
| RN-06 vale para default do template | TC-05 |
| RN-07 auto-compact derivado | TC-03, TC-05 |
| RN-08 override manual de `.env` | teste automatizado (005-D) |
| RN-09 fallback do fetch | TC-02 |
| RN-10 config antigo | TC-13 |
| RN-11 prefixo `claude-` | TC-11 |
| RN-12 paridade headless | TC-08, TC-09 |
| R-04 gateway lento | TC-10 |
