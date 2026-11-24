import { createBrowserRouter, Navigate } from 'react-router';
import { AdminLayout, RequireStaff } from '@/layout/admin-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { NotFoundPage } from '@/pages/not-found-page';

/**
 * Cada página é carregada sob demanda (code splitting): o editor de texto e o
 * arrastar e soltar só baixam quando a tela que usa é aberta.
 */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) => ({
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
});

export const router = createBrowserRouter([
  // Páginas públicas (links dos e-mails).
  { path: '/login', element: <LoginPage /> },
  {
    path: '/verificar-email',
    ...page(() => import('@/pages/auth/verify-email-page'), 'VerifyEmailPage'),
  },
  {
    path: '/esqueci-senha',
    ...page(() => import('@/pages/auth/password-pages'), 'ForgotPasswordPage'),
  },
  {
    path: '/redefinir-senha',
    ...page(() => import('@/pages/auth/password-pages'), 'ResetPasswordPage'),
  },
  // Compra do Sem Anúncios por Pix (pública; login próprio).
  { path: '/sem-anuncios', ...page(() => import('@/pages/buy/buy-page'), 'BuyPage') },
  {
    element: (
      <RequireStaff>
        <AdminLayout />
      </RequireStaff>
    ),
    children: [
      { index: true, element: <Navigate to="/tecnicas" replace /> },
      {
        path: '/tecnicas',
        ...page(() => import('@/pages/techniques/techniques-page'), 'TechniquesPage'),
      },
      {
        path: '/tecnicas/nova',
        ...page(() => import('@/pages/techniques/technique-edit-page'), 'TechniqueEditPage'),
      },
      {
        path: '/tecnicas/:id',
        ...page(() => import('@/pages/techniques/technique-edit-page'), 'TechniqueEditPage'),
      },
      {
        path: '/programas',
        ...page(() => import('@/pages/programs/programs-page'), 'ProgramsPage'),
      },
      {
        path: '/programas/:id',
        ...page(() => import('@/pages/programs/program-detail-page'), 'ProgramDetailPage'),
      },
      {
        path: '/categorias',
        ...page(() => import('@/pages/categories/categories-page'), 'CategoriesPage'),
      },
      {
        path: '/glossario',
        ...page(() => import('@/pages/glossary/glossary-page'), 'GlossaryPage'),
      },
      { path: '/quiz', ...page(() => import('@/pages/quiz/quiz-page'), 'QuizPage') },
      { path: '/textos', ...page(() => import('@/pages/articles/articles-page'), 'ArticlesPage') },
      {
        path: '/textos/novo',
        ...page(() => import('@/pages/articles/article-edit-page'), 'ArticleEditPage'),
      },
      {
        path: '/textos/:id',
        ...page(() => import('@/pages/articles/article-edit-page'), 'ArticleEditPage'),
      },
      {
        path: '/monetizacao',
        ...page(() => import('@/pages/monetization/monetization-page'), 'MonetizationPage'),
      },
      {
        path: '/midia',
        ...page(() => import('@/pages/media/media-library-page'), 'MediaLibraryPage'),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
