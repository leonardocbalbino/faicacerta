import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppException } from '../src/common/errors/app.exception.js';
import { AsaasClient } from '../src/modules/billing/asaas.client.js';
import {
  AppleStoreVerifier,
  GooglePlayVerifier,
  type VerifiedStorePurchase,
} from '../src/modules/billing/store-verifiers.js';
import { createTestApp, createUser, resetDatabase, type TestContext } from './utils/test-app.js';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer() as App);

/** Loja falsa: o "JWS"/token é `produto|transação` (ou "invalid"). */
const fakeStore = {
  async verify(a: string, b?: string): Promise<VerifiedStorePurchase> {
    const raw = b ?? a;
    if (raw.startsWith('invalid')) throw AppException.badRequest('billing.invalidPurchase');
    const [productId, transactionId] = (b ? `${a}|${b}` : a).split('|');
    return {
      productId: productId ?? '',
      transactionId: transactionId ?? '',
      purchasedAt: new Date(),
      sandbox: true,
    };
  },
};

let chargeSeq = 0;
const fakeAsaas = {
  async settings() {
    return {
      apiKey: 'k',
      sandbox: true,
      webhookToken: 'segredo-webhook',
      pixExpirationMinutes: 30,
    };
  },
  async createPixCharge() {
    chargeSeq += 1;
    return {
      chargeId: `pay_${chargeSeq}`,
      copiaECola: '00020126...',
      qrCodeBase64: 'iVBORw0KGgo=',
      expiresAt: new Date(Date.now() + 30 * 60_000),
    };
  },
  sealSecret: (v: string) => `sealed:${v}`,
};

type Auth = { Authorization: string };
let user: Auth;
let other: Auth;
let admin: Auth;
const longJws = (s: string) => `${s}|`.padEnd(120, 'x');

beforeAll(async () => {
  ctx = await createTestApp((b) =>
    b
      .overrideProvider(AppleStoreVerifier)
      .useValue({ verify: (jws: string) => fakeStore.verify(jws.replace(/\|x+$/, '')) })
      .overrideProvider(GooglePlayVerifier)
      .useValue({
        verify: (productId: string, token: string) => fakeStore.verify(productId, token),
      })
      .overrideProvider(AsaasClient)
      .useValue(fakeAsaas),
  );
});

afterAll(async () => {
  await ctx?.app.close();
  await ctx?.storage.dispose();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  user = (await createUser(ctx)).auth;
  other = (await createUser(ctx)).auth;
  const a = await createUser(ctx, ['USER', 'ADMIN']);
  admin = a.auth;
  const plan = await ctx.prisma.plan.create({
    data: { code: 'NO_ADS', kind: 'ONE_TIME', name: 'Sem Anúncios' },
  });
  await ctx.prisma.planPrice.create({
    data: {
      planId: plan.id,
      amountCents: 1000,
      validFrom: new Date(Date.now() - 1000),
      createdByAdminId: a.id,
    },
  });
});

const me = (auth: Auth) => api().get('/v1/me').set(auth).expect(200);

