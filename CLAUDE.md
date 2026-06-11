Atualizar a importação de soldados para preencher automaticamente 
os campos com base nas seguintes regras do TG 02-032:

1. RA: gerado automaticamente em sequência (001-1, 002-1, 003-1... 100-1).
   O sargento não precisa preencher — o sistema atribui na ordem de importação.

2. Data de Incorporação: igual para todos os soldados da importação.
   Adicionar um campo de data no formulário de importação para o sargento 
   informar uma vez só antes de importar. Aplicar a todos os registros.

3. Pelotão: definido automaticamente pelo RA:
   - 001 a 025 → 1º Pelotão
   - 026 a 050 → 2º Pelotão
   - 051 a 075 → 3º Pelotão
   - 076 a 100 → 4º Pelotão

4. Graduação: todos entram como 'atirador' por padrão.
   O sargento altera manualmente depois se necessário.

5. Turma: vinculada automaticamente à turma ativa do sistema.
   Não precisa de coluna na planilha.

Resultado: o modelo de planilha passa a ter apenas uma coluna obrigatória:
| Nome Completo |
| SILVA, João Pedro |
| SOUZA, Carlos Eduardo |

Atualizar o modelo para download, o parser de importação e o 
formulário de importação para refletir essas mudanças.