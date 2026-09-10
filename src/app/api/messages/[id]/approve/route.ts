import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { getMessagingProvider } from '@/lib/messaging/provider';
import { decryptSensitive } from '@/lib/crypto';
import { validateAiOutputWithoutPrice } from '@/lib/ai/schemas';
import { authenticateRequest } from '@/lib/auth-guard';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse, authContext } = await authenticateRequest(request);
    if (errorResponse || !authContext) {
      return errorResponse!;
    }

    const { organizationId, userId } = authContext;
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { editedContent } = body;

    const tenantDb = getTenantDb(organizationId);

    // 1. Busca a mensagem e verifica se está pendente de revisão nesta organização
    const message = await tenantDb.message.findUnique({
      where: { id },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada nesta organização' }, { status: 404 });
    }

    if (message.reviewStatus !== 'pending_review') {
      return NextResponse.json(
        { error: `Mensagem já revisada anteriormente (status atual: ${message.reviewStatus})` },
        { status: 400 }
      );
    }

    const finalContent = editedContent?.trim() ? editedContent.trim() : message.content;

    // 2. Garante que o texto aprovado não possua valores monetários
    validateAiOutputWithoutPrice(finalContent);

    // 3. Obtém credencial do WhatsApp para o tenant
    const connection = await tenantDb.whatsappConnection.findFirst({
      where: { isActive: true },
    });

    let apiKey: string | undefined;
    if (connection?.apiKeyEncrypted) {
      try {
        apiKey = decryptSensitive(connection.apiKeyEncrypted);
      } catch (err) {
        console.warn('[Approve] Falha ao descriptografar chave 360dialog, usando mock provider');
      }
    }

    const messagingProvider = getMessagingProvider(apiKey);

    // 4. Envia para o WhatsApp do cliente através da API Oficial
    const destinationPhone = message.conversation.remoteJid;
    const dispatchResult = await messagingProvider.sendMessage({
      to: destinationPhone,
      text: finalContent,
    });

    const newStatus = editedContent?.trim() ? 'edited' : 'approved';

    // 5. Atualiza o status da mensagem
    const updatedMessage = await tenantDb.message.update({
      where: { id },
      data: {
        content: finalContent,
        reviewStatus: newStatus,
        reviewedById: userId,
      },
    });

    // 6. Registra no log de auditoria SUSEP/LGPD
    await tenantDb.auditLog.create({
      data: {
        organizationId,
        userId,
        acao: 'APPROVE_MESSAGE',
        entidade: 'Message',
        entidadeId: id,
        detalhes: {
          edited: Boolean(editedContent?.trim()),
          status: newStatus,
          externalMessageId: dispatchResult.messageId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      messageId: updatedMessage.id,
      reviewStatus: updatedMessage.reviewStatus,
      dispatch: dispatchResult,
    });
  } catch (error: any) {
    console.error('[API Approve Message] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao aprovar mensagem' }, { status: 500 });
  }
}
