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
          <StatusBar style="light" />
          {fontsReady && <Navigator />}
        </PrefsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const { ready } = usePrefs();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
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
      <Stack.Screen
        name="faixas"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
