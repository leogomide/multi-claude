# links uteis

https://code.claude.com/docs/en/headless
https://platform.claude.com/docs/en/agent-sdk/typescript


# templates

precebi que estamos salvando as credenciais de api de todos os provedores em plain text

propronha solucoes para podermos criptografar essas credenciais para nao salvar elas em plain text

foque em segurança, performance nao é o problema

pergunte para esclarecer sua dúvidas. sugira melhorias, adicoes e/ou correções caso necessario.

-----------------------------------------------------

# correções


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

resultados com provedores testados:
- zai:
  - resultados satisfatorios com glm4.7
  - falta acesso aos modelos melhores no plano mais basico
- minimax
  - resultados abaixo do esperado
- alibaba cloud
  - acesso a modelos melhores por um bom preço
  - api para a execução do claude code sem motivo aparente
