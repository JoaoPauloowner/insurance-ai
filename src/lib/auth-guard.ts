import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { prisma } from './prisma';

export interface AuthContext {
  userId: string;
  userEmail: string;
  organizationId: string;
}

/**
 * Autentica uma requisição HTTP via Better Auth.
 * 
 * Regra Crítica de Segurança:
 * O organizationId é derivado EXCLUSIVAMENTE da sessão autenticada.
 * NUNCA é aceito via query param, header ou corpo da requisição.
 * Se não houver sessão válida ou se o usuário não pertencer a uma organização,
 * retorna 401 imediatamente. Não existe fallback de "primeira organização".
 */
export async function authenticateRequest(
  request: Request | NextRequest,
  customAuth?: typeof auth,
  customPrisma?: typeof prisma
): Promise<{ errorResponse?: NextResponse; authContext?: AuthContext }> {
  try {
    const authInstance = customAuth || auth;
    const prismaInstance = customPrisma || prisma;

    const session = await authInstance.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Não autorizado. Autenticação obrigatória para acessar este recurso.' },
          { status: 401 }
        ),
      };
    }

    // Obtém o activeOrganizationId da sessão
    let organizationId: string | null = (session.session as any)?.activeOrganizationId || null;

    // Se não estiver explícito no token da sessão, busca no banco a qual organização o usuário pertence
    if (!organizationId) {
      const member = await prismaInstance.member.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
      });
      organizationId = member?.organizationId || null;
    }

    if (!organizationId) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Não autorizado. Usuário não possui uma organização ativa vinculada à sua sessão.' },
          { status: 401 }
        ),
      };
    }

    return {
      authContext: {
        userId: session.user.id,
        userEmail: session.user.email,
        organizationId,
      },
    };
  } catch (error: any) {
    console.error('[Auth Guard] Erro na validação de sessão:', error);
    return {
      errorResponse: NextResponse.json(
        { error: 'Erro ao validar autenticação da requisição.' },
        { status: 401 }
      ),
    };
  }
}
