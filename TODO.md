# links uteis

https://code.claude.com/docs/en/headless
https://platform.claude.com/docs/en/agent-sdk/typescript


# templates

pergunte para esclarecer sua dúvidas. sugira melhorias, adicoes e/ou correções caso necessario.

-----------------------------------------------------

# correções

- adicionar status do contexto nos statuslines mais completos
  - usar conforme o modo de selecao de autocompact
    ┌───────┬────────┬────────────────┬────────────────────────────────────┐
    │ Nível │ Range  │      Cor       │            Significado             │
    ├───────┼────────┼────────────────┼────────────────────────────────────┤
    │ 1     │ 0-55%  │ white          │ Zona segura                        │
    ├───────┼────────┼────────────────┼────────────────────────────────────┤
    │ 2     │ 56-70% │ yellow         │ Aproximando da zona de compactação │
    ├───────┼────────┼────────────────┼────────────────────────────────────┤
    │ 3     │ 71-78% │ orange         │ Compactação iminente               │
    ├───────┼────────┼────────────────┼────────────────────────────────────┤
    │ 4     │ 79%+   │ red+bold+blink │ Compactando ou prestes a compactar │
    └───────┴────────┴────────────────┴────────────────────────────────────┘

Auto Compact OFF (checkbox desmarcado):

┌───────┬────────┬────────────────┬───────────────────────────────┐
│ Nível │ Range  │      Cor       │          Significado          │
├───────┼────────┼────────────────┼───────────────────────────────┤
│ 1     │ 0-60%  │ white          │ Zona segura                   │
├───────┼────────┼────────────────┼───────────────────────────────┤
│ 2     │ 61-75% │ yellow         │ Zona de atenção               │
├───────┼────────┼────────────────┼───────────────────────────────┤
│ 3     │ 76-87% │ orange         │ Considere usar /compact       │
├───────┼────────┼────────────────┼───────────────────────────────┤
│ 4     │ 88%+   │ red+bold+blink │ Crítico — sessão vai bloquear │
└───────┴────────┴────────────────┴───────────────────────────────┘

- Observação: File-based IPC é simples mas tem race conditions se TUI for killado entre write e read. 
Melhoria futura: pipes ou Unix sockets.

# apresnetação comunidade

beneficios de um projeto open source:
- mostrar que consegue entregar um projeto polido
- demonstração de workflow para entrega de um projeto
- crescimento do perfil (imagem publica)

bons aprendizados que tive fazendo o projeto:
- know how sobre TUIs 
  - limitações e problemas usando o INK (nao tem como dois processos que usam INK existirem no mesmo terminal)
  - aplicações praticas desse tipo de interface
- decisoes tecnicas acertadas
  - pedi para dividir em dois processos e funcionou bem
- aprendizado do uso e funcionamento do claude code
  - aprendi como funciona tendo que ler a documentação para fazer a ferramenta
- desenvolvimento da habilidade de pensar em um projeto e executar um mvp
- uso do bun como runtime
  - vatagens e limitacoes da tecnologia
  - so reforcou minha decisao de usar o nodejs padrao para projetos em producao

usos de caso que gostei:

- analises tecnicas sobre o projeto:
  - apresentação para a comunidade por exemplo, gerou resultados diferentes
- testes simples, porem que gastam muito token
  - uso para testes e2e manuais, simulando um QA
- benchmarks de modelos
  - padronizando as ferramentas, podemos fazer bechmarks mais 'justos' com diferentes modelos

limitacoes de uso com provedores nao oficiais:
- modelos que nao nao sao multi modais (nao suportam imagens)
- modelos com janela de contexto maior que 200k sao limitados a usar 200k

resultados com provedores testados:
- zai:
  - resultados satisfatorios com glm4.7
  - falta acesso aos modelos melhores no plano mais basico
- minimax
  - resultados abaixo do esperado
- alibaba cloud
  - acesso a modelos melhores por um bom preço
  - api para a execução do claude code sem motivo aparente

desabilitação do auto compact:
- com auto compact habiltiado, ele vai atuar em 80% da janela de contexto
- sem auto compact, ele mostra que está em 0% de contexto quando chega em 90%
- acima de 90%, `Context limit reached · /compact or /clear to continue`


