import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  Belt,
  BeltInput,
  BeltRequirement,
  BeltRequirementsInput,
  Program,
  ProgramDetail,
  ProgramInput,
  ReorderInput,
  StatusChangeInput,
} from '@faixa-certa/shared';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { ContentLifecycleService } from '../common/content-lifecycle.service.js';

const programInclude = {
  _count: { select: { belts: { where: { deletedAt: null } } } },
} as const;

const beltInclude = { _count: { select: { requirements: true } } } as const;

type ProgramRow = {
  id: string;
  name: string;
  federation: string | null;
  description: string | null;
  isBase: boolean;
  status: Program['status'];
  updatedAt: Date;
  _count: { belts: number };
};

type BeltRow = {
  id: string;
  programId: string;
  name: string;
  colors: string[];
  order: number;
  minAge: number | null;
  description: string | null;
  _count: { requirements: number };
};

const toProgram = (p: ProgramRow): Program => ({
  id: p.id,
  name: p.name,
  federation: p.federation,
  description: p.description,
  isBase: p.isBase,
  status: p.status,
  beltCount: p._count.belts,
  updatedAt: p.updatedAt.toISOString(),
});

const toBelt = (b: BeltRow): Belt => ({
  id: b.id,
  programId: b.programId,
  name: b.name,
  colors: b.colors,
  order: b.order,
  minAge: b.minAge,
  description: b.description,
  requirementCount: b._count.requirements,
});

/**
 * Programas base (federação/academia) e suas faixas. Os programas
 * personalizados de professores entram na etapa 7.
 */
