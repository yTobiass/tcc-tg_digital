import { useState, useCallback } from 'react';
import { soldadosService } from '../services/soldadosService';

export function useSoldados() {
  const [soldados, setSoldados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await soldadosService.listar();
      setSoldados(data);
      setErro(null);
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar soldados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  return { soldados, carregando, erro, carregar };
}
