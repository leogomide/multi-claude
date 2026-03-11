# Análise de Provedores com Planos de Assinatura Mensal para Coding via LiteLLM e multi-claude

**Data:** 2026-03-11
**Objetivo:** Identificar provedores com planos mensais (flat-rate ou quota fixa) para uso com Claude Code via multi-claude ou LiteLLM proxy, visando redução de custos.

---

## Sumário Executivo

A pesquisa cobriu 11 provedores de IA com foco em planos de assinatura mensal para codificação. As principais conclusões:

1. **A maioria dos provedores com planos mensais já está integrada no multi-claude** (MiniMax, Alibaba, BytePlus, Z.AI, Anthropic OAuth, Moonshot)
2. **Via LiteLLM**, os provedores adicionais com assinatura mensal são ChatGPT Pro/Max e GitHub Copilot, ambos com ressalvas (ToS/instabilidade)
3. **Melhor custo-benefício**: MiniMax Starter ($10/mês) e Alibaba Lite ($10/mês com promo de $3)
4. **Para uso ilimitado**: ChatGPT Pro ($200/mês) via LiteLLM é a única opção flat-rate verdadeiramente ilimitada, mas com risco de violação de ToS

---

## O que é o LiteLLM?

O LiteLLM é um proxy Python que expõe uma API OpenAI-compatible em `http://localhost:4000`. Ele suporta **108+ provedores** e pode rotear requests para qualquer um deles, agindo como um "tradutor universal" entre o Claude Code e qualquer provedor de IA.

### Fluxo de uso com multi-claude:
1. Instalar LiteLLM: `pip install 'litellm[proxy]'`
2. Configurar `config.yaml` com os modelos desejados
3. Iniciar proxy: `litellm --config config.yaml`
4. No multi-claude, adicionar provedor LiteLLM apontando para `http://localhost:4000`
5. Claude Code conecta via LiteLLM proxy → roteado para o provedor final

**Limitação:** O LiteLLM roda como processo separado (Python). O multi-claude não gerencia seu lifecycle — apenas conecta a ele como endpoint.

---

## Provedores com Planos Mensais — Via LiteLLM (bridge assinatura → API)

Estes provedores possuem assinaturas de consumidor que o LiteLLM converte em acesso API programático:

### 1. ChatGPT Pro/Max (OpenAI)

| Campo | Detalhes |
|-------|---------|
| **Prefixo LiteLLM** | `chatgpt/` |
| **Planos** | Plus ($20/mês), Pro ($200/mês) |
| **Modelos** | `chatgpt/gpt-5.4`, `chatgpt/gpt-5.4-pro`, `chatgpt/gpt-5.3-codex`, `chatgpt/gpt-5.3-codex-spark`, `chatgpt/gpt-5.3-instant` |
| **Auth** | OAuth device code flow (autenticação via browser) |
| **Endpoints** | `/responses` (nativo), `/chat/completions` (bridge) |
| **Status multi-claude** | ❌ Requer LiteLLM como proxy |

**Prós:**
- Pro ($200/mês) dá acesso ilimitado a GPT-5.2 Pro, o1 Pro, Codex
- Modelos Codex (`gpt-5.3-codex`) são otimizados para coding
- Única opção verdadeiramente "ilimitada"

**Contras:**
- Rejeita `max_tokens`, `max_output_tokens`, `max_completion_tokens` e `metadata` (LiteLLM auto-remove)
- Possível `output_config` error com alguns modelos
- Bridge de assinatura de consumidor — pode violar ToS da OpenAI
- Plus ($20/mês) tem quotas muito limitadas

**Quando usar:** Desenvolvimento heavy que precisa de modelos GPT-5 com uso ilimitado e não se importa com o risco de ToS.

---

### 2. GitHub Copilot

| Campo | Detalhes |
|-------|---------|
| **Prefixo LiteLLM** | `github_copilot/` |
| **Planos** | Free ($0, 50 premium req), Pro ($10/mês, 300 req), Pro+ ($39/mês, 1500 req) |
| **Modelos** | `github_copilot/gpt-4`, `github_copilot/gpt-5.1-codex`. Pro+ inclui Claude Opus 4 e o3 |
| **Auth** | OAuth device flow via GitHub |
| **Status multi-claude** | ❌ Requer LiteLLM como proxy |

**Prós:**
- Pro ($10/mês) é extremamente barato para acesso a GPT-4 e coding models
- Pro+ ($39/mês) inclui Claude Opus 4 e o3
- Tier gratuito disponível

