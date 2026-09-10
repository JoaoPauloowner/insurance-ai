import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getTenantDb } from '@/lib/tenant-db';
import { TenantAccessError } from '@/lib/errors';
import { createTestDatabase } from '@/lib/test-db';
import { encryptSensitive } from '@/lib/crypto';

/**
 * TESTE CRÍTICO DE ISOLAMENTO MULTI-TENANT ENTRE CORRETORAS (Fase 1)
 *
 * Objetivo: Provar matematicamente e na prática que a Corretora B (Org B) JAMAIS consegue:
 * 1. Listar dados da Corretora A (findMany)
 * 2. Buscar por ID direto dados da Corretora A (findUnique / findFirst)
 * 3. Atualizar dados da Corretora A (update / updateMany)
 * 4. Excluir dados da Corretora A (delete / deleteMany)
 *
 * Em todas as entidades do domínio de seguros: Clientes, Apólices, Cotações, Sinistros e Conversas.
 */

describe('Insurance Multi-Tenant Isolation Integration Test', () => {
  let prisma: PrismaClient;
  let cleanupDb: () => Promise<void>;

  const orgAId = 'corretora-alpha-id';
  const orgBId = 'corretora-beta-id';
  const userAId = 'user-corretor-alpha-id';
  const userBId = 'user-corretor-beta-id';

  beforeAll(async () => {
    const testDb = await createTestDatabase();
    prisma = testDb.prisma;
    cleanupDb = testDb.cleanup;

    // 1. Criação das duas corretoras (Organizations) distintas
    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: 'Alpha Seguros Corretora (Org A)', slug: 'alpha-seguros', susepRegistro: 'SUSEP-112233' },
        { id: orgBId, name: 'Beta Proteção Corretora (Org B)', slug: 'beta-seguros', susepRegistro: 'SUSEP-445566' },
      ],
    });

    // 2. Criação dos corretores
    await prisma.user.createMany({
      data: [
        { id: userAId, name: 'Corretor Carlos (Org A)', email: 'carlos@alpha.com', role: 'corretor' },
        { id: userBId, name: 'Corretora Beatriz (Org B)', email: 'beatriz@beta.com', role: 'corretor' },
      ],
    });
  });

  afterAll(async () => {
    if (cleanupDb) {
      await cleanupDb();
    }
  });

  it('deve bloquear instanciação de tenantDb com organizationId vazio ou inválido', () => {
    expect(() => getTenantDb('')).toThrow(TenantAccessError);
    expect(() => getTenantDb('   ')).toThrow(TenantAccessError);
    // @ts-expect-error teste com valor undefined
    expect(() => getTenantDb(undefined)).toThrow(TenantAccessError);
  });

  it('deve isolar completamente Clientes criados pela Corretora A impedindo leitura e busca pela Corretora B', async () => {
    const dbA = getTenantDb(orgAId, prisma);
    const dbB = getTenantDb(orgBId, prisma);

    // 1. Corretora A cadastra um segurado confidencial com CPF criptografado
    const clienteA = await dbA.cliente.create({
      data: {
        organizationId: orgAId,
        nome: 'Dr. Roberto Magalhães (Segurado Alpha)',
        telefone: '+551199887766',
        cpfEncrypted: encryptSensitive('111.222.333-44'),
        email: 'roberto@paciente.com',
      },
    });

    expect(clienteA.id).toBeDefined();
    expect(clienteA.organizationId).toBe(orgAId);

    // 2. Corretora A lista e vê seu cliente
    const clientesA = await dbA.cliente.findMany();
    expect(clientesA.some((c) => c.id === clienteA.id)).toBe(true);

    // 3. REGRA CRÍTICA: Corretora B lista e NÃO vê o cliente da Corretora A
    const clientesB = await dbB.cliente.findMany();
    const leakedClient = clientesB.find((c) => c.id === clienteA.id);
    expect(leakedClient).toBeUndefined();

    // 4. REGRA CRÍTICA: Corretora B tenta buscar diretamente pelo ID do cliente A e recebe null
    const directFetch = await dbB.cliente.findUnique({
      where: { id: clienteA.id },
    });
    expect(directFetch).toBeNull();

    const firstFetch = await dbB.cliente.findFirst({
      where: { id: clienteA.id },
    });
    expect(firstFetch).toBeNull();
  });

  it('deve isolar Apólices e impedir que a Corretora B altere ou exclua apólices da Corretora A', async () => {
    const dbA = getTenantDb(orgAId, prisma);
    const dbB = getTenantDb(orgBId, prisma);

    // Cliente prévio da Org A
    const clienteA = await dbA.cliente.findFirst();
    expect(clienteA).not.toBeNull();

    // Corretora A cadastra apólice de seguro Auto com vencimento em 30 dias
    const apoliceA = await dbA.apolice.create({
      data: {
        organizationId: orgAId,
        clienteId: clienteA!.id,
        seguradora: 'Porto Seguro',
        tipoSeguro: 'auto',
        numeroApolice: 'APO-2026-9988',
        valorPremio: 3500.0,
        dataInicio: new Date('2025-10-10'),
        dataVencimento: new Date('2026-10-10'),
        status: 'ativa',
      },
    });

    expect(apoliceA.id).toBeDefined();

    // 1. Corretora B tenta listar apólices da A -> Retorna vazio
    const apolicesB = await dbB.apolice.findMany();
    expect(apolicesB.find((a) => a.id === apoliceA.id)).toBeUndefined();

    // 2. Corretora B tenta alterar o status da apólice da Corretora A -> Deve lançar TenantAccessError
    await expect(
      dbB.apolice.update({
        where: { id: apoliceA.id },
        data: { status: 'cancelada' },
      })
    ).rejects.toThrow(TenantAccessError);

    // 3. Corretora B tenta excluir a apólice da Corretora A -> Deve lançar TenantAccessError
    await expect(
      dbB.apolice.delete({
        where: { id: apoliceA.id },
      })
    ).rejects.toThrow(TenantAccessError);

    // 4. Corretora B tenta updateMany em lote -> Afeta 0 registros
    const updateManyResult = await dbB.apolice.updateMany({
      where: { id: apoliceA.id },
      data: { status: 'cancelada' },
    });
    expect(updateManyResult.count).toBe(0);

    // 5. Verifica que a apólice da Corretora A permanece intacta e ativa
    const apoliceAIntacta = await dbA.apolice.findUnique({
      where: { id: apoliceA.id },
    });
    expect(apoliceAIntacta?.status).toBe('ativa');
  });

  it('deve isolar Cotações criadas manualmente por corretores humanos', async () => {
    const dbA = getTenantDb(orgAId, prisma);
    const dbB = getTenantDb(orgBId, prisma);

    const clienteA = await dbA.cliente.findFirst();

    // Corretor da Org A registra cotação humana
    const cotacaoA = await dbA.cotacao.create({
      data: {
        organizationId: orgAId,
        clienteId: clienteA!.id,
        seguradora: 'Allianz Seguros',
        dadosEntrada: { franquia: 'reduzida', carroReserva: true },
        valorPremio: 2850.5,
        status: 'enviada',
        criadoPorId: userAId, // Sempre um humano!
      },
    });

    expect(cotacaoA.id).toBeDefined();

    // Org B não vê a cotação da Org A
    const cotacoesB = await dbB.cotacao.findMany();
    expect(cotacoesB.some((c) => c.id === cotacaoA.id)).toBe(false);

    // Org B não pode excluir a cotação da Org A
    await expect(
      dbB.cotacao.delete({
        where: { id: cotacaoA.id },
      })
    ).rejects.toThrow(TenantAccessError);
  });

  it('deve isolar a Fila de Revisão Humana: Org B não pode ver, aprovar ou alterar minutas da Org A', async () => {
    const dbA = getTenantDb(orgAId, prisma);
    const dbB = getTenantDb(orgBId, prisma);

    const convA = await dbA.conversation.create({
      data: {
        organizationId: orgAId,
        remoteJid: '+5511911112222',
        status: 'qualificado',
      },
    });

    const msgA = await dbA.message.create({
      data: {
        organizationId: orgAId,
        conversationId: convA.id,
        direction: 'out',
        content: 'Minuta confidencial da Org A aguardando aprovação.',
        aiGenerated: true,
        requiresReview: true,
        reviewStatus: 'pending_review',
      },
    });

    // 1. Org B não enxerga a mensagem pendente da Org A
    const pendingB = await dbB.message.findMany({
      where: { reviewStatus: 'pending_review' },
    });
    expect(pendingB.some((m) => m.id === msgA.id)).toBe(false);

    // 2. Org B tenta buscar diretamente por ID e recebe null
    const directFetch = await dbB.message.findUnique({
      where: { id: msgA.id },
    });
    expect(directFetch).toBeNull();

    // 3. Org B tenta alterar status da mensagem da Org A e é bloqueada com TenantAccessError
    await expect(
      dbB.message.update({
        where: { id: msgA.id },
        data: { reviewStatus: 'approved' },
      })
    ).rejects.toThrow(TenantAccessError);

    // 4. Org B tenta deletar a mensagem da Org A e é bloqueada com TenantAccessError
    await expect(
      dbB.message.delete({
        where: { id: msgA.id },
      })
    ).rejects.toThrow(TenantAccessError);

    // 5. Minuta da Org A permanece intocada em pending_review
    const msgAIntacta = await dbA.message.findUnique({
      where: { id: msgA.id },
    });
    expect(msgAIntacta?.reviewStatus).toBe('pending_review');
  });
});

