import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { TenantAccessError } from './errors';

export type TenantPrismaClient = ReturnType<typeof createTenantExtension>;

type QueryHookParams = { args: any; query: (args: any) => Promise<any> };
type FindUniqueParams = { args: any };

function createTenantExtension(basePrisma: PrismaClient, organizationId: string) {
  return basePrisma.$extends({
    name: 'insurance-tenant-isolation',
    query: {
      cliente: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.cliente.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.cliente.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Cliente não encontrado ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.cliente.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Cliente não encontrado ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      apolice: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.apolice.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.apolice.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Apólice não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.apolice.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Apólice não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      cotacao: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.cotacao.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.cotacao.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Cotação não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.cotacao.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Cotação não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      sinistro: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.sinistro.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.sinistro.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Sinistro não encontrado ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.sinistro.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Sinistro não encontrado ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      conversation: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.conversation.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.conversation.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Conversa não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.conversation.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Conversa não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      message: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.message.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.message.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Mensagem não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.message.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Mensagem não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      whatsappConnection: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.whatsappConnection.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
        async update({ args, query }: QueryHookParams) {
          const record = await basePrisma.whatsappConnection.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Conexão WhatsApp não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async delete({ args, query }: QueryHookParams) {
          const record = await basePrisma.whatsappConnection.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!record) {
            throw new TenantAccessError('Conexão WhatsApp não encontrada ou não pertence a esta organização.');
          }
          return query(args);
        },
        async updateMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
      },
      auditLog: {
        async findMany({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findUnique({ args }: FindUniqueParams) {
          return basePrisma.auditLog.findFirst({
            where: { ...args.where, organizationId },
          });
        },
        async count({ args, query }: QueryHookParams) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async create({ args, query }: QueryHookParams) {
          args.data = { ...args.data, organizationId };
          return query(args);
        },
      },
    },
  });
}

/**
 * Obtém o cliente Prisma escopado estritamente para o tenant (organizationId).
 * Rejeita qualquer tentativa de consulta sem tenant identificado.
 */
export function getTenantDb(organizationId: string, customPrisma?: PrismaClient) {
  if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new TenantAccessError('Contexto de organização (organizationId) ausente ou inválido.');
  }

  const base = customPrisma || prisma;
  return createTenantExtension(base, organizationId.trim());
}
