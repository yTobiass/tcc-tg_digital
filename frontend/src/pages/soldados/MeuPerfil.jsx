import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Layout }            from '../../components/layout/Layout';
import { useAuth }           from '../../hooks/useAuth';
import { soldadosService }   from '../../services/soldadosService';
import { avaliacoesService } from '../../services/avaliacoesService';
import { escalasService }    from '../../services/escalasService';
import { BG_CONCEITO }       from '../../utils/tafCalculo';
import { formatarData }      from '../../utils/data';

const COR_LINHA = '#16a34a';
const COR_EIXO  = '#9ca3af';
const COR_GRID  = '#f3f4f6';

const REFS_TAF = [
  { y: 90, label: 'Excelente', cor: '#15803d' },
  { y: 75, label: 'Muito Bom', cor: '#22c55e' },
  { y: 60, label: 'Bom',       cor: '#3b82f6' },
  { y: 45, label: 'Regular',   cor: '#eab308' },
];

const STATUS_LABEL = {
  ativo:      { label: 'Ativo',      cls: 'bg-green-100 text-green-800' },
  licenca:    { label: 'Licença',    cls: 'bg-yellow-100 text-yellow-800' },
  baixado:    { label: 'Baixado',    cls: 'bg-red-100 text-red-800' },
  dispensado: { label: 'Dispensado', cls: 'bg-gray-100 text-gray-600' },
};

