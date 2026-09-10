import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, TestDatabaseContext } from '../../src/lib/test-db';
import { getTenantDb } from '../../src/lib/tenant-db';
import { processRenewalAlerts } from '../../src/lib/queue/renewals';
import { globalMockMessagingProvider } from '../../src/lib/messaging/provider';
import { encryptSensitive } from '../../src/lib/crypto';
import { validateAiOutputWithoutPrice } from '../../src/lib/ai/schemas';

describe('Integração: Motor de Alertas de Renovação (Janela de 30 Dias)', () => {
  let dbCtx: TestDatabaseContext;
  let orgId: string;

  beforeAll(async () => {
    dbCtx = await createTestDatabase();

    const org = await dbCtx.prisma.organization.create({
      data: {
        name: 'Prime Corretora de Seguros',
        slug: 'prime-corretora',
        susepRegistro: 'SUSEP-887722-MG',
      },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    await dbCtx.cleanup();
  });

  beforeEach(() => {
    globalMockMessagingProvider.clear();
  });

  it('deve identificar apólice vencendo em 28 dias e gerar minuta em pending_review sem preço', async () => {
    const tenantDb = getTenantDb(orgId, dbCtx.prisma);

    const cliente = await tenantDb.cliente.create({
      data: {
        organizationId: orgId,
        nome: 'Fernando Silveira',
        telefone: '5531988881234',
        cpfEncrypted: encryptSensitive('987.654.321-99'),
      },
    });

    const now = new Date();
    const dataVencimento28Dias = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    const dataVencimento180Dias = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    // Apólice a vencer na janela alvo de 30 dias
    const apoliceExpiring = await tenantDb.apolice.create({
      data: {
        organizationId: orgId,
        clienteId: cliente.id,
        seguradora: 'Porto Seguro',
        tipoSeguro: 'auto',
        numeroApolice: 'AP-PORTO-2025-001',
        valorPremio: 2450.0, // Cadastrado por humano
        dataInicio: new Date(now.getTime() - 337 * 24 * 60 * 60 * 1000),
        dataVencimento: dataVencimento28Dias,
        status: 'ativa',
      },
    });

    // Apólice longe do vencimento (não deve acionar alerta)
    const apoliceFar = await tenantDb.apolice.create({
      data: {
        organizationId: orgId,
        clienteId: cliente.id,
        seguradora: 'Allianz',
        tipoSeguro: 'residencial',
        numeroApolice: 'AP-ALLIANZ-2025-002',
        valorPremio: 890.0,
        dataInicio: now,
        dataVencimento: dataVencimento180Dias,
        status: 'ativa',
      },
    });

    // Executa a varredura de renovações
    const result = await processRenewalAlerts({
      tenantDb,
      organizationId: orgId,
    });

    // Asserções:
    // Apenas a apólice de 28 dias foi processada
    expect(result.processedCount).toBe(1);
    expect(result.draftsCreatedCount).toBe(1);

    const draft = result.drafts[0];
    expect(draft.apoliceId).toBe(apoliceExpiring.id);
    expect(draft.clienteNome).toBe('Fernando Silveira');

    // Regra Pétrea: NUNCA gera preço
    expect(() => validateAiOutputWithoutPrice(draft.draftText)).not.toThrow();
    expect(draft.draftText).not.toMatch(/R\$|\d+\s*reais/i);
    expect(draft.draftText).toContain('Fernando Silveira');
    expect(draft.draftText).toContain('Porto Seguro');

    // Status da apólice mudou para 'em_renovacao'
    const updatedApolice = await tenantDb.apolice.findUnique({
      where: { id: apoliceExpiring.id },
    });
    expect(updatedApolice?.status).toBe('em_renovacao');

    // Apólice de 180 dias continua intocada
    const unchangedApolice = await tenantDb.apolice.findUnique({
      where: { id: apoliceFar.id },
    });
    expect(unchangedApolice?.status).toBe('ativa');

    // Nenhuma mensagem enviada ao WhatsApp (ainda na fila de revisão humana)
    expect(globalMockMessagingProvider.sentMessages.length).toBe(0);

    // Teste de Idempotência: rodar novamente não duplica a minuta
    const rerunResult = await processRenewalAlerts({
      tenantDb,
      organizationId: orgId,
    });
    expect(rerunResult.draftsCreatedCount).toBe(0);
  });
});
