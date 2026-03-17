# Analise de Viabilidade: Proxy Multi-Account para Claude Code

**Data:** 2026-03-17
**Projeto:** multi-claude (addon proposto)
**Objetivo:** Proxy que roteia requisicoes do Claude Code entre multiplas contas OAuth cadastradas

---

## Resumo Executivo

| Aspecto | Avaliacao |
|---------|-----------|
| Viabilidade tecnica | **ALTA** - totalmente possivel |
| Complexidade de implementacao | **MEDIA** - existem projetos open-source de referencia |
| Conformidade com ToS | **INVIAVEL** - viola explicitamente os termos da Anthropic |
| Risco para usuarios | **CRITICO** - suspensao de todas as contas envolvidas |

**Veredito: Tecnicamente viavel, mas legalmente proibido pela Anthropic desde janeiro de 2026.**

---

## 1. Como o Claude Code se Comunica com a API

### Endpoint e Protocolo

- **URL base:** `https://api.anthropic.com/v1/messages`
- **Protocolo:** HTTP com SSE (Server-Sent Events) para streaming — **nao usa WebSockets**
- **Sem certificate pinning:** Claude Code e uma aplicacao Node.js/Bun que respeita variaveis de proxy padrao

### Autenticacao OAuth vs API Key

| Tipo | Header | Formato do Token |
|------|--------|-----------------|
| API Key | `x-api-key: sk-ant-...` | Chave fixa, sem expiracao |
| OAuth | `Authorization: Bearer sk-ant-oat01-...` | Token temporario (~8h), requer refresh |

### Headers Obrigatorios

```
anthropic-version: 2023-06-01
content-type: application/json
anthropic-beta: oauth-2025-04-20  (obrigatorio para OAuth)
```

### Streaming SSE

Eventos retornados: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`, `ping`

### Validacao de System Prompt

A Anthropic valida server-side que requisicoes OAuth contenham como **primeiro elemento** do system prompt a frase exata:
> `"You are Claude Code, Anthropic's official CLI for Claude."`

Um proxy precisaria preservar esse system prompt intacto.

---

## 2. Mecanismo de Proxy Proposto

### Arquitetura

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Claude Code │────▶│  Proxy Local/Remoto  │────▶│  api.anthropic.com│
│  (usuario)   │◀────│  (load balancer)     │◀────│  (Anthropic API) │
└──────────────┘     └─────────────────────┘     └──────────────────┘
                              │
                     ┌────────┼────────┐
                     │        │        │
                   Conta A  Conta B  Conta C
                   (OAuth)  (OAuth)  (OAuth)
```

### Como Funcionaria

1. Usuario configura `ANTHROPIC_BASE_URL=http://localhost:PORT` no multi-claude
2. Proxy recebe requisicoes do Claude Code
3. Seleciona a proxima conta disponivel (round-robin, least-recently-used, ou baseado em rate limits)
4. Injeta o `Authorization: Bearer <token>` da conta selecionada
5. Encaminha a requisicao para `api.anthropic.com`
6. Faz streaming da resposta SSE de volta para o Claude Code

### Componentes Necessarios

| Componente | Descricao | Complexidade |
|-----------|-----------|--------------|
| HTTP Server | Receber requisicoes do Claude Code | Baixa |
| SSE Proxy | Forward streaming bidirecional | Media |
| Account Manager | Cadastro/remocao de contas OAuth | Baixa |
| Token Refresher | Renovar tokens expirados (~8h) | Media |
| Load Balancer | Rotear entre contas disponiveis | Baixa |
| Rate Limit Tracker | Monitorar uso por conta | Media |
| Health Checker | Verificar se contas estao ativas | Baixa |

---

## 3. Viabilidade Tecnica — Detalhada

### 3.1. Roteamento de Requisicoes

**Viavel.** O `ANTHROPIC_BASE_URL` e oficialmente suportado pelo Claude Code para redirecionar trafego. Basta apontar para o proxy local:

```bash
ANTHROPIC_BASE_URL=http://localhost:8787
```

O Claude Code enviara todas as requisicoes para esse endpoint em vez de `api.anthropic.com`.

### 3.2. Streaming SSE

**Viavel com cuidado.** O proxy precisa:
- Manter a conexao HTTP aberta durante toda a resposta
- Fazer forward dos chunks SSE em tempo real (sem buffering)
- Propagar corretamente headers como `Transfer-Encoding: chunked`
- Lidar com timeouts longos (respostas podem levar minutos)

