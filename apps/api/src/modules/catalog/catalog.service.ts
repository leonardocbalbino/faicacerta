import { Injectable } from '@nestjs/common';
import type {
  CatalogBeltDetail,
  CatalogCategory,
  CatalogGlossaryQuery,
  CatalogGlossaryTerm,
  CatalogMedia,
  CatalogProgram,
  CatalogSearchResult,
  CatalogTechnique,
  CatalogTechniqueItem,
} from '@faixa-certa/shared';
import { AppException } from '../../common/errors/app.exception.js';
import { Prisma, type Media } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { bucketFor } from '../media/media-keys.js';

const PUBLISHED = 'PUBLISHED' as const;
const SEARCH_LIMIT = 20;

/** Técnica visível no app: publicada e não removida. */
const liveTechnique = { status: PUBLISHED, deletedAt: null } satisfies Prisma.TechniqueWhereInput;

const categoryInclude = {
  parent: { select: { id: true, name: true } },
} satisfies Prisma.CategoryInclude;

const itemInclude = {
  category: { include: categoryInclude },
  // Enum em ordem: MAIN_VIDEO, STEP, GALLERY → o primeiro item serve de capa.
  media: { include: { media: true }, orderBy: [{ role: 'asc' }, { order: 'asc' }], take: 1 },
} satisfies Prisma.TechniqueInclude;

const detailInclude = {
  category: { include: categoryInclude },
  pronunciationAudio: true,
  media: { include: { media: true }, orderBy: [{ role: 'asc' }, { order: 'asc' }] },
  relatedTo: {
    orderBy: { order: 'asc' },
    where: { related: liveTechnique },
    include: { related: { include: itemInclude } },
  },
  requirements: {
    where: { belt: { deletedAt: null, program: { status: PUBLISHED, deletedAt: null } } },
    include: {
      belt: { select: { id: true, name: true, colors: true, order: true, programId: true } },
    },
    orderBy: { belt: { order: 'asc' } },
  },
} satisfies Prisma.TechniqueInclude;

const glossaryInclude = {
  category: { select: { id: true, name: true } },
  audio: true,
} satisfies Prisma.GlossaryTermInclude;

type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;
type ItemRow = Prisma.TechniqueGetPayload<{ include: typeof itemInclude }>;
type GlossaryRow = Prisma.GlossaryTermGetPayload<{ include: typeof glossaryInclude }>;

