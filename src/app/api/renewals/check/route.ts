import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { processRenewalAlerts } from '@/lib/queue/renewals';
import { authenticateRequest } from '@/lib/auth-guard';

export async function POST(request: NextRequest) {
  try {
    const { errorResponse, authContext } = await authenticateRequest(request);
    if (errorResponse || !authContext) {
      return errorResponse!;
    }

    const { organizationId } = authContext;
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