### 3.3. Gerenciamento de Tokens OAuth

**Viavel, mas complexo.** Desafios:
- **Expiracao:** Tokens expiram em ~8 horas, exigindo refresh automatico
- **Refresh tokens single-use:** Ao usar um refresh token, o anterior e invalidado server-side
- **Race condition:** Se duas requisicoes tentam refresh simultaneamente, uma falhara
- **Solucao:** Mutex/lock no refresh, com fila de requisicoes aguardando o novo token

```
Token Lifecycle:
  Login OAuth ──▶ Access Token (8h) + Refresh Token (single-use)
  Expiracao ──▶ Refresh Token ──▶ Novo Access + Novo Refresh
  Race Condition ──▶ ERRO (token ja usado)
```

### 3.4. Load Balancing

**Viavel.** Estrategias possiveis:

| Estrategia | Descricao | Adequacao |
|-----------|-----------|-----------|
| Round-robin | Alterna sequencialmente | Boa para uso uniforme |
| Least-used | Prioriza conta com menos uso | Melhor distribuicao |
| Rate-limit aware | Desvia de contas no limite | Ideal |
| Sticky session | Mantém conversa na mesma conta | Evita problemas de contexto |

**Nota importante:** Cada requisicao do Claude Code e independente (stateless do ponto de vista da API). Nao ha sessao server-side, entao round-robin funciona sem problemas.

### 3.5. Rate Limits por Plano

| Plano | Preco | Limite 5h | Limite Semanal |
|-------|-------|-----------|----------------|
| Pro | $20/mo | ~45 msgs | ~40-80h Sonnet/semana |
| Max 5x | $100/mo | ~225 msgs | ~140-280h Sonnet/semana |
| Max 20x | $200/mo | 20x Pro | Maior alocacao |

**Com 3 contas Pro ($60/mo):** ~135 msgs/5h, ~120-240h Sonnet/semana
**Comparacao Max 5x ($100/mo):** ~225 msgs/5h, ~140-280h Sonnet/semana

### 3.6. Projetos Open-Source de Referencia

Ja existem projetos que fazem exatamente isso:

