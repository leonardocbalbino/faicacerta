import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PrefsProvider, usePrefs } from '@/lib/prefs';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 300, fade: true });
// Pronúncias tocam mesmo com o iPhone no modo silencioso.
setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PrefsProvider>
          <AuthProvider>
            <StatusBar style="light" />
            {fontsReady && <Navigator />}
          </AuthProvider>
        </PrefsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const MODAL = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

function Navigator() {
  const { ready } = usePrefs();
  const { status } = useAuth();
  // Espera a sessão ser restaurada para não piscar a tela de login.
  const loaded = ready && status !== 'loading';

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="tecnica/[slug]" />
      <Stack.Screen name="faixas" options={MODAL} />
      <Stack.Screen name="entrar" options={{ animation: 'fade' }} />
      <Stack.Screen name="entrar-email" />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="conta" />
      <Stack.Screen name="favoritas" />
      <Stack.Screen name="marco" options={MODAL} />
      <Stack.Screen name="card" />
      <Stack.Screen name="card-foto" />
    </Stack>
  );
}
