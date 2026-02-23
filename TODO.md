# templates

atualmente no projeto, substituimos algumas variaveis de ambiente para serem os defualt_opus_model e etc

porem, seguindo a documentacao em https://code.claude.com/docs/en/settings
vejo que tem a variavel `availableModels`, que muda essa lista de modelos dinamicamente

analise se podemos aplcar os modelos disponiveis nos provedores atraves dessa varaivel, para termos uma flexibilidade ainda maior
no uso da ferramenta

pergunte para esclarecer sua dúvidas. sugira melhorias, adicoes e/ou correções caso necessario.

-----------------------------------------------------

# correções

testar com minimax, zai e openrouter

- adicionar check balance no provedor moonshot
  - https://platform.moonshot.ai/docs/api/balance#example-request

- adicionar limites no provedor zai 
  - https://api.z.ai/api/monitor/usage/quota/limit

- possibilidade de mapeamento dos modelos padrao para modelos do provedor
  - poder mapear as variaveis ANTHROPIC_DEFAULT_OPUS_MODEL e etc para modelos por provedor