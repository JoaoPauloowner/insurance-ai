import { Queue } from 'bullmq';
import { getRedisConnection } from './redis';
import { AIProvider, getAIProvider } from '../ai/provider';
import { validateAiOutputWithoutPrice } from '../ai/schemas';

export interface RenewalJobData {
  organizationId: string;
}

export const RENEWAL_QUEUE_NAME = 'insurance-renewals-check';

let renewalQueue: Queue | null = null;

export function getRenewalQueue(): Queue | null {
  const redis = getRedisConnection();
  if (!redis) return null;

  if (!renewalQueue) {
    renewalQueue = new Queue(RENEWAL_QUEUE_NAME, {
      connection: redis as any,
    });
  }
  return renewalQueue;
}

/**
 * Função central de processamento de alertas de renovação (30 dias antes do vencimento).
 * Pode ser executada diretamente (cron HTTP / CLI / testes) ou pelo Worker BullMQ.
 */
export async function processRenewalAlerts(options: {
  tenantDb: any; // Instância retornada por getTenantDb(organizationId)
  organizationId: string;
  aiProvider?: AIProvider;
  daysWindowStart?: number; // default 20 dias
  daysWindowEnd?: number; // default 35 dias
}) {
  const {
    tenantDb,
    organizationId,
    aiProvider = getAIProvider(),
    daysWindowStart = 20,
    daysWindowEnd = 35,
  } = options;

  const now = new Date();
  const minDate = new Date(now.getTime() + daysWindowStart * 24 * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + daysWindowEnd * 24 * 60 * 60 * 1000);

  // 1. Busca apólices ativas que vencem na janela de 30 dias
  const expiringPolicies = await tenantDb.apolice.findMany({
    where: {
      status: 'ativa',
      dataVencimento: {
        gte: minDate,
        lte: maxDate,
      },
    },
    include: {
      cliente: true,
    },
  });

  const generatedDrafts = [];

  for (const apolice of expiringPolicies) {
    if (!apolice.cliente || !apolice.cliente.telefone) continue;

    // 2. Busca ou cria conversa vinculada
    let conversation = await tenantDb.conversation.findFirst({
      where: { remoteJid: apolice.cliente.telefone },
    });

    if (!conversation) {
      conversation = await tenantDb.conversation.create({
        data: {
          organizationId,
          remoteJid: apolice.cliente.telefone,
          clienteId: apolice.cliente.id,
          status: 'aguardando_renovacao',
        },
      });
    }

    // 3. Evita duplicidade: verifica se já gerou minuta de renovação nos últimos 15 dias
    const recentDraft = await tenantDb.message.findFirst({
      where: {
        conversationId: conversation.id,
        aiGenerated: true,
        createdAt: {
          gte: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentDraft) {
      continue; // Alerta já gerado recentemente
    }

    // 4. IA gera a minuta de renovação personalizada
    const renewalResult = await aiProvider.generateRenewalDraft({
      clienteNome: apolice.cliente.nome,
      tipoSeguro: apolice.tipoSeguro,
      seguradora: apolice.seguradora,
      dataVencimento: apolice.dataVencimento,
    });

    // 5. Regra Pétrea: NUNCA gera preço
    validateAiOutputWithoutPrice(renewalResult.draftText);

    // 6. Regra Pétrea: Cria mensagem em PENDING_REVIEW (Revisão Humana Obrigatória)
    const draftMessage = await tenantDb.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: 'out',
        content: renewalResult.draftText,
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // 7. Atualiza status da apólice para 'em_renovacao'
    await tenantDb.apolice.update({
      where: { id: apolice.id },
      data: { status: 'em_renovacao' },
    });

    generatedDrafts.push({
      apoliceId: apolice.id,
      clienteNome: apolice.cliente.nome,
      messageId: draftMessage.id,
      draftText: renewalResult.draftText,
      dataVencimento: apolice.dataVencimento,
    });
  }

  return {
    processedCount: expiringPolicies.length,
    draftsCreatedCount: generatedDrafts.length,
    drafts: generatedDrafts,
  };
}
