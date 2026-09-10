import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { processIncomingInsuranceMessage } from '@/lib/ai/qualification';
import { encryptSensitive } from '@/lib/crypto';
import { WhatsAppWebhookPayload } from '@/lib/messaging/types';

// Validação de Webhook (Meta / 360dialog verification handshake)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'insurance-ai-token';

  if (mode === 'subscribe' && token === webhookVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token de verificação inválido' }, { status: 403 });
}

// Ingestão de mensagens recebidas
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('orgId') || request.headers.get('x-organization-id');

    const body = (await request.json()) as WhatsAppWebhookPayload;

    // Se organizationId não foi passado no parâmetro, busca da primeira conexão ativa
    if (!organizationId) {
      const conn = await prisma.whatsappConnection.findFirst({
        where: { isActive: true },
        select: { organizationId: true },
      });
      if (conn) {
        organizationId = conn.organizationId;
      } else {
        const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
        organizationId = firstOrg?.id || null;
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Nenhuma organização/corretora associada encontrada para este webhook' },
        { status: 400 }
      );
    }

    // Extrai mensagem recebida (suporta formato Meta Cloud API e 360dialog direto)
    let fromNumber = '';
    let textContent = '';
    let senderName = 'Segurado';

    if (body.entry?.[0]?.changes?.[0]?.value) {
      const val = body.entry[0].changes[0].value;
      const msg = val.messages?.[0];
      const contact = val.contacts?.[0];

      if (msg) {
        fromNumber = msg.from;
        textContent = msg.text?.body || '';
      }
      if (contact?.profile?.name) {
        senderName = contact.profile.name;
      }
    } else if (body.messages?.[0]) {
      const msg = body.messages[0];
      fromNumber = msg.from;
      textContent = msg.text?.body || '';
      if (body.contacts?.[0]?.profile?.name) {
        senderName = body.contacts[0].profile.name;
      }
    }

    if (!fromNumber || !textContent) {
      // Pode ser evento de status (delivered, read) — responde 200 OK sem erro
      return NextResponse.json({ status: 'ignored_non_message_event' }, { status: 200 });
    }

    const tenantDb = getTenantDb(organizationId);

    // 1. Localiza ou cria Cliente
    let cliente = await tenantDb.cliente.findFirst({
      where: { telefone: fromNumber },
    });

    if (!cliente) {
      cliente = await tenantDb.cliente.create({
        data: {
          organizationId,
          nome: senderName,
          telefone: fromNumber,
          cpfEncrypted: encryptSensitive('000.000.000-00'), // Placeholder protegido até coleta
        },
      });
    }

    // 2. Localiza ou cria Conversa
    let conversation = await tenantDb.conversation.findFirst({
      where: { remoteJid: fromNumber },
    });

    if (!conversation) {
      conversation = await tenantDb.conversation.create({
        data: {
          organizationId,
          remoteJid: fromNumber,
          clienteId: cliente.id,
          status: 'novo',
        },
      });
    }

    // 3. Salva a mensagem recebida (INBOUND)
    const incomingMessage = await tenantDb.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: 'in',
        content: textContent,
        aiGenerated: false,
        requiresReview: false,
        reviewStatus: 'none',
      },
    });

    // 4. Dispara a IA para gerar a minuta de resposta (em PENDING_REVIEW)
    const qualificationResult = await processIncomingInsuranceMessage({
      tenantDb,
      organizationId,
      conversationId: conversation.id,
      userMessage: textContent,
      clienteNome: cliente.nome,
    });

    return NextResponse.json(
      {
        success: true,
        incomingMessageId: incomingMessage.id,
        draftMessageId: qualificationResult.draftMessage.id,
        reviewStatus: qualificationResult.draftMessage.reviewStatus,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Webhook WhatsApp] Erro no processamento:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar webhook' },
      { status: 500 }
    );
  }
}
