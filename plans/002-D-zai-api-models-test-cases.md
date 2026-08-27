# 002-D - Test cases (execução manual)

> Preencher os resultados após executar manualmente. Este arquivo permanece em `plans/` até a execução; INDEX + steps A/B/C seguem para `plans/done`.

## Pré-requisitos

- `bun install` na raiz
- Provider Z.AI configurado com API key válida do Coding Plan
- Debug ativado: `$env:MCLAUDE_LOG_LEVEL = "debug"`

## TC-01 — Lista vinda da API (RN-01, RN-02)

**Passos**

1. Rodar `mclaude`
2. Start Claude → provider Z.AI
3. Observar a tela de seleção de modelos

**Esperado**
- Aparecem ~10 modelos (`GLM-4.5`, `GLM-4.5-Air`, `GLM-4.6`, `GLM-4.7`, `GLM-5`, `GLM-5-Turbo`, `GLM-5.1`, `GLM-5.2`, `GLM-5.3`, `GLM-5.3-Flash`), não apenas os 3 fixos
- Os nomes exibidos usam a capitalização da Z.AI (`GLM-5.3`)
- Selecionar `GLM-5.3` e lançar → log do `runner`, linha `env=`, mostra `ANTHROPIC_MODEL=glm-5.3` (id canônico minúsculo)

**Resultado:** (preencher)

## TC-02 — Sem duplicatas (RN-05)

**Passos**

1. Repetir TC-01 e procurar por entradas repetidas do mesmo modelo

**Esperado**
- `GLM-4.7` / `glm-4.7` aparece **uma única vez** — apesar de estar tanto em `defaultModels` quanto na resposta da API
- Idem para `GLM-5.3` e `GLM-5-Turbo`

**Resultado:** (preencher)

## TC-03 — Modelo salvo pelo usuário que a API não retorna (RN-06)

**Passos**

1. Manage providers → Z.AI → Manage models → confirmar que a lista salva contém entradas antigas (ex.: `GLM-5-Code`, `GLM-4.5-X`)
2. Start Claude → Z.AI

**Esperado**
- As entradas antigas continuam listadas junto dos modelos da API (dado do usuário não é apagado)

**Resultado:** (preencher)

## TC-04 — Fallback com rede indisponível (RN-03)

**Passos**

1. Desconectar a rede (ou bloquear `api.z.ai` no firewall/hosts)
2. Rodar `mclaude` → Start Claude → Z.AI

**Esperado**
- **Não** cai na tela de erro sem saída
- Tela de seleção aparece com a lista salva/fixa e um aviso amarelo: *"Nao foi possivel acessar Z.AI Coding Plan — exibindo a lista de modelos salva."* (pt-BR)
- É possível selecionar um modelo e lançar normalmente

**Resultado:** (preencher)

## TC-05 — Chave inválida classificada como auth (RN-07)

> Cobre o gotcha do HTTP 200 com erro no corpo.

**Passos**

1. Manage providers → editar a Z.AI → trocar a API key por um valor inválido
2. Start Claude → Z.AI

**Esperado**
- Fallback com aviso (RN-03), **não** uma lista vazia nem "0 modelos"
- No log, o erro é classificado como `auth` (não `unknown`)
- Restaurar a chave válida ao final

**Resultado:** (preencher)

## TC-06 — Validação de API key no cadastro (R-02)

**Passos**

1. Manage providers → Add provider → template `Z.AI Coding Plan`
2. Informar uma API key inválida e confirmar

**Esperado**
- Volta para o campo de key com a mensagem "The API key is invalid or expired." (ou equivalente no locale)
- Provider **não** é criado
- Repetir com a key válida → provider criado com sucesso

**Resultado:** (preencher)

## TC-07 — Nenhuma regressão nos demais providers (RN-08)

**Passos**

1. Start Claude → OpenRouter (fetch via API) → conferir que a lista carrega como antes
2. Start Claude → DeepSeek (lista fixa, sem fetch) → conferir que os 2 modelos fixos aparecem
3. Sidebar do Manage providers: campo "Models" do Z.AI mostra a contagem local (3+), não "via API"

**Resultado:** (preencher)

## TC-08 — Locales

**Passos**

1. Settings → trocar idioma para English e depois Español
2. Reproduzir TC-04 em cada idioma

**Esperado**
- O aviso de fallback aparece traduzido, sem chave crua (`apiModels.fallbackNotice`)

**Resultado:** (preencher)
