import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer() as App);

const adult = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  password: 'judo2026',
  birthDate: '1995-04-10',
};

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx?.app.close();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.mail.sent = [];
});

function register(body: Record<string, unknown> = adult) {
  return api().post('/v1/auth/register').send(body);
}

describe('saúde', () => {
  it('GET /health/ready confere o banco', async () => {
    const res = await api().get('/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });
});

describe('cadastro', () => {
  it('cria a conta, inicia a sessão e envia o e-mail de verificação', async () => {
    const res = await register().expect(201);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.refreshToken).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({
      email: 'ana@example.com',
      emailVerified: false,
      isMinor: false,
      roles: ['USER'],
      hasPassword: true,
      providers: ['EMAIL'],
    });
    expect(ctx.mail.lastTo('ana@example.com')?.subject).toContain('Confirme');
  });

  it('não expõe o hash da senha', async () => {
    const res = await register().expect(201);
    expect(JSON.stringify(res.body)).not.toContain('argon2');
  });

  it('recusa e-mail duplicado (ignorando maiúsculas) com RFC 7807', async () => {
    await register().expect(201);
    const res = await register({ ...adult, email: 'ANA@example.com' }).expect(409);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status: 409, code: 'auth.emailInUse' });
    expect(res.body.instance).toBe('/v1/auth/register');
  });

  it('exige responsável para menores de 18', async () => {
    const res = await register({ ...adult, birthDate: '2014-03-01' }).expect(400);
    expect(res.body.code).toBe('errors.validation');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'guardian' })]),
    );
  });

  it('registra o consentimento do responsável e avisa por e-mail', async () => {
    const res = await register({
      ...adult,
      birthDate: '2014-03-01',
      guardian: { name: 'Maria Souza', email: 'maria@example.com', consent: true },
    }).expect(201);
    expect(res.body.user.isMinor).toBe(true);

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: adult.email } });
    expect(user.guardianName).toBe('Maria Souza');
    expect(user.guardianConsentAt).toBeInstanceOf(Date);
    expect(ctx.mail.lastTo('maria@example.com')).toBeDefined();
  });

  it('valida a força da senha', async () => {
    const res = await register({ ...adult, password: 'abcdefgh' }).expect(400);
    expect(res.body.errors[0].path).toBe('password');
  });
});

