'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Plus,
  X,
  ShieldCheck,
} from 'lucide-react';

interface ApoliceItem {
  id: string;
  numeroApolice: string;
  seguradora: string;
  tipoSeguro: string;
  valorPremio: number | null;
  dataInicio: string;
  dataVencimento: string;
  status: string;
  cliente: {
    id: string;
    nome: string;
    telefone: string;
  };
}

export default function ApolicesPage() {
  const [apolices, setApolices] = useState<ApoliceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningRenewalCheck, setRunningRenewalCheck] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nomeCliente: '',
    telefoneCliente: '',
    seguradora: 'Porto Seguro',
    tipoSeguro: 'auto',
    numeroApolice: '',
    valorPremio: '',
    dataInicio: new Date().toISOString().split('T')[0],
    dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const fetchApolices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apolices');
      const data = await res.json();
      if (res.ok && data.apolices) {
        setApolices(data.apolices);
      }
    } catch (err) {
      console.error('Erro ao buscar apólices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApolices();
  }, []);

  const handleRunRenewalCheck = async () => {
    setRunningRenewalCheck(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/renewals/check', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedback(
          `Varredura concluída! ${data.draftsCreatedCount} novas minutas de renovação foram criadas e direcionadas para a Fila de Revisão.`
        );
        fetchApolices();
      } else {
        setFeedback(data.error || 'Erro ao executar varredura');
      }
    } catch (err: any) {
      setFeedback(err.message || 'Erro de conexão');
    } finally {
      setRunningRenewalCheck(false);
    }
  };

  const handleCreateApolice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resApolice = await fetch('/api/apolices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: apolices[0]?.cliente?.id || 'temp',
          clienteNome: formData.nomeCliente,
          clienteTelefone: formData.telefoneCliente,
          seguradora: formData.seguradora,
          tipoSeguro: formData.tipoSeguro,
          numeroApolice: formData.numeroApolice,
          valorPremio: formData.valorPremio ? parseFloat(formData.valorPremio) : null,
          dataInicio: formData.dataInicio,
          dataVencimento: formData.dataVencimento,
        }),
      });

      if (resApolice.ok) {
        setShowModal(false);
        setFeedback('Nova apólice cadastrada com sucesso pelo corretor!');
        fetchApolices();
      } else {
        const data = await resApolice.json();
        setFeedback(data.error || 'Erro ao cadastrar apólice');
      }
    } catch (err: any) {
      setFeedback(err.message || 'Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysRemaining = (vencimento: string) => {
    const diff = new Date(vencimento).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400" />
            Minhas Apólices & Alertas de Renovação
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Acompanhe vencimentos, controle prêmios oficiais e dispare lembretes preventivos de 30 dias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            Cadastrar Apólice
          </button>

          <button
            onClick={handleRunRenewalCheck}
            disabled={runningRenewalCheck}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningRenewalCheck ? 'animate-spin' : ''}`} />
            Disparar Varredura de 30 Dias
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl border bg-teal-950/40 border-teal-800/60 text-teal-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabela de Apólices */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Apólices Cadastradas ({apolices.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
            <span className="text-xs">Carregando carteira de apólices...</span>
          </div>
        ) : apolices.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">Nenhuma apólice cadastrada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Segurado</th>
                  <th className="py-3 px-4">Seguradora</th>
                  <th className="py-3 px-4">Ramo</th>
                  <th className="py-3 px-4">Nº Apólice</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Janela 30 Dias</th>
                  <th className="py-3 px-4">Prêmio Humano (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {apolices.map((ap) => {
                  const days = getDaysRemaining(ap.dataVencimento);
                  const isExpiringSoon = days >= 0 && days <= 35;

                  return (
                    <tr key={ap.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-white">
                        <div>{ap.cliente?.nome || 'Segurado'}</div>
                        <div className="text-[10px] text-slate-500">{ap.cliente?.telefone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200">{ap.seguradora}</span>
                      </td>
                      <td className="py-3.5 px-4 capitalize">{ap.tipoSeguro}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{ap.numeroApolice}</td>
                      <td className="py-3.5 px-4">
                        {new Date(ap.dataVencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4">
                        {isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/50">
                            <AlertTriangle className="w-3 h-3" />
                            Vence em {days} dias
                          </span>
                        ) : days < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800/50">
                            Vencida há {Math.abs(days)} dias
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {days} dias restantes
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-400">
                        {ap.valorPremio != null
                          ? Number(ap.valorPremio).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Apólice */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                Cadastrar Nova Apólice
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApolice} className="space-y-4 pt-4 text-xs">
              <div className="rounded-lg bg-teal-950/30 border border-teal-800/40 p-3 text-teal-300 flex items-start gap-2 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>
                  O valor do prêmio é registrado pelo corretor credenciado e nunca é gerado pela inteligência artificial.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Seguradora</label>
                  <select
                    value={formData.seguradora}
                    onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-200"
                  >
                    <option value="Porto Seguro">Porto Seguro</option>
                    <option value="Allianz Seguros">Allianz Seguros</option>
                    <option value="Bradesco Seguros">Bradesco Seguros</option>
                    <option value="SulAmérica">SulAmérica</option>
                    <option value="Tokio Marine">Tokio Marine</option>
                    <option value="HDI Seguros">HDI Seguros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Ramo de Seguro</label>
                  <select
                    value={formData.tipoSeguro}
                    onChange={(e) => setFormData({ ...formData, tipoSeguro: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-200"
                  >
                    <option value="auto">Auto / Veículos</option>
                    <option value="residencial">Residencial</option>
                    <option value="vida">Vida & Previdência</option>
                    <option value="saude">Saúde & Odonto</option>
                    <option value="empresarial">Empresarial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Número da Apólice</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 0531.02.123456"
                  value={formData.numeroApolice}
                  onChange={(e) => setFormData({ ...formData, numeroApolice: e.target.value })}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Prêmio Total da Apólice (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2450.00"
                  value={formData.valorPremio}
                  onChange={(e) => setFormData({ ...formData, valorPremio: e.target.value })}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Data Início de Vigência</label>
                  <input
                    type="date"
                    required
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Data Vencimento</label>
                  <input
                    type="date"
                    required
                    value={formData.dataVencimento}
                    onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Apólice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
