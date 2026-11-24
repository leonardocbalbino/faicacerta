import type { AppConfig } from '@faixa-certa/shared';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  InterstitialAd,
  MaxAdContentRating,
  type RequestOptions,
} from 'react-native-google-mobile-ads';
import { useAuth } from './auth';
import { api, unwrap } from './http';

/** Anúncios não personalizados: sem rastreamento (não pedimos ATT nem usamos IDFA). */
export const AD_REQUEST: RequestOptions = { requestNonPersonalizedAdsOnly: true };

export function useAppConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => unwrap<AppConfig>(api.GET('/v1/config')),
    staleTime: 60 * 60 * 1000,
  });
}

interface AdsContextValue {
  /** Mostra anúncios? (ligados no painel e o usuário não comprou o Sem Anúncios) */
  enabled: boolean;
  bannerUnitId: string | null;
  /** Conta uma tela de conteúdo; de tempos em tempos mostra um intersticial. */
  trackContentView: () => void;
}

const AdsContext = createContext<AdsContextValue>({
  enabled: false,
  bannerUnitId: null,
  trackContentView: () => undefined,
});

let sdkStarted = false;

export function AdsProvider({ children }: { children: ReactNode }) {
  const config = useAppConfig();
  const { user } = useAuth();
  const ads = config.data?.ads;
  const owned = user?.entitlements.includes('NO_ADS') ?? false;
  const enabled = Boolean(ads?.enabled) && !owned;
  const units = ads ? (Platform.OS === 'ios' ? ads.units.ios : ads.units.android) : null;

  // Inicializa o SDK uma vez, com conteúdo livre para todas as idades (alunos de judô incluem crianças).
  useEffect(() => {
    if (!enabled || sdkStarted) return;
    sdkStarted = true;
    mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForUnderAgeOfConsent: user?.isMinor ?? false,
      })
      .then(() => mobileAds().initialize())
      .catch(() => {
        sdkStarted = false;
      });
  }, [enabled, user?.isMinor]);

  // Intersticial: carregado com antecedência e exibido a cada N telas, com intervalo mínimo.
  const interstitial = useRef<InterstitialAd | null>(null);
  const loaded = useRef(false);
  const views = useRef(0);
  const lastShown = useRef(0);

  useEffect(() => {
    if (!enabled || !units?.interstitial || !ads?.interstitialEveryNScreens) {
      interstitial.current = null;
      return;
    }
    const ad = InterstitialAd.createForAdRequest(units.interstitial, AD_REQUEST);
    interstitial.current = ad;
    loaded.current = false;
    const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      loaded.current = true;
    });
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      loaded.current = false;
      ad.load();
    });
    const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
      loaded.current = false;
    });
    ad.load();
    return () => {
      offLoaded();
      offClosed();
      offError();
      interstitial.current = null;
    };
  }, [enabled, units?.interstitial, ads?.interstitialEveryNScreens]);

  const trackContentView = useCallback(() => {
    if (!enabled || !ads || ads.interstitialEveryNScreens <= 0) return;
    views.current += 1;
    const minGapMs = ads.interstitialMinIntervalSeconds * 1000;
    if (
      views.current % ads.interstitialEveryNScreens === 0 &&
      Date.now() - lastShown.current >= minGapMs &&
      loaded.current &&
      interstitial.current
    ) {
      lastShown.current = Date.now();
      interstitial.current.show().catch(() => undefined);
    }
  }, [enabled, ads]);

  const value = useMemo<AdsContextValue>(
    () => ({ enabled, bannerUnitId: enabled ? (units?.banner ?? null) : null, trackContentView }),
    [enabled, units?.banner, trackContentView],
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  return useContext(AdsContext);
}
