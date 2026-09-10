import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'insurance-ai — Atendimento & Gestão de Carteira WhatsApp para Corretores',
  description: 'Plataforma multi-tenant com IA para qualificação de leads e gestão de apólices com alerta de renovação nos 30 dias. Em conformidade com a SUSEP.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
