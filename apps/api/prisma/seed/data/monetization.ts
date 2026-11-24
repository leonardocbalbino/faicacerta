/**
 * Planos e preços iniciais. Os valores do Pro são PROVISÓRIOS: o admin define
 * os preços reais no painel de monetização (cada alteração gera nova versão).
 */
export const plans = [
  {
    code: 'NO_ADS',
    kind: 'ONE_TIME',
    interval: null,
    name: 'Sem Anúncios',
    offerText: 'Pague uma vez e estude sem anúncios para sempre.',
    trialDays: 0,
    graceDays: 0,
    limits: null,
    initialPriceCents: 1000,
  },
  {
    code: 'PRO_MONTHLY',
    kind: 'RECURRING',
    interval: 'MONTH',
    name: 'Pro Professor (mensal)',
    offerText: 'Turmas, material próprio e lojinha para seus alunos.',
    trialDays: 7,
    graceDays: 5,
    limits: { maxClasses: 0, maxStudents: 0, maxProducts: 0 },
    initialPriceCents: 2990,
  },
  {
    code: 'PRO_YEARLY',
    kind: 'RECURRING',
    interval: 'YEAR',
    name: 'Pro Professor (anual)',
    offerText: 'Turmas, material próprio e lojinha, com desconto no plano anual.',
    trialDays: 7,
    graceDays: 5,
    limits: { maxClasses: 0, maxStudents: 0, maxProducts: 0 },
    initialPriceCents: 29900,
  },
] as const;

/** IDs de TESTE públicos do Google AdMob. Trocar pelos reais no painel. */
const ADMOB_TEST = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
};

export const remoteConfig: Record<string, unknown> = {
  ads: {
    enabled: true,
    units: ADMOB_TEST,
    interstitialEveryNScreens: 5,
    interstitialMinIntervalSeconds: 120,
    bannerScreens: ['belt_list', 'technique_list', 'glossary', 'quiz_home'],
  },
  payments: {
    enabled: { ios: false, android: true },
    mode: 'in_app',
    pixExpirationMinutes: 30,
  },
  entitlements: {
    classMembersNoAds: true,
  },
  features: {
    videoComparison: false,
    offlineDownloads: true,
  },
};