**Contras:**
- **Integração instável no LiteLLM** (headers faltantes como `Editor-Version`, endpoints não suportados)
- Não é verdadeiramente ilimitado — todos os tiers têm limites de premium requests
- Risco de **ban por uso automatizado excessivo** (projetado para IDE, não API proxy)
- Viola ToS se usado puramente como API proxy

**Quando usar:** Experimentação ou uso leve. Não recomendado para uso pesado ou produção.

---

### 3. Claude Max (Anthropic)

| Campo | Detalhes |
|-------|---------|
| **Prefixo LiteLLM** | `anthropic/` com OAuth forwarding |
| **Planos** | Max 5x ($100/mês), Max 20x ($200/mês) |
| **Modelos** | Claude Opus 4.6, Sonnet 4.5, todos os Claude |
| **Auth** | Dual: `x-litellm-api-key` + OAuth token forwarded |
| **Config LiteLLM** | Requer `forward_client_headers_to_llm_api: true` |
| **Status multi-claude** | ✅ JÁ INTEGRADO nativamente via OAuth |

**Prós:**
- Suporte nativo no multi-claude (sem LiteLLM)
- Melhor qualidade para Claude Code (é o ecossistema nativo)
- Free 6 meses Max 20x para maintainers OSS (5k+ GitHub stars ou 1M+ npm downloads)

**Contras:**
- Não é ilimitado — 5x ou 20x dos limites Pro
- Usage compartilhado entre Claude web e Claude Code

**Quando usar:** Uso principal do Claude Code. O caminho oficial e mais estável.

---

### 4. Google Gemini

| Campo | Detalhes |
|-------|---------|
| **Prefixo LiteLLM** | `gemini/` (AI Studio) ou `vertex_ai/` (Vertex) |
| **Planos** | AI Plus ($7.99/mês), AI Pro ($19.99/mês), AI Ultra ($249.99/mês) |
| **Modelos** | Gemini 3 Pro, 3.1 Pro, Flash |
| **Status multi-claude** | ⚠️ Possível via LiteLLM, não integrado diretamente |

**Prós:**
- Free tier generoso (1000 Flash requests/dia)
- AI Pro ($19.99/mês) acessível

**Contras:**
- Assinatura melhora quotas do Gemini CLI, não dá acesso API ilimitado
- Vertex AI é sempre pay-per-token
- Bridge parcial via LiteLLM

**Quando usar:** Se já usa Gemini CLI e quer quotas maiores. Não é o melhor caminho para Claude Code.

---

## Provedores com Planos Mensais — Integráveis Diretamente no multi-claude

Estes provedores possuem endpoints Anthropic-compatible e podem ser usados diretamente no multi-claude sem LiteLLM:

### 5. MiniMax — ⭐ MELHOR CUSTO-BENEFÍCIO

| Campo | Detalhes |
|-------|---------|
| **Planos** | Starter ($10/mês), Plus ($20/mês), Max ($50/mês) + variantes High-Speed |
| **Modelos** | MiniMax-M2.5 (SWE-bench **80.2%**), M2.5-Lightning (100 tok/s), M2.1, M2 |
| **Endpoint** | `https://api.minimax.io/anthropic` |
| **Status multi-claude** | ✅ JÁ INTEGRADO (template `minimax`) |

**Detalhamento dos planos:**

| Plano | Preço | Equivalência declarada |
|-------|-------|----------------------|
| Starter | $10/mês | ~ Claude Max 5x ($100/mês) |
| Plus | $20/mês | ~ Claude Max 20x ($200/mês) |
| Max | $50/mês | > Claude Max 20x |
| High-Speed Starter | $10/mês | Lightning (100 tok/s) |
| High-Speed Plus | $20/mês | Lightning com mais quota |

**Prós:**
- **10x mais barato** que Claude Max 5x (se a equivalência declarada for precisa)
- M2.5 praticamente empata com Opus 4.6 no SWE-bench (80.2 vs 80.9)
- Lightning a 100 tok/s é extremamente rápido
- API pricing fora do plano: $0.30/$1.20 por 1M tokens

**Contras:**
- "Equivalência" com Claude Max é autodeclarada — verificar na prática
- Modelo menos testado que Claude para tarefas complexas de coding

**Quando usar:** Budget principal para coding pesado. Melhor relação qualidade/preço do mercado.

