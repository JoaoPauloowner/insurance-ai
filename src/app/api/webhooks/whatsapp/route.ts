import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { processIncomingInsuranceMessage } from '@/lib/ai/qualification';
import { encryptSensitive } from '@/lib/crypto';
import { WhatsAppWebhookPayload } from '@/lib/messaging/types';
import { verifyWhatsAppSignature } from '@/lib/messaging/signature';

// Validação de Webhook Handshake (GET)
export async function GET(request: NextRequest) {
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!webhookVerifyToken || webhookVerifyToken.trim() === '') {
    console.error('[Webhook WhatsApp] ERRO: WHATSAPP_WEBHOOK_VERIFY_TOKEN não definido no ambiente.');
    return NextResponse.json(
      { error: 'Configuração do webhook incompleta no servidor. WHATSAPP_WEBHOOK_VERIFY_TOKEN ausente.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === webhookVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token de verificação inválido' }, { status: 403 });
}

// Ingestão de mensagens recebidas (POST)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 1. Validação de Assinatura Criptográfica X-Hub-Signature-256
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.DIALOG360_WEBHOOK_SECRET;
    if (appSecret) {
      const signatureHeader = request.headers.get('x-hub-signature-256');
      const isValid = verifyWhatsAppSignature(rawBody, signatureHeader, appSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Assinatura criptográfica X-Hub-Signature-256 inválida ou ausente.' },
          { status: 401 }
        );
      }
    }

    let body: WhatsAppWebhookPayload;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
    }

    // 2. Extrai o identificador do número de destino (phone_number_id ou display_phone_number)
    let destinationPhoneId = '';
    let destinationPhoneNumber = '';

    if (body.entry?.[0]?.changes?.[0]?.value?.metadata) {
      const meta = body.entry[0].changes[0].value.metadata;
      destinationPhoneId = meta.phone_number_id || '';
      destinationPhoneNumber = meta.display_phone_number?.replace(/\D/g, '') || '';
    }

    // 3. Regra Crítica: O organizationId vem EXCLUSIVAMENTE do número de destino cadastrado no banco
    if (!destinationPhoneId && !destinationPhoneNumber) {
      return NextResponse.json(
        { error: 'Metadados de destino ausentes no webhook (phone_number_id não identificado).' },
        { status: 400 }
      );
    }

    const connection = await prisma.whatsappConnection.findFirst({
      where: {
        isActive: true,
        OR: [
          ...(destinationPhoneId ? [{ phoneNumber: destinationPhoneId }] : []),
          ...(destinationPhoneNumber ? [{ phoneNumber: destinationPhoneNumber }] : []),
        ],
      },
      select: { organizationId: true },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Nenhuma corretora/organização vinculada a este número de WhatsApp de destino.' },
        { status: 404 }
      );
    }

    const organizationId = connection.organizationId;
    const tenantDb = getTenantDb(organizationId);

    // 4. Extrai mensagem do segurado
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
      // Evento de status (delivered, read) — responde 200 OK
      return NextResponse.json({ status: 'ignored_non_message_event' }, { status: 200 });
    }

    // 5. Localiza ou cria Cliente
    let cliente = await tenantDb.cliente.findFirst({
      where: { telefone: fromNumber },
    });

    if (!cliente) {
      cliente = await tenantDb.cliente.create({
        data: {
          organizationId,
          nome: senderName,
          telefone: fromNumber,
          cpfEncrypted: encryptSensitive('000.000.000-00'), // Placeholder criptografado até coleta
        },
      });
    }

    // 6. Localiza ou cria Conversa
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

    // 7. Salva mensagem de entrada (INBOUND)
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

    // 8. Dispara IA para gerar minuta em PENDING_REVIEW (Revisão Humana Obrigatória)
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
