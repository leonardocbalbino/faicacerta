import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { MailService, type MailMessage } from '../../src/infra/mail/mail.service.js';
import { PrismaService } from '../../src/infra/prisma/prisma.service.js';
import {
  AppleTokenVerifier,
  GoogleTokenVerifier,
  type SocialIdentity,
} from '../../src/modules/auth/social/social-identity.js';
import { AppException } from '../../src/common/errors/app.exception.js';
import type { Role } from '../../src/generated/prisma/client.js';
import { StorageService } from '../../src/infra/storage/storage.service.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { LocalStorageService } from './local-storage.js';

/** Guarda os e-mails em memória para os testes lerem os links. */
export class FakeMailService {
  sent: MailMessage[] = [];
  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
  lastTo(to: string): MailMessage | undefined {
    return this.sent.filter((m) => m.to === to).at(-1);
  }
  /** Extrai o `token` do último link enviado para o destinatário. */
  tokenFor(to: string): string {
    const text = this.lastTo(to)?.text ?? '';
    const match = /token=([A-Za-z0-9_-]+)/.exec(text);
    if (!match?.[1]) throw new Error(`Nenhum link com token para ${to}`);
    return match[1];
  }
}

/**
 * Token falso no formato `sub|email|verified`, ex.: `g-1|ana@x.com|true`.
 * "invalid" simula um token rejeitado pelo provedor.
 */
function parseFakeToken(token: string): SocialIdentity {
  if (token.startsWith('invalid')) throw AppException.unauthorized('auth.invalidSocialToken');
  const [sub, email, verified, name] = token.split('|');
  return {
    providerUserId: sub ?? '',
    email: email || null,
    emailVerified: verified === 'true',
    name: name || null,
  };
}

export class FakeGoogleVerifier extends GoogleTokenVerifier {
  async verify(idToken: string) {
    return parseFakeToken(idToken);
  }
}

export class FakeAppleVerifier extends AppleTokenVerifier {
  async verify(identityToken: string) {
    return parseFakeToken(identityToken);
  }
}

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  mail: FakeMailService;
  storage: LocalStorageService;
}

/** `customize` permite trocar provedores (ex.: verificadores das lojas) em uma suíte. */
export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<TestContext> {
  const mail = new FakeMailService();
  const storage = await new LocalStorageService().init();
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideProvider(StorageService)
    .useValue(storage)
    .overrideProvider(GoogleTokenVerifier)
    .useClass(FakeGoogleVerifier)
    .overrideProvider(AppleTokenVerifier)
    .useClass(FakeAppleVerifier);
  const moduleRef = await customize(builder).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), mail, storage };
}

let userSeq = 0;

/** Cria um usuário com os papéis pedidos e devolve o id e um access token. */
export async function createUser(
  ctx: TestContext,
  roles: Role[] = ['USER'],
): Promise<{ id: string; token: string; auth: { Authorization: string } }> {
  userSeq += 1;
  const user = await ctx.prisma.user.create({
    data: {
      email: `user${userSeq}-${Date.now()}@example.com`,
      name: `Usuário ${userSeq}`,
      passwordHash: await new PasswordService().hash('senha1234'),
      roles,
    },
  });
  const tokens = await ctx.app.get(TokenService).issue(user, {});
  return {
    id: user.id,
    token: tokens.accessToken,
    auth: { Authorization: `Bearer ${tokens.accessToken}` },
  };
}

/** Limpa todas as tabelas (menos o histórico de migrations). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (!rows.length) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
