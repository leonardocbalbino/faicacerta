import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { ArticlesController } from './articles/articles.controller.js';
import { ArticlesService } from './articles/articles.service.js';
import { CategoriesController } from './categories/categories.controller.js';
import { CategoriesService } from './categories/categories.service.js';
import { ContentLifecycleService } from './common/content-lifecycle.service.js';
import { GlossaryController } from './glossary/glossary.controller.js';
import { GlossaryService } from './glossary/glossary.service.js';
import { ProgramsController } from './programs/programs.controller.js';
import { ProgramsService } from './programs/programs.service.js';
import { QuizController } from './quiz/quiz.controller.js';
import { QuizService } from './quiz/quiz.service.js';
import { TechniquesController } from './techniques/techniques.controller.js';
import { TechniquesService } from './techniques/techniques.service.js';

/** CMS do conteúdo base (rotas /v1/admin/*, papel CONTENT_EDITOR ou ADMIN). */
@Module({
  imports: [MediaModule],
  controllers: [
    CategoriesController,
    ProgramsController,
    TechniquesController,
    GlossaryController,
    QuizController,
    ArticlesController,
  ],
  providers: [
    ContentLifecycleService,
    CategoriesService,
    ProgramsService,
    TechniquesService,
    GlossaryService,
    QuizService,
    ArticlesService,
  ],
})
export class CmsModule {}
