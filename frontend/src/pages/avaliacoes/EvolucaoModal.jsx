import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Modal } from '../../components/ui/Modal';
import { avaliacoesService } from '../../services/avaliacoesService';
import { BG_CONCEITO } from '../../utils/tafCalculo';
import { formatarData } from '../../utils/data';

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
  const badge = BG_CONCEITO[d.conceito] ?? '';
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-gray-700">{formatarData(d.data)}</p>
      <p className="text-gray-600">
        Nota: <span className="font-bold text-gray-800">{d.nota_final}</span>
        {' '}<span className={`px-1.5 py-0.5 rounded-full ${badge}`}>{d.conceito}</span>
      </p>
      <p className="text-gray-500">Corrida {d.corrida}m · Flexão {d.flexao} · Abd {d.abdominal}</p>
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
      {carregando && (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Carregando…
        </div>
      )}

      {semDados && (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhuma avaliação registrada para este soldado.
        </p>
      )}

      {dados && dados.length > 0 && (
        <>
          {/* Gráfico */}
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={dados}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
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
                <ReferenceLine
                  key={y}
                  y={y}
                  stroke={cor}
                  strokeDasharray="4 3"
                  strokeOpacity={0.5}
                  label={{ value: label, fontSize: 10, fill: cor, position: 'insideTopRight' }}
                />
              ))}
              <Tooltip content={<TooltipEvolucao />} />
              <Line
                type="monotone"
                dataKey="nota_final"
                stroke={COR}
                strokeWidth={2}
                dot={{ fill: COR, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Tabela histórico */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-gray-600">
              <thead>
                <tr className="text-left text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Corrida (m)</th>
                  <th className="pb-2 pr-4">Flexão</th>
                  <th className="pb-2 pr-4">Abdominal</th>
                  <th className="pb-2 pr-4">Nota</th>
                  <th className="pb-2">Conceito</th>
                </tr>
              </thead>
              <tbody>
                {[...dados].reverse().map((a, i) => {
                  const badge = BG_CONCEITO[a.conceito] ?? '';
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4">{formatarData(a.data)}</td>
                      <td className="py-2 pr-4">{a.corrida}</td>
                      <td className="py-2 pr-4">{a.flexao}</td>
                      <td className="py-2 pr-4">{a.abdominal}</td>
                      <td className="py-2 pr-4 font-semibold text-gray-800">{a.nota_final}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>
                          {a.conceito}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
