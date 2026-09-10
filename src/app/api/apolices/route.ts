import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('orgId') || request.headers.get('x-organization-id');
    const status = searchParams.get('status');

    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = firstOrg?.id || null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'OrganizationId não informado' }, { status: 400 });
    }

    const tenantDb = getTenantDb(organizationId);

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const apolices = await tenantDb.apolice.findMany({
      where,
      orderBy: { dataVencimento: 'asc' },
      include: {
        cliente: true,
      },
    });

    return NextResponse.json({
      total: apolices.length,
      apolices,
    });
  } catch (error: any) {
    console.error('[API Apolices GET] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao buscar apólices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('orgId') || request.headers.get('x-organization-id');
    const body = await request.json();

    if (!organizationId) {
      organizationId = body.organizationId;
    }

    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = firstOrg?.id || null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'OrganizationId não informado' }, { status: 400 });
    }

    const {
      clienteId,
      seguradora,
      tipoSeguro,
      numeroApolice,
      valorPremio, // Preenchido exclusivamente pelo corretor humano
      dataInicio,
      dataVencimento,
      userId,
    } = body;

    if (!clienteId || !seguradora || !tipoSeguro || !numeroApolice || !dataInicio || !dataVencimento) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes na apólice' }, { status: 400 });
    }

    const tenantDb = getTenantDb(organizationId);

    const apolice = await tenantDb.apolice.create({
      data: {
        organizationId,
        clienteId,
        seguradora,
        tipoSeguro,
        numeroApolice,
        valorPremio: valorPremio ? Number(valorPremio) : null,
        dataInicio: new Date(dataInicio),
        dataVencimento: new Date(dataVencimento),
        status: 'ativa',
      },
      include: {
        cliente: true,
      },
    });

    // Registra no AuditLog
    await tenantDb.auditLog.create({
      data: {
        organizationId,
        userId: userId || null,
        acao: 'CREATE',
        entidade: 'Apolice',
        entidadeId: apolice.id,
        detalhes: {
          numeroApolice,
          seguradora,
          tipoSeguro,
        },
      },
    });

    return NextResponse.json({ success: true, apolice }, { status: 201 });
  } catch (error: any) {
    console.error('[API Apolices POST] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao criar apólice' }, { status: 500 });
  }
}