describe('login e /me', () => {
  beforeEach(async () => {
    await register().expect(201);
  });

  it('recusa senha errada sem revelar se a conta existe', async () => {
    const wrong = await api()
      .post('/v1/auth/login')
      .send({ email: adult.email, password: 'errada123' })
      .expect(401);
    const missing = await api()
      .post('/v1/auth/login')
      .send({ email: 'ninguem@example.com', password: 'errada123' })
      .expect(401);
    expect(wrong.body.code).toBe('auth.invalidCredentials');
    expect(missing.body.code).toBe('auth.invalidCredentials');
  });

  it('entra e acessa /me', async () => {
    const login = await api()
      .post('/v1/auth/login')
      .send({ email: 'Ana@Example.com', password: adult.password })
      .expect(200);
    const me = await api()
      .get('/v1/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(adult.email);
  });

  it('/me exige token válido', async () => {
    await api().get('/v1/me').expect(401);
    await api().get('/v1/me').set('Authorization', 'Bearer abc.def.ghi').expect(401);
  });

  it('bloqueia login de conta bloqueada', async () => {
    await ctx.prisma.user.update({ where: { email: adult.email }, data: { isBlocked: true } });
    const res = await api()
      .post('/v1/auth/login')
      .send({ email: adult.email, password: adult.password })
      .expect(403);
    expect(res.body.code).toBe('auth.accountBlocked');
  });
});

describe('refresh token com rotação', () => {
  it('troca o token e detecta reuso, revogando a sessão inteira', async () => {
    const { body: first } = await register().expect(201);

    const r2 = await api()
      .post('/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    expect(r2.body.refreshToken).not.toBe(first.refreshToken);

    // Reuso do token antigo: sinal de vazamento.
    const reuse = await api()
      .post('/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    expect(reuse.body.code).toBe('auth.refreshTokenReuse');

    // O token mais novo da mesma família também foi revogado.
    await api().post('/v1/auth/refresh').send({ refreshToken: r2.body.refreshToken }).expect(401);
  });

  it('não afeta outras sessões do mesmo usuário', async () => {
    const { body: phone } = await register().expect(201);
    const { body: tablet } = await api()
      .post('/v1/auth/login')
      .send({ email: adult.email, password: adult.password })
      .expect(200);

    await api().post('/v1/auth/refresh').send({ refreshToken: phone.refreshToken }).expect(200);
    await api().post('/v1/auth/refresh').send({ refreshToken: phone.refreshToken }).expect(401);

    await api().post('/v1/auth/refresh').send({ refreshToken: tablet.refreshToken }).expect(200);
  });

  it('logout revoga a sessão e é idempotente', async () => {
    const { body } = await register().expect(201);
    await api().post('/v1/auth/logout').send({ refreshToken: body.refreshToken }).expect(204);
    await api().post('/v1/auth/logout').send({ refreshToken: body.refreshToken }).expect(204);
    const res = await api()
      .post('/v1/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);
    expect(res.body.code).toBe('auth.invalidRefreshToken');
  });

  it('recusa refresh de conta bloqueada', async () => {
    const { body } = await register().expect(201);
    await ctx.prisma.user.update({ where: { email: adult.email }, data: { isBlocked: true } });
    await api().post('/v1/auth/refresh').send({ refreshToken: body.refreshToken }).expect(403);
  });
});

describe('verificação de e-mail', () => {
  it('confirma o e-mail com o link e não aceita o mesmo link duas vezes', async () => {
    const { body } = await register().expect(201);
    const token = ctx.mail.tokenFor(adult.email);

    await api().post('/v1/auth/verify-email').send({ token }).expect(204);
    const me = await api()
      .get('/v1/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect(me.body.emailVerified).toBe(true);

    const again = await api().post('/v1/auth/verify-email').send({ token }).expect(400);
    expect(again.body.code).toBe('auth.invalidOrExpiredToken');
  });

  it('reenviar invalida o link anterior', async () => {
    const { body } = await register().expect(201);
    const oldToken = ctx.mail.tokenFor(adult.email);
    await api()
      .post('/v1/auth/verify-email/resend')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(204);
    const newToken = ctx.mail.tokenFor(adult.email);
    expect(newToken).not.toBe(oldToken);

    await api().post('/v1/auth/verify-email').send({ token: oldToken }).expect(400);
    await api().post('/v1/auth/verify-email').send({ token: newToken }).expect(204);
  });
});

describe('redefinição de senha', () => {
  it('troca a senha e encerra todas as sessões', async () => {
    const { body: session } = await register().expect(201);
    ctx.mail.sent = [];

    await api().post('/v1/auth/password/forgot').send({ email: adult.email }).expect(202);
    const token = ctx.mail.tokenFor(adult.email);

    await api()
      .post('/v1/auth/password/reset')
      .send({ token, password: 'novaSenha99' })
      .expect(204);

    await api().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    await api()
      .post('/v1/auth/login')
      .send({ email: adult.email, password: adult.password })
      .expect(401);
    await api()
      .post('/v1/auth/login')
      .send({ email: adult.email, password: 'novaSenha99' })
      .expect(200);
  });

  it('responde igual para e-mail inexistente e não envia nada', async () => {
    const res = await api()
      .post('/v1/auth/password/forgot')
      .send({ email: 'ninguem@example.com' })
      .expect(202);
    expect(res.body.message).toContain('Se o e-mail estiver cadastrado');
    expect(ctx.mail.sent).toHaveLength(0);
  });
});

describe('login social', () => {
  it('Google: cria a conta no primeiro login e reaproveita depois', async () => {
    const first = await api()
      .post('/v1/auth/google')
      .send({ idToken: 'g-123|bia@example.com|true|Bia Lima' })
      .expect(200);
    expect(first.body.user).toMatchObject({
      name: 'Bia Lima',
      email: 'bia@example.com',
      emailVerified: true,
      hasPassword: false,
      providers: ['GOOGLE'],
    });

    const second = await api()
      .post('/v1/auth/google')
      .send({ idToken: 'g-123|bia@example.com|true|Bia Lima' })
      .expect(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('Google: vincula a uma conta existente quando o e-mail é verificado', async () => {
    const { body: reg } = await register().expect(201);
    const res = await api()
      .post('/v1/auth/google')
      .send({ idToken: `g-9|${adult.email}|true` })
      .expect(200);
    expect(res.body.user.id).toBe(reg.user.id);
    expect(res.body.user.providers.toSorted()).toEqual(['EMAIL', 'GOOGLE']);
  });

  it('não vincula quando o provedor não verificou o e-mail', async () => {
    await register().expect(201);
    const res = await api()
      .post('/v1/auth/google')
      .send({ idToken: `g-9|${adult.email}|false` })
      .expect(409);
    expect(res.body.code).toBe('auth.socialEmailNotVerified');
  });

  it('Apple: usa o nome enviado pelo app e aceita conta sem e-mail', async () => {
    const res = await api()
      .post('/v1/auth/apple')
      .send({ identityToken: 'apple-sub-000001||false', fullName: 'Caio Prado' })
      .expect(200);
    expect(res.body.user).toMatchObject({ name: 'Caio Prado', email: null, providers: ['APPLE'] });
  });

  it('recusa token inválido', async () => {
    const res = await api()
      .post('/v1/auth/google')
      .send({ idToken: 'invalid-token-xxxxxxxxxx' })
      .expect(401);
    expect(res.body.code).toBe('auth.invalidSocialToken');
  });
});
