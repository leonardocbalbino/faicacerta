import type { EntitlementsResult, StorePurchaseInput } from '@faixa-certa/shared';
import { useIAP, isUserCancelledError, type Purchase } from 'expo-iap';
import { router } from 'expo-router';
import { BookOpen, Check, Sparkles, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, PrimaryButton, Text } from '@/components/ui';
import { useAppConfig } from '@/lib/ads';
import { useAuth } from '@/lib/auth';
import { api, errorMessage, unwrap } from '@/lib/http';
import { colors, GUTTER, radii } from '@/theme';

/** Tela 07 — Sem anúncios. Compra pela App Store / Google Play, vinculada à conta. */
export default function SemAnuncios() {
  const insets = useSafeAreaInsets();
  const { user, status, refreshUser } = useAuth();
  const config = useAppConfig();
  const sku = config.data?.noAds.storeProductId ?? 'sem_anuncios';
  const owned = user?.entitlements.includes('NO_ADS') ?? false;
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [done, setDone] = useState(false);
  const restoring = useRef(false);

  /** Confirma a compra no servidor (que valida com a loja) e só então finaliza na loja. */
  const confirm = useCallback(
    async (
      purchase: Purchase,
      finish: (p: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>,
    ) => {
      if (purchase.productId !== sku || !purchase.purchaseToken) return false;
      const body: StorePurchaseInput =
        Platform.OS === 'ios'
          ? { platform: 'ios', signedTransaction: purchase.purchaseToken }
          : {
              platform: 'android',
              productId: purchase.productId,
              purchaseToken: purchase.purchaseToken,
            };
      const result = await unwrap<EntitlementsResult>(api.POST('/v1/billing/store', { body }));
      await finish({ purchase, isConsumable: false });
      await refreshUser();
      return result.entitlements.includes('NO_ADS');
    },
    [sku, refreshUser],
  );

  const iap = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        if (await confirm(purchase, iap.finishTransaction)) setDone(true);
      } catch (e) {
        Alert.alert('Não foi possível concluir', errorMessage(e));
      } finally {
        setBusy(null);
      }
    },
    onPurchaseError: (error) => {
      setBusy(null);
      if (isUserCancelledError(error)) return;
      Alert.alert('Compra não concluída', error.message);
    },
  });

  useEffect(() => {
    if (iap.connected) void iap.fetchProducts({ skus: [sku], type: 'in-app' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iap.connected, sku]);

  // Restaurar: confirma cada compra já feita nesta conta da loja.
  useEffect(() => {
    if (!restoring.current) return;
    restoring.current = false;
    (async () => {
      const mine = iap.availablePurchases.filter((p) => p.productId === sku);
      try {
        let ok = false;
        for (const p of mine) ok = (await confirm(p, iap.finishTransaction)) || ok;
        if (ok) setDone(true);
        else
          Alert.alert(
            'Nada para restaurar',
            'Não encontramos a compra do Sem Anúncios nesta conta da loja.',
          );
      } catch (e) {
        Alert.alert('Não foi possível restaurar', errorMessage(e));
      } finally {
        setBusy(null);
      }
    })();
  }, [iap.availablePurchases, sku, confirm, iap.finishTransaction]);

  const product = iap.products.find((p) => p.id === sku);
  const price = product?.displayPrice;

  const buy = async () => {
    if (status !== 'signedIn') {
      router.push('/entrar');
      return;
    }
    setBusy('buy');
    try {
      await iap.requestPurchase({
        request: { apple: { sku }, google: { skus: [sku] } },
        type: 'in-app',
      });
    } catch (e) {
      setBusy(null);
      if (!isUserCancelledError(e as never)) Alert.alert('Compra não concluída', errorMessage(e));
    }
  };

  const restore = async () => {
    if (status !== 'signedIn') {
      router.push('/entrar');
      return;
    }
    setBusy('restore');
    restoring.current = true;
    try {
      await iap.getAvailablePurchases();
    } catch (e) {
      restoring.current = false;
      setBusy(null);
      Alert.alert('Não foi possível restaurar', errorMessage(e));
    }
  };

  const isDone = done || owned;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Fechar" onPress={() => router.back()}>
          <X size={20} color={colors.text} />
        </IconButton>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 200 + insets.bottom }]}>
        <View style={styles.badge}>
          <Sparkles size={40} color={colors.ink} />
        </View>
        <Text variant="display" size={40} style={{ lineHeight: 41 }}>
          {isDone ? 'Pronto! Sem anúncios.' : 'Estude sem\ninterrupções.'}
        </Text>
        <Text variant="muted" size={16} style={{ lineHeight: 24 }}>
          {isDone
            ? 'Obrigado por apoiar o Faixa Certa. A compra vale para a sua conta, em qualquer aparelho.'
            : 'Pague uma vez e nunca mais veja anúncios no Faixa Certa.'}
        </Text>

        <View style={{ gap: 12 }}>
          <Perk icon={<BookOpen size={16} color={colors.lime} />}>
            Apostila e glossário sem banners
          </Perk>
          <Perk icon={<Zap size={16} color={colors.lime} />}>
            Nada interrompe entre uma técnica e outra
          </Perk>
          <Perk icon={<Check size={16} color={colors.lime} strokeWidth={3} />}>
            Vale para sempre, em qualquer aparelho
          </Perk>
        </View>

        {!isDone && (
          <View style={styles.offer}>
            <View style={{ gap: 4, flex: 1 }}>
              <Text variant="muted">Pagamento único</Text>
              <Text weight="semibold" size={14}>
                Vinculado à sua conta
              </Text>
            </View>
            {price ? (
              <Text variant="display" size={32}>
                {price}
              </Text>
            ) : (
              <ActivityIndicator color={colors.lime} />
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
        {isDone ? (
          <PrimaryButton label="Voltar a estudar" onPress={() => router.back()} />
        ) : (
          <>
            <PrimaryButton
              label={
                busy === 'buy'
                  ? 'Abrindo a loja…'
                  : status !== 'signedIn'
                    ? 'Entrar para comprar'
                    : price
                      ? `Comprar por ${price}`
                      : 'Comprar'
              }
              onPress={buy}
              disabled={busy !== null || (status === 'signedIn' && (!iap.connected || !product))}
            />
            <Pressable
              accessibilityRole="button"
              onPress={restore}
              disabled={busy !== null}
              style={styles.restore}
            >
              <Text weight="semibold" size={14} color={colors.textMuted}>
                {busy === 'restore' ? 'Restaurando…' : 'Restaurar compra'}
              </Text>
            </Pressable>
            <Text variant="muted" size={12} style={{ textAlign: 'center' }}>
              {status === 'signedIn'
                ? `Cobrado pela ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.`
                : 'Precisa estar logado para vincular a compra à sua conta.'}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function Perk({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={styles.perkIcon}>{icon}</View>
      <Text size={15} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: GUTTER },
  content: { paddingHorizontal: GUTTER, gap: 22 },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  perkIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offer: {
    borderRadius: radii.card - 4,
    borderWidth: 2,
    borderColor: colors.lime,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: GUTTER,
    gap: 6,
    backgroundColor: colors.ink,
  },
  restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
