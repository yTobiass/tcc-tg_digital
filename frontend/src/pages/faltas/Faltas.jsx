import { useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import RegistrarFaltas from './RegistrarFaltas';
import HistoricoFaltas from './HistoricoFaltas';

const SUBABAS = [
  { key: 'registrar', label: 'Registrar Faltas do Dia' },
  { key: 'historico', label: 'Histórico de Faltas' },
];

export default function Faltas() {
  const [aba, setAba] = useState('registrar');

  return (
    <Layout>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '0 0 16px' }}>Faltas</h1>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        {SUBABAS.map(({ key, label }) => {
          const ativo = aba === key;
          return (
            <button
              key={key}
              onClick={() => setAba(key)}
              style={{
                padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: ativo ? '#dc2626' : '#6b7280',
                borderBottom: ativo ? '2px solid #dc2626' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {aba === 'registrar' ? <RegistrarFaltas /> : <HistoricoFaltas />}
    </Layout>
  );
}
