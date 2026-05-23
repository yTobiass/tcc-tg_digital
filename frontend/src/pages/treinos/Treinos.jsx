import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { InfoTooltip } from '../../components/ui/Tooltip';
import { treinosService } from '../../services/treinosService';
import { hoje, formatarData } from '../../utils/data';

// ─── Helpers ────────────────────────────────────────────────────────────────

function linhaVazia(d) {
  return {
    soldado_id: d.soldado_id,
    ra: d.ra,
    nome_completo: d.nome_completo,
    pelotao: d.pelotao || '—',
    // Se já existe registro salvo, usa ele; senão, padrão ausente
    presente: d.registro_id != null ? Boolean(d.presente) : false,
    resultado: d.resultado != null ? String(d.resultado) : '',
    observacao: d.observacao || '',
  };
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Tabs({ aba, onChange }) {
  const cls = (v) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      aba === v
        ? 'border-green-700 text-green-700'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;
  return (
    <div className="flex border-b border-gray-200 mb-6">
      <button className={cls('registrar')} onClick={() => onChange('registrar')}>Registrar presença</button>
      <button className={cls('historico')} onClick={() => onChange('historico')}>Histórico</button>
    </div>
  );
}

function TabelaRegistro({ linhas, tipoUnidade, onChange }) {
  const todosPresentes = linhas.length > 0 && linhas.every((l) => l.presente);

  function toggleTodos() {
    const novoValor = !todosPresentes;
    onChange(linhas.map((l) => ({ ...l, presente: novoValor, resultado: novoValor ? l.resultado : '' })));
  }

  function setLinha(soldadoId, campo, valor) {
    onChange(
      linhas.map((l) =>
        l.soldado_id === soldadoId ? { ...l, [campo]: valor } : l
      )
    );
  }

  function togglePresente(soldadoId, checked) {
    onChange(
      linhas.map((l) =>
        l.soldado_id === soldadoId
          ? { ...l, presente: checked, resultado: checked ? l.resultado : '' }
          : l
      )
    );
  }

  const presentes = linhas.filter((l) => l.presente).length;

  return (
    <div>
      {/* Ações em lote */}
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={toggleTodos}
          className="text-sm text-green-700 hover:text-green-900 font-medium"
        >
          {todosPresentes ? 'Desmarcar todos' : 'Marcar todos presentes'}
        </button>
        <span className="text-xs text-gray-400">
          {presentes} de {linhas.length} presente{presentes !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
              <th className="px-4 py-3 w-10 text-center">Pres.</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3 hidden sm:table-cell">RA</th>
              <th className="px-4 py-3 hidden md:table-cell">Pelotão</th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  Resultado {tipoUnidade ? <span className="normal-case font-normal text-gray-400">({tipoUnidade})</span> : ''}
                  <InfoTooltip text="Opcional — preencha apenas se o resultado foi medido." position="top" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {linhas.map((l) => (
              <tr
                key={l.soldado_id}
                className={`transition-colors ${l.presente ? 'bg-white' : 'bg-gray-50/60'}`}
              >
                <td className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={l.presente}
                    onChange={(e) => togglePresente(l.soldado_id, e.target.checked)}
                    className="w-4 h-4 accent-green-700 cursor-pointer"
                  />
                </td>
                <td className={`px-4 py-2.5 font-medium ${l.presente ? 'text-gray-800' : 'text-gray-400'}`}>
                  {l.nome_completo}
                </td>
                <td className="px-4 py-2.5 text-gray-500 font-mono hidden sm:table-cell">{l.ra}</td>
                <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{l.pelotao}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={l.resultado}
                    disabled={!l.presente}
                    onChange={(e) => setLinha(l.soldado_id, 'resultado', e.target.value)}
                    placeholder={l.presente ? '—' : ''}
                    className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {linhas.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">Nenhum soldado ativo encontrado.</p>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Treinos() {
  const [aba, setAba] = useState('registrar');

  // — Dados gerais —
  const [tipos, setTipos] = useState([]);

  // — Aba Registrar —
  const [data, setData] = useState(hoje());
  const [tipoId, setTipoId] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [estadoSessao, setEstadoSessao] = useState('idle'); // idle | carregando | pronto | salvando
  const [mensagem, setMensagem] = useState(null); // {tipo: 'sucesso'|'erro', texto}
  const msgTimer = useRef(null);

  // — Aba Histórico —
  const [sessoes, setSessoes] = useState([]);
  const [filtroHist, setFiltroHist] = useState({ tipo_treino_id: '', data_inicio: '', data_fim: '' });
  const [carregandoHist, setCarregandoHist] = useState(false);

  // Carrega tipos na montagem
  useEffect(() => {
    treinosService.listarTipos().then((lista) => {
      setTipos(lista);
      if (lista.length > 0) setTipoId(String(lista[0].id));
    });
  }, []);

  // Carrega sessão sempre que data ou tipoId mudar (e ambos estiverem preenchidos)
  const carregarSessao = useCallback(async (d, t) => {
    if (!d || !t) return;
    setEstadoSessao('carregando');
    setMensagem(null);
    try {
      const dados = await treinosService.buscarSessao(d, t);
      setLinhas(dados.map(linhaVazia));
      setEstadoSessao('pronto');
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.response?.data?.error || 'Erro ao carregar sessão.' });
      setEstadoSessao('idle');
    }
  }, []);

  useEffect(() => {
    if (tipoId) carregarSessao(data, tipoId);
  }, [data, tipoId, carregarSessao]);

  function mostrarMensagem(tipo, texto) {
    clearTimeout(msgTimer.current);
    setMensagem({ tipo, texto });
    msgTimer.current = setTimeout(() => setMensagem(null), 4000);
  }

  async function handleSalvar() {
    if (!tipoId || linhas.length === 0) return;
    setEstadoSessao('salvando');
    try {
      const payload = {
        data,
        tipo_treino_id: Number(tipoId),
        registros: linhas.map((l) => ({
          soldado_id: l.soldado_id,
          presente: l.presente,
          resultado: l.presente && l.resultado !== '' ? Number(l.resultado) : null,
          observacao: null,
        })),
      };
      const { salvos } = await treinosService.salvarLote(payload);
      mostrarMensagem('sucesso', `${salvos} registro${salvos !== 1 ? 's' : ''} salvo${salvos !== 1 ? 's' : ''} com sucesso.`);
      setEstadoSessao('pronto');
    } catch (err) {
      mostrarMensagem('erro', err.response?.data?.error || 'Erro ao salvar.');
      setEstadoSessao('pronto');
    }
  }

  // Histórico
  const carregarHistorico = useCallback(async (params) => {
    setCarregandoHist(true);
    try {
      const data = await treinosService.listarSessoes(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
      );
      setSessoes(data);
    } finally {
      setCarregandoHist(false);
    }
  }, []);

  useEffect(() => {
    if (aba === 'historico') carregarHistorico(filtroHist);
  }, [aba, filtroHist, carregarHistorico]);

  function abrirSessao(sessao) {
    setData(sessao.data);
    setTipoId(String(sessao.tipo_treino_id));
    setAba('registrar');
  }

  const tipoAtual = tipos.find((t) => String(t.id) === String(tipoId));
  const salvando = estadoSessao === 'salvando';

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Treinos e Presenças</h1>

      <Tabs aba={aba} onChange={setAba} />

      {/* ── ABA REGISTRAR ── */}
      {aba === 'registrar' && (
        <div>
          {/* Seletores de sessão */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-3 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data</label>
              <input
                type="date"
                value={data}
                max={hoje()}
                onChange={(e) => setData(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Tipo de atividade</label>
              <select
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Selecione...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dica rápida */}
          {estadoSessao === 'pronto' && (
            <p className="text-xs text-gray-400 -mt-2 mb-3">
              Todos os soldados ativos são carregados automaticamente. Use <strong className="text-gray-500">Marcar todos presentes</strong> para agilizar.
            </p>
          )}

          {/* Mensagem de feedback */}
          {mensagem && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {mensagem.texto}
            </div>
          )}

          {/* Estado da sessão */}
          {estadoSessao === 'carregando' && (
            <p className="text-sm text-gray-400 py-8 text-center">Carregando soldados...</p>
          )}

          {(estadoSessao === 'pronto' || estadoSessao === 'salvando') && tipoId && (
            <>
              <TabelaRegistro
                linhas={linhas}
                tipoUnidade={tipoAtual?.unidade}
                onChange={setLinhas}
              />

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSalvar}
                  disabled={salvando || linhas.length === 0}
                  className="px-6 py-2 text-sm font-medium bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-lg transition-colors"
                >
                  {salvando ? 'Salvando...' : 'Salvar sessão'}
                </button>
              </div>
            </>
          )}

          {estadoSessao === 'idle' && !tipoId && (
            <p className="text-sm text-gray-400 py-8 text-center">Selecione uma atividade para começar.</p>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div>
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-3 mb-5">
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-gray-500 mb-1">Atividade</label>
              <select
                value={filtroHist.tipo_treino_id}
                onChange={(e) => setFiltroHist((f) => ({ ...f, tipo_treino_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Todas</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">De</label>
              <input
                type="date"
                value={filtroHist.data_inicio}
                onChange={(e) => setFiltroHist((f) => ({ ...f, data_inicio: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Até</label>
              <input
                type="date"
                value={filtroHist.data_fim}
                onChange={(e) => setFiltroHist((f) => ({ ...f, data_fim: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {carregandoHist ? (
              <p className="py-12 text-center text-gray-400 text-sm">Carregando...</p>
            ) : sessoes.length === 0 ? (
              <p className="py-12 text-center text-gray-400 text-sm">Nenhuma sessão registrada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Atividade</th>
                    <th className="px-4 py-3 text-center">Presença</th>
                    <th className="px-4 py-3 text-center">Taxa</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessoes.map((s) => {
                    const taxa = s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0;
                    return (
                      <tr key={`${s.data}-${s.tipo_treino_id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">{formatarData(s.data)}</td>
                        <td className="px-4 py-3 text-gray-600">{s.tipo_nome}</td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {s.presentes}/{s.total}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            taxa >= 80 ? 'bg-green-100 text-green-800' :
                            taxa >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {taxa}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => abrirSessao(s)}
                            className="text-sm text-green-700 hover:text-green-900 font-medium"
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