function TooltipTAF({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const badge = BG_CONCEITO[d.conceito] ?? '';
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-gray-700">{formatarData(d.data)}</p>
      <p className="text-gray-600">
        Nota: <span className="font-bold text-gray-800">{d.nota_final}</span>{' '}
        <span className={`px-1.5 py-0.5 rounded-full ${badge}`}>{d.conceito}</span>
      </p>
      <p className="text-gray-500">Corrida {d.corrida}m · Flexão {d.flexao} · Abd {d.abdominal}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function MeuPerfil() {
  const { usuario }    = useAuth();
  const [soldado,      setSoldado]      = useState(null);
  const [avaliacoes,   setAvaliacoes]   = useState([]);
  const [guardas,      setGuardas]      = useState([]);
  const [carregando,   setCarregando]   = useState(true);

  useEffect(() => {
    if (!usuario?.soldado_id) { setCarregando(false); return; }
    Promise.all([
      soldadosService.buscarPorId(usuario.soldado_id),
      avaliacoesService.minhaEvolucao(),
      escalasService.historicoSoldado(usuario.soldado_id),
    ])
      .then(([sol, av, gd]) => { setSoldado(sol); setAvaliacoes(av); setGuardas(gd); })
      .finally(() => setCarregando(false));
  }, [usuario]);

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Carregando…</div>
      </Layout>
    );
  }

  const ultimaTAF  = avaliacoes.length > 0 ? avaliacoes[avaliacoes.length - 1] : null;
  const melhorTAF  = avaliacoes.length > 0
    ? avaliacoes.reduce((m, a) => (a.nota_final > m.nota_final ? a : m))
    : null;
  const statusInfo = STATUS_LABEL[soldado?.status] ?? { label: soldado?.status, cls: 'bg-gray-100 text-gray-600' };

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Meu Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna esquerda — dados do soldado */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Dados Pessoais</h2>
              {soldado && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>

            {soldado ? (
              <div>
                <p className="font-bold text-gray-900 text-base mb-0.5">{soldado.nome_completo}</p>
                <p className="text-xs text-gray-400 mb-4">RA {soldado.ra}</p>
                <InfoRow label="Pelotão"            value={soldado.pelotao} />
                <InfoRow label="Turma"              value={soldado.turma} />
                <InfoRow label="Graduação"          value={soldado.graduacao === 'cabo' ? 'Cabo' : 'Atirador'} />
                <InfoRow label="Data de incorporação" value={soldado.data_incorporacao ? formatarData(soldado.data_incorporacao) : null} />
                <InfoRow label="Data de nascimento" value={soldado.data_nascimento ? formatarData(soldado.data_nascimento) : null} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Perfil não vinculado.</p>
            )}
          </div>

          {/* Cards de resumo TAF */}
          {ultimaTAF && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Última TAF</h2>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900">{ultimaTAF.nota_final}</span>
                <span className="text-sm text-gray-400 mb-1">pts</span>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${BG_CONCEITO[ultimaTAF.conceito] ?? ''}`}>
                  {ultimaTAF.conceito}
                </span>
              </div>
              <p className="text-xs text-gray-400">{formatarData(ultimaTAF.data)}</p>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-50 text-center text-xs text-gray-500">
                <div>
                  <p className="font-semibold text-gray-700 text-base">{ultimaTAF.corrida}</p>
                  <p>m corrida</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-base">{ultimaTAF.flexao}</p>
                  <p>flexões</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-base">{ultimaTAF.abdominal}</p>
                  <p>abdominais</p>
                </div>
              </div>
            </div>
          )}

          {melhorTAF && melhorTAF.id !== ultimaTAF?.id && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Melhor TAF</h2>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900">{melhorTAF.nota_final}</span>
                <span className="text-sm text-gray-400 mb-0.5">pts</span>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${BG_CONCEITO[melhorTAF.conceito] ?? ''}`}>
                  {melhorTAF.conceito}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{formatarData(melhorTAF.data)}</p>
            </div>
          )}
        </div>

        {/* Coluna direita — gráfico + histórico */}
        <div className="lg:col-span-2 space-y-4">

          {/* Gráfico de evolução */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Evolução TAF</h2>

            {avaliacoes.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Nenhuma avaliação registrada ainda.
              </div>
            ) : avaliacoes.length === 1 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Apenas uma avaliação registrada — o gráfico aparece a partir da segunda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={avaliacoes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                  {REFS_TAF.map(({ y, label, cor }) => (
                    <ReferenceLine
                      key={y}
                      y={y}
                      stroke={cor}
                      strokeDasharray="4 3"
                      strokeOpacity={0.5}
                      label={{ value: label, fontSize: 10, fill: cor, position: 'insideTopRight' }}
                    />
                  ))}
                  <Tooltip content={<TooltipTAF />} />
                  <Line
                    type="monotone"
                    dataKey="nota_final"
                    stroke={COR_LINHA}
                    strokeWidth={2}
                    dot={{ fill: COR_LINHA, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Histórico em tabela */}
          {avaliacoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Histórico de Avaliações</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                      <th className="px-5 py-3">Data</th>
                      <th className="px-5 py-3 text-center">Corrida (m)</th>
                      <th className="px-5 py-3 text-center">Flexão</th>
                      <th className="px-5 py-3 text-center">Abdominal</th>
                      <th className="px-5 py-3 text-center">Nota</th>
                      <th className="px-5 py-3">Conceito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...avaliacoes].reverse().map((a, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-600">{formatarData(a.data)}</td>
                        <td className="px-5 py-3 text-center text-gray-700">{a.corrida}</td>
                        <td className="px-5 py-3 text-center text-gray-700">{a.flexao}</td>
                        <td className="px-5 py-3 text-center text-gray-700">{a.abdominal}</td>
                        <td className="px-5 py-3 text-center font-bold text-gray-900">{a.nota_final}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BG_CONCEITO[a.conceito] ?? ''}`}>
                            {a.conceito}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Histórico de guardas */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Minhas Escalas de Guarda</h2>
            </div>
            {guardas.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Nenhuma escala registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3">Período</th>
                      <th className="px-5 py-3">Função</th>
                      <th className="px-5 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {guardas.map((g) => {
                      const TIPO_BADGE = {
                        verde:    'bg-green-100 text-green-800',
                        preta:    'bg-gray-200 text-gray-800',
                        vermelha: 'bg-red-100 text-red-800',
                      };
                      const STATUS_BADGE = {
                        agendada:     'bg-blue-50 text-blue-700',
                        em_andamento: 'bg-yellow-50 text-yellow-700',
                        concluida:    'bg-green-50 text-green-700',
                        cancelada:    'bg-gray-100 text-gray-500',
                      };
                      const STATUS_LABEL_G = {
                        agendada: 'Agendada', em_andamento: 'Em andamento',
                        concluida: 'Concluída', cancelada: 'Cancelada',
                      };
                      const periodo = g.data_inicio === g.data_fim
                        ? formatarData(g.data_inicio)
                        : `${formatarData(g.data_inicio)} – ${formatarData(g.data_fim)}`;
                      return (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TIPO_BADGE[g.tipo] ?? ''}`}>
                              {g.tipo}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{periodo}</td>
                          <td className="px-5 py-3 text-gray-600 capitalize">
                            {g.funcao === 'cabo' ? 'Monitor/Cabo' : 'Atirador'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[g.status] ?? ''}`}>
                              {STATUS_LABEL_G[g.status] ?? g.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
