# 003 - Selecao agindo em indice defasado (Enter seleciona o item errado)

## Prompt base

"pois verifique o porque os testes estao falhando e corrija por favor"

Aprovação do dev: pedido direto durante a sessão (correção reativa, sem gate zero prévio).

## Descricao

Investigação das 3 falhas do `bun test` herdadas do plano 002 (`2. Navigate to Manage Providers`, `3. Navigate to Settings`, `5. Select OpenRouter`). A hipótese registrada no 002-C — drift na contagem de `DOWN` do smoke test — **estava errada**.

A navegação está correta: instrumentando o `GroupedSelect`, 5 `DOWN` levam o `❯` até `Settings`, como o teste espera. O que falha é o **Enter**: no momento do `key.return`, o handler lê `activeIndex=4` do seu closure enquanto a tela já renderizou o índice 5.

Causa: o Ink re-inscreve o handler do `useInput` através de um efeito. Quando a tecla chega antes desse efeito rodar, quem atende é o handler do render **anterior**, e ele lê estado defasado do closure. As setas escapavam porque usavam `setState` funcional (`prev => ...`), imune ao closure; o Enter não, porque indexa `allItems[activeIndex]` direto.

Não é artefato do harness de teste: medindo o intervalo entre a última seta e o Enter, com 150ms e 300ms o índice sai errado; com 600ms e 1200ms sai certo. **Em uso real, quem confirma rápido depois da seta seleciona o item de cima.**

## Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Fonte de verdade do índice | `useRef` atualizado no próprio handler | O ref é o mesmo objeto em todos os renders, então um handler antigo lê o valor atual. Elimina a classe do bug em vez de mascarar o sintoma |
| Sincronia com o estado | `useLayoutEffect` sem array de deps | Roda no commit, antes do `useEffect` do Ink; cobre resets externos (`setActiveIndex(0)` na busca, troca de lista) |
| Estado mantido | Sim, `useState` continua para render | O ref não dispara render; a UI precisa do state |
| Semântica de navegação | Preservada por componente | `GroupedSelect`/`ChecklistSelect` continuam circulando (módulo); `StartClaudeFlow` continua com clamp nas pontas |
| `SearchableSelect` | Intocado | Seu `useInput` só trata `escape`, não indexa nada |
| `CyanSelectInput` | Intocado | Não usa `useInput` |
| Escopo além dos testes | `StartClaudeFlow` e `ChecklistSelect` incluídos | Mesmo padrão exato; na lista de modelos o efeito é **lançar o Claude Code no modelo errado** — deixar isso de pé sabendo da causa seria pior que o desvio de escopo |
| Teste 5 do smoke | Asserção atualizada | Ela codificava a precedência antiga (id cru do usuário). O 002-B tornou a entrada da API canônica (RN-05) — a expectativa é que estava velha, não o código |

## Estrutura do Plano

| Arquivo | Descricao | Dependencia |
|---------|-----------|-------------|
| 003-A | Fix nos 3 componentes + smoke test (asserção do 5, regressões 6 e 7) | - |

## Regras de Negocio

- RN-01: Enter seleciona sempre o item destacado por `❯`, independente do intervalo desde a última seta
- RN-02: idem para a lista de modelos e a de instalações do `StartClaudeFlow`
- RN-03: idem para a barra de espaço do `ChecklistSelect` (marcar o item destacado)
- RN-04: a semântica de navegação de cada componente (circular vs. clamp) permanece a de antes
- RN-05: lista vazia não quebra a navegação nem o Enter

## Riscos

- R-01: escrever em ref durante o commit é escape hatch do React. Mitigado usando `useLayoutEffect` (só roda em render commitado), não escrita no corpo do render.
- R-02: se a lista encolher entre renders, o índice pode passar do fim até a próxima tecla. O lookup é guardado por `if (item)` e a navegação se auto-corrige (módulo/clamp). Condição pré-existente, não agravada.

## Resumo de Implementacao

Concluído. `bun test`: **7 pass / 0 fail** (antes: 2 pass / 3 fail).

- **`src/components/common/GroupedSelect.tsx`**: `activeIndexRef`/`allItemsRef` + `useLayoutEffect` de sincronia; helper `moveActive(delta)` com módulo; `key.return` lê dos refs.
- **`src/components/common/ChecklistSelect.tsx`**: mesmo padrão; a barra de espaço passou a marcar o item dos refs.
- **`src/components/app/StartClaudeFlow.tsx`**: refs para modelo e instalação, helpers `moveModelActive`/`moveInstallationActive` com clamp; o reset por busca (`useEffect [query]`) também zera o ref.
- **`src/smoke.test.tsx`**: asserção do teste 5 atualizada para a precedência da API (RN-05 do 002) — agora exige `GPT-4o` e proíbe `openai/gpt-4o` duplicado; testes 6 e 7 novos.

### Verificacao das regressoes

Cada teste novo foi checado revertendo **apenas** o fix correspondente:

| Reversão | Resultado |
|----------|-----------|
| `GroupedSelect` no estado original | testes 2, 3, 5 e 6 falham; restaurado → 7 pass |
| Só o lookup por ref do `StartClaudeFlow` | teste 7 falha; restaurado → 7 pass |

`bunx tsc --noEmit` limpo. `biome check`: contagem de avisos por arquivo **idêntica ao HEAD** (GroupedSelect 5, ChecklistSelect 3, StartClaudeFlow 9, smoke.test 2) — nenhum aviso novo.
