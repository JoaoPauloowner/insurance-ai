import Link from 'next/link';
import { ShieldCheck, MessageSquareText, FileText, ArrowLeft } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner de Compliance SUSEP */}
      <div className="bg-emerald-950/80 border-b border-emerald-800/40 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Ambiente Seguro SUSEP & LGPD:</strong> Criptografia AES-256 ativa • Revisão humana obrigatória • Bloqueio estrito de preços gerados por IA.
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                IA
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Insurance-AI
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard/revisao"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <MessageSquareText className="w-4 h-4 text-emerald-400" />
                Fila de Revisão
              </Link>

              <Link
                href="/dashboard/apolices"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4 text-teal-400" />
                Minhas Apólices & Renovações
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Página Inicial
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                CR
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">Corretor Conectado</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
