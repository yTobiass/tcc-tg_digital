import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Modal } from '../../components/ui/Modal';
import { avaliacoesService } from '../../services/avaliacoesService';
import { BG_CONCEITO } from '../../utils/tafCalculo';
import { formatarData } from '../../utils/data';
import styles from './EvolucaoModal.module.scss';

const COR = '#16a34a';
const COR_EIXO = '#9ca3af';
const COR_GRID = '#f3f4f6';

const REFS = [
  { y: 90, label: 'Excelente', cor: '#15803d' },
  { y: 75, label: 'Muito Bom', cor: '#22c55e' },
  { y: 60, label: 'Bom',       cor: '#3b82f6' },
  { y: 45, label: 'Regular',   cor: '#eab308' },
];

function TooltipEvolucao({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{formatarData(d.data)}</p>
      <p className={styles.tooltipBody}>
        Nota: <span className={styles.boldNote}>{d.nota_final}</span>
        {' '}<span className={BG_CONCEITO[d.conceito] ?? ''}>{d.conceito}</span>
      </p>
      <p className={styles.tooltipMuted}>Corrida {d.corrida}m · Flexão {d.flexao} · Abd {d.abdominal}</p>
    </div>
  );
}

export default function EvolucaoModal({ soldado, onClose: onFechar }) {
  const [dados,      setDados]      = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    avaliacoesService.evolucao(soldado.id)
      .then(setDados)
      .finally(() => setCarregando(false));
  }, [soldado.id]);

  const semDados = !carregando && (!dados || dados.length === 0);

  return (
    <Modal aberto titulo={`Evolução TAF — ${soldado.nome}`} onFechar={onFechar} largura="max-w-2xl">
      {carregando && <div className={styles.loading}>Carregando…</div>}

      {semDados && (
        <p className={styles.empty}>Nenhuma avaliação registrada para este soldado.</p>
      )}

      {dados && dados.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={COR_GRID} vertical={false} />
              <XAxis
                dataKey="data"
                tickFormatter={(v) => { const [, m, d] = v.split('-'); return `${d}/${m}`; }}
                tick={{ fontSize: 11, fill: COR_EIXO }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 105]}
                ticks={[0, 20, 45, 60, 75, 90, 100]}
                tick={{ fontSize: 11, fill: COR_EIXO }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              {REFS.map(({ y, label, cor }) => (
                <ReferenceLine key={y} y={y} stroke={cor} strokeDasharray="4 3" strokeOpacity={0.5}
                  label={{ value: label, fontSize: 10, fill: cor, position: 'insideTopRight' }} />
              ))}
              <Tooltip content={<TooltipEvolucao />} />
              <Line type="monotone" dataKey="nota_final" stroke={COR} strokeWidth={2}
                dot={{ fill: COR, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>

          <div className={styles.historyWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Corrida (m)</th>
                  <th>Flexão</th>
                  <th>Abdominal</th>
                  <th>Nota</th>
                  <th>Conceito</th>
                </tr>
              </thead>
              <tbody>
                {[...dados].reverse().map((a, i) => (
                  <tr key={i}>
                    <td>{formatarData(a.data)}</td>
                    <td>{a.corrida}</td>
                    <td>{a.flexao}</td>
                    <td>{a.abdominal}</td>
                    <td className={styles.boldNote}>{a.nota_final}</td>
                    <td><span className={BG_CONCEITO[a.conceito] ?? ''}>{a.conceito}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
