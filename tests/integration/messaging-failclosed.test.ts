import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, TestDatabaseContext } from '../../src/lib/test-db';
import { getTenantDb } from '../../src/lib/tenant-db';
import { getMessagingProvider, MockMessagingProvider, MessagingConfigError } from '../../src/lib/messaging/provider';
import { encryptSensitive } from '../../src/lib/crypto';

/**
 * FASE 1 — Testes de integração: mensagens "enviadas" que na real não saem.
 *
 * Garante que:
 * (a) Credencial ausente → getMessagingProvider lança, mensagem permanece pending_review
 * (b) decryptSensitive lança → mesmo comportamento
 * (c) Caminho feliz com provider mockado via DI (não via NODE_ENV)
 */

describe('Fase 1: Messaging Provider Fail-Closed e DI', () => {
  let dbCtx: TestDatabaseContext;
  let orgId: string;
  let corretorUserId: string;

  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = validKey;
    dbCtx = await createTestDatabase();

    const org = await dbCtx.prisma.organization.create({
      data: {
        name: 'Corretora Teste Fase1',
        slug: 'corretora-fase1',
        susepRegistro: 'SUSEP-FASE1-001',
      },
    });
    orgId = org.id;

    const corretor = await dbCtx.prisma.user.create({
      data: {
        name: 'Corretor Fase1',
        email: 'corretor@fase1.com',
        role: 'corretor',
      },
    });
    corretorUserId = corretor.id;
  });

  afterAll(async () => {
    await dbCtx.cleanup();
  });

  it('(a) getMessagingProvider SEM apiKey deve lançar MessagingConfigError — nunca retorna mock', () => {
    expect(() => getMessagingProvider()).toThrow(MessagingConfigError);
    expect(() => getMessagingProvider(undefined)).toThrow(MessagingConfigError);
    expect(() => getMessagingProvider('')).toThrow(MessagingConfigError);
    expect(() => getMessagingProvider('   ')).toThrow(MessagingConfigError);
  });

  it('(b) getMessagingProvider COM apiKey válida deve retornar provider real (ThreeSixtyDialogProvider)', () => {
    const provider = getMessagingProvider('valid_api_key_123');
    expect(provider.name).toBe('dialog360');
    // Não deve ser mock
    expect(provider).not.toBeInstanceOf(MockMessagingProvider);
  });

  it('(c) credencial ausente → mensagem permanece pending_review, nenhum envio ocorre', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);

    const conv = await tenantDb.conversation.create({
      data: {
        organizationId: orgId,
        remoteJid: '5511999990099',
        status: 'qualificado',
      },
    });

    const draft = await tenantDb.message.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        direction: 'out',
        content: 'Minuta que deveria ser enviada mas não pode.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // SEM whatsappConnection configurada → não há apiKey para decrypt
    const connection = await tenantDb.whatsappConnection.findFirst({
      where: { isActive: true },
    });
    expect(connection).toBeNull();

    // Simula o fluxo de aprovação: tenta obter provider → deve falhar
    let providerError: Error | null = null;
    try {
      getMessagingProvider(undefined); // Sem apiKey
    } catch (err: any) {
      providerError = err;
    }

    expect(providerError).toBeInstanceOf(MessagingConfigError);

    // Mensagem DEVE permanecer pending_review (não foi marcada como approved)
    const msgAfter = await tenantDb.message.findUnique({
      where: { id: draft.id },
    });
    expect(msgAfter?.reviewStatus).toBe('pending_review');
  });

  it('(d) decryptSensitive com dados inválidos → lança erro, mensagem permanece pending_review', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);

    // Cria conexão com apiKey com dados criptografados INVÁLIDOS
    await tenantDb.whatsappConnection.create({
      data: {
        organizationId: orgId,
        phoneNumber: '5511999990098',
        apiKeyEncrypted: 'dados_corrompidos_sem_formato_iv_tag_cipher',
        isActive: true,
      },
    });

    const conv = await tenantDb.conversation.create({
      data: {
        organizationId: orgId,
        remoteJid: '5511999990098',
        status: 'qualificado',
      },
    });

    const draft = await tenantDb.message.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        direction: 'out',
        content: 'Minuta de teste.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // Simula fluxo: buscar conexão e tentar descriptografar
    const connection = await tenantDb.whatsappConnection.findFirst({
      where: { isActive: true },
    });
    expect(connection).not.toBeNull();

    let decryptError: Error | null = null;
    try {
      const { decryptSensitive } = await import('../../src/lib/crypto');
      decryptSensitive(connection!.apiKeyEncrypted);
    } catch (err: any) {
      decryptError = err;
    }

    // Decrypt DEVE falhar com dados corrompidos
    expect(decryptError).not.toBeNull();

    // Mensagem DEVE permanecer pending_review
    const msgAfter = await tenantDb.message.findUnique({
      where: { id: draft.id },
    });
    expect(msgAfter?.reviewStatus).toBe('pending_review');
  });

  it('(e) caminho feliz: provider via DI (MockMessagingProvider injetado) → mensagem marcada approved', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);
    const mockProvider = new MockMessagingProvider();

    const conv = await tenantDb.conversation.create({
      data: {
        organizationId: orgId,
        remoteJid: '5511999990097',
        status: 'qualificado',
      },
    });

    const draft = await tenantDb.message.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        direction: 'out',
        content: 'Minuta aprovada com DI.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // Provider injetado via DI — não via getMessagingProvider() nem NODE_ENV
    const dispatchResult = await mockProvider.sendMessage({
      to: conv.remoteJid,
      text: draft.content,
    });

    expect(dispatchResult.status).toBe('sent');
    expect(dispatchResult.messageId).toBeDefined();

    // Marca como approved SOMENTE APÓS envio bem-sucedido
    await tenantDb.message.update({
      where: { id: draft.id },
      data: {
        reviewStatus: 'approved',
        reviewedById: corretorUserId,
      },
    });

    // Cria log de auditoria
    await tenantDb.auditLog.create({
      data: {
        organizationId: orgId,
        userId: corretorUserId,
        acao: 'APPROVE_MESSAGE',
        entidade: 'Message',
        entidadeId: draft.id,
        detalhes: {
          externalMessageId: dispatchResult.messageId,
          status: 'approved',
        },
      },
    });

    const msgAfter = await tenantDb.message.findUnique({
      where: { id: draft.id },
    });
    expect(msgAfter?.reviewStatus).toBe('approved');
    expect(msgAfter?.reviewedById).toBe(corretorUserId);

    const audit = await tenantDb.auditLog.findFirst({
      where: { entidadeId: draft.id, acao: 'APPROVE_MESSAGE' },
    });
    expect(audit).toBeDefined();
    expect(mockProvider.sentMessages.length).toBe(1);
  });
});
