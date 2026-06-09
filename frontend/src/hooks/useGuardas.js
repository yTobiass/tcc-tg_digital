import { useState, useEffect } from 'react';
import api from '../services/api';

// Busca o histórico de guardas de um soldado e calcula os totais por tipo.
export function useGuardasSoldado(soldadoId) {
  const [historico, setHistorico] = useState([]);
  const [totais, setTotais] = useState({ verde: 0, preta: 0, vermelha: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!soldadoId) { setLoading(false); return; }
    let ativo = true;
    setLoading(true);
    api.get(`/soldados/${soldadoId}/guardas`)
      .then((res) => {
        if (!ativo) return;
        const data = res.data ?? [];
        setHistorico(data);
        setTotais({
          verde:    data.filter((g) => g.tipo === 'verde').length,
          preta:    data.filter((g) => g.tipo === 'preta').length,
          vermelha: data.filter((g) => g.tipo === 'vermelha').length,
        });
      })
      .catch(() => {
        if (!ativo) return;
        setHistorico([]);
        setTotais({ verde: 0, preta: 0, vermelha: 0 });
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [soldadoId]);

  return { historico, totais, loading };
}
