import React from 'react';
import { ShieldCheck, MessageSquare, Clock, Lock, CheckCircle2, ArrowRight, BellRing, UserCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header / Navbar */}
      <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              🛡️
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              insurance<span className="text-teal-700">.ai</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#beneficios" className="hover:text-teal-700 transition">Benefícios</a>
            <a href="#compliance" className="hover:text-teal-700 transition">Regras de Negócio</a>
            <a href="#precos" className="hover:text-teal-700 transition">Planos</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-teal-700 px-3 py-2 transition"
            >
              Acessar Painel
            </a>
            <a
              href="#precos"
              className="text-sm font-semibold bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg shadow-sm transition"
            >
              Criar Conta
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-teal-50/50 to-white text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold mb-6">
              <ShieldCheck className="w-4 h-4" /> Em conformidade com a SUSEP • API Oficial WhatsApp
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Atendimento e Gestão de Carteira no WhatsApp para <span className="text-teal-700">Corretores de Seguros</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Acelere a qualificação de novos leads e nunca mais perca uma apólice nos 30 dias de vencimento. Com IA para organização e <strong>100% de controle humano</strong> sobre propostas e valores.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#precos"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-base shadow-md transition"
              >
                Começar Agora <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#compliance"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base transition"
              >
                Conhecer Diretrizes de Segurança
              </a>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-slate-200 text-left">
              <div>
                <p className="text-2xl font-bold text-teal-700">0%</p>
                <p className="text-xs text-slate-500 font-medium">Preço gerado por IA (Restrição Estrutural)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700">100%</p>
                <p className="text-xs text-slate-500 font-medium">Revisão humana obrigatória das mensagens</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700">30 Dias</p>
                <p className="text-xs text-slate-500 font-medium">Motor de alerta antecipado de renovações</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700">AES-256</p>
                <p className="text-xs text-slate-500 font-medium">Criptografia de CPF e Chaves de API</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pilares de Compliance */}
        <section id="compliance" className="py-16 px-4 bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Arquitetura de Confiança para o Mercado Regulado</h2>
              <p className="text-slate-400 mt-2">Diferente de CRMs genéricos, aqui as restrições da SUSEP são regras estruturais de código.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">A IA NUNCA gera preço ou cotação</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  O schema de saída de IA sequer possui campos para moedas, valores de prêmio ou franquias. Valores só são registrados no sistema por um corretor humano autenticado na tela exclusiva de cotações.
                </p>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Revisão Humana Obrigatória</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Nenhuma mensagem criada pela IA é enviada diretamente ao WhatsApp do cliente. Todas nascem como rascunho com status <code className="text-xs bg-slate-700 px-1 py-0.5 rounded">pending_review</code> e dependem da aprovação do corretor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section id="beneficios" className="py-16 px-4 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Funcionalidades Feitas para a Rotina do Corretor</h2>
            <p className="text-slate-600 mt-2">Tecnologia desenhada especificamente para apólices, sinistros e renovações.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
              <BellRing className="w-8 h-8 text-teal-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Radar de Renovações 30 Dias</h3>
              <p className="text-sm text-slate-600">
                O motor diário rastreia apólices que estão prestes a vencer e gera rascunhos de mensagens para garantir sua receita recorrente.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
              <MessageSquare className="w-8 h-8 text-teal-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">API Oficial WhatsApp (360dialog)</h3>
              <p className="text-sm text-slate-600">
                Sem risco de banimento de número. Conexão oficial segura, estável e com credenciais criptografadas em banco com AES-256.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
              <Clock className="w-8 h-8 text-teal-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Gestão de Sinistros e Cotações</h3>
              <p className="text-sm text-slate-600">
                Acompanhe o status de cada sinistro e registre cotações manuais com histórico completo de auditoria para fins regulatórios.
              </p>
            </div>
          </div>
        </section>

        {/* Planos / Preços */}
        <section id="precos" className="py-16 px-4 bg-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Planos Transparentes</h2>
              <p className="text-slate-600 mt-2">Escolha o plano ideal para o tamanho da sua corretora.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Individual */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Corretor Individual</h3>
                  <p className="text-xs text-slate-500 mt-1">Para corretores autônomos</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-4">R$ 197<span className="text-sm font-normal text-slate-500">/mês</span></p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> 1 Número WhatsApp Oficial</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Até 500 apólices ativas</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Alerta de renovação 30 dias</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Fila de revisão humana</li>
                  </ul>
                </div>
                <button className="mt-8 w-full py-2.5 rounded-lg border border-teal-700 text-teal-700 font-semibold hover:bg-teal-50 transition text-sm">
                  Escolher Plano
                </button>
              </div>

              {/* Pro */}
              <div className="bg-white p-6 rounded-xl border-2 border-teal-700 shadow-md flex flex-col justify-between relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-700 text-white text-[11px] font-bold uppercase px-3 py-0.5 rounded-full">
                  Mais Escolhido
                </span>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Corretora Pro</h3>
                  <p className="text-xs text-slate-500 mt-1">Para pequenas e médias corretoras</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-4">R$ 397<span className="text-sm font-normal text-slate-500">/mês</span></p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Até 3 Números WhatsApp</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Até 2.500 apólices ativas</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Multi-usuários (atendentes + corretores)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Gestão de sinistros e cotações</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Logs de auditoria completos</li>
                  </ul>
                </div>
                <button className="mt-8 w-full py-2.5 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition text-sm shadow">
                  Começar Teste Grátis
                </button>
              </div>

              {/* Enterprise */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Enterprise</h3>
                  <p className="text-xs text-slate-500 mt-1">Para grandes corretoras e franqueadoras</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-4">Sob Consulta</p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Números de WhatsApp ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Volume ilimitado de apólices</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> SLA dedicado e integração com multicálculo</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Suporte a auditoria jurídica</li>
                  </ul>
                </div>
                <button className="mt-8 w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm">
                  Falar com Especialista
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} insurance-ai. Todos os direitos reservados. Plataforma de tecnologia para corretores de seguros.</p>
          <div className="flex gap-4">
            <a href="/termos" className="hover:underline">Termos de Uso</a>
            <a href="/privacidade" className="hover:underline">Política de Privacidade (LGPD)</a>
            <a href="/seguranca" className="hover:underline">Segurança da Informação</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
