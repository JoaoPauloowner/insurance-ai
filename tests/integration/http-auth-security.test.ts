import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createTestDatabase, TestDatabaseContext } from '../../src/lib/test-db';
import { getTenantDb } from '../../src/lib/tenant-db';
import { setPrismaClient } from '../../src/lib/prisma';
import { GET as getApolices } from '../../src/app/api/apolices/route';
import { GET as getPendingMessages } from '../../src/app/api/messages/pending/route';
import { POST as postWhatsAppWebhook } from '../../src/app/api/webhooks/whatsapp/route';

describe('Segurança de Camada HTTP: Autenticação Better Auth e Validação de Webhook', () => {
  let dbCtx: TestDatabaseContext;
  let orgAId: string;

  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = validKey;
    dbCtx = await createTestDatabase();
    setPrismaClient(dbCtx.prisma);

    const orgA = await dbCtx.prisma.organization.create({
      data: {
        name: 'Seguradora Alpha',
        slug: 'seguradora-alpha',
        susepRegistro: 'SUSEP-ALPHA-123',
      },
    });
    orgAId = orgA.id;

    // Cadastra apólice confidencial na Org A
    const tenantDbA = getTenantDb(orgAId, dbCtx.prisma);
    const clienteA = await tenantDbA.cliente.create({
      data: {
        organizationId: orgAId,
        nome: 'Cliente Confidencial Alpha',
        telefone: '5511999990001',
        cpfEncrypted: 'iv:tag:cipher',
      },
    });

    await tenantDbA.apolice.create({
      data: {
        organizationId: orgAId,
        clienteId: clienteA.id,
        seguradora: 'Porto Seguro',
        tipoSeguro: 'auto',
        numeroApolice: 'APO-ALPHA-TOP-SECRET',
        valorPremio: 5000.0,
        dataInicio: new Date(),
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ativa',
      },
    });
  });

  afterAll(async () => {
    await dbCtx.cleanup();
  });

  it('deve retornar 401 ao tentar acessar /api/apolices sem sessão, mesmo fornecendo orgId via query param', async () => {
    // Simula atacante chamando a URL com o ID da Org A como parâmetro sem cookie de sessão
    const attackUrl = `http://localhost:3000/api/apolices?orgId=${orgAId}`;
    const request = new NextRequest(attackUrl, {
      method: 'GET',
    });

    const response = await getApolices(request);

    // O servidor DEVE rejeitar na camada HTTP com 401
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toMatch(/Não autorizado/i);
    expect(body.apolices).toBeUndefined();
  });

  it('deve retornar 401 ao tentar acessar /api/messages/pending sem sessão', async () => {
    const attackUrl = `http://localhost:3000/api/messages/pending?orgId=${orgAId}`;
    const request = new NextRequest(attackUrl, {
      method: 'GET',
    });

    const response = await getPendingMessages(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/Não autorizado/i);
    expect(body.messages).toBeUndefined();
  });

  it('deve rejeitar webhook do WhatsApp com 401 se a assinatura X-Hub-Signature-256 for inválida', async () => {
    const webhookSecret = 'meta_app_secret_super_seguro_2026';
    process.env.WHATSAPP_APP_SECRET = webhookSecret;

    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [],
    });

    // Envia requisição com assinatura forjada
    const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=assinatura_forjada_invalida',
      },
      body: payload,
    });

    const response = await postWhatsAppWebhook(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/X-Hub-Signature-256 inválida/i);

    delete process.env.WHATSAPP_APP_SECRET;
  });

  it('deve rejeitar webhook do WhatsApp com 404 se o número de destino não estiver cadastrado em whatsapp_connections', async () => {
    const webhookSecret = 'meta_app_secret_super_seguro_2026';
    process.env.WHATSAPP_APP_SECRET = webhookSecret;

    const payloadObj = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba_unknown',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'numero_nao_cadastrado_999999',
                  display_phone_number: '551100000000',
                },
                messages: [
                  {
                    from: '5511988887777',
                    text: { body: 'Olá' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const payload = JSON.stringify(payloadObj);
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${validSignature}`,
      },
      body: payload,
    });

    const response = await postWhatsAppWebhook(request);

    // Deve recusar porque não existe organização vinculada a este número
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/Nenhuma corretora\/organização vinculada/i);

    delete process.env.WHATSAPP_APP_SECRET;
  });

  it('deve aceitar webhook com assinatura válida e processar mensagem quando o número de destino está cadastrado', async () => {
    const webhookSecret = 'meta_app_secret_super_seguro_2026';
    process.env.WHATSAPP_APP_SECRET = webhookSecret;

    // Cadastra conexão WhatsApp para a Org A
    await dbCtx.prisma.whatsappConnection.create({
      data: {
        organizationId: orgAId,
        phoneNumber: '5511999998888',
        apiKeyEncrypted: 'iv:tag:cipher',
        isActive: true,
      },
    });

    const payloadObj = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba_123',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: '5511999998888',
                  display_phone_number: '5511999998888',
                },
                contacts: [{ profile: { name: 'Mariana Lima' }, wa_id: '5511977771111' }],
                messages: [
                  {
                    from: '5511977771111',
                    id: 'wamid_test_123',
                    timestamp: '1720000000',
                    type: 'text',
                    text: { body: 'Olá, gostaria de cotar um seguro auto para meu Jeep Compass' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const payload = JSON.stringify(payloadObj);
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${validSignature}`,
      },
      body: payload,
    });

    const response = await postWhatsAppWebhook(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.reviewStatus).toBe('pending_review');

    delete process.env.WHATSAPP_APP_SECRET;
  });
});
