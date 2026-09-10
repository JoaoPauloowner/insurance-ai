'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  XCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  User,
  Phone,
  MessageCircle,
} from 'lucide-react';

interface PendingMessage {
  id: string;
  content: string;
  createdAt: string;
  reviewStatus: string;
  conversation: {
    id: string;
    remoteJid: string;
    status: string;
    cliente?: {
      nome: string;
      telefone: string;
    } | null;
    messages: Array<{
      id: string;
      direction: string;
      content: string;
      createdAt: string;
    }>;
  };
}

export default function ReviewQueuePage() {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/pending');
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
        // Inicializa estado de edição com os textos originais
        const initialDrafts: Record<string, string> = {};
        data.messages.forEach((m: PendingMessage) => {
          initialDrafts[m.id] = m.content;
        });
        setEditedDrafts(initialDrafts);
      }
    } catch (err) {
      console.error('Falha ao buscar minutas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    setFeedback(null);
    try {
      const editedContent = editedDrafts[id];
      const res = await fetch(`/api/messages/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedContent }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          text: `Mensagem aprovada e enviada via WhatsApp com sucesso! ID: ${data.dispatch?.messageId || data.messageId}`,
          type: 'success',
        });
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        setFeedback({
          text: data.error || 'Erro ao aprovar mensagem',
          type: 'error',
        });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Erro de conexão', type: 'error' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    setFeedback(null);
    try {
      const res = await fetch(`/api/messages/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejeitado pelo corretor na fila' }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          text: 'Minuta descartada com sucesso. Nenhuma mensagem foi enviada ao cliente.',
          type: 'success',
        });
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        setFeedback({ text: data.error || 'Erro ao rejeitar mensagem', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Erro de conexão', type: 'error' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Fila de Revisão Humana de Mensagens
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Valide, edite ou descarte respostas geradas pela IA antes do envio oficial no WhatsApp.
          </p>
        </div>

        <button
          onClick={fetchPending}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Fila
        </button>
      </div>

      {/* Alerta de Conformidade SUSEP */}
      <div className="rounded-xl bg-amber-950/40 border border-amber-800/40 p-4 text-amber-200 flex items-start gap-3 text-sm">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-amber-300">Regra de Proteção ao Segurado (SUSEP):</strong>
          <p className="text-amber-200/90 text-xs mt-0.5">
            A IA nunca despacha mensagens de forma autônoma. Nenhuma cotação com valor monetário pode ser sugerida sem o preenchimento manual por você na tela de apólices e cotações.
          </p>
        </div>
      </div>

      {/* Feedback Toast/Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm">Carregando minutas pendentes...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Tudo em dia! Fila de revisão zerada</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Não há mensagens aguardando aprovação no momento. Quando novos segurados entrarem em contato no WhatsApp, as minutas aparecerão aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {messages.length} minuta{messages.length > 1 ? 's' : ''} aguardando sua validação
          </div>

          <div className="grid gap-6">
            {messages.map((item) => {
              const clienteNome = item.conversation.cliente?.nome || 'Segurado (Não Cadastrado)';
              const clienteTelefone = item.conversation.remoteJid;
              const isActing = actionLoading[item.id];

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:px-6 bg-slate-800/50 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {clienteNome}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                            {item.conversation.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {clienteTelefone}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Gerado em: {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Histórico Recente do Segurado */}
                    {item.conversation.messages && item.conversation.messages.length > 0 && (
                      <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                          Últimas mensagens do diálogo:
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                          {item.conversation.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`p-2 rounded-lg ${
                                m.direction === 'in'
                                  ? 'bg-slate-800/70 text-slate-200 border-l-2 border-slate-500'
                                  : 'bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500'
                              }`}
                            >
                              <span className="font-bold opacity-75 mr-1">
                                {m.direction === 'in' ? 'Segurado:' : 'Corretora:'}
                              </span>
                              {m.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Editor da Minuta de IA */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          Minuta Gerada pela IA (Edite livremente antes de enviar):
                        </label>
                        <span className="text-[10px] text-slate-500">
                          {editedDrafts[item.id]?.length || 0} caracteres
                        </span>
                      </div>
                      <textarea
                        value={editedDrafts[item.id] ?? item.content}
                        onChange={(e) =>
                          setEditedDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        rows={4}
                        disabled={isActing}
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-sans resize-y"
                      />
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={isActing}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Descartar Minuta
                      </button>

                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={isActing}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Send className={`w-4 h-4 ${isActing ? 'animate-bounce' : ''}`} />
                        Aprovar e Enviar no WhatsApp Oficial
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
