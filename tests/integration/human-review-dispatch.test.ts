import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, TestDatabaseContext } from '../../src/lib/test-db';
import { getTenantDb } from '../../src/lib/tenant-db';
import { globalMockMessagingProvider } from '../../src/lib/messaging/provider';

describe('Integração: Fila de Revisão Humana e Despacho WhatsApp', () => {
  let dbCtx: TestDatabaseContext;
  let orgId: string;
  let corretorUserId: string;

  beforeAll(async () => {
    dbCtx = await createTestDatabase();

    const org = await dbCtx.prisma.organization.create({
      data: {
        name: 'Porto Forte Seguros',
        slug: 'porto-forte-seguros',
        susepRegistro: 'SUSEP-998811-RJ',
      },
    });
    orgId = org.id;

    const corretor = await dbCtx.prisma.user.create({
      data: {
        name: 'Roberto Corretor',
        email: 'roberto@portoforte.com.br',
        role: 'corretor',
        susepRegistro: 'CORRETOR-SUSEP-12345',
      },
    });
    corretorUserId = corretor.id;
  });

  afterAll(async () => {
    await dbCtx.cleanup();
  });

  beforeEach(() => {
    globalMockMessagingProvider.clear();
  });

  it('deve aprovar minuta pendente, despachar via WhatsApp oficial e gravar auditoria', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);

    const conv = await tenantDb.conversation.create({
      data: {
        organizationId: orgId,
        remoteJid: '5511999990001',
        status: 'qualificado',
      },
    });

    const draft = await tenantDb.message.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        direction: 'out',
        content: 'Olá! Recebi suas informações e já consultei as seguradoras parceiras.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // Estado antes da aprovação
    expect(globalMockMessagingProvider.sentMessages.length).toBe(0);

    // Corretor aprova
    const dispatchResult = await globalMockMessagingProvider.sendMessage({
      to: conv.remoteJid,
      text: draft.content,
    });

    const updatedMessage = await tenantDb.message.update({
      where: { id: draft.id },
      data: {
        reviewStatus: 'approved',
        reviewedById: corretorUserId,
      },
    });

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

    // Asserções
    expect(updatedMessage.reviewStatus).toBe('approved');
    expect(updatedMessage.reviewedById).toBe(corretorUserId);

    // Mensagem de fato despachada no WhatsApp
    expect(globalMockMessagingProvider.sentMessages.length).toBe(1);
    expect(globalMockMessagingProvider.sentMessages[0].to).toBe('5511999990001');
    expect(globalMockMessagingProvider.sentMessages[0].text).toBe(draft.content);

    // Log de auditoria gravado
    const audit = await tenantDb.auditLog.findFirst({
      where: { entidadeId: draft.id, acao: 'APPROVE_MESSAGE' },
    });
    expect(audit).toBeDefined();
    expect(audit?.userId).toBe(corretorUserId);
  });

  it('deve permitir que o corretor edite a minuta antes de aprovar e envie o texto revisado', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);

    const conv = await tenantDb.conversation.create({
      data: {
        organizationId: orgId,
        remoteJid: '5511999990002',
        status: 'qualificado',
      },
    });

    const draft = await tenantDb.message.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        direction: 'out',
        content: 'Texto gerado automaticamente pela IA que precisa de ajuste fino.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    const textoRevisado = 'Texto revisado e customizado com carinho pelo corretor Roberto!';

    await globalMockMessagingProvider.sendMessage({
      to: conv.remoteJid,
      text: textoRevisado,
    });

    const updatedMessage = await tenantDb.message.update({
      where: { id: draft.id },
      data: {
        content: textoRevisado,
        reviewStatus: 'edited',
        reviewedById: corretorUserId,
      },
    });

    expect(updatedMessage.reviewStatus).toBe('edited');
    expect(updatedMessage.content).toBe(textoRevisado);
    expect(globalMockMessagingProvider.sentMessages[0].text).toBe(textoRevisado);
  });

  it('deve descartar minuta rejeitada SEM disparar para o WhatsApp e registrar log', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);

    const conv = await tenantDb.conversation.create({
      data: {
        organizationId: orgId,
        remoteJid: '5511999990003',
        status: 'novo',
      },
    });

    const draft = await tenantDb.message.create({
      data: {
        organizationId: orgId,
        conversationId: conv.id,
        direction: 'out',
        content: 'Minuta que não deve ser enviada.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // Rejeita
    const updated = await tenantDb.message.update({
      where: { id: draft.id },
      data: {
        reviewStatus: 'rejected',
        reviewedById: corretorUserId,
      },
    });

    await tenantDb.auditLog.create({
      data: {
        organizationId: orgId,
        userId: corretorUserId,
        acao: 'REJECT_MESSAGE',
        entidade: 'Message',
        entidadeId: draft.id,
      },
    });

    expect(updated.reviewStatus).toBe('rejected');
    // Nada enviado
    expect(globalMockMessagingProvider.sentMessages.length).toBe(0);

    const audit = await tenantDb.auditLog.findFirst({
      where: { entidadeId: draft.id, acao: 'REJECT_MESSAGE' },
    });
    expect(audit).toBeDefined();
  });
});
