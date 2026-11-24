import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  catalogBeltDetailSchema,
  catalogCategorySchema,
  catalogGlossaryQuerySchema,
  catalogGlossaryTermSchema,
  catalogProgramSchema,
  catalogSearchQuerySchema,
  catalogSearchResultSchema,
  catalogTechniqueListSchema,
  catalogTechniqueSchema,
  catalogTechniquesByIdQuerySchema,
  uuidSchema,
  type CatalogTechniqueItem,
  type CatalogTechniquesByIdQuery,
  type CatalogBeltDetail,
  type CatalogCategory,
  type CatalogGlossaryQuery,
  type CatalogGlossaryTerm,
  type CatalogProgram,
  type CatalogSearchQuery,
  type CatalogSearchResult,
  type CatalogTechnique,
} from '@faixa-certa/shared';
import { z } from 'zod';
import { Public } from '../../common/auth/decorators.js';
import { CatalogService } from './catalog.service.js';

const slugOrId = { schema: z.string().trim().min(2).max(80) };

/** Conteúdo publicado para o app (sem login). */
@ApiTags('Catálogo')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('programs')
  @ApiOkResponse({ standardSchema: z.array(catalogProgramSchema) })
  programs(): Promise<CatalogProgram[]> {
    return this.catalog.listPrograms();
  }

  @Get('belts/:id')
  @ApiOkResponse({ standardSchema: catalogBeltDetailSchema })
  belt(@Param('id', { schema: uuidSchema }) id: string): Promise<CatalogBeltDetail> {
    return this.catalog.getBelt(id);
  }

  /** Técnicas publicadas por id (ex.: favoritos sincronizados de outro aparelho). */
  @Get('techniques')
  @ApiOkResponse({ standardSchema: catalogTechniqueListSchema })
  techniquesById(
    @Query({ schema: catalogTechniquesByIdQuerySchema }) query: CatalogTechniquesByIdQuery,
  ): Promise<CatalogTechniqueItem[]> {
    return this.catalog.techniquesById(query.ids);
  }

  @Get('techniques/:slugOrId')
  @ApiOkResponse({ standardSchema: catalogTechniqueSchema })
  technique(@Param('slugOrId', slugOrId) value: string): Promise<CatalogTechnique> {
    return this.catalog.getTechnique(value);
  }

  @Get('categories')
  @ApiOkResponse({ standardSchema: z.array(catalogCategorySchema) })
  categories(): Promise<CatalogCategory[]> {
    return this.catalog.listCategories();
  }

  @Get('glossary')
  @ApiOkResponse({ standardSchema: z.array(catalogGlossaryTermSchema) })
  glossary(
    @Query({ schema: catalogGlossaryQuerySchema }) query: CatalogGlossaryQuery,
  ): Promise<CatalogGlossaryTerm[]> {
    return this.catalog.listGlossary(query);
  }

  @Get('search')
  @ApiOkResponse({ standardSchema: catalogSearchResultSchema })
  search(
    @Query({ schema: catalogSearchQuerySchema }) query: CatalogSearchQuery,
  ): Promise<CatalogSearchResult> {
    return this.catalog.search(query.q);
  }
}
