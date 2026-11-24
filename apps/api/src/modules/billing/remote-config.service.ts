import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

/**
 * Configuração remota versionada (tabela remote_config): cada gravação cria
 * uma versão nova e marca a anterior como não vigente.
 */
@Injectable()
export class RemoteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.remoteConfig.findFirst({
      where: { key, isCurrent: true },
      orderBy: { version: 'desc' },
    });
    return row ? (row.value as T) : fallback;
  }

  async set(key: string, value: unknown, updatedById: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.remoteConfig.findFirst({
        where: { key },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      await tx.remoteConfig.updateMany({
        where: { key, isCurrent: true },
        data: { isCurrent: false },
      });
      await tx.remoteConfig.create({
        data: {
          key,
          value: value as Prisma.InputJsonValue,
          version: (current?.version ?? 0) + 1,
          isCurrent: true,
          updatedById,
        },
      });
    });
  }
}
