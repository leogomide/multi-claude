# Anthropic-compatible API providers beyond multi-claude's list

**At least 18 additional providers offer native Anthropic Messages API endpoints** that work directly with Claude Code's `ANTHROPIC_BASE_URL` environment variable — and they're not yet in multi-claude. The ecosystem has expanded rapidly, driven especially by Chinese cloud platforms launching "coding plans" and Western gateway services adding Anthropic protocol support. Below is a complete inventory of confirmed providers, organized by category, with exact base URLs, models, and pricing.

## Direct API providers with native `/v1/messages` endpoints

These providers expose their own models through the Anthropic Messages API format without requiring a translation proxy. Each works by simply setting `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`.

**Fireworks AI** is the standout Western inference provider with confirmed Anthropic SDK compatibility. Their official documentation at `docs.fireworks.ai/tools-sdks/anthropic-compatibility` shows the base URL **`https://api.fireworks.ai/inference`** working directly with the Anthropic Python SDK. Models include DeepSeek V3p1, Kimi K2, LLaMA variants, and Qwen series — all open-source, no actual Claude models. Pricing is pay-per-use with **$1 free credits** for new users. The configuration is straightforward:

```
export ANTHROPIC_BASE_URL="https://api.fireworks.ai/inference"
export ANTHROPIC_AUTH_TOKEN="your-fireworks-api-key"
export ANTHROPIC_MODEL="accounts/fireworks/models/deepseek-v3p1"
```

**NanoGPT** at **`https://nano-gpt.com/api/v1`** offers access to **400+ models** including Claude, GPT-5, Gemini, Grok, and open-source models — all through a unified Anthropic-compatible `/v1/messages` endpoint. Non-Anthropic models are internally translated. Pricing is pure pay-per-prompt with no monthly fees, though an optional subscription offers up to 2,000 queries/day. Their Claude Code integration guide lives at `docs.nano-gpt.com/integrations/claude-code`.

**xAI / Grok** previously offered Anthropic Messages API compatibility at **`https://api.x.ai`**, supporting Grok 4 and 4.1 models. However, this endpoint is now **fully deprecated** as of early 2026. xAI's official docs state: "The Anthropic SDK compatibility is fully deprecated. Please migrate to the Responses API or gRPC." It may still function temporarily but should not be relied upon.

## Chinese cloud providers with coding plans

The most dramatic expansion has occurred among Chinese cloud providers, nearly all of which now offer Anthropic-compatible endpoints with subscription-based "coding plans" designed explicitly for Claude Code. These plans bundle multiple models under a single monthly fee with request quotas.