describe('configuração pública', () => {
  it('traz anúncios (IDs de teste por padrão) e a oferta', async () => {
    const res = await api().get('/v1/config').expect(200);
    expect(res.body.ads.enabled).toBe(true);
    expect(res.body.ads.units.android.banner).toMatch(/^ca-app-pub-3940256099942544\//);
    expect(res.body.noAds).toEqual({
      salesEnabled: true,
      priceCents: 1000,
      storeProductId: 'sem_anuncios',
    });
  });
});

describe('compras nas lojas', () => {
  it('iOS: libera o Sem Anúncios e é idempotente', async () => {
    const body = { platform: 'ios', signedTransaction: longJws('sem_anuncios|1000001') };
    const res = await api().post('/v1/billing/store').set(user).send(body).expect(200);
    expect(res.body.entitlements).toEqual(['NO_ADS']);
    await api().post('/v1/billing/store').set(user).send(body).expect(200);
    expect(await ctx.prisma.payment.count()).toBe(1);
    expect((await me(user)).body.entitlements).toEqual(['NO_ADS']);
  });

  it('Android: libera com o token do Google Play', async () => {
    const res = await api()
      .post('/v1/billing/store')
      .set(user)
      .send({ platform: 'android', productId: 'sem_anuncios', purchaseToken: 'GPA.1234-5678' })
      .expect(200);
    expect(res.body.entitlements).toEqual(['NO_ADS']);
  });

  it('não libera a mesma compra em outra conta', async () => {
    const body = { platform: 'ios', signedTransaction: longJws('sem_anuncios|2000002') };
    await api().post('/v1/billing/store').set(user).send(body).expect(200);
    const res = await api().post('/v1/billing/store').set(other).send(body).expect(409);
    expect(res.body.code).toBe('billing.purchaseOwnedByAnotherAccount');
    expect((await me(other)).body.entitlements).toEqual([]);
  });

  it('recusa produto desconhecido e compra inválida', async () => {
    await api()
      .post('/v1/billing/store')
      .set(user)
      .send({ platform: 'ios', signedTransaction: longJws('outro_produto|3') })
      .expect(400);
    await api()
      .post('/v1/billing/store')
      .set(user)
      .send({ platform: 'android', productId: 'sem_anuncios', purchaseToken: 'invalid-token' })
      .expect(400);
  });

  it('exige login', async () => {
    await api()
      .post('/v1/billing/store')
      .send({ platform: 'ios', signedTransaction: longJws('a|b') })
      .expect(401);
  });
});

describe('Pix (site)', () => {
  it('gera o Pix, reaproveita o pendente e libera quando o Asaas confirma', async () => {
    await api().post('/v1/billing/pix').set(user).send({ cpf: '111.111.111-11' }).expect(400);

    const pix = await api()
      .post('/v1/billing/pix')
      .set(user)
      .send({ cpf: '529.982.247-25' })
      .expect(200);
    expect(pix.body).toMatchObject({
      status: 'PENDING',
      amountCents: 1000,
      copiaECola: '00020126...',
    });
    const again = await api()
      .post('/v1/billing/pix')
      .set(user)
      .send({ cpf: '52998224725' })
      .expect(200);
    expect(again.body.paymentId).toBe(pix.body.paymentId);

    const chargeId = (
      await ctx.prisma.payment.findUniqueOrThrow({ where: { id: pix.body.paymentId } })
    ).gatewayChargeId;
    const event = { id: 'evt_1', event: 'PAYMENT_RECEIVED', payment: { id: chargeId } };

    await api().post('/v1/billing/webhooks/asaas').send(event).expect(401);
    await api()
      .post('/v1/billing/webhooks/asaas')
      .set('asaas-access-token', 'errado')
      .send(event)
      .expect(401);
    await api()
      .post('/v1/billing/webhooks/asaas')
      .set('asaas-access-token', 'segredo-webhook')
      .send(event)
      .expect(200);
    // Repetido: idempotente.
    await api()
      .post('/v1/billing/webhooks/asaas')
      .set('asaas-access-token', 'segredo-webhook')
      .send(event)
      .expect(200);

    const status = await api()
      .get(`/v1/billing/payments/${pix.body.paymentId}`)
      .set(user)
      .expect(200);
    expect(status.body).toMatchObject({ status: 'PAID', copiaECola: null });
    expect((await me(user)).body.entitlements).toEqual(['NO_ADS']);
    expect(await ctx.prisma.entitlement.count()).toBe(1);

    // Outro usuário não vê o pagamento; quem já tem não gera outro Pix.
    await api().get(`/v1/billing/payments/${pix.body.paymentId}`).set(other).expect(404);
    await api().post('/v1/billing/pix').set(user).send({ cpf: '52998224725' }).expect(409);
  });

  it('estorno revoga o acesso', async () => {
    const pix = await api()
      .post('/v1/billing/pix')
      .set(user)
      .send({ cpf: '52998224725' })
      .expect(200);
    const chargeId = (
      await ctx.prisma.payment.findUniqueOrThrow({ where: { id: pix.body.paymentId } })
    ).gatewayChargeId;
    const send = (id: string, ev: string) =>
      api()
        .post('/v1/billing/webhooks/asaas')
        .set('asaas-access-token', 'segredo-webhook')
        .send({ id, event: ev, payment: { id: chargeId } })
        .expect(200);
    await send('evt_a', 'PAYMENT_CONFIRMED');
    await send('evt_b', 'PAYMENT_REFUNDED');
    expect((await me(user)).body.entitlements).toEqual([]);
  });

  it('com as vendas pausadas, não gera Pix', async () => {
    await api()
      .put('/v1/admin/monetization/no-ads')
      .set(admin)
      .send({ salesEnabled: false, priceCents: 1000 })
      .expect(200);
    const res = await api()
      .post('/v1/billing/pix')
      .set(user)
      .send({ cpf: '52998224725' })
      .expect(409);
    expect(res.body.code).toBe('billing.salesDisabled');
  });
});

describe('admin: monetização', () => {
  it('só ADMIN acessa', async () => {
    await api().get('/v1/admin/monetization/ads').set(user).expect(403);
    await api().get('/v1/admin/monetization/ads').set(admin).expect(200);
  });

  it('salva anúncios (valida os IDs) e reflete na configuração pública', async () => {
    const ads = (await api().get('/v1/admin/monetization/ads').set(admin).expect(200)).body;
    await api()
      .put('/v1/admin/monetization/ads')
      .set(admin)
      .send({ ...ads, units: { ...ads.units, ios: { ...ads.units.ios, banner: 'errado' } } })
      .expect(400);
    await api()
      .put('/v1/admin/monetization/ads')
      .set(admin)
      .send({ ...ads, enabled: false })
      .expect(200);
    expect((await api().get('/v1/config').expect(200)).body.ads.enabled).toBe(false);
  });

  it('muda o preço criando uma nova versão', async () => {
    const res = await api()
      .put('/v1/admin/monetization/no-ads')
      .set(admin)
      .send({ salesEnabled: true, priceCents: 1290 })
      .expect(200);
    expect(res.body).toEqual({ salesEnabled: true, priceCents: 1290 });
    expect(await ctx.prisma.planPrice.count()).toBe(2);
  });

  it('salva o gateway sem devolver a chave', async () => {
    const res = await api()
      .put('/v1/admin/monetization/gateway')
      .set(admin)
      .send({
        environment: 'SANDBOX',
        apiKey: '$aact_teste',
        webhookToken: 'tok',
        pixExpirationMinutes: 30,
        isActive: true,
      })
      .expect(200);
    expect(res.body).toMatchObject({ hasApiKey: true, hasWebhookToken: true, isActive: true });
    expect(JSON.stringify(res.body)).not.toContain('aact');
    expect(res.body.webhookUrl).toMatch(/\/v1\/billing\/webhooks\/asaas$/);
  });

  it('concede e revoga acesso manualmente e lista pagamentos', async () => {
    const target = await ctx.prisma.user.findFirstOrThrow({
      where: { roles: { equals: ['USER'] } },
    });
    await api()
      .post('/v1/admin/monetization/entitlements')
      .set(admin)
      .send({ email: target.email, type: 'NO_ADS', reason: 'Cortesia para professor parceiro' })
      .expect(204);
    const list = await api().get('/v1/admin/monetization/entitlements').set(admin).expect(200);
    expect(list.body[0]).toMatchObject({ type: 'NO_ADS', source: 'ADMIN_GRANT' });
    await api()
      .delete(`/v1/admin/monetization/entitlements/${list.body[0].id}`)
      .set(admin)
      .expect(204);

    await api()
      .post('/v1/billing/store')
      .set(user)
      .send({ platform: 'android', productId: 'sem_anuncios', purchaseToken: 'GPA.9' })
      .expect(200);
    const payments = await api().get('/v1/admin/monetization/payments').set(admin).expect(200);
    expect(payments.body.items[0]).toMatchObject({
      provider: 'GOOGLE_PLAY',
      status: 'PAID',
      amountCents: 1000,
    });
    expect(payments.body.paidLast30Days).toEqual({ count: 1, amountCents: 1000 });
  });
});