@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lifecycle: ContentLifecycleService,
  ) {}

  // ---------------------------------------------------------------------------
  // Programas
  // ---------------------------------------------------------------------------

  async list(): Promise<Program[]> {
    const rows = await this.prisma.program.findMany({
      where: { isBase: true, deletedAt: null },
      orderBy: { name: 'asc' },
      include: programInclude,
    });
    return rows.map(toProgram);
  }

  async get(id: string): Promise<ProgramDetail> {
    const program = await this.findProgram(id);
    const belts = await this.prisma.belt.findMany({
      where: { programId: id, deletedAt: null },
      orderBy: { order: 'asc' },
      include: beltInclude,
    });
    return { ...toProgram(program), belts: belts.map(toBelt) };
  }

  async create(actor: AuthUser, input: ProgramInput): Promise<Program> {
    const row = await this.prisma.program.create({
      data: {
        name: input.name,
        federation: input.federation ?? null,
        description: input.description ?? null,
        isBase: true,
      },
      include: programInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'program.create',
      entityType: 'PROGRAM',
      entityId: row.id,
      after: row,
    });
    return toProgram(row);
  }

  async update(actor: AuthUser, id: string, input: Partial<ProgramInput>): Promise<Program> {
    const before = await this.findProgram(id);
    const row = await this.prisma.program.update({
      where: { id },
      data: { name: input.name, federation: input.federation, description: input.description },
      include: programInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'program.update',
      entityType: 'PROGRAM',
      entityId: id,
      before,
      after: row,
    });
    return toProgram(row);
  }

  async changeStatus(actor: AuthUser, id: string, input: StatusChangeInput): Promise<Program> {
    const before = await this.findProgram(id);
    this.lifecycle.assertTransition(before.status, input.status, actor);
    const row = await this.prisma.program.update({
      where: { id },
      data: { status: input.status },
      include: programInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      action: `program.status.${input.status.toLowerCase()}`,
      entityType: 'PROGRAM',
      entityId: id,
      before: { status: before.status },
      after: { status: row.status, comment: input.comment },
    });
    return toProgram(row);
  }

  /** Programa em uso por usuários ou turmas não pode sair do ar. */
  async remove(actor: AuthUser, id: string): Promise<void> {
    const program = await this.prisma.program.findFirst({
      where: { id, deletedAt: null, isBase: true },
      include: { _count: { select: { users: true, classes: true } } },
    });
    if (!program) throw AppException.notFound();
    if (program._count.users > 0 || program._count.classes > 0) {
      throw new AppException(HttpStatus.CONFLICT, 'content.programInUse');
    }
    await this.prisma.program.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({
      actorId: actor.id,
      action: 'program.delete',
      entityType: 'PROGRAM',
      entityId: id,
      before: program,
    });
  }

  // ---------------------------------------------------------------------------
  // Faixas
  // ---------------------------------------------------------------------------

  async createBelt(actor: AuthUser, programId: string, input: BeltInput): Promise<Belt> {
    await this.findProgram(programId);
    const agg = await this.prisma.belt.aggregate({
      where: { programId },
      _max: { order: true },
    });
    const row = await this.prisma.belt.create({
      data: {
        programId,
        name: input.name,
        colors: input.colors,
        minAge: input.minAge ?? null,
        description: input.description ?? null,
        order: (agg._max.order ?? -1) + 1,
      },
      include: beltInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'belt.create',
      entityType: 'BELT',
      entityId: row.id,
      after: row,
    });
    return toBelt(row);
  }

  async updateBelt(actor: AuthUser, id: string, input: Partial<BeltInput>): Promise<Belt> {
    const before = await this.findBelt(id);
    const row = await this.prisma.belt.update({
      where: { id },
      data: {
        name: input.name,
        colors: input.colors,
        minAge: input.minAge,
        description: input.description,
      },
      include: beltInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'belt.update',
      entityType: 'BELT',
      entityId: id,
      before,
      after: row,
    });
    return toBelt(row);
  }

  /** Faixa já usada por usuários, turmas, linha do tempo ou quiz não pode ser apagada. */
  async removeBelt(actor: AuthUser, id: string): Promise<void> {
    const belt = await this.prisma.belt.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { users: true, targetClasses: true, timelineEvents: true, quizAttempts: true },
        },
      },
    });
    if (!belt) throw AppException.notFound();
    if (Object.values(belt._count).some((n) => n > 0)) {
      throw new AppException(HttpStatus.CONFLICT, 'content.beltInUse');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.belt.delete({ where: { id } });
      // Fecha o buraco na ordem para manter 0..n-1.
      const rest = await tx.belt.findMany({
        where: { programId: belt.programId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      await this.applyOrder(
        tx,
        belt.programId,
        rest.map((b) => b.id),
      );
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'belt.delete',
          entityType: 'BELT',
          entityId: id,
          before: belt,
        },
        tx,
      );
    });
  }

  async reorderBelts(actor: AuthUser, programId: string, input: ReorderInput): Promise<Belt[]> {
    const current = await this.prisma.belt.findMany({
      where: { programId, deletedAt: null },
      select: { id: true },
    });
    const same =
      current.length === input.ids.length && current.every((b) => input.ids.includes(b.id));
    if (!same) throw AppException.badRequest('content.invalidReorder');

    await this.prisma.$transaction(async (tx) => {
      await this.applyOrder(tx, programId, input.ids);
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'belt.reorder',
          entityType: 'PROGRAM',
          entityId: programId,
          after: input.ids,
        },
        tx,
      );
    });
    return (await this.get(programId)).belts;
  }

  // ---------------------------------------------------------------------------
  // Requisitos da faixa (checklist do exame)
  // ---------------------------------------------------------------------------

  async getRequirements(beltId: string): Promise<BeltRequirement[]> {
    await this.findBelt(beltId);
    const rows = await this.prisma.beltRequirement.findMany({
      where: { beltId, technique: { deletedAt: null } },
      orderBy: { order: 'asc' },
      include: {
        technique: {
          select: { id: true, slug: true, japaneseName: true, translation: true, status: true },
        },
      },
    });
    return rows.map((r) => ({ type: r.type, order: r.order, technique: r.technique }));
  }

  /** Substitui a lista inteira; a ordem do array vira a ordem do checklist. */
  async setRequirements(
    actor: AuthUser,
    beltId: string,
    input: BeltRequirementsInput,
  ): Promise<BeltRequirement[]> {
    await this.findBelt(beltId);
    const ids = input.items.map((i) => i.techniqueId);
    const found = await this.prisma.technique.count({
      where: { id: { in: ids }, deletedAt: null },
    });
    if (found !== ids.length) throw AppException.badRequest('content.referenceNotFound');

    const before = await this.getRequirements(beltId);
    await this.prisma.$transaction(async (tx) => {
      await tx.beltRequirement.deleteMany({ where: { beltId } });
      await tx.beltRequirement.createMany({
        data: input.items.map((item, order) => ({
          beltId,
          techniqueId: item.techniqueId,
          type: item.type,
          order,
        })),
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: 'belt.requirements.update',
          entityType: 'BELT',
          entityId: beltId,
          before: before.map((r) => ({ techniqueId: r.technique.id, type: r.type })),
          after: input.items,
        },
        tx,
      );
    });
    return this.getRequirements(beltId);
  }

  // ---------------------------------------------------------------------------

  /** Ordem única por programa: passa por valores negativos para não colidir. */
  private async applyOrder(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    programId: string,
    ids: string[],
  ): Promise<void> {
    for (const [i, id] of ids.entries()) {
      await tx.belt.update({ where: { id, programId }, data: { order: -(i + 1) } });
    }
    for (const [i, id] of ids.entries()) {
      await tx.belt.update({ where: { id, programId }, data: { order: i } });
    }
  }

  private async findProgram(id: string) {
    const program = await this.prisma.program.findFirst({
      where: { id, deletedAt: null, isBase: true },
      include: programInclude,
    });
    if (!program) throw AppException.notFound();
    return program;
  }

  private async findBelt(id: string) {
    const belt = await this.prisma.belt.findFirst({ where: { id, deletedAt: null } });
    if (!belt) throw AppException.notFound();
    return belt;
  }
}
