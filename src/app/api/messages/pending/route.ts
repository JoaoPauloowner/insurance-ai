import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('orgId') || request.headers.get('x-organization-id');

    if (!organizationId) {
      // Fallback para a primeira organização para facilitar visualização no dashboard
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = firstOrg?.id || null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Tenant/OrganizationId não informado' }, { status: 400 });
    }

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
