import { useState, useEffect, useCallback } from 'react';
import { pontosService } from '../services/pontosService';

// Busca o histórico de pontos/FATD de um soldado e seus totais.
export function usePontos(soldadoId) {
  const [registros, setRegistros] = useState([]);
  const [resumo, setResumo] = useState(null); // { total_pontos, total_fatd, total_faltas, status }
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    if (!soldadoId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await pontosService.historico(soldadoId);
      setRegistros(data.registros ?? []);
      setResumo(data.soldado ?? null);
      setErro(null);
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar pontos.');
    } finally {
      setLoading(false);
    }
  }, [soldadoId]);

  useEffect(() => { carregar(); }, [carregar]);

  return { registros, resumo, loading, erro, recarregar: carregar };
}