/**
 * Leitura pública do conteúdo base para o app. Só entra o que está publicado;
 * mídias só aparecem quando já foram processadas (READY).
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listPrograms(): Promise<CatalogProgram[]> {
    const programs = await this.prisma.program.findMany({
      where: { status: PUBLISHED, deletedAt: null, ownerTeacherId: null },
      orderBy: [{ isBase: 'desc' }, { name: 'asc' }],
      include: {
        belts: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { requirements: { where: { technique: liveTechnique } } } },
          },
        },
      },
    });
    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      federation: p.federation,
      description: p.description,
      isBase: p.isBase,
      belts: p.belts.map((b) => ({
        id: b.id,
        name: b.name,
        colors: b.colors,
        order: b.order,
        minAge: b.minAge,
        description: b.description,
        techniqueCount: b._count.requirements,
      })),
    }));
  }

  async getBelt(id: string): Promise<CatalogBeltDetail> {
    const belt = await this.prisma.belt.findFirst({
      where: {
        id,
        deletedAt: null,
        program: { status: PUBLISHED, deletedAt: null, ownerTeacherId: null },
      },
      include: {
        program: { select: { id: true, name: true } },
        requirements: {
          where: { technique: liveTechnique },
          orderBy: { order: 'asc' },
          include: { technique: { include: itemInclude } },
        },
      },
    });
    if (!belt) throw AppException.notFound();

    return {
      id: belt.id,
      name: belt.name,
      colors: belt.colors,
      order: belt.order,
      minAge: belt.minAge,
      description: belt.description,
      techniqueCount: belt.requirements.length,
      program: belt.program,
      requirements: await Promise.all(
        belt.requirements.map(async (r) => ({
          type: r.type,
          order: r.order,
          technique: await this.toItem(r.technique),
        })),
      ),
    };
  }

  /** Aceita o slug (links compartilháveis) ou o id. */
  async getTechnique(slugOrId: string): Promise<CatalogTechnique> {
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    const t = await this.prisma.technique.findFirst({
      where: { ...liveTechnique, ...(isId ? { id: slugOrId } : { slug: slugOrId }) },
      include: detailInclude,
    });
    if (!t) throw AppException.notFound();

    const ready = t.media.filter((m) => isReady(m.media));
    const mainVideo = ready.find((m) => m.role === 'MAIN_VIDEO');
    const [video, steps, gallery, related, audioUrl, item] = await Promise.all([
      mainVideo ? this.toMedia(mainVideo.media, mainVideo.caption) : null,
      Promise.all(
        ready.filter((m) => m.role === 'STEP').map((m) => this.toMedia(m.media, m.caption)),
      ),
      Promise.all(
        ready.filter((m) => m.role === 'GALLERY').map((m) => this.toMedia(m.media, m.caption)),
      ),
      Promise.all(t.relatedTo.map((r) => this.toItem(r.related))),
      this.audioUrl(t.pronunciationAudio),
      this.toItem({ ...t, media: t.media.slice(0, 1) }),
    ]);

    return {
      ...item,
      richContent: (t.richContent as CatalogTechnique['richContent']) ?? null,
      keyPoints: t.keyPoints,
      commonMistakes: t.commonMistakes,
      examinerCriteria: t.examinerCriteria,
      pronunciationAudioUrl: audioUrl,
      video,
      steps,
      gallery,
      related,
      belts: t.requirements.map((r) => r.belt),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  async listCategories(): Promise<CatalogCategory[]> {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null },
      include: categoryInclude,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toCategory);
  }

  async listGlossary(query: CatalogGlossaryQuery): Promise<CatalogGlossaryTerm[]> {
    const q = query.q?.trim();
    const ids = q
      ? await this.searchIds('glossary_terms', '"japanese" || \' \' || "translation"', q, 200)
      : undefined;
    const rows = await this.prisma.glossaryTerm.findMany({
      where: {
        status: PUBLISHED,
        deletedAt: null,
        categoryId: query.categoryId,
        id: ids ? { in: ids } : undefined,
      },
      include: glossaryInclude,
      orderBy: { japanese: 'asc' },
    });
    return Promise.all(rows.map((g) => this.toGlossary(g)));
  }

  async search(q: string): Promise<CatalogSearchResult> {
    const [techniqueIds, glossaryIds] = await Promise.all([
      this.searchIds('techniques', '"japaneseName" || \' \' || "translation"', q, SEARCH_LIMIT),
      this.searchIds('glossary_terms', '"japanese" || \' \' || "translation"', q, SEARCH_LIMIT),
    ]);
    const [techniques, glossary] = await Promise.all([
      this.prisma.technique.findMany({
        where: { ...liveTechnique, id: { in: techniqueIds } },
        include: itemInclude,
      }),
      this.prisma.glossaryTerm.findMany({
        where: { status: PUBLISHED, deletedAt: null, id: { in: glossaryIds } },
        include: glossaryInclude,
      }),
    ]);
    // Mantém a ordem de relevância da busca.
    const byRank = <T extends { id: string }>(rows: T[], ids: string[]) =>
      rows.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return {
      techniques: await Promise.all(byRank(techniques, techniqueIds).map((t) => this.toItem(t))),
      glossary: await Promise.all(byRank(glossary, glossaryIds).map((g) => this.toGlossary(g))),
    };
  }

  // ---------------------------------------------------------------------------

  /**
   * Busca sem acento e tolerante a erro de digitação. Usa `word_similarity`
   * (`<%`) com a mesma expressão do índice trigram e, para nomes com hífen
   * ("osoto" → "O-soto-gari"), também compara sem hífens e espaços.
   * Só técnicas/termos publicados entram (o filtro de status é feito aqui).
   */
  private async searchIds(
    table: 'techniques' | 'glossary_terms',
    expr: string,
    q: string,
    limit: number,
  ): Promise<string[]> {
    const column = Prisma.raw(`f_unaccent(lower(${expr}))`);
    const compact = Prisma.raw(`regexp_replace(f_unaccent(lower(${expr})), '[^a-z0-9]', '', 'g')`);
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM ${Prisma.raw(`"${table}"`)}
      WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL
        AND (
          f_unaccent(lower(${q})) <% ${column}
          OR ${compact} LIKE '%' || regexp_replace(f_unaccent(lower(${q})), '[^a-z0-9]', '', 'g') || '%'
        )
      ORDER BY word_similarity(f_unaccent(lower(${q})), ${column}) DESC
      LIMIT ${limit}`;
    return rows.map((r) => r.id);
  }

  private url(media: Media, key: string | null): Promise<string | null> {
    return key ? this.storage.readUrl(bucketFor(media.visibility), key) : Promise.resolve(null);
  }

  private async audioUrl(media: Media | null): Promise<string | null> {
    if (!media || !isReady(media)) return null;
    // O processamento grava o áudio convertido em key720p; sem ele, usa o original.
    return this.url(media, media.key720p ?? media.originalKey);
  }

  private async toMedia(media: Media, caption: string | null): Promise<CatalogMedia> {
    const [display, offline, thumb] = await Promise.all([
      this.url(media, media.key720p ?? media.originalKey),
      this.url(media, media.keyOffline),
      this.url(media, media.keyThumb),
    ]);
    return {
      type: media.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      url: display ?? '',
      offlineUrl: offline,
      thumbUrl: thumb,
      durationMs: media.durationMs,
      width: media.width,
      height: media.height,
      caption,
    };
  }

  private async toItem(t: ItemRow): Promise<CatalogTechniqueItem> {
    const cover = t.media[0]?.media;
    const coverReady = cover && isReady(cover) ? cover : null;
    return {
      id: t.id,
      slug: t.slug,
      japaneseName: t.japaneseName,
      japaneseScript: t.japaneseScript,
      translation: t.translation,
      category: toCategory(t.category),
      thumbUrl: coverReady ? await this.url(coverReady, coverReady.keyThumb) : null,
      videoDurationMs:
        coverReady && t.media[0]?.role === 'MAIN_VIDEO' ? coverReady.durationMs : null,
    };
  }

  private async toGlossary(g: GlossaryRow): Promise<CatalogGlossaryTerm> {
    return {
      id: g.id,
      japanese: g.japanese,
      kanji: g.kanji,
      translation: g.translation,
      description: g.description,
      category: g.category,
      audioUrl: await this.audioUrl(g.audio),
    };
  }
}

function isReady(media: Media): boolean {
  return media.status === 'READY' && !media.deletedAt;
}

function toCategory(c: CategoryRow): CatalogCategory {
  return { id: c.id, slug: c.slug, name: c.name, icon: c.icon, parent: c.parent };
}