**Volcengine / Ark (ByteDance/字节跳动)** offers one of the most comprehensive coding plans at **`https://ark.cn-beijing.volces.com/api/coding`**. Their "Auto mode" intelligently routes requests to the best model for each task. Available models include **Doubao-Seed-2.0-Code** (ByteDance's own), GLM-4.7, DeepSeek-V3.2, Kimi-K2.5, and MiniMax-M2.5. Pricing starts at **¥40/month** for the Lite plan (~¥9 first month promotional), with ¥200/month for Pro. The Lite plan allows approximately **1,200 requests per 5-hour window** and 18,000/month. Volcengine claims costs **62.7% lower** than industry average. Documentation: `volcengine.com/docs/82379/1928262`.

**Tencent Cloud (腾讯云)** provides its endpoint at **`https://api.lkeap.cloud.tencent.com/coding/anthropic`** with Hunyuan 2.0 models alongside third-party models (MiniMax-M2.5, Kimi-K2.5, GLM-5). Pricing mirrors the industry standard: **¥40/month Lite** (first month ¥7.9), **¥200/month Pro** (first month ¥39.9). Same quota structure as Volcengine. API keys use the `sk-sp-xxxx` format. Documentation: `cloud.tencent.com/document/product/1772/128951`.

**Baidu Qianfan (百度千帆)** stands out by making **all Chat models on the platform** Anthropic-compatible. The base URL is **`https://qianfan.baidubce.com/anthropic`** for pay-as-you-go, and **`https://qianfan.baidubce.com/anthropic/coding`** for their coding plan. Models include DeepSeek-V3.2, DeepSeek-V3.2-thinking, and `qianfan-code-latest`. Requires a custom `appid` header. Documentation: `cloud.baidu.com/doc/qianfan-docs/s/6mh3e6gjp`.

**SiliconFlow (硅基流动)** is a major Chinese API aggregator at **`https://api.siliconflow.com/`** offering models from multiple providers including Kimi K2, DeepSeek, Qwen, and GLM series. They provide an automated setup script and have some free models available. Documentation: `docs.siliconflow.com/en/usercases/use-siliconcloud-in-ClaudeCode`.

**Infini-AI (无问芯穹)** offers the **most affordable coding plan** at just **¥19.9/month** for Lite — roughly $2.75 USD. Their endpoint at **`https://cloud.infini-ai.com/maas/coding`** provides access to GLM-4.5/4.6/5, MiniMax-M2/M2.5, DeepSeek, and Kimi models. Multiple reviewers cite Infini-AI as the best value in the Chinese coding plan ecosystem. Documentation: `docs.infini-ai.com/gen-studio/coding-plan/`.

**ModelScope (魔搭, Alibaba)** is notable for being **completely free** — offering **2,000 API calls per day** at **`https://api-inference.modelscope.cn`**. Models include DeepSeek-V3.1 and Qwen3-Coder variants. Requires an Alibaba Cloud account and uses API keys with the `ms-` prefix. This is backed by Alibaba Cloud compute and represents the most accessible entry point.

## Chinese coding plan pricing at a glance

| Provider | Lite plan | Pro plan | First month (Lite) | Notable models |
|----------|-----------|----------|-------------------|----------------|
| Alibaba Bailian | ¥40/mo | ¥200/mo | ¥7.9 | Qwen3.5+, GLM-5, Kimi-K2.5 |
| Volcengine (ByteDance) | ¥40/mo | ¥200/mo | ~¥9 | Doubao-Seed-Code, Auto mode |
| Tencent Cloud | ¥40/mo | ¥200/mo | ¥7.9 | Hunyuan 2.0, GLM-5 |
| Zhipu GLM | ¥49/mo | Higher tiers | — | GLM-5, GLM-4.7 |
| Infini-AI | **¥19.9/mo** | Higher | — | Multi-model access |
| Baidu Qianfan | Has plan | — | — | All Chat models |
| ModelScope | **Free** | — | — | Qwen3-Coder, DeepSeek |

All plans use a **rolling 5-hour sliding window** for rate limiting (typically ~1,200 requests per window for Lite) and support the standard `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` pattern.

## Enterprise cloud providers with Anthropic-format endpoints

Three major cloud platforms expose Claude models through native Anthropic API format, though Google and AWS use dedicated environment variables rather than `ANTHROPIC_BASE_URL`.

**Azure AI Foundry (Microsoft)** provides the most directly compatible endpoint at **`https://<resource-name>.services.ai.azure.com/anthropic`**. This accepts standard Anthropic Messages API format and works with `ANTHROPIC_BASE_URL`. Claude models deployed through Azure appear at this endpoint. Configuration uses `CLAUDE_CODE_USE_FOUNDRY=1` or the base URL approach.

**Databricks** exposes Claude through **`https://<workspace>.databricks.com/serving-endpoints/anthropic`** using native Anthropic SDK compatibility. The model identifier is `databricks-claude-sonnet-4-5`. Authentication uses Databricks personal access tokens.

**Google Vertex AI** and **Amazon Bedrock** both have first-class Claude Code support but use their own integration methods (`CLAUDE_CODE_USE_VERTEX=1` and `CLAUDE_CODE_USE_BEDROCK=1` respectively) rather than `ANTHROPIC_BASE_URL`. They can be made compatible through LiteLLM or Portkey proxy gateways if the `ANTHROPIC_BASE_URL` pattern is required.

## Gateway and router services

Several gateway services accept Anthropic Messages API format and route requests to underlying providers, adding features like fallback routing, cost tracking, and unified billing.

**Vercel AI Gateway** at **`https://ai-gateway.vercel.sh`** provides full Anthropic Messages API support including streaming, tool calls, extended thinking, and prompt caching passthrough. Models from any configured provider use the `provider/model-name` format (e.g., `anthropic/claude-sonnet-4.6`). Models are billed at list price with no markup. Configuration requires setting `ANTHROPIC_API_KEY=""` (empty string) alongside the auth token. Official documentation: `vercel.com/docs/ai-gateway/anthropic-compat`.

**Portkey** at **`https://api.portkey.ai`** is a full-featured AI gateway with Anthropic-compatible endpoints. It routes to Anthropic, Bedrock, Vertex AI, and other backends while providing automatic fallback, load balancing, budget limits, and RBAC. Has a dedicated CLI setup: `npx portkey setup`. No markup on model costs; enterprise features priced separately.

**LLMGateway** at **`https://api.llmgateway.io`** translates between Anthropic Messages API format and any supported backend. Any model in their catalog (GPT-5, Gemini, Claude, etc.) can be accessed through the Anthropic format. Currently offering a **50% discount** on Anthropic models.

**Anannas** at **`https://api.anannas.ai`** provides Anthropic Messages API compatibility routing to OpenAI, Google, Anthropic, and xAI models. Model format uses `provider/model-name` syntax.

**AgentRouter** at **`https://agentrouter.org/`** offers **$200 in free credits** for new signups and routes to Anthropic, OpenAI, DeepSeek, and Zhipu AI through an Anthropic-compatible endpoint.

**Cloudflare AI Gateway** at **`https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/anthropic`** acts as a proxy to Anthropic's own API (you still need an Anthropic API key), but adds caching, rate limiting, analytics, and unified billing through Cloudflare credits.

## Providers confirmed NOT to have Anthropic-compatible endpoints

The following providers were investigated and **do not** offer native Anthropic Messages API endpoints. All use OpenAI-compatible format exclusively and require a translation proxy (like LiteLLM, y-router, or Claude Code Router) to work with Claude Code:

- **Groq** — OpenAI-compatible only; has an open community feature request for Anthropic endpoint
- **Cerebras** — OpenAI-compatible only; has coding plans ($50/$200 month) and an MCP server for Claude Code, but no native Anthropic API
- **Together AI** — OpenAI-compatible only at `https://api.together.xyz/v1`
- **Cohere** — Proprietary API format only
- **Mistral AI** — OpenAI-compatible only at `https://api.mistral.ai/v1`
- **Perplexity** — OpenAI-compatible only
- **SambaNova** — OpenAI-compatible only
- **AI21 Labs** — Proprietary API only
- **Nebius AI**, **Hyperbolic**, **RunPod**, **Anyscale**, **Modal**, **Lepton AI** — All OpenAI-compatible only
- **NVIDIA NIM** — OpenAI-compatible only; has an open feature request on NVIDIA Developer Forums
- **Hugging Face Inference API** — OpenAI-compatible unified endpoint across 15+ providers
- **Replicate**, **DeepInfra** — OpenAI-compatible or proprietary format
- **iFlytek Spark**, **01.AI (Yi)**, **Baichuan AI**, **Stepfun** — No Anthropic-compatible endpoints found

## Complete reference of new providers for multi-claude

| Provider | Base URL | Type | Models | Pricing |
|----------|----------|------|--------|---------|
| Fireworks AI | `https://api.fireworks.ai/inference` | Direct API | DeepSeek, Kimi K2, LLaMA, Qwen | Pay-per-use |
| NanoGPT | `https://nano-gpt.com/api/v1` | Aggregator | 400+ (Claude, GPT, Gemini, open-source) | Pay-per-prompt |
| Volcengine (ByteDance) | `https://ark.cn-beijing.volces.com/api/coding` | Coding plan | Doubao-Seed-Code, GLM, DeepSeek, Kimi | From ¥9/mo |
| Tencent Cloud | `https://api.lkeap.cloud.tencent.com/coding/anthropic` | Coding plan | Hunyuan, MiniMax, Kimi, GLM | From ¥7.9/mo |
| Baidu Qianfan | `https://qianfan.baidubce.com/anthropic` | Direct API | All Qianfan Chat models | Pay-per-use + plan |
| SiliconFlow | `https://api.siliconflow.com/` | Aggregator | Kimi K2, DeepSeek, Qwen, GLM | Pay-per-use |
| Infini-AI | `https://cloud.infini-ai.com/maas/coding` | Coding plan | GLM, MiniMax, DeepSeek, Kimi | From ¥19.9/mo |
| ModelScope | `https://api-inference.modelscope.cn` | Free tier | Qwen3-Coder, DeepSeek-V3.1 | **Free** (2K/day) |
| Azure AI Foundry | `https://<resource>.services.ai.azure.com/anthropic` | Enterprise | Claude (Anthropic models) | Azure billing |
| Databricks | `https://<workspace>.databricks.com/serving-endpoints/anthropic` | Enterprise | Claude via Databricks | Databricks billing |
| Vercel AI Gateway | `https://ai-gateway.vercel.sh` | Gateway | All providers, `provider/model` format | List price, no markup |
| Portkey | `https://api.portkey.ai` | Gateway | All providers via routing | No markup |
| LLMGateway | `https://api.llmgateway.io` | Gateway | Multi-provider translation | Pay-per-use |
| Anannas | `https://api.anannas.ai` | Gateway | Multi-provider | Pay-per-use |
| AgentRouter | `https://agentrouter.org/` | Router | Anthropic, OpenAI, DeepSeek, Zhipu | $200 free credits |
| Cloudflare AI Gateway | `https://gateway.ai.cloudflare.com/v1/.../anthropic` | Proxy | Anthropic models (passthrough) | Free tier available |
| xAI/Grok ⚠️ | `https://api.x.ai` | Deprecated | Grok 4, 4.1 | — |

## Conclusion

The Anthropic Messages API has become a de facto second standard for LLM APIs alongside OpenAI's Chat Completions format. The most actionable additions for multi-claude fall into three tiers. **For free or ultra-cheap access**, ModelScope (free, 2K calls/day) and Infini-AI (¥19.9/month) are unbeatable. **For the broadest model selection**, NanoGPT (400+ models, pay-per-prompt) and Vercel AI Gateway (all providers, no markup) stand out. **For production-grade enterprise use**, Azure AI Foundry and Databricks offer native Anthropic-format endpoints with full corporate billing and compliance. The Chinese coding plan ecosystem — Volcengine, Tencent, Baidu, and Infini-AI — represents the fastest-growing segment, with standardized ¥40/200 monthly tiers and aggressive promotional pricing that can start under $2/month. Fireworks AI is the strongest Western direct-API addition, offering fast inference on open-source models with official Anthropic SDK documentation.