1. **[ccproxy-api](https://github.com/CaddyGlow/ccproxy-api)** — Reverse proxy com plugin `credential_balancer` que rotaciona credenciais. Mais diretamente relevante.

2. **[anthropic-max-router](https://github.com/nsxdavid/anthropic-max-router)** — Router dual (Anthropic + OpenAI) para Claude MAX. Implementa OAuth PKCE completo, validacao de system prompt, gerenciamento de tokens.

3. **[LLM-API-Key-Proxy](https://github.com/Mirrowel/LLM-API-Key-Proxy)** — Gateway universal com load-balancing, key rotation e failover.

4. **[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)** — Wrapa Claude Code como API service, suporta troca entre multiplas contas com dashboard visual.

5. **[horselock/claude-code-proxy](https://github.com/horselock/claude-code-proxy)** — Usa OAuth do Claude Code para chamadas diretas a API.

---

## 4. Impedimento Legal — Termos de Servico

### 4.1. Proibicao Explicita

**Desde janeiro de 2026, a Anthropic proibe explicitamente o uso de tokens OAuth de contas consumer (Free/Pro/Max) em qualquer produto que nao seja o Claude Code oficial.**

> "Using OAuth tokens obtained through Claude Free, Pro, or Max accounts in any other product, tool, or service — including the Agent SDK — is not permitted and constitutes a violation of the Consumer Terms of Service."

### 4.2. Acoes da Anthropic

| Data | Acao |
|------|------|
| Jan 2026 | Ativacao de protecoes server-side bloqueando ferramentas third-party |
| Fev 2026 | Envio de notificacoes legais (takedown) para projetos como OpenCode |
| Continuo | Monitoramento ativo de padroes de uso anomalos |

### 4.3. Mecanismos de Deteccao

A Anthropic implementou multiplas camadas de deteccao:

1. **Validacao de system prompt** — Verifica a presenca exata do prompt do Claude Code oficial
2. **Deteccao de client spoofing** — Identifica tentativas de se passar pelo Claude Code
3. **Monitoramento de padroes** — Detecta padroes de uso anomalos (multiplas contas, IPs similares)
4. **Rate de refresh tokens** — Frequencia anomala de refreshes indica uso automatizado

### 4.4. Riscos para o Usuario

- **Suspensao imediata** de todas as contas envolvidas
- **Sem reembolso** — contas banidas perdem acesso ao servico
- **Deteccao provavel** — multiplas contas com padroes similares de um mesmo IP sao facilmente detectaveis
- **Precedente legal** — Anthropic ja tomou acoes legais contra projetos similares

### 4.5. Contexto da Comunidade

Houve forte reacao negativa da comunidade de desenvolvedores (incluindo DHH), mas a Anthropic manteve a posicao e continua aplicando ativamente as restricoes.

---

## 5. Alternativas Viaveis

### 5.1. API Keys (Billing por Token) — PERMITIDO

Em vez de contas OAuth consumer, usar multiplas API keys com billing por uso:

```
Conta API 1 ──▶ sk-ant-api-key-1 ──▶ Billing por token
Conta API 2 ──▶ sk-ant-api-key-2 ──▶ Billing por token
Conta API 3 ──▶ sk-ant-api-key-3 ──▶ Billing por token
```

**Pros:** Totalmente permitido, sem rate limits de consumer
**Contras:** Custo muito maior (billing por token, sem flat-rate)

O multi-claude **ja suporta** providers com API key. Bastaria adicionar um modo "pool" que rotaciona entre multiplas API keys do mesmo provider.

### 5.2. Provedores Terceiros com Rate Limits Maiores — PERMITIDO

Usar provedores como OpenRouter, Requesty, Z.AI etc. que oferecem acesso a modelos Claude via API com seus proprios limites:

**Pros:** Permitido, sem risco de ban da Anthropic
**Contras:** Custo variavel, possivel latencia adicional

### 5.3. Claude Max 20x ($200/mo) — PERMITIDO

Para quem precisa de mais capacidade, o plano Max 20x oferece 20x os limites do Pro, o que equivale a ~20 contas Pro:

**Pros:** Solucao oficial, sem risco, sem proxy
**Contras:** $200/mo vs $60/mo (3x Pro)

### 5.4. Pool de API Keys (mesmo provider) — MELHOR ALTERNATIVA

Implementar no multi-claude um modo onde um provider pode ter **multiplas API keys** e o sistema rotaciona automaticamente:

```typescript
// Conceito
interface ProviderPool {
  templateId: string;
  apiKeys: string[];          // Multiplas keys
  strategy: "round-robin" | "least-used" | "failover";
  currentIndex: number;
}
```

Isso funcionaria com qualquer provider de API (OpenRouter, Requesty, etc.) e seria totalmente dentro dos ToS.

---

## 6. Conclusao e Recomendacao

### Viabilidade Tecnica: ALTA

- O protocolo (HTTP + SSE) e facilmente proxiavel
- `ANTHROPIC_BASE_URL` oficialmente suportado para redirecionamento
- Existem 5+ projetos open-source de referencia
- Complexidade de implementacao estimada: **2-3 semanas** para um MVP funcional

### Viabilidade Legal: INVIAVEL para OAuth Consumer

- Viola explicitamente os ToS da Anthropic
- Deteccao ativa implementada server-side
- Risco de suspensao de todas as contas envolvidas
- Anthropic ja tomou acoes legais contra projetos similares

### Recomendacao

**Nao implementar proxy para contas OAuth consumer.**

Em vez disso, considerar:

1. **Pool de API Keys** no multi-claude — rotacao automatica entre multiplas API keys do mesmo provider (100% dentro dos ToS, facil de implementar)
2. **Suporte a provedores terceiros** — ja existente no multi-claude, poderia ser melhorado com failover automatico entre providers
3. **Documentar alternativas** para usuarios que precisam de mais capacidade (Max 20x, API billing, provedores terceiros)

---

## Apendice: Stack Tecnica (caso fosse implementado)

Para referencia futura, caso a Anthropic mude os ToS:

| Componente | Tecnologia Sugerida |
|-----------|-------------------|
| Runtime | Bun (consistente com multi-claude) |
| HTTP Server | Bun.serve() ou Hono |
| SSE Proxy | Streaming nativo do Bun |
| Storage | SQLite (bun:sqlite) ou JSON |
| Token Management | Mutex + refresh queue |
| UI de Config | Ink (consistente com multi-claude) |
| Monitoramento | Dashboard web simples |