---

### 6. Alibaba Cloud Coding Plan (DashScope)

| Campo | Detalhes |
|-------|---------|
| **Planos** | Lite (~$10/mês, promo $3 primeiro mês), Pro (~$50/mês, promo $15 primeiro mês) |
| **Modelos** | Qwen3.5, GLM-5, MiniMax M2.5, Kimi K2.5 (troca livre entre os 4) |
| **Endpoint** | `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic` |
| **Status multi-claude** | ✅ JÁ INTEGRADO (template `alibaba`) |

**Detalhamento dos planos:**

| Plano | Preço | Requests/mês | Promo 1º mês |
|-------|-------|-------------|--------------|
| Lite | ~$10/mês | 18.000 | $3 |
| Pro | ~$50/mês | 90.000 | $15 |

**Prós:**
- **4 modelos top-tier** em um único plano (maior variedade do mercado)
- Promo de primeiro mês é excelente para teste ($3 ou $15)
- Qwen3.5 e GLM-5 são modelos muito competitivos
- ~3x equivalente ao uso do Claude Code no plano Lite

**Contras:**
- Cada "request" é uma invocação de modelo; uma tarefa de coding usa 5-30 invocações
- Promos de primeiro mês têm quota diária limitada
- Modelos chineses podem ter limitações com prompts em inglês complexos

**Quando usar:** Quando quer testar múltiplos modelos com um único plano. Excelente para diversificação.

---

### 7. BytePlus ModelArk

| Campo | Detalhes |
|-------|---------|
| **Planos** | A partir de $5/mês (primeiro mês para novos usuários), até 6 meses consecutivos |
| **Modelos** | Bytedance-Seed-Code, DeepSeek-V3.2, GLM-4.7, Kimi-K2, GPT-OSS + **auto mode** |
| **Endpoint** | `https://ark.ap-southeast.bytepluses.com/api/coding` |
| **Status multi-claude** | ✅ JÁ INTEGRADO (template `byteplus`) |

**Prós:**
- **$5/mês** — menor preço de entrada com múltiplos modelos
- **Auto mode** seleciona o modelo ótimo para cada tarefa automaticamente
- Programa de referral dá 10% em vouchers
- Suporta Claude Code, Cursor, Cline nativamente

**Contras:**
- Quota-based, reseta cada ciclo
- Modelos podem ser menos potentes que MiniMax M2.5 ou Claude
- Preço promocional — verificar preço regular

**Quando usar:** Entrada mais barata possível com acesso a múltiplos modelos. Ideal para teste e uso leve.

---

### 8. Z.AI GLM

| Campo | Detalhes |
|-------|---------|
| **Planos** | Lite ($3/mês), Pro ($15/mês), Max (~$30/mês), Enterprise (custom) |
| **Modelos** | GLM-5 (SWE-bench **77.8%**), GLM-5-Code, GLM-4.7 |
| **Endpoint** | `https://api.z.ai/api/anthropic` |
| **Status multi-claude** | ✅ JÁ INTEGRADO (template `zai`) |

**Detalhamento dos planos:**

| Plano | Preço | Prompts | Janela de uso |
|-------|-------|---------|---------------|
| Lite | $3/mês | 120 | 5 horas |
| Pro | $15/mês | 600 | sem limite |
| Max | ~$30/mês | mais | sem limite |

**Prós:**
- **$3/mês** — menor preço absoluto do mercado
- GLM-5 é competitivo no SWE-bench (77.8)
- GLM-5-Code otimizado para coding

**Contras:**
- Lite tem apenas 120 prompts e janela de 5 horas — muito limitado
- Preços foram ajustados para cima recentemente (fev 2026)
- GLM-5 consome mais quota que GLM-4.7

**Quando usar:** Budget extremamente limitado ou uso leve/esporádico.

---

### 9. Moonshot AI (Kimi)

| Campo | Detalhes |
|-------|---------|
| **Planos** | Pay-as-you-go ($0.60/$3.00 por 1M tokens), disponível via Alibaba Coding Plan |
| **Modelos** | Kimi K2.5 (256k context), K2-thinking |
| **Endpoint** | `https://api.moonshot.ai/anthropic` |
| **Status multi-claude** | ✅ JÁ INTEGRADO (template `moonshot`) |

**Prós:**
- K2.5 com 256k de contexto é excelente para bases de código grandes
- Disponível dentro do Alibaba Coding Plan (melhor custo-benefício)
- Kimi Code CLI disponível para workflows de terminal

