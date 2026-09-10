import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { authenticateRequest } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const { errorResponse, authContext } = await authenticateRequest(request);
    if (errorResponse || !authContext) {
      return errorResponse!;
    }

    const { organizationId } = authContext;
    const tenantDb = getTenantDb(organizationId);

    const pendingMessages = await tenantDb.message.findMany({
      where: {
        reviewStatus: 'pending_review',
        requiresReview: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            cliente: true,
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    return NextResponse.json({
      organizationId,
      totalPending: pendingMessages.length,
      messages: pendingMessages,
    });
  } catch (error: any) {
    console.error('[API Messages Pending] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao carregar minutas' }, { status: 500 });
  }
}
