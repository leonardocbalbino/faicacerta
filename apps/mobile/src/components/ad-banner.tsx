import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_REQUEST, useAds } from '@/lib/ads';
import { colors, radii } from '@/theme';
import { Text } from './ui';

/**
 * Espaço do anúncio (tela 01): banner adaptativo + "Remover anúncios".
 * Some para quem comprou o Sem Anúncios ou quando os anúncios estão desligados.
 */
export function AdBanner() {
  const { bannerUnitId } = useAds();
  const [failed, setFailed] = useState(false);
  if (!bannerUnitId) return null;

  return (
    <View style={styles.box} accessibilityLabel="Anúncio">
      {!failed && (
        <BannerAd
          unitId={bannerUnitId}
          size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
          requestOptions={AD_REQUEST}
          onAdFailedToLoad={() => setFailed(true)}
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/sem-anuncios')}
        style={styles.remove}
        hitSlop={8}
      >
        <Text weight="semibold" size={12} color={colors.textMuted}>
          Remover anúncios
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 8,
  },
  remove: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 },
});