cuidado com o uso pay-as-you-go:

modelo: gpt-5.3-codex
prompt: analise o projeto e sugira malhorias gerais para poder fazer a apresentação da plataforma para um usuario
custo: 1,52 dolares / 3m 17s
resultado:

```
Diagnóstico rápido (resumo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         Seu projeto já está com uma base muito boa para demo:
- proposta clara (multi-provider para Claude Code),                                                                                                                                                                                               - TUI bem estruturada,
- modo headless útil para automação,
- i18n (PT-BR/EN/ES),
- logs e update check integrados.                                                                                                                                                                                                               
  O que falta para “brilhar” em apresentação é principalmente: onboarding, clareza visual, segurança percebida e prova de valor com métricas.                                                                                                                                                                                                                                                                                                                                                         ---                                                                                                                                                                                                                                             
  Melhorias prioritárias (para aumentar impacto na apresentação)

1) Onboarding “1 minuto” (alta prioridade)

- Criar um fluxo inicial super curto:                                                                                                                                                                                                           
  “Adicionar provider → selecionar modelo → iniciar Claude” com menos decisões.
- Objetivo: reduzir fricção para primeiro uso ao vivo.

2) Segurança percebida (alta prioridade)
- Melhorar a narrativa e implementação de proteção de credenciais (evidenciar isso na demo).
- Exibir claramente no produto/docs como os segredos são tratados.
- Isso aumenta confiança de usuário técnico e gestor.

3) Mensagens de erro mais orientadas à ação (alta prioridade)
- Quando falhar config/API: mostrar causa + próximo passo (“faça X”).
- Evita travas durante demo e melhora experiência real.

4) Ajustes de UX para terminal pequeno/acessibilidade (média-alta)
- Reduzir dependência de cor/ícones.
- Manter ações essenciais sempre visíveis no footer.
- Ajuda muito em ambientes corporativos/SSH.

5) Fechar lacunas de i18n (média)
- Remover strings hardcoded em inglês em telas de fluxo.
- Garante consistência para apresentação multilíngue.

  ---                                                                                                                                                                                                                                             
Quick wins (1–2 sprints)

- “Quick setup” no primeiro uso.
- Revisão de mensagens de erro críticas.
- Padronização i18n completa.
- Modo visual simplificado (sem ícones/baixo contraste dependente).
- Slide simples com “antes vs depois” (tempo e passos).

Médio prazo (3–6 sprints)
- Telemetria opt-in de produto (funil de uso e erros por provider).
- Mais testes de confiabilidade (headless/config/migrações).
- Import/export de configuração.
- Guia de troubleshooting por provider no README/docs.

  ---                                                                                                                                                                                                                                             
Roteiro de apresentação (8 minutos)

1. Problema (40s)                                                
   “Trocar provider/modelo manualmente é chato e propenso a erro.”
2. Valor imediato (1m30s)                                                                                                                                                                                                                       
   Abrir mclaude e mostrar menu principal + organização.
3. Fluxo principal (2m)                                                                                                                                                                                                                         
   Selecionar provider → modelo → opções → launch.
4. Diferenciais (1m30s)                                                                                                                                                                                                                         
   Instalações separadas, headless, i18n, logs.
5. Confiabilidade (1m)                                                                                                                                                                                                                          
   Mostrar --logs last e update check.
6. Fechamento com prova (1m20s)                                                                                                                                                                                                                 
   Antes/depois com métricas objetivas.                                                                                                                                                                                                            
   ---                                                                                                                                                                                                                                             
   Métricas para provar valor na apresentação

- Time-to-first-launch (instalou → primeiro launch).
- Tempo de troca de provider/modelo.
- Número de passos manuais evitados.
- Taxa de erro de setup (manual vs mclaude).
- Tempo de diagnóstico de falha com logs.

  ---                                                                                                                                                                                                                                             
Se quiser, no próximo passo eu te entrego um plano de execução em formato backlog (prioridade, impacto, esforço e critérios de aceite) já pronto para virar issues.
```