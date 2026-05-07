# links uteis

https://code.claude.com/docs/en/headless
https://platform.claude.com/docs/en/agent-sdk/typescript


# templates

as informacoes disponiveis oficialmente no statusline do claude code foram expandidas, veja a docuemntação em https://code.claude.com/docs/en/statusline#available-data

com essa melhoria, nao precisamos mais do mecanismo que usamos atualmente para buscar o limite de uso semanal e de 5 horas via api, usando o token da antropic

vamos remover essa logica que usa a api, simplificando o script de statusline

vamos tambem aprimorar as statusline atuais, com as informacoes relevantes que foram adicionadas no novo schema json

entenda profuindamente como está implementado, o que precisa ser removido e o que pode ser adicionado

pergunte para esclarecer sua dúvidas. sugira melhorias, adicoes e/ou correções caso necessario.

-----------------------------------------------------

# correções


vamos fazer algumas correções na statuslline padrao

na linhas de uso de tokens, vamos adicionar o aviso de 200k+ de uso, ficando assim:

Input:84.2k    | Output:62.8k   | Cache:20.6M    | 200k+

oa viso de 200k+ so deve aparecer quando for atingido, até lá nem ele e nem o divisor devem aparecer
