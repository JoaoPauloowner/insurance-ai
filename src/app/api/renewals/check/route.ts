import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { processRenewalAlerts } from '@/lib/queue/renewals';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('orgId') || request.headers.get('x-organization-id');

    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = firstOrg?.id || null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'OrganizationId não informado' }, { status: 400 });
    }

    const tenantDb = getTenantDb(organizationId);

    const result = await processRenewalAlerts({
      tenantDb,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      message: `Varredura de renovações executada: ${result.draftsCreatedCount} novas minutas geradas na fila de revisão.`,
      ...result,
    });
  } catch (error: any) {
    console.error('[API Renewals Check] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao executar verificação de renovações' }, { status: 500 });
  }
}