**Contras:**
- Sem plano de assinatura próprio (pay-per-token ou via Alibaba)
- API requer recarga mínima de $1
- Cache hit a $0.10/M tokens é bom, mas output a $3.00/M é caro

**Quando usar:** Melhor acessado via Alibaba Coding Plan. Direto, use para bases de código grandes que precisam de contexto longo.

---

## Provedores Pay-per-Token (Sem Plano Mensal, mas com Bom Custo)

### 10. Mistral Codestral

| Campo | Detalhes |
|-------|---------|
| **Prefixo LiteLLM** | `codestral/` (chat), `text-completion-codestral/` (FIM) |
| **Preço** | $0.30/$0.90 por 1M tokens + free tier para experimentação |
| **Modelos** | Codestral 25.01 (80+ linguagens, 256k contexto) |
| **Status multi-claude** | ❌ NÃO INTEGRADO |

~7x mais barato que GPT-4.1 para coding. Free tier disponível. Startup programs com até $30k em créditos. Suporte a FIM (fill-in-middle) para code completion.

### 11. DeepSeek

| Campo | Detalhes |
|-------|---------|
| **Preço** | V3.2: $0.028 (cache hit) / $0.28 (miss) / $0.42 (output) por 1M tokens |
| **Modelos** | DeepSeek-V3.2 (chat), DeepSeek-Reasoner (R1) |
| **Status multi-claude** | ✅ JÁ INTEGRADO (template `deepseek`) |

Extremamente barato, especialmente com cache hits ($0.028/M = 90% de economia). Free 5M tokens no signup ($8.40 de valor). Sem plano mensal mas custos tipicamente muito baixos ($5-15/mês para uso moderado).

---

## Tabela Comparativa Final

| # | Provedor | Plano | Preço/mês | Requests ou Tokens | SWE-bench | Via | Status multi-claude |
|---|----------|-------|-----------|-------------------|-----------|-----|-------------------|
| 1 | BytePlus ModelArk | Entry | **$5** | quota variável | — | direto | ✅ integrado |
| 2 | Z.AI GLM | Lite | **$3** | 120 prompts | 77.8 | direto | ✅ integrado |
| 3 | MiniMax | Starter | **$10** | ~ Claude Max 5x | 80.2 | direto | ✅ integrado |
| 4 | Alibaba Cloud | Lite | **$10** ($3 promo) | 18.000 req | — | direto | ✅ integrado |
| 5 | GitHub Copilot | Pro | **$10** | 300 premium req | — | LiteLLM | ⚠️ instável |
| 6 | Z.AI GLM | Pro | **$15** | 600 prompts | 77.8 | direto | ✅ integrado |
| 7 | Google Gemini | AI Pro | **$19.99** | quotas maiores | — | LiteLLM | ⚠️ parcial |
| 8 | ChatGPT | Plus | **$20** | quotas limitadas | — | LiteLLM | ⚠️ ToS risk |
| 9 | GitHub Copilot | Pro+ | **$39** | 1.500 premium req | — | LiteLLM | ⚠️ instável |
| 10 | MiniMax | Max | **$50** | > Claude Max 20x | 80.2 | direto | ✅ integrado |
| 11 | Alibaba Cloud | Pro | **$50** ($15 promo) | 90.000 req | — | direto | ✅ integrado |
| 12 | Anthropic | Max 5x | **$100** | 5x Pro | — | OAuth | ✅ integrado |
| 13 | ChatGPT | Pro | **$200** | ilimitado | — | LiteLLM | ⚠️ ToS risk |
| 14 | Anthropic | Max 20x | **$200** | 20x Pro | — | OAuth | ✅ integrado |
| 15 | Google Gemini | AI Ultra | **$249.99** | quotas máximas | — | LiteLLM | ⚠️ parcial |

---

## Recomendações por Caso de Uso

### Para quem quer gastar o mínimo possível:
1. **Z.AI Lite ($3/mês)** — 120 prompts, bom para uso esporádico
2. **BytePlus ($5/mês)** — múltiplos modelos com auto-select
3. **MiniMax Starter ($10/mês)** — melhor custo-benefício geral

### Para quem quer melhor qualidade por preço:
1. **MiniMax Starter ($10/mês)** — M2.5 com SWE-bench 80.2%, 10x mais barato que Claude Max 5x
2. **Alibaba Lite ($10/mês, $3 promo)** — 4 modelos top-tier em um plano
3. **Z.AI Pro ($15/mês)** — GLM-5 competitivo, 600 prompts

