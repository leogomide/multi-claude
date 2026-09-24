<h1 align="center">multi-claude</h1>

<p align="center">
  <b>Português</b> · <a href="README.en.md">English</a>
</p>

<div align="center">

[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/leogomide/multi-claude/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![NPM](https://img.shields.io/badge/npm-%40leogomide%2Fmulti--claude-red)](https://www.npmjs.com/package/@leogomide/multi-claude)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org)
[![Claude Code](https://img.shields.io/badge/Claude-Code-orange)](https://docs.anthropic.com/en/docs/claude-code)

</div>

<div align="center">
  <img src="cover.png" alt="multi-claude" width="500"/>
</div>

<div align="center">

https://github.com/user-attachments/assets/d8565001-350a-46b8-ae28-6b5cc6937aa5

</div>

**Use o [Claude Code](https://docs.anthropic.com/en/docs/claude-code) com qualquer provedor de IA — e troque entre eles em segundos.**

Digite `mclaude`, escolha o provedor e o modelo num menu no terminal, e o Claude Code abre já configurado. Sem editar variável de ambiente, sem copiar chave de um lado para o outro.

---

<div align="center">
  <sub>PATROCINADO POR</sub>
  <br><br>
  <a href="https://flatt.com.br/?utm_source=github&utm_medium=sponsor&utm_campaign=multi-claude">
    <img src="assets/sponsors/flatt.png" alt="Flatt" width="72"/>
  </a>
  <h3>Flatt — inferência a preço fixo.</h3>
  <p>
    Seu agente roda o dia inteiro, o mês inteiro — e a conta não muda.<br>
    Sem contagem de token, 262 mil de contexto em todos os planos e API compatível com a Anthropic,<br>
    já integrada ao <b>mclaude</b> como provedor nativo: é o primeiro da lista, basta colar a chave.
  </p>
  <a href="https://flatt.com.br/?utm_source=github&utm_medium=sponsor&utm_campaign=multi-claude">
    <img src="https://img.shields.io/badge/Comece%20com%20a%20Flatt-4b3fe6?style=for-the-badge" alt="Comece com a Flatt"/>
  </a>
</div>

---

## Por que usar

- **20 provedores num só menu** — DeepSeek, OpenRouter, Z.AI, MiniMax, Kimi, Ollama, LM Studio e muitos outros, além de qualquer gateway compatível com a API da Anthropic.
- **Várias contas Anthropic** — alterne entre conta pessoal e de trabalho sem fazer logout.
- **Instalações isoladas** — configurações, MCPs e histórico separados por contexto (trabalho, pessoal, cliente).
- **Chaves protegidas** — suas API keys ficam criptografadas no disco, com senha mestra opcional.
- **Status line completa** — modelo, tokens, custo e uso de contexto em tempo real dentro do Claude Code.
- **Interface em português**, inglês ou espanhol.

## Instalação

Pré-requisitos: [Node.js](https://nodejs.org) 22 ou mais recente e [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
npm i -g @leogomide/multi-claude
```

Também funciona com `pnpm add -g @leogomide/multi-claude` ou `bun add -g @leogomide/multi-claude`. Para rodar sem instalar: `npx @leogomide/multi-claude`.

Para atualizar, use a opção de update dentro do app ou reinstale com o mesmo gerenciador. Para remover: `npm rm -g @leogomide/multi-claude`.

- **Só tem o Bun?** Rode com `bunx @leogomide/multi-claude`. Um `mclaude` instalado globalmente exige Node.js no PATH.
- **Atrás de proxy corporativo?** Defina `NODE_USE_ENV_PROXY=1` (Node 22.21+) junto de `HTTPS_PROXY`, e `NODE_EXTRA_CA_CERTS` se a rede usar uma CA própria.

## Como usar

```bash
mclaude
```

1. Escolha um provedor no menu principal (ou adicione um em **Gerenciar provedores**)
2. Escolha o modelo
3. Escolha a instalação (ou use a padrão)
4. O Claude Code abre com tudo configurado

Qualquer argumento extra é repassado ao Claude Code — por exemplo, `mclaude -p "explique este projeto"`.

## Provedores suportados

| Provedor | Tipo | Onde obter acesso |
|----------|------|-------------------|
| ★ Flatt | Plano de assinatura (preço fixo) | [flatt.com.br](https://flatt.com.br/?utm_source=github&utm_medium=sponsor&utm_campaign=multi-claude) |
| Anthropic | Conta Claude (OAuth) | [claude.ai](https://claude.ai) |
| Alibaba Cloud | Plano de assinatura | [Model Studio](https://bailian.console.alibabacloud.com/) |
| BytePlus ModelArk | Plano de assinatura | [BytePlus](https://www.byteplus.com/en/activity/codingplan) |
| DeepSeek | API | [platform.deepseek.com](https://platform.deepseek.com) |
| Kimi Code | Plano de assinatura | [kimi.com](https://www.kimi.com/code/docs/en/more/third-party-agents.html) |
| MiniMax | Plano de assinatura | [platform.minimax.io](https://platform.minimax.io) |
| Moonshot AI | API | [platform.moonshot.ai](https://platform.moonshot.ai) |
| NanoGPT | Agregador | [nano-gpt.com](https://nano-gpt.com/api) |
| Novita AI | API | [novita.ai](https://novita.ai) |
| OpenRouter | Agregador | [openrouter.ai](https://openrouter.ai/keys) |
| Poe | Agregador | [poe.com](https://poe.com) |
| Requesty | Agregador | [requesty.ai](https://requesty.ai) |
| Z.AI Coding Plan | Plano de assinatura | [z.ai](https://z.ai/subscribe) |
| LiteLLM Proxy | Proxy próprio | [docs.litellm.ai](https://docs.litellm.ai/docs/) |
| llama.cpp | Local | [GitHub](https://github.com/ggml-org/llama.cpp) |
| LM Studio | Local | [lmstudio.ai](https://lmstudio.ai) |
| Ollama | Local | [ollama.com](https://ollama.com) |
| OmniRoute | Local | [GitHub](https://github.com/diegosouzapw/OmniRoute) |
| 9Router | Local | [GitHub](https://github.com/decolua/9router) |
| Provedor personalizado | Qualquer API compatível com a Anthropic | — |

Provedores locais não precisam de API key. Em Flatt, OpenRouter, NanoGPT, LiteLLM e nos locais, a lista de modelos é carregada automaticamente.

### Provedor personalizado

Tem um gateway que não está na lista? Use o **Provedor personalizado**: informe um nome, a URL base e o token, e pronto. A lista de modelos é buscada no próprio endpoint. Funciona com proxies corporativos, gateways próprios e qualquer serviço compatível com a API da Anthropic.

## Várias contas Anthropic

Adicione quantas contas Anthropic (OAuth) quiser — "Trabalho", "Pessoal" — e faça login uma vez em cada. Cada conta usa sua própria instalação, com configurações, histórico e MCPs totalmente separados.

## Instalações isoladas

Por padrão o Claude Code usa `~/.claude/`. Em **Gerenciar instalações** você cria diretórios de configuração independentes e escolhe qual usar a cada sessão.

## Status line

O mclaude adiciona ao Claude Code uma status line com informações da sessão em tempo real. Escolha o modelo em **Configurações → Status line**:

```
Provider/Opus (master +45 -7)
Input:84.2k    | Output:62.8k   | Cache:20.6M
Session:3h31m  | API:1h38m      | Cost:$11.15    | $0.19/min
━━━━━━━━━━━━━━━━━━━━━━━━╌╌╌╌╌╌╌ | 153.9k/77%     | 46.1k/23% left (imminent)
```

Há também os modelos `full`, `slim`, `mini`, `cost`, `perf` e `context`.

## Automação (modo headless)

Pule o menu informando o provedor na linha de comando — útil para scripts e agentes de IA:

```bash
mclaude --provider deepseek --model deepseek-chat -p "explique esta função"
mclaude --list   # lista provedores, modelos e instalações em JSON
```

A skill [`mclaude-headless`](.claude/skills/mclaude-headless/) ensina agentes a usar o mclaude dessa forma. Veja todas as opções com `mclaude --help`.

## Segurança

As API keys são criptografadas com **AES-256-GCM** antes de irem para o disco. Para uma camada extra, ative uma senha mestra em **Configurações → Definir senha mestra**.

## Patrocinadores

<a href="https://flatt.com.br/?utm_source=github&utm_medium=sponsor&utm_campaign=multi-claude">
  <img src="assets/sponsors/flatt.png" alt="Flatt" width="40" align="left"/>
</a>

**[Flatt](https://flatt.com.br/?utm_source=github&utm_medium=sponsor&utm_campaign=multi-claude)** — inferência de modelos de linguagem por preço fixo mensal, feita para agentes de código que rodam o dia inteiro. Integrada ao mclaude como provedor nativo, o primeiro da lista.

<br clear="left"/>

## Novidades

Veja o [CHANGELOG](CHANGELOG.md) ou as [releases](https://github.com/leogomide/multi-claude/releases). O histórico também aparece dentro do app, na tela **Changelog**.

## Desenvolvimento

```bash
pnpm install             # instala e builda (prepare)
pnpm link --global       # expõe o `mclaude` local (rode `pnpm setup` uma vez antes)
pnpm build:watch         # rebuild contínuo; em outro terminal: mclaude
pnpm check-types         # checagem de tipos
pnpm test                # testes (Vitest)
pnpm lint                # biome
```

## Licença

[MIT](./LICENSE)
