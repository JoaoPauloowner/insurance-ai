import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export class PGlitePool extends pg.Pool {
  private pglite: PGlite;

  constructor(pglite: PGlite) {
    super();
    this.pglite = pglite;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override query: any = async (queryTextOrConfig: any, values?: any): Promise<any> => {
    const config = queryTextOrConfig as { text?: string; values?: unknown[]; rowMode?: string };
    const text = typeof queryTextOrConfig === 'string' ? queryTextOrConfig : config.text || '';
    const vals = (values ?? (typeof queryTextOrConfig === 'object' ? config.values : [])) as unknown[];
    const rowMode = typeof queryTextOrConfig === 'object' ? config.rowMode : undefined;

    const res = await this.pglite.query(text, vals, {
      rowMode: rowMode === 'array' ? 'array' : undefined,
    });

    // Converter objetos Date para string ISO para compatibilidade com o Prisma Query Engine
    const mappedRows = res.rows.map((row: unknown) => {
      if (Array.isArray(row)) {
        return row.map((col: unknown) => (col instanceof Date ? col.toISOString() : col));
      }
      return row;
    });

    return {
      rows: mappedRows,
      fields: res.fields,
      rowCount: res.affectedRows ?? res.rows.length,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override connect: any = async (): Promise<any> => {
    const client = {
      query: (textOrConfig: any, values?: any) => this.query(textOrConfig, values),
      release: () => {},
      on: () => client,
      removeListener: () => client,
      emit: () => true,
    };
    return client;
  };

  override async end(): Promise<void> {
    await this.pglite.close();
  }
}

export interface TestDatabaseContext {
  prisma: PrismaClient;
  pglite: PGlite;
  pool: PGlitePool;
  cleanup: () => Promise<void>;
}

/**
 * Cria uma instância de banco de dados PostgreSQL 16 real em WebAssembly (PGlite)
 * executando a migration inicial completa e conecta via PrismaPg adapter.
 */
export async function createTestDatabase(): Promise<TestDatabaseContext> {
  const pglite = new PGlite();

  const migrationPath = path.resolve(__dirname, '../../prisma/migrations/0_init/migration.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await pglite.exec(migrationSql);

  const pool = new PGlitePool(pglite);
  const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  return {
    prisma,
    pglite,
    pool,
    cleanup: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
