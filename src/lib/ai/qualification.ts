import { AIProvider, getAIProvider } from './provider';
import { validateAiOutputWithoutPrice } from './schemas';

export interface ProcessIncomingMessageOptions {
  tenantDb: any; // Instância retornada por getTenantDb(organizationId)
  organizationId: string;
  conversationId: string;
  userMessage: string;
  clienteNome?: string;
  aiProvider?: AIProvider;
}

export async function processIncomingInsuranceMessage(options: ProcessIncomingMessageOptions) {
  const { tenantDb, organizationId, conversationId, userMessage, clienteNome, aiProvider = getAIProvider() } = options;

  // 1. Busca mensagens recentes para contexto
  const pastMessages = await tenantDb.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const history = pastMessages.map((m: { direction: string; content: string }) => ({
    role: (m.direction === 'in' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
  }));

  // Se a última do banco não for a atual, inclui
  if (history.length === 0 || history[history.length - 1].content !== userMessage) {
    history.push({ role: 'user', content: userMessage });
  }

  // 2. Classifica se é sinistro ou qualificação de contratação/renovação
  const isSinistro = /batida|colis|acidente|guincho|roubo|furto|sinistro|pane/i.test(userMessage);

  let draftText = '';
  let qualification = null;

  if (isSinistro) {
    const claimResult = await aiProvider.generateClaimDraft({
      clienteNome: clienteNome || 'Cliente',
      relatoCliente: userMessage,
    });
    draftText = claimResult.draftText;
  } else {
    qualification = await aiProvider.qualifyInsuranceLead(history);
    draftText = qualification.sugestao_resposta_ao_cliente;
  }

  // 3. Regra Pétrea: NUNCA gera preço
  validateAiOutputWithoutPrice(draftText);

  // 4. Regra Pétrea: Salva como pending_review (Revisão Humana Obrigatória)
  const draftMessage = await tenantDb.message.create({
    data: {
      organizationId,
      conversationId,
      direction: 'out',
      content: draftText,
      aiGenerated: true,
      requiresReview: true,
      reviewStatus: 'pending_review',
    },
  });

  // 5. Atualiza conversa
  await tenantDb.conversation.update({
    where: { id: conversationId },
    data: {
      status: isSinistro ? 'sinistro_em_analise' : qualification?.qualificado ? 'qualificado' : 'novo',
      lastMessageAt: new Date(),
    },
  });

  return {
    draftMessage,
    qualification,
    isSinistro,
  };
}
