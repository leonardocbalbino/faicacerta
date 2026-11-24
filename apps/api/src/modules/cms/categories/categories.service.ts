import { HttpStatus, Injectable } from '@nestjs/common';
import type { Category, CategoryInput, ReorderInput } from '@faixa-certa/shared';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';

const withCount = {
  _count: { select: { techniques: { where: { deletedAt: null } } } },
} as const;

type Row = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
  _count: { techniques: number };
};

const toDto = (c: Row): Category => ({
  id: c.id,
  parentId: c.parentId,
  slug: c.slug,
  name: c.name,
  icon: c.icon,
  order: c.order,
  techniqueCount: c._count.techniques,
});

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: withCount,
    });
    return rows.map(toDto);
  }

  async create(actor: AuthUser, input: CategoryInput): Promise<Category> {
    const parentId = input.parentId ?? null;
    if (parentId) await this.findOrThrow(parentId);
    const order = input.order ?? (await this.nextOrder(parentId));
    const row = await this.prisma.category.create({
      data: { parentId, slug: input.slug, name: input.name, icon: input.icon ?? null, order },
      include: withCount,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'category.create',
      entityType: 'CATEGORY',
      entityId: row.id,
      after: row,
    });
    return toDto(row);
  }

  async update(actor: AuthUser, id: string, input: Partial<CategoryInput>): Promise<Category> {
    const before = await this.findOrThrow(id);
    if (input.parentId !== undefined && input.parentId !== null) {
      await this.assertNoCycle(id, input.parentId);
    }
    const row = await this.prisma.category.update({
      where: { id },
      data: {
        parentId: input.parentId,
        slug: input.slug,
        name: input.name,
        icon: input.icon,
        order: input.order,
      },
      include: withCount,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'category.update',
      entityType: 'CATEGORY',
      entityId: id,
      before,
      after: row,
    });
    return toDto(row);
  }

  /** Só remove categoria vazia (sem subcategorias, técnicas, termos ou textos). */
  async remove(actor: AuthUser, id: string): Promise<void> {
    const cat = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { children: true, techniques: true, glossaryTerms: true, articles: true },
        },
      },
    });
    if (!cat) throw AppException.notFound();
    if (Object.values(cat._count).some((n) => n > 0)) {
      throw new AppException(HttpStatus.CONFLICT, 'content.categoryNotEmpty');
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      action: 'category.delete',
      entityType: 'CATEGORY',
      entityId: id,
      before: cat,
    });
  }

  /** Reordena categorias irmãs (mesmo pai). */
  async reorder(actor: AuthUser, input: ReorderInput): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { id: { in: input.ids }, deletedAt: null },
      select: { id: true, parentId: true },
    });
    const parents = new Set(rows.map((r) => r.parentId));
    if (rows.length !== input.ids.length || parents.size !== 1) {
      throw AppException.badRequest('content.invalidReorder');
    }
    await this.prisma.$transaction(
      input.ids.map((id, order) => this.prisma.category.update({ where: { id }, data: { order } })),
    );
    await this.audit.record({
      actorId: actor.id,
      action: 'category.reorder',
      entityType: 'CATEGORY',
      after: input.ids,
    });
    return this.list();
  }

  private async findOrThrow(id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw AppException.badRequest('content.referenceNotFound');
    return cat;
  }

  private async nextOrder(parentId: string | null): Promise<number> {
    const agg = await this.prisma.category.aggregate({
      where: { parentId, deletedAt: null },
      _max: { order: true },
    });
    return (agg._max.order ?? -1) + 1;
  }

  /** O novo pai não pode ser a própria categoria nem um descendente dela. */
  private async assertNoCycle(id: string, newParentId: string): Promise<void> {
    let cursor: string | null = newParentId;
    for (let depth = 0; cursor && depth < 50; depth++) {
      if (cursor === id) throw AppException.badRequest('content.categoryCycle');
      const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      if (!parent) throw AppException.badRequest('content.referenceNotFound');
      cursor = parent.parentId;
    }
  }
}
