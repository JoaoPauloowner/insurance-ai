import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, TestDatabaseContext } from '../../src/lib/test-db';
import { getTenantDb } from '../../src/lib/tenant-db';
import { processIncomingInsuranceMessage } from '../../src/lib/ai/qualification';
import { globalMockMessagingProvider } from '../../src/lib/messaging/provider';
import { encryptSensitive } from '../../src/lib/crypto';
import { validateAiOutputWithoutPrice } from '../../src/lib/ai/schemas';

describe('Integração: Ingestão de WhatsApp e Geração de Minuta em Revisão', () => {
  let dbCtx: TestDatabaseContext;
  let orgAId: string;

  beforeAll(async () => {
    dbCtx = await createTestDatabase();

    const orgA = await dbCtx.prisma.organization.create({
      data: {
        name: 'Corretora Aliança Seguros',
        slug: 'alianca-seguros',
        susepRegistro: 'SUSEP-109283-SP',
      },
    });
    orgAId = orgA.id;
  });

  afterAll(async () => {
    await dbCtx.cleanup();
  });

  beforeEach(() => {
    globalMockMessagingProvider.clear();
  });

  it('deve processar mensagem recebida e gerar minuta em pending_review sem envio ao WhatsApp', async () => {
    const tenantDb = getTenantDb(orgAId, dbCtx.prisma);

    // Cria cliente
    const cliente = await tenantDb.cliente.create({
      data: {
        organizationId: orgAId,
        nome: 'Carlos Eduardo Segurado',
        telefone: '5511988887777',
        cpfEncrypted: encryptSensitive('123.456.789-00'),
      },
    });

    // Cria conversa
    const conversation = await tenantDb.conversation.create({
      data: {
        organizationId: orgAId,
        remoteJid: '5511988887777',
        clienteId: cliente.id,
        status: 'novo',
      },
    });

    const userMessage = 'Olá! Gostaria de cotar seguro para meu Corolla 2023. Como funciona?';

    // 1. Salva mensagem de entrada
    await tenantDb.message.create({
      data: {
        organizationId: orgAId,
        conversationId: conversation.id,
        direction: 'in',
        content: userMessage,
        aiGenerated: false,
        requiresReview: false,
        reviewStatus: 'none',
      },
    });

    // 2. Executa qualificação por IA
    const result = await processIncomingInsuranceMessage({
      tenantDb,
      organizationId: orgAId,
      conversationId: conversation.id,
      userMessage,
      clienteNome: cliente.nome,
    });

    // Asserções:
    // A minuta foi gerada
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage.direction).toBe('out');
    expect(result.draftMessage.aiGenerated).toBe(true);
    expect(result.draftMessage.requiresReview).toBe(true);
    expect(result.draftMessage.reviewStatus).toBe('pending_review');

    // Regra Pétrea: Minuta não possui valores ou preços
    expect(() => validateAiOutputWithoutPrice(result.draftMessage.content)).not.toThrow();
    expect(result.draftMessage.content).not.toMatch(/R\$|\d+\s*reais/i);

    // Regra Pétrea: NENHUMA mensagem foi enviada ao provedor externo
    expect(globalMockMessagingProvider.sentMessages.length).toBe(0);

    // Conversa atualizada para 'qualificado'
    const updatedConv = await tenantDb.conversation.findUnique({ where: { id: conversation.id } });
    expect(updatedConv?.status).toBe('qualificado');
  });

  it('deve classificar relato de colisão como sinistro e gerar minuta empática em pending_review', async () => {
    const tenantDb = getTenantDb(orgAId, dbCtx.prisma);

    const conversation = await tenantDb.conversation.create({
      data: {
        organizationId: orgAId,
        remoteJid: '5511977776666',
        status: 'novo',
      },
    });

    const sinistroMsg = 'Acabei de bater o carro no cruzamento e preciso de um guincho urgente!';

    await tenantDb.message.create({
      data: {
        organizationId: orgAId,
        conversationId: conversation.id,
        direction: 'in',
        content: sinistroMsg,
      },
    });

    const result = await processIncomingInsuranceMessage({
      tenantDb,
      organizationId: orgAId,
      conversationId: conversation.id,
      userMessage: sinistroMsg,
      clienteNome: 'Mariana',
    });

    expect(result.isSinistro).toBe(true);
    expect(result.draftMessage.reviewStatus).toBe('pending_review');
    expect(result.draftMessage.content).toContain('bem fisicamente');
    expect(globalMockMessagingProvider.sentMessages.length).toBe(0);

    const updatedConv = await tenantDb.conversation.findUnique({ where: { id: conversation.id } });
    expect(updatedConv?.status).toBe('sinistro_em_analise');
  });
});
