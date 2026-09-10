import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { reason, userId } = body;

    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('orgId') || request.headers.get('x-organization-id');

    if (!organizationId) {
      const msg = await prisma.message.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      organizationId = msg?.organizationId || null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Tenant/OrganizationId não localizado' }, { status: 400 });
    }

    const tenantDb = getTenantDb(organizationId);

    const message = await tenantDb.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada nesta organização' }, { status: 404 });
    }

    // Atualiza status para 'rejected'
    const updatedMessage = await tenantDb.message.update({
      where: { id },
      data: {
        reviewStatus: 'rejected',
        reviewedById: userId || null,
      },
    });

    // Registra auditoria
    await tenantDb.auditLog.create({
      data: {
        organizationId,
        userId: userId || null,
        acao: 'REJECT_MESSAGE',
        entidade: 'Message',
        entidadeId: id,
        detalhes: {
          motivoRejeicao: reason || 'Descartado pelo corretor humano',
        },
      },
    });

    return NextResponse.json({
      success: true,
      messageId: updatedMessage.id,
      reviewStatus: updatedMessage.reviewStatus,
    });
  } catch (error: any) {
    console.error('[API Reject Message] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao rejeitar mensagem' }, { status: 500 });
  }
}
