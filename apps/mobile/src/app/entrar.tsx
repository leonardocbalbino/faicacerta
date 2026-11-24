import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormError } from '@/components/form';
import { SecondaryButton, Text } from '@/components/ui';
import { API_URL, errorMessage } from '@/lib/api';
import { useAppleAvailable, useAuth } from '@/lib/auth';
import { colors, GUTTER, radii } from '@/theme';

/** Tela 09 — Login opcional ("Salve cada passo da sua jornada"). */
export default function Entrar() {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { signInWithApple } = useAuth();
  const appleAvailable = useAppleAvailable();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    if (from === 'onboarding' || !router.canGoBack()) router.replace('/');
    else router.back();
  };

  const apple = async () => {
    setError(null);
    setBusy(true);
    try {
      if (await signInWithApple()) done();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.stripes} aria-hidden>
        <View style={[styles.stripe, { backgroundColor: '#FACC15' }]} />
        <View style={[styles.stripe, { backgroundColor: '#FB923C', marginLeft: 60 }]} />
        <View style={[styles.stripe, { backgroundColor: colors.lime, marginLeft: 120 }]} />
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
        <View style={{ gap: 10, marginBottom: 8 }}>
          <Text variant="display" size={40} style={{ lineHeight: 41 }}>
            Salve cada passo da sua jornada.
          </Text>
          <Text variant="muted" size={15} style={{ lineHeight: 22 }}>
            Com uma conta você guarda favoritos, progresso e a sua linha do tempo no judô, em
            qualquer celular.
          </Text>
        </View>

        <FormError message={error} />

        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={16}
            style={{ height: 54, opacity: busy ? 0.5 : 1 }}
            onPress={() => !busy && apple()}
          />
        )}
        <SecondaryButton
          label="Usar e-mail"
          icon={<Mail size={20} color={colors.text} />}
          onPress={() => router.push({ pathname: '/entrar-email', params: from ? { from } : {} })}
          style={styles.provider}
          disabled={busy}
        />

        <Pressable accessibilityRole="button" onPress={done} style={styles.skip} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.lime} />
          ) : (
            <Text weight="semibold" size={15}>
              Agora não, só quero estudar
            </Text>
          )}
        </Pressable>

        <Text size={12} color={colors.textSubtle} style={styles.legal}>
          Ao continuar você aceita os{' '}
          <Text
            size={12}
            color="#C8C8D0"
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/termos/`)}
          >
            Termos
          </Text>{' '}
          e a{' '}
          <Text
            size={12}
            color="#C8C8D0"
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacidade/`)}
          >
            Política de privacidade
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  stripes: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: 120,
    gap: 14,
    transform: [{ rotate: '-8deg' }],
  },
  stripe: { height: 52, borderRadius: 10 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: GUTTER,
    gap: 14,
  },
  provider: { height: 54, borderRadius: radii.lg - 2, backgroundColor: colors.surface },
  skip: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  legal: { textAlign: 'center', lineHeight: 18 },
});
