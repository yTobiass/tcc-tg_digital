Adicione a contagem de guardas (verde, preta, vermelha) na aba de soldados.
Não altere nenhuma outra parte do sistema.

O que deve aparecer
Na listagem de soldados, adicionar 3 colunas novas:
RANome CompletoPelotãoGraduaçãoStatus🟢 Verde⚫ Preta🔴 Vermelha1SILVA, João1º Pelatiradorativo421
No perfil individual do soldado, exibir os mesmos números em destaque (cards)
junto com um histórico listando cada guarda feita (tipo, data, função exercida).

Backend
Query de contagem (models/soldados.js)
sql-- Contagem de guardas por soldado agrupada por tipo
SELECT
  s.id,
  s.nome_completo,
  COUNT(CASE WHEN eg.tipo = 'verde'    THEN 1 END) AS total_verde,
  COUNT(CASE WHEN eg.tipo = 'preta'    THEN 1 END) AS total_preta,
  COUNT(CASE WHEN eg.tipo = 'vermelha' THEN 1 END) AS total_vermelha
FROM soldados s
LEFT JOIN escala_membros em ON em.soldado_id = s.id
LEFT JOIN escalas_guarda eg ON eg.id = em.escala_id
  AND eg.status = 'concluida'        -- só conta guardas já realizadas
GROUP BY s.id;
Atualizar endpoint de listagem
GET /api/soldados deve retornar os campos extras:
json{
  "id": 1,
  "ra": "101-1",
  "nome_completo": "SILVA, João Pedro",
  "pelotao": "1º Pelotão",
  "graduacao": "atirador",
  "status": "ativo",
  "total_verde": 4,
  "total_preta": 2,
  "total_vermelha": 1
}
Fazer um JOIN com a query de contagem acima ao buscar a lista de soldados.
Soldados sem nenhuma guarda retornam 0 em todos os campos (LEFT JOIN garante isso).
Novo endpoint de histórico individual
GET /api/soldados/:id/guardas
Retorna todas as guardas que o soldado participou, ordenadas da mais recente para a mais antiga:
json[
  {
    "escala_id": 10,
    "tipo": "preta",
    "funcao": "cabo",
    "data_inicio": "2024-03-15",
    "data_fim": "2024-03-16",
    "status": "concluida"
  },
  {
    "escala_id": 7,
    "tipo": "verde",
    "funcao": "atirador",
    "data_inicio": "2024-03-08",
    "data_fim": "2024-03-08",
    "status": "concluida"
  }
]
Query:
sqlSELECT
  eg.id AS escala_id,
  eg.tipo,
  em.funcao,
  eg.data_inicio,
  eg.data_fim,
  eg.status
FROM escala_membros em
JOIN escalas_guarda eg ON eg.id = em.escala_id
WHERE em.soldado_id = :id
ORDER BY eg.data_inicio DESC;

Frontend
Tabela de soldados (pages/soldados/ListaSoldados.jsx)
Adicionar 3 colunas ao final da tabela existente:
| 🟢 Verde | ⚫ Preta | 🔴 Vermelha |

Os números são exibidos centralizados com badge colorido:

Verde: badge fundo verde claro, texto verde escuro
Preta: badge fundo cinza escuro, texto branco
Vermelha: badge fundo vermelho claro, texto vermelho escuro


Se o valor for 0, exibir — (traço) em vez de zero para não poluir a tabela
Atiradores mostram as 3 colunas; cabos mostram apenas preta e vermelha
(cabos nunca fazem verde — exibir — fixo na coluna verde para eles)

Perfil do soldado (pages/soldados/PerfilSoldado.jsx)
Adicionar uma seção "Histórico de Guardas" com:

3 cards de resumo no topo da seção:

┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│  🟢 Verde   │  │  ⚫ Preta   │  │ 🔴 Vermelha  │
│      4      │  │      2      │  │      1       │
│   guardas   │  │   guardas   │  │   guardas    │
└─────────────┘  └─────────────┘  └──────────────┘

Tabela de histórico abaixo dos cards:

TipoFunçãoData InícioData FimSituação🔴 VermelhaCabo15/03/202417/03/2024Concluída🟢 VerdeAtirador08/03/202408/03/2024Concluída

Ordenado do mais recente para o mais antigo
Badge colorido na coluna Tipo (mesmas cores da tabela de listagem)
Paginação de 10 itens por página se o histórico for longo


Hook (hooks/useGuardas.js)
Criar hook para buscar os dados de guardas do soldado:
javascriptexport function useGuardasSoldado(soldadoId) {
  const [historico, setHistorico] = useState([]);
  const [totais, setTotais] = useState({ verde: 0, preta: 0, vermelha: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/soldados/${soldadoId}/guardas`).then(res => {
      const data = res.data;
      setHistorico(data);
      setTotais({
        verde:    data.filter(g => g.tipo === 'verde').length,
        preta:    data.filter(g => g.tipo === 'preta').length,
        vermelha: data.filter(g => g.tipo === 'vermelha').length,
      });
      setLoading(false);
    });
  }, [soldadoId]);

  return { historico, totais, loading };
}