### Para quem quer uso pesado sem preocupação:
1. **Anthropic Max 20x ($200/mês)** — máxima qualidade, ecossistema nativo
2. **MiniMax Max ($50/mês)** — declarado equivalente a Max 20x por 1/4 do preço
3. **Alibaba Pro ($50/mês)** — 90.000 requests com 4 modelos

### Para quem quer usar modelos OpenAI via LiteLLM:
1. **ChatGPT Pro ($200/mês)** — único caminho para GPT-5 Codex ilimitado, mas com risco de ToS
2. **GitHub Copilot Pro+ ($39/mês)** — acesso a Claude Opus 4 + o3, mas integração instável

---

## Provedores NÃO Recomendados para multi-claude

| Provedor | Motivo |
|----------|--------|
| **OpenAI Codex** | Locked ao próprio CLI/IDE. API para melhores modelos "coming soon" |
| **GitHub Copilot** | Integração LiteLLM instável (headers faltantes, endpoints não suportados) |
| **xAI SuperGrok** | Assinatura ($30/mês) é apenas para chat consumidor, sem bridge API |

---

## Provedor Ainda Não Integrado que Pode Valer a Pena

### Mistral Codestral
- **Preço**: Free tier + $0.30/$0.90 por 1M tokens (pay-per-token)
- **Vantagem**: ~7x mais barato que GPT-4.1, 80+ linguagens, 256k contexto
- **FIM support**: Fill-in-middle para code completion
- **Endpoint**: Precisa verificar se tem endpoint Anthropic-compatible
- **Startup program**: Até $30k em créditos
- **Recomendação**: Investigar integração direta no multi-claude se tiver endpoint Anthropic-compatible

---

## Fontes

- [LiteLLM Providers List](https://docs.litellm.ai/docs/providers)
- [LiteLLM ChatGPT Subscription](https://docs.litellm.ai/docs/providers/chatgpt)
- [LiteLLM GitHub Copilot](https://docs.litellm.ai/docs/providers/github_copilot)
- [LiteLLM Claude Code Max Subscription](https://docs.litellm.ai/docs/tutorials/claude_code_max_subscription)
- [LiteLLM OpenAI Codex](https://docs.litellm.ai/docs/tutorials/openai_codex)
- [LiteLLM Codestral](https://docs.litellm.ai/docs/providers/codestral)
- [LiteLLM Gemini CLI](https://docs.litellm.ai/docs/tutorials/litellm_gemini_cli)
- [Alibaba Cloud Coding Plan](https://www.alibabacloud.com/help/en/model-studio/coding-plan)
- [Alibaba Coding Plan Promotions](https://www.alibabacloud.com/en/notice/alibaba_cloud_coding_plan_firstpurchase_promotions_6d9)
- [Z.ai GLM Coding Plan](https://z.ai/subscribe)
- [Z.ai GLM Coding Plan Review](https://vibecoding.app/blog/zhipu-ai-glm-coding-plan-review)
- [BytePlus ModelArk Coding Plan](https://www.byteplus.com/en/activity/codingplan)
- [MiniMax Coding Plan](https://platform.minimax.io/docs/coding-plan/intro)
- [MiniMax M2.5 Pricing Guide](https://www.verdent.ai/guides/minimax-m2-5-pricing)
- [Claude Max Plan](https://claude.com/pricing/max)
- [Claude Plans & Pricing](https://claude.com/pricing)
- [ChatGPT Plans Pricing](https://chatgpt.com/pricing/)
- [GitHub Copilot Plans](https://github.com/features/copilot/plans)
- [Gemini CLI Quotas](https://geminicli.com/docs/resources/quota-and-pricing/)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Mistral Pricing](https://mistral.ai/pricing)
- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [AI Coding Plan Comparison 2026](https://codingplan.org/en/)
- [Top 7 Coding Plans for Vibe Coding - KDnuggets](https://www.kdnuggets.com/top-7-coding-plans-for-vibe-coding)
- [Free Claude Max for OSS Maintainers](https://simonwillison.net/2026/Feb/27/claude-max-oss-six-months/)
- [Free OpenAI API via GitHub Copilot + LiteLLM](https://gist.github.com/sudhxnva/78172d7a46bf4a1e5663fc487c136121)
