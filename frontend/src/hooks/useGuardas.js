import { useState, useEffect } from 'react';
import api from '../services/api';

// Busca o histórico de guardas de um soldado e os totais por tipo.
// Os totais SEMPRE refletem todas as guardas AGENDADAS (não são afetados pelos
// filtros aplicados ao histórico). Refaz a busca quando os filtros mudam.
export function useGuardasSoldado(soldadoId, filtros = {}) {
  const { tipo, situacao } = filtros;
  const [historico, setHistorico] = useState([]);
  const [totais, setTotais] = useState({ verde: 0, preta: 0, vermelha: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!soldadoId) { setLoading(false); return; }
    let ativo = true;
    setLoading(true);
    const params = {};
    if (tipo)     params.tipo = tipo;
    if (situacao) params.situacao = situacao;
    api.get(`/soldados/${soldadoId}/guardas`, { params })
      .then((res) => {
        if (!ativo) return;
        const data = res.data ?? {};
        setHistorico(Array.isArray(data) ? data : (data.historico ?? []));
        setTotais(data.totais ?? { verde: 0, preta: 0, vermelha: 0 });
      })
      .catch(() => {
        if (!ativo) return;
        setHistorico([]);
        setTotais({ verde: 0, preta: 0, vermelha: 0 });
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [soldadoId, tipo, situacao]);

  return { historico, totais, loading };
}